import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseMarkdownToHtml } from '../markdown-serializer.ts'

describe('parseMarkdownToHtml links', () => {
  test('mantém link https', () => {
    const html = parseMarkdownToHtml('[site](https://pref.rio/servicos)')

    assert.ok(html.includes('<a href="https://pref.rio/servicos">site</a>'))
  })

  test('escapa caracteres do href', () => {
    const html = parseMarkdownToHtml('[site](https://pref.rio/busca?a=1&b=2)')

    assert.ok(
      html.includes('<a href="https://pref.rio/busca?a=1&amp;b=2">site</a>')
    )
  })

  test('mantém mailto, tel, caminho relativo e âncora', () => {
    assert.ok(
      parseMarkdownToHtml('[e](mailto:a@pref.rio)').includes(
        'href="mailto:a@pref.rio"'
      )
    )
    assert.ok(
      parseMarkdownToHtml('[t](tel:+5521999999999)').includes(
        'href="tel:+5521999999999"'
      )
    )
    assert.ok(
      parseMarkdownToHtml('[p](/servicos/cursos)').includes(
        'href="/servicos/cursos"'
      )
    )
    assert.ok(parseMarkdownToHtml('[a](#secao)').includes('href="#secao"'))
  })

  test('não emite href javascript:', () => {
    const html = parseMarkdownToHtml('[x](javascript:alert(1))')

    assert.equal(html.includes('javascript:'), false)
    assert.equal(html.includes('<a '), false)
    assert.ok(html.includes('x'))
  })

  test('não emite href data:', () => {
    const html = parseMarkdownToHtml('[x](data:text/html,hi)')

    assert.equal(html.includes('data:'), false)
    assert.equal(html.includes('<a '), false)
    assert.ok(html.includes('x'))
  })

  test('não emite href que quebra o atributo', () => {
    const html = parseMarkdownToHtml('[x](https://ok.com" onclick="alert(1))')

    assert.equal(html.includes('onclick'), false)
    assert.equal(html.includes('<a '), false)
    assert.ok(html.includes('x'))
  })

  test('não emite href protocol-relative', () => {
    const html = parseMarkdownToHtml('[x](//evil.example/phish)')

    assert.equal(html.includes('evil.example'), false)
    assert.equal(html.includes('<a '), false)
  })
})
