import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { summarizeImportJobForLog } from '../import-job-log.ts'

// DEV-205: o job de importação de inscrições por planilha traz em
// `errors[].data` a linha original da planilha (CPF, nome, telefone, e-mail,
// endereço do cidadão). Nem o BFF de status do job nem o formulário de
// planilha podem mandar esse objeto para o log do pod ou para o console do
// navegador: só um resumo sem dado pessoal.

// Dados sintéticos (CPF de teste, nome e contatos fictícios).
const SYNTHETIC_ROW =
  'Fulana de Teste;000.000.001-91;(21) 90000-0000;fulana@example.com;Rua Fictícia 1;Centro'

const syntheticJob = {
  id: 'job-123',
  type: 'enrollment_import',
  status: 'completed',
  progress: 100,
  total_records: 3,
  success_count: 2,
  error_count: 1,
  created_at: '2026-11-03T10:00:00Z',
  errors: [{ line: 3, data: SYNTHETIC_ROW, message: 'CPF duplicado' }],
  result: { duplicate_count: 1, rows: [SYNTHETIC_ROW] },
  metadata: { file_name: 'inscritos-fulana.xlsx', curso_id: 7 },
}

describe('summarizeImportJobForLog (DEV-205)', () => {
  test('mantém só id, status, progresso e contagens', () => {
    assert.deepEqual(summarizeImportJobForLog(syntheticJob), {
      id: 'job-123',
      status: 'completed',
      progress: 100,
      total_records: 3,
      success_count: 2,
      error_count: 1,
    })
  })

  test('nada da linha da planilha, do resultado ou da metadata chega ao log', () => {
    const logged = JSON.stringify(summarizeImportJobForLog(syntheticJob))
    assert.doesNotMatch(logged, /000\.000\.001-91/)
    assert.doesNotMatch(logged, /Fulana/)
    assert.doesNotMatch(logged, /fulana@example\.com/)
    assert.doesNotMatch(logged, /90000-0000/)
    assert.doesNotMatch(logged, /Fictícia/)
    assert.doesNotMatch(logged, /errors|result|metadata|data/)
  })

  test('descarta campo com tipo inesperado em vez de logá-lo', () => {
    const summary = summarizeImportJobForLog({
      id: { cpf: '000.000.001-91' },
      status: SYNTHETIC_ROW,
      progress: '100',
      success_count: Number.NaN,
      error_count: 1,
    })
    assert.deepEqual(summary, { error_count: 1 })
  })

  test('aceita entrada que não é objeto', () => {
    assert.deepEqual(summarizeImportJobForLog(null), {})
    assert.deepEqual(summarizeImportJobForLog(undefined), {})
    assert.deepEqual(summarizeImportJobForLog(SYNTHETIC_ROW), {})
    assert.deepEqual(summarizeImportJobForLog([syntheticJob]), {})
  })
})

/** Remove strings, template literals e comentários, mantendo só o código. */
function stripLiterals(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, literal => {
      const expressions = literal.match(/\$\{[^}]*\}/g) ?? []
      return ` ${expressions.join(' ')} `
    })
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
}

/** Argumentos (já sem literais) de cada chamada console.<método>(...). */
function consoleCallArguments(code: string): string[] {
  const calls: string[] = []
  const pattern = /console\.\w+\s*\(/g
  let match = pattern.exec(code)
  while (match !== null) {
    let depth = 1
    let index = match.index + match[0].length
    const start = index
    while (index < code.length && depth > 0) {
      if (code[index] === '(') depth++
      if (code[index] === ')') depth--
      index++
    }
    calls.push(code.slice(start, index - 1))
    match = pattern.exec(code)
  }
  return calls
}

/** Argumento que é o objeto do job inteiro, fora do resumo seguro. */
function logsRawJob(args: string, names: RegExp): boolean {
  const withoutSummaries = args.replace(
    /summarizeImportJobForLog\s*\([^()]*\)/g,
    ' '
  )
  return names.test(withoutSummaries)
}

describe('logs do BFF de status de job (DEV-205)', () => {
  const routeSource = readFileSync(
    new URL('../../app/api/jobs/[jobId]/status/route.ts', import.meta.url),
    'utf8'
  )
  const calls = consoleCallArguments(stripLiterals(routeSource))

  test('encontra as chamadas console.* da rota', () => {
    assert.ok(calls.length > 0)
  })

  test('nenhum console.* loga a resposta do backend fora do resumo', () => {
    for (const args of calls) {
      assert.ok(
        !logsRawJob(
          args,
          /\bresponse\b(?!\s*\.\s*status\b)|\bdata\b|JSON\.stringify/
        ),
        `console com o job inteiro: ${args}`
      )
    }
  })
})

describe('logs do formulário de importação por planilha (DEV-205)', () => {
  const formSource = readFileSync(
    new URL(
      '../../app/(private)/(app)/gorio/components/add-participants/spreadsheet-form.tsx',
      import.meta.url
    ),
    'utf8'
  )
  const calls = consoleCallArguments(stripLiterals(formSource))

  test('encontra as chamadas console.* do formulário', () => {
    assert.ok(calls.length > 0)
  })

  test('nenhum console.* loga a resposta do upload ou do status do job', () => {
    const rawJob =
      /\b(uploadData|statusData|jobData|finalStatusData|jobResult|parsedRows|errors)\b|JSON\.stringify/
    for (const args of calls) {
      assert.ok(!logsRawJob(args, rawJob), `console com o job inteiro: ${args}`)
    }
  })
})
