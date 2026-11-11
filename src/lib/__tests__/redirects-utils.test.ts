import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'

const SRC_ROOT = new URL('../../', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = new URL(`${specifier.slice(2)}.ts`, SRC_ROOT)
      return nextResolve(target.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const {
  CSV_TEMPLATE_HEADER,
  PREFIX_ROOT_ERROR_MESSAGE,
  createRedirectFormSchema,
  describeEventChanges,
  formatEventAction,
  generateCsvTemplate,
  isRedirectFormField,
  isValidPrefRioDestination,
  maskCpf,
  redirectFormSchema,
} = await import(
  '../../app/(private)/(app)/redirecionamentos/lib/redirects-utils.ts'
)
const {
  API_ROUTE_PERMISSIONS,
  findApiRoutePermission,
  hasApiRouteAccess,
  hasRouteAccess,
} = await import('../route-permissions.ts')

describe('redirectFormSchema (DEV-484)', () => {
  test('Given a valid exact redirect rule When parsed Then succeeds', () => {
    const result = redirectFormSchema.safeParse({
      host: 'www.1746.rio',
      path: '/hc/pt-br/p/ouvidoria',
      match_type: 'exact',
      destination: 'https://pref.rio/ouvidoria',
      status_code: 302,
      enabled: true,
      notes: 'Ouvidoria',
    })
    assert.equal(result.success, true)
  })

  test('Given exact match on root path and https://pref.rio destination When parsed Then succeeds', () => {
    const result = redirectFormSchema.safeParse({
      host: 'carioca.rio',
      path: '/',
      match_type: 'exact',
      destination: 'https://pref.rio',
      status_code: 301,
      enabled: true,
    })
    assert.equal(result.success, true)
  })

  test('Given prefix match on root path "/" When parsed Then fails with exact message on path', () => {
    for (const rootPath of ['/', '///', ' / ']) {
      const result = redirectFormSchema.safeParse({
        host: 'www.1746.rio',
        path: rootPath,
        match_type: 'prefix',
        destination: 'https://pref.rio/servicos',
        status_code: 302,
        enabled: true,
      })
      assert.equal(result.success, false)
      const pathIssue = result.error.issues.find(
        issue => issue.path.join('.') === 'path'
      )
      assert.ok(pathIssue)
      assert.equal(pathIssue.message, PREFIX_ROOT_ERROR_MESSAGE)
    }
  })

  test('Given path without leading slash When parsed Then fails on path', () => {
    const result = redirectFormSchema.safeParse({
      host: 'www.1746.rio',
      path: 'hc/pt-br/p/ouvidoria',
      match_type: 'exact',
      destination: 'https://pref.rio/ouvidoria',
      status_code: 302,
      enabled: true,
    })
    assert.equal(result.success, false)
    const pathIssue = result.error.issues.find(
      issue => issue.path.join('.') === 'path'
    )
    assert.equal(pathIssue?.message, 'O caminho deve começar com /.')
  })

  test('Given invalid destination URL When parsed Then fails on destination', () => {
    for (const badDest of [
      'http://pref.rio/ouvidoria',
      'https://1746.rio/ouvidoria',
      'https://pref.rio.evil.com/ouvidoria',
      'pref.rio/ouvidoria',
    ]) {
      assert.equal(isValidPrefRioDestination(badDest), false, badDest)
      const result = redirectFormSchema.safeParse({
        host: 'www.1746.rio',
        path: '/ouvidoria',
        match_type: 'exact',
        destination: badDest,
        status_code: 302,
        enabled: true,
      })
      assert.equal(result.success, false, badDest)
    }
  })

  test('Given canonicalHosts list When host is not canonical Then fails on host', () => {
    const schema = createRedirectFormSchema(['www.1746.rio', 'carioca.rio'])
    const invalid = schema.safeParse({
      host: '1746.rio',
      path: '/ouvidoria',
      match_type: 'exact',
      destination: 'https://pref.rio/ouvidoria',
      status_code: 302,
      enabled: true,
    })
    assert.equal(invalid.success, false)
    assert.equal(
      invalid.error.issues.find(i => i.path.join('.') === 'host')?.message,
      'Selecione um host canônico válido.'
    )
  })

  test('Given field names When checked with isRedirectFormField Then identifies form fields', () => {
    assert.equal(isRedirectFormField('path'), true)
    assert.equal(isRedirectFormField('destination'), true)
    assert.equal(isRedirectFormField('unknown_field'), false)
    assert.equal(isRedirectFormField(undefined), false)
  })
})

describe('generateCsvTemplate (DEV-484)', () => {
  test('Given CSV template generator When called Then returns header and valid example row', () => {
    const csv = generateCsvTemplate()
    const lines = csv.trim().split('\n')
    assert.equal(lines.length, 2)
    assert.equal(
      lines[0],
      'host,path,match_type,destination,status_code,enabled,notes'
    )
    assert.equal(lines[0], CSV_TEMPLATE_HEADER)

    const cols = lines[1].split(',')
    assert.equal(cols.length, 7)
    const parsed = redirectFormSchema.safeParse({
      host: cols[0],
      path: cols[1],
      match_type: cols[2],
      destination: cols[3],
      status_code: Number(cols[4]),
      enabled: cols[5] === 'true',
      notes: cols[6],
    })
    assert.equal(parsed.success, true)
  })
})

describe('maskCpf (DEV-484)', () => {
  test('Given 11-digit CPF When masked Then formats as ***.456.789-**', () => {
    assert.equal(maskCpf('12345678901'), '***.456.789-**')
    assert.equal(maskCpf('123.456.789-01'), '***.456.789-**')
    assert.equal(maskCpf('00000000000'), '***.000.000-**')
  })

  test('Given empty or non-CPF input When masked Then handles safely', () => {
    assert.equal(maskCpf(''), '—')
    assert.equal(maskCpf(null), '—')
    assert.equal(maskCpf(undefined), '—')
    assert.equal(maskCpf('***.456.789-**'), '***.456.789-**')
    assert.equal(maskCpf('sistema'), 'sistema')
  })
})

describe('describeEventChanges & formatEventAction (DEV-484)', () => {
  test('Given rule update event When described Then returns field transitions in PT-BR', () => {
    assert.equal(formatEventAction('status_change'), 'Mudança de status')
    assert.equal(formatEventAction('create'), 'Criação')
    const changes = describeEventChanges({
      action: 'update',
      before: {
        status_code: 302,
        destination: 'https://pref.rio/antigo',
        enabled: true,
      },
      after: {
        status_code: 301,
        destination: 'https://pref.rio/novo',
        enabled: false,
      },
    })
    assert.deepEqual(changes, [
      'Destino: https://pref.rio/antigo → https://pref.rio/novo',
      'Status: 302 · Temporário → 301 · Permanente',
      'Ativa: Sim → Não',
    ])
  })
})

describe('RBAC de Redirecionamentos (DEV-484)', () => {
  test('Given route and API permissions When checked Then only admin and superadmin are allowed', () => {
    assert.equal(hasRouteAccess('/redirecionamentos', ['admin']), true)
    assert.equal(hasRouteAccess('/redirecionamentos', ['superadmin']), true)
    assert.equal(hasRouteAccess('/redirecionamentos', ['go:admin']), false)
    assert.equal(
      hasRouteAccess('/redirecionamentos', ['busca:services:admin']),
      false
    )

    for (const apiPath of [
      '/api/redirecionamentos',
      '/api/redirecionamentos/42',
      '/api/redirecionamentos/42/eventos',
      '/api/redirecionamentos/status',
      '/api/redirecionamentos/importar',
      '/api/redirecionamentos/exportar',
      '/api/redirecionamentos/hosts',
      '/api/redirecionamentos/testar',
    ]) {
      const resolved = findApiRoutePermission(apiPath)
      assert.ok(resolved, apiPath)
      assert.equal(hasApiRouteAccess(resolved.permission, ['admin']), true)
      assert.equal(hasApiRouteAccess(resolved.permission, ['superadmin']), true)
      assert.equal(hasApiRouteAccess(resolved.permission, ['go:admin']), false)
    }
    assert.ok('/api/redirecionamentos' in API_ROUTE_PERMISSIONS)
  })
})
