import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

// DEV-21: o BFF de candidaturas não pode mandar dados pessoais do cidadão
// (CPF, nome, e-mail, corpo da requisição ou resposta completa do backend)
// para os logs do container.

const routeSource = readFileSync(
  new URL('../route.ts', import.meta.url),
  'utf8'
)

/** Remove strings, template literals e comentários, mantendo só o código. */
function stripLiterals(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
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

const calls = consoleCallArguments(stripLiterals(routeSource))

describe('logs do BFF de candidaturas (DEV-21)', () => {
  test('encontra as chamadas console.* da rota', () => {
    assert.ok(calls.length > 0)
  })

  test('nenhum console.* loga o corpo da requisição', () => {
    for (const args of calls) {
      assert.doesNotMatch(args, /\bbody\b/, `console com body: ${args}`)
    }
  })

  test('nenhum console.* loga CPF, nome ou e-mail', () => {
    for (const args of calls) {
      assert.doesNotMatch(args, /cpf/i, `console com CPF: ${args}`)
      assert.doesNotMatch(args, /\bnome\b/i, `console com nome: ${args}`)
      assert.doesNotMatch(args, /e-?mail/i, `console com e-mail: ${args}`)
    }
  })

  test('nenhum console.* loga a resposta completa do backend', () => {
    for (const args of calls) {
      const fullData =
        /response\.data\b(?!\s*\?\.\s*(?:id|curriculo_snapshot)\b)/
      assert.doesNotMatch(args, fullData, `console com response.data: ${args}`)
    }
  })
})
