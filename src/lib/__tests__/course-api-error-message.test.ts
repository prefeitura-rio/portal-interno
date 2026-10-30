import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

// DEV-94: quando a API de cursos recusa a exclusão de um curso ou rascunho, o
// BFF repassa a mensagem dela, e o toast do portal mostra a causa em vez de só
// "Failed to delete course from external API".

const { courseApiErrorMessage, extractCourseApiErrorMessage } = await import(
  '../course-api-error-message.ts'
)

const FALLBACK = 'Failed to delete course from external API'

describe('extractCourseApiErrorMessage', () => {
  test('lê o campo error do app-go-api', () => {
    assert.equal(
      extractCourseApiErrorMessage({ error: 'Erro ao excluir curso' }),
      'Erro ao excluir curso'
    )
  })

  test('lê o campo message quando não há error', () => {
    assert.equal(
      extractCourseApiErrorMessage({ code: 403, message: 'Acesso negado' }),
      'Acesso negado'
    )
  })

  test('prefere error a message', () => {
    assert.equal(
      extractCourseApiErrorMessage({
        error: 'Curso não encontrado',
        message: 'x',
      }),
      'Curso não encontrado'
    )
  })

  test('aceita resposta em texto puro', () => {
    assert.equal(extractCourseApiErrorMessage('  forbidden \n'), 'forbidden')
  })

  test('ignora HTML, corpo vazio e campos que não são texto', () => {
    assert.equal(
      extractCourseApiErrorMessage('<html><body>502</body></html>'),
      undefined
    )
    assert.equal(extractCourseApiErrorMessage(''), undefined)
    assert.equal(extractCourseApiErrorMessage(null), undefined)
    assert.equal(extractCourseApiErrorMessage(undefined), undefined)
    assert.equal(extractCourseApiErrorMessage({ error: 42 }), undefined)
    assert.equal(extractCourseApiErrorMessage({ error: '   ' }), undefined)
  })

  test('limita mensagens longas', () => {
    const message = extractCourseApiErrorMessage({ error: 'a'.repeat(1000) })
    assert.ok(message)
    assert.equal(message.length, 300)
    assert.ok(message.endsWith('…'))
  })
})

describe('courseApiErrorMessage', () => {
  test('junta texto genérico, status e mensagem da API', () => {
    assert.equal(
      courseApiErrorMessage(FALLBACK, 500, { error: 'Erro ao excluir curso' }),
      `${FALLBACK} (HTTP 500): Erro ao excluir curso`
    )
  })

  test('sem mensagem da API, mantém o genérico com o status', () => {
    assert.equal(
      courseApiErrorMessage(FALLBACK, 502, '<html></html>'),
      `${FALLBACK} (HTTP 502)`
    )
  })
})

describe('BFF DELETE /api/courses/[course-id]', () => {
  const routeSource = readFileSync(
    new URL('../../app/api/courses/[course-id]/route.ts', import.meta.url),
    'utf8'
  )
  const deleteHandler = routeSource.slice(
    routeSource.indexOf('export async function DELETE')
  )

  test('repassa a mensagem e o status da API no campo error', () => {
    assert.match(
      deleteHandler,
      /error:\s*courseApiErrorMessage\(\s*'Failed to delete course from external API',\s*response\.status,\s*response\.data\s*\)/
    )
    assert.match(deleteHandler, /\{\s*status:\s*response\.status\s*\}/)
  })
})
