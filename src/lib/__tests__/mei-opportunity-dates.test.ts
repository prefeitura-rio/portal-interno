import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import {
  EXECUTION_BEFORE_EXPIRATION_MESSAGE,
  SERVICE_EXECUTION_DEADLINE_REQUIRED_MESSAGE,
  isExecutionDeadlineBeforeExpiration,
} from '../mei-opportunity-dates.ts'

// DEV-70: a data limite para execução do serviço não pode ser anterior ao
// prazo de expiração da oportunidade MEI.
//
// Carrega o formulário de oportunidade MEI real (new-mei-opportunity-form.tsx)
// em Node puro para validar os schemas: resolve o alias `@/` e os imports sem
// extensão do bundler do Next, transpila .ts/.tsx de src/ com o TypeScript do
// projeto e troca CSS e imagens por módulos vazios.
// troca CSS e imagens por módulos vazios.
const SRC_ROOT = new URL('../../', import.meta.url)
const ASSET_PATTERN = /\.(css|png|jpe?g|gif|svg|webp)$/
const SOURCE_EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function findSourceFile(basePath: string): string | undefined {
  return SOURCE_EXTENSIONS.map(ext => `${basePath}${ext}`).find(
    candidate => existsSync(candidate) && statSync(candidate).isFile()
  )
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL
    let basePath: string | undefined
    if (specifier.startsWith('@/')) {
      basePath = fileURLToPath(new URL(specifier.slice(2), SRC_ROOT))
    } else if (specifier.startsWith('.') && parent?.startsWith(SRC_ROOT.href)) {
      basePath = fileURLToPath(new URL(specifier, parent))
    }
    if (basePath) {
      const file = findSourceFile(basePath)
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      // Subpaths sem `exports` (ex.: `next/navigation`) exigem a extensão em ESM
      if (/^[@a-z]/i.test(specifier) && !specifier.startsWith('node:')) {
        return nextResolve(`${specifier}.js`, context)
      }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (ASSET_PATTERN.test(url)) {
      return {
        format: 'module',
        source: 'export default { src: "" }',
        shortCircuit: true,
      }
    }
    if (url.startsWith(SRC_ROOT.href) && /\.tsx?$/.test(url)) {
      const { source } = nextLoad(url, { ...context, format: 'module' })
      const { outputText } = ts.transpileModule(String(source), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      })
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const { draftFormSchema, fullFormSchema } = await import(
  '../../app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form.tsx'
)

const at = (iso: string) => new Date(iso)

const EXPIRATION = '2026-11-30T18:00:00-03:00'

// Oportunidade sintética válida; só as datas variam entre os testes
const baseOpportunity = {
  orgao_id: 'orgao-teste',
  subclasses: ['0000-0/00'],
  title: 'Oportunidade de teste',
  description: 'Descrição sintética do serviço usada apenas no teste.',
  outras_informacoes: '',
  address: 'Rua Sintética de Teste',
  number: '100',
  neighborhood: 'Centro',
  forma_pagamento: 'PIX',
  prazo_pagamento: '30 dias',
  gallery_images: [''],
  cover_image:
    'https://storage.googleapis.com/rj-escritorio-dev-public/superapp/capa.png',
}

function opportunity(execution: string | undefined, expiration = EXPIRATION) {
  return {
    ...baseOpportunity,
    opportunity_expiration_date: at(expiration),
    service_execution_deadline: execution ? at(execution) : undefined,
  }
}

function deadlineIssues(data: unknown, schema = fullFormSchema) {
  const result = schema.safeParse(data)
  const issues = result.success ? [] : result.error.issues
  return {
    success: result.success,
    otherIssues: issues.filter(
      issue => issue.message !== EXECUTION_BEFORE_EXPIRATION_MESSAGE
    ),
    paths: issues
      .filter(issue => issue.message === EXECUTION_BEFORE_EXPIRATION_MESSAGE)
      .map(issue => issue.path),
  }
}

describe('isExecutionDeadlineBeforeExpiration', () => {
  test('execução antes da expiração é inválido', () => {
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: at(EXPIRATION),
        service_execution_deadline: at('2026-11-29T18:00:00-03:00'),
      }),
      true
    )
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: at(EXPIRATION),
        service_execution_deadline: at('2026-11-30T17:59:00-03:00'),
      }),
      true
    )
  })

  test('execução igual ou depois da expiração é válido', () => {
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: at(EXPIRATION),
        service_execution_deadline: at(EXPIRATION),
      }),
      false
    )
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: at(EXPIRATION),
        service_execution_deadline: at('2026-12-15T18:00:00-03:00'),
      }),
      false
    )
  })

  test('sem uma das datas, ou com data inválida, não há o que comparar', () => {
    const expiration = at(EXPIRATION)
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: expiration,
      }),
      false
    )
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: expiration,
        service_execution_deadline: null,
      }),
      false
    )
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        service_execution_deadline: at('2026-11-01T18:00:00-03:00'),
      }),
      false
    )
    assert.equal(
      isExecutionDeadlineBeforeExpiration({
        opportunity_expiration_date: expiration,
        service_execution_deadline: new Date('data inválida'),
      }),
      false
    )
  })
})

