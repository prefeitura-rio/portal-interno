import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'

// DEV-71: no menu lateral, o título do grupo logo acima de "Capacitação" passou
// de "GO Rio" para "Oportunidades Cariocas". Só o rótulo muda: os itens, as
// rotas e os papéis do grupo continuam os mesmos.

const SRC_ROOT = new URL('../../', import.meta.url)

// Ícones do Lucide viram componentes vazios: o teste só olha a estrutura do menu
const LUCIDE_STUB = `data:text/javascript,${encodeURIComponent(
  [
    'Briefcase',
    'FileUser',
    'FolderKanban',
    'GraduationCap',
    'KeyRound',
    'LayoutGrid',
    'Settings',
    'Shield',
    'Signpost',
  ]
    .map(name => `export const ${name} = () => null;`)
    .join('\n')
)}`

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'lucide-react') {
      return { url: LUCIDE_STUB, shortCircuit: true }
    }
    if (specifier.startsWith('@/')) {
      const target = new URL(`${specifier.slice(2)}.ts`, SRC_ROOT)
      return nextResolve(target.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const { getMenuList, getFilteredMenuList } = await import('../menu-list.ts')

// DEV-644: o menu recebe as flags de runtime do servidor. Os testes de antes da
// flag descrevem o menu com a Dashboard de Capacitações ligada.
const FLAGS_ON = { coursesDashboard: true }
const FLAGS_OFF = { coursesDashboard: false }

function groupOf(menu: ReturnType<typeof getMenuList>, label: string) {
  return menu.find(group => group.menus.some(item => item.label === label))
}

describe('menu lateral: grupo de Capacitação (DEV-71)', () => {
  test('o título do grupo acima de "Capacitação" é "Oportunidades Cariocas"', () => {
    const group = groupOf(getMenuList('/', FLAGS_ON), 'Capacitação')
    assert.ok(group, 'grupo com o item Capacitação não encontrado')
    assert.equal(group.groupLabel, 'Oportunidades Cariocas')
  })

  test('nenhum grupo do menu se chama mais "GO Rio"', () => {
    const labels = getMenuList('/', FLAGS_ON).map(group => group.groupLabel)
    assert.ok(!labels.includes('GO Rio'))
  })

  test('os itens e as rotas do grupo continuam os mesmos', () => {
    const group = groupOf(getMenuList('/', FLAGS_ON), 'Capacitação')
    assert.ok(group)
    assert.deepEqual(
      group.menus.map(item => item.label),
      ['Capacitação', 'Emprego e trabalho', 'Banco de currículos']
    )
    const capacitacao = group.menus.find(item => item.label === 'Capacitação')
    // DEV-100 acrescentou o Dashboard de Capacitações no topo do submenu
    assert.deepEqual(
      capacitacao?.submenus?.map(item => ('href' in item ? item.href : null)),
      ['/gorio/courses/dashboard', '/gorio/courses', '/gorio/courses/new']
    )
  })

  test('os demais grupos mantêm os títulos', () => {
    const labels = getMenuList('/', FLAGS_ON).map(group => group.groupLabel)
    assert.deepEqual(labels, [
      '',
      'Oportunidades Cariocas',
      'Serviços municipais',
      'Acesso restrito',
      'Configurações',
    ])
  })

  test('o menu filtrado por papel mostra o rótulo novo a quem tem o módulo', () => {
    const filtered = getFilteredMenuList('/', ['go:admin'], FLAGS_ON)
    const group = groupOf(filtered, 'Capacitação')
    assert.equal(group?.groupLabel, 'Oportunidades Cariocas')
  })
})

describe('menu lateral: Dashboard de Capacitações (DEV-100)', () => {
  function capacitacaoSubmenus(roles: string[]) {
    const group = groupOf(
      getFilteredMenuList('/', roles, FLAGS_ON),
      'Capacitação'
    )
    const capacitacao = group?.menus.find(item => item.label === 'Capacitação')
    return (
      capacitacao?.submenus?.map(item => ('href' in item ? item.href : null)) ??
      []
    )
  }

  test('Casa Civil, admin e superadmin veem o Dashboard em Capacitação', () => {
    for (const role of ['go:cursos:casa_civil', 'admin', 'superadmin']) {
      assert.deepEqual(
        capacitacaoSubmenus([role]),
        ['/gorio/courses/dashboard', '/gorio/courses', '/gorio/courses/new'],
        role
      )
    }
  })

  test('go:admin e o editor de cursos não veem o Dashboard', () => {
    for (const role of ['go:admin', 'go:cursos:editor']) {
      assert.deepEqual(
        capacitacaoSubmenus([role]),
        ['/gorio/courses', '/gorio/courses/new'],
        role
      )
    }
  })

  test('o item do menu usa os mesmos papéis da rota', async () => {
    const { ROUTE_PERMISSIONS } = await import('../route-permissions.ts')
    const group = groupOf(getMenuList('/', FLAGS_ON), 'Capacitação')
    const capacitacao = group?.menus.find(item => item.label === 'Capacitação')
    const dashboard = capacitacao?.submenus?.find(
      item => 'href' in item && item.href === '/gorio/courses/dashboard'
    )
    assert.ok(dashboard && 'href' in dashboard)
    assert.equal(dashboard.label, 'Dashboard')
    assert.deepEqual(
      dashboard.allowedRoles,
      ROUTE_PERMISSIONS['/gorio/courses/dashboard']
    )
  })
})

describe('menu lateral: flag de runtime da Dashboard de Capacitações (DEV-644)', () => {
  function capacitacaoHrefs(
    roles: string[],
    flags: { coursesDashboard: boolean }
  ) {
    const group = groupOf(getFilteredMenuList('/', roles, flags), 'Capacitação')
    const capacitacao = group?.menus.find(item => item.label === 'Capacitação')
    return (
      capacitacao?.submenus?.map(item => ('href' in item ? item.href : null)) ??
      []
    )
  }

  test('flag desligada: nenhum papel vê o Dashboard, nem os admins', () => {
    for (const role of [
      'go:cursos:casa_civil',
      'admin',
      'superadmin',
      'go:admin',
      'go:cursos:editor',
    ]) {
      assert.deepEqual(
        capacitacaoHrefs([role], FLAGS_OFF),
        ['/gorio/courses', '/gorio/courses/new'],
        role
      )
    }
  })

  test('flag desligada: o menu completo não tem o item da Dashboard', () => {
    const group = groupOf(getMenuList('/', FLAGS_OFF), 'Capacitação')
    const capacitacao = group?.menus.find(item => item.label === 'Capacitação')
    assert.deepEqual(
      capacitacao?.submenus?.map(item => ('href' in item ? item.href : null)),
      ['/gorio/courses', '/gorio/courses/new']
    )
  })

  test('flag desligada: o resto do menu fica igual ao da flag ligada', () => {
    const withoutDashboard = (flags: { coursesDashboard: boolean }) =>
      JSON.stringify(
        getFilteredMenuList('/', ['admin'], flags).map(group => ({
          ...group,
          menus: group.menus.map(menu => ({
            ...menu,
            icon: null,
            submenus: menu.submenus?.filter(
              item =>
                !('href' in item) || item.href !== '/gorio/courses/dashboard'
            ),
          })),
        }))
      )
    assert.equal(withoutDashboard(FLAGS_OFF), withoutDashboard(FLAGS_ON))
  })

  test('flag ligada: o Dashboard volta só para os papéis da rota', () => {
    assert.deepEqual(capacitacaoHrefs(['go:cursos:casa_civil'], FLAGS_ON), [
      '/gorio/courses/dashboard',
      '/gorio/courses',
      '/gorio/courses/new',
    ])
    assert.deepEqual(capacitacaoHrefs(['go:cursos:editor'], FLAGS_ON), [
      '/gorio/courses',
      '/gorio/courses/new',
    ])
  })
})
