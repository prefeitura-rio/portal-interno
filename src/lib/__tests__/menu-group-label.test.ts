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

function groupOf(menu: ReturnType<typeof getMenuList>, label: string) {
  return menu.find(group => group.menus.some(item => item.label === label))
}

describe('menu lateral: grupo de Capacitação (DEV-71)', () => {
  test('o título do grupo acima de "Capacitação" é "Oportunidades Cariocas"', () => {
    const group = groupOf(getMenuList('/'), 'Capacitação')
    assert.ok(group, 'grupo com o item Capacitação não encontrado')
    assert.equal(group.groupLabel, 'Oportunidades Cariocas')
  })

  test('nenhum grupo do menu se chama mais "GO Rio"', () => {
    const labels = getMenuList('/').map(group => group.groupLabel)
    assert.ok(!labels.includes('GO Rio'))
  })

  test('os itens e as rotas do grupo continuam os mesmos', () => {
    const group = groupOf(getMenuList('/'), 'Capacitação')
    assert.ok(group)
    assert.deepEqual(
      group.menus.map(item => item.label),
      ['Capacitação', 'Emprego e trabalho', 'Banco de currículos']
    )
    const capacitacao = group.menus.find(item => item.label === 'Capacitação')
    assert.deepEqual(
      capacitacao?.submenus?.map(item => ('href' in item ? item.href : null)),
      ['/gorio/courses', '/gorio/courses/new']
    )
  })

  test('os demais grupos mantêm os títulos', () => {
    const labels = getMenuList('/').map(group => group.groupLabel)
    assert.deepEqual(labels, [
      '',
      'Oportunidades Cariocas',
      'Serviços municipais',
      'Acesso restrito',
      'Configurações',
    ])
  })

  test('o menu filtrado por papel mostra o rótulo novo a quem tem o módulo', () => {
    const filtered = getFilteredMenuList('/', ['go:admin'])
    const group = groupOf(filtered, 'Capacitação')
    assert.equal(group?.groupLabel, 'Oportunidades Cariocas')
  })
})
