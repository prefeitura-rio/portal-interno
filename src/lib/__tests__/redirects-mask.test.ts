import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

const { maskRedirectsPayload } = await import('../redirects-mask.ts')

describe('maskRedirectsPayload (DEV-484)', () => {
  test('Given nested rule When masked Then created_by/updated_by are masked', () => {
    const out = maskRedirectsPayload({
      rules: [
        { id: 1, created_by: '12345678901', updated_by: '123.456.789-01' },
      ],
      rule: { updated_by: '98765432100', host: 'a' },
    })
    assert.deepEqual(out, {
      rules: [
        { id: 1, created_by: '***.456.789-**', updated_by: '***.456.789-**' },
      ],
      rule: { updated_by: '***.654.321-**', host: 'a' },
    })
  })

  test('Given events array When masked Then actor and before/after updated_by are masked', () => {
    const out = maskRedirectsPayload([
      {
        actor: '12345678901',
        before: { updated_by: '11122233344' },
        after: { created_by: '55566677788', updated_by: '55566677788' },
      },
    ])
    assert.deepEqual(out, [
      {
        actor: '***.456.789-**',
        before: { updated_by: '***.222.333-**' },
        after: { created_by: '***.666.777-**', updated_by: '***.666.777-**' },
      },
    ])
  })

  test('Given null/empty values When masked Then untouched', () => {
    const input = { actor: null, created_by: '', updated_by: undefined, n: 3 }
    assert.deepEqual(maskRedirectsPayload(input), input)
  })

  test('Given already masked or non-CPF string When masked Then unchanged and idempotent', () => {
    const input = { actor: '***.456.789-**', updated_by: 'sistema' }
    assert.deepEqual(maskRedirectsPayload(input), input)
    const once = maskRedirectsPayload({ actor: '12345678901' })
    assert.deepEqual(maskRedirectsPayload(once), once)
  })

  test('Given other keys with CPF-like values When masked Then untouched', () => {
    const input = { notes: '12345678901' }
    assert.deepEqual(maskRedirectsPayload(input), input)
  })
})
