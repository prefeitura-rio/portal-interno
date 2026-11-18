import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

// DEV-613: em Minha Conta, `go:cursos:editor` e `go:cursos:casa_civil`
// apareciam como o slug cru, com a descrição genérica "Função personalizada",
// porque o mapa de papéis da página não os trazia. O mapa passa a viver em
// `src/lib/account-role-info.ts`, com os dois papéis do módulo Cursos.

const { ROLE_INFO, getRoleInfo } = await import('../account-role-info.ts')

const FALLBACK_DESCRIPTION = 'Função personalizada'

const KNOWN_ROLES = [
  'admin',
  'superadmin',
  'go:admin',
  'go:cursos:casa_civil',
  'go:cursos:editor',
  'busca:services:admin',
  'busca:services:editor',
  'go:empregabilidade:admin',
  'go:empregabilidade:editor_sem_curadoria',
  'go:empregabilidade:editor_com_curadoria',
  'go:curriculos:admin',
  'go:curriculos:editor',
]

describe('getRoleInfo (Minha Conta)', () => {
  test('go:cursos:editor tem rótulo e descrição em português', () => {
    const info = getRoleInfo('go:cursos:editor')
    assert.equal(info.label, 'Editor Cursos')
    assert.notEqual(info.description, FALLBACK_DESCRIPTION)
    assert.match(info.description, /cursos/i)
  })

  test('go:cursos:casa_civil tem rótulo e descrição em português', () => {
    const info = getRoleInfo('go:cursos:casa_civil')
    assert.equal(info.label, 'Curadoria de Cursos (Casa Civil)')
    assert.notEqual(info.description, FALLBACK_DESCRIPTION)
    assert.match(info.description, /cursos/i)
  })

  test('todo papel do RBAC tem entrada própria, sem cair no fallback', () => {
    for (const role of KNOWN_ROLES) {
      const info = getRoleInfo(role)
      assert.notEqual(info.label, role, `rótulo cru para ${role}`)
      assert.notEqual(
        info.description,
        FALLBACK_DESCRIPTION,
        `descrição genérica para ${role}`
      )
      assert.ok(info.className.length > 0, `sem cor para ${role}`)
    }
    assert.deepEqual(Object.keys(ROLE_INFO).sort(), [...KNOWN_ROLES].sort())
  })

  test('papéis já existentes mantêm o rótulo anterior', () => {
    assert.equal(getRoleInfo('admin').label, 'Administrador')
    assert.equal(getRoleInfo('go:admin').label, 'Administrador GO Rio')
    assert.equal(
      getRoleInfo('go:empregabilidade:editor_com_curadoria').label,
      'Editor Emprego e Trabalho (com curadoria)'
    )
    assert.equal(
      getRoleInfo('go:curriculos:editor').label,
      'Editor Banco de Currículos'
    )
  })

  test('papel desconhecido continua no fallback com o próprio slug', () => {
    const info = getRoleInfo('go:outro:papel')
    assert.equal(info.label, 'go:outro:papel')
    assert.equal(info.description, FALLBACK_DESCRIPTION)
    assert.equal(info.variant, 'outline')
  })

  test('nome de propriedade herdada não vira papel conhecido', () => {
    for (const role of ['constructor', 'toString', '__proto__']) {
      const info = getRoleInfo(role)
      assert.equal(info.label, role)
      assert.equal(info.description, FALLBACK_DESCRIPTION)
    }
  })

  test('a página Minha Conta usa o mapa compartilhado', () => {
    const page = readFileSync(
      new URL('../../app/(private)/(app)/account/page.tsx', import.meta.url),
      'utf8'
    )
    assert.match(
      page,
      /import \{ getRoleInfo \} from '@\/lib\/account-role-info'/
    )
    assert.doesNotMatch(page, /function getRoleInfo\(/)
  })
})