describe('fullFormSchema do formulário de oportunidade MEI', () => {
  test('oportunidade válida é aceita (base dos demais casos)', () => {
    const result = deadlineIssues(opportunity('2026-12-15T18:00:00-03:00'))
    assert.deepEqual(result.otherIssues, [])
    assert.equal(result.success, true)
  })

  test('rejeita data limite de execução anterior ao prazo de expiração, no campo de execução', () => {
    const result = deadlineIssues(opportunity('2026-11-20T18:00:00-03:00'))
    assert.equal(result.success, false)
    assert.deepEqual(result.otherIssues, [])
    assert.deepEqual(result.paths, [['service_execution_deadline']])
  })

  test('aceita data limite de execução igual ao prazo de expiração', () => {
    const result = deadlineIssues(opportunity(EXPIRATION))
    assert.deepEqual(result.otherIssues, [])
    assert.equal(result.success, true)
  })

  // DEV-89: o campo é marcado como obrigatório (*) no formulário; ao criar,
  // editar ou publicar, a ausência bloqueia o envio com erro no próprio campo.
  test('rejeita oportunidade sem data limite de execução, no campo de execução', () => {
    const result = fullFormSchema.safeParse(opportunity(undefined))
    assert.equal(result.success, false)
    const issues = result.success ? [] : result.error.issues
    assert.deepEqual(
      issues.map(issue => ({ path: issue.path, message: issue.message })),
      [
        {
          path: ['service_execution_deadline'],
          message: SERVICE_EXECUTION_DEADLINE_REQUIRED_MESSAGE,
        },
      ]
    )
  })

  test('aponta o erro das datas mesmo com outros campos ainda inválidos', () => {
    const result = deadlineIssues({
      ...opportunity('2026-11-20T18:00:00-03:00'),
      title: '',
      cover_image: '',
    })
    assert.equal(result.success, false)
    assert.deepEqual(result.paths, [['service_execution_deadline']])
  })
})

describe('draftFormSchema (salvar rascunho)', () => {
  test('rejeita data limite de execução anterior ao prazo de expiração', () => {
    const result = deadlineIssues(
      {
        opportunity_expiration_date: at(EXPIRATION),
        service_execution_deadline: at('2026-11-20T18:00:00-03:00'),
      },
      draftFormSchema
    )
    assert.equal(result.success, false)
    assert.deepEqual(result.otherIssues, [])
    assert.deepEqual(result.paths, [['service_execution_deadline']])
  })

  test('aceita rascunho com datas coerentes ou sem prazo de expiração', () => {
    for (const draft of [
      {
        opportunity_expiration_date: at(EXPIRATION),
        service_execution_deadline: at(EXPIRATION),
      },
      { service_execution_deadline: at('2026-11-20T18:00:00-03:00') },
      // DEV-89: no rascunho a data limite de execução segue opcional
      { opportunity_expiration_date: at(EXPIRATION) },
      {},
    ]) {
      const result = deadlineIssues(draft, draftFormSchema)
      assert.deepEqual(result.otherIssues, [])
      assert.equal(result.success, true)
    }
  })
})
