import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

// DEV-200: o primeiro item do breadcrumb das telas de Capacitação, MEI,
// Empregabilidade e Banco de currículos mostrava "GO Rio" (ou "Go Rio") fixo
// em cada página. O DEV-71 já tinha trocado o menu lateral; agora o
// breadcrumb também mostra "Oportunidades Cariocas", a partir de uma
// constante compartilhada. Separador e demais itens continuam os mesmos.

const { GORIO_MODULE_LABEL } = await import('../module-labels.ts')

const APP_ROOT = new URL('../../app/(private)/(app)/gorio/', import.meta.url)

const BREADCRUMB_PAGES = [
  'courses/page.tsx',
  'courses/new/page.tsx',
  'courses/course/[course-id]/page.tsx',
  'oportunidades-mei/page.tsx',
  'oportunidades-mei/new/page.tsx',
  'oportunidades-mei/oportunidade-mei/[oportunidade-mei-id]/page.tsx',
  'empregabilidade/[empregabilidade-id]/page.tsx',
  'banco-curriculos/page.tsx',
  'banco-curriculos/[cpf]/page.tsx',
]

function readPage(path: string): string {
  return readFileSync(new URL(path, APP_ROOT), 'utf8')
}

// Conteúdo do primeiro <BreadcrumbItem> de <BreadcrumbList>
function firstBreadcrumbItem(source: string): string | undefined {
  const list = source.split('<BreadcrumbList>')[1]
  return list?.match(/<BreadcrumbItem>([\s\S]*?)<\/BreadcrumbItem>/)?.[1]
}

describe('breadcrumb do módulo (DEV-200)', () => {
  test('o rótulo do módulo é "Oportunidades Cariocas"', () => {
    assert.equal(GORIO_MODULE_LABEL, 'Oportunidades Cariocas')
  })

  for (const page of BREADCRUMB_PAGES) {
    test(`${page}: o primeiro item usa o rótulo compartilhado`, () => {
      const source = readPage(page)
      assert.equal(firstBreadcrumbItem(source)?.trim(), '{GORIO_MODULE_LABEL}')
      assert.match(
        source,
        /import \{ GORIO_MODULE_LABEL \} from '@\/lib\/module-labels'/
      )
    })

    test(`${page}: não mostra mais "GO Rio" no breadcrumb`, () => {
      const list = readPage(page).split('<BreadcrumbList>')[1] ?? ''
      assert.doesNotMatch(list, />\s*GO Rio\s*</i)
    })

    test(`${page}: o separador continua depois do primeiro item`, () => {
      const list = readPage(page).split('<BreadcrumbList>')[1] ?? ''
      assert.match(
        list,
        /^\s*<BreadcrumbItem>\{GORIO_MODULE_LABEL\}<\/BreadcrumbItem>\s*<BreadcrumbSeparator \/>/
      )
    })
  }
})
