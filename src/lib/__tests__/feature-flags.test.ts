import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-644: a Dashboard de Capacitações fica atrás da flag de runtime
// FEATURE_COURSES_DASHBOARD, lida só no servidor e segura por padrão (só o
// valor exato 'true' liga). Desligada, o menu esconde o item e a página e o
// BFF respondem 404 para todos os papéis.

registerSrcLoader()
const { isCoursesDashboardEnabled, getRuntimeFeatureFlags } = await import(
  '../feature-flags.ts'
)
const DASHBOARD_LAYOUT_URL = new URL(
  '../../app/(private)/(app)/gorio/courses/dashboard/layout.tsx',
  import.meta.url
)
const dashboardLayout = await import(DASHBOARD_LAYOUT_URL.href)
const dashboardRoute = readFileSync(
  new URL('../../app/api/courses/dashboard/route.ts', import.meta.url),
  'utf8'
)
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { FeatureFlagsProvider, useFeatureFlags } = await import(
  '../../contexts/feature-flags-context.tsx'
)

const ORIGINAL_FLAG = process.env.FEATURE_COURSES_DASHBOARD

function setFlag(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'FEATURE_COURSES_DASHBOARD')
  } else {
    process.env.FEATURE_COURSES_DASHBOARD = value
  }
}

afterEach(() => {
  setFlag(ORIGINAL_FLAG)
})

const OFF_VALUES = [
  undefined,
  '',
  'false',
  'FALSE',
  'TRUE',
  'True',
  '1',
  'yes',
  ' true',
  'true ',
]

describe('isCoursesDashboardEnabled (DEV-644)', () => {
  test('só o valor exato "true" liga', () => {
    setFlag('true')
    assert.equal(isCoursesDashboardEnabled(), true)
    assert.deepEqual(getRuntimeFeatureFlags(), { coursesDashboard: true })
  })

  test('ausente ou qualquer outro valor deixa desligado', () => {
    for (const value of OFF_VALUES) {
      setFlag(value)
      assert.equal(isCoursesDashboardEnabled(), false, JSON.stringify(value))
      assert.deepEqual(getRuntimeFeatureFlags(), { coursesDashboard: false })
    }
  })

  test('lê process.env a cada chamada (troca sem novo build)', () => {
    setFlag('true')
    assert.equal(isCoursesDashboardEnabled(), true)
    setFlag('false')
    assert.equal(isCoursesDashboardEnabled(), false)
  })
})

describe('página /gorio/courses/dashboard atrás da flag (DEV-644)', () => {
  function renderLayout(): unknown {
    return dashboardLayout.default({ children: 'conteúdo da dashboard' })
  }

  test('flag desligada: notFound() (404) para qualquer papel', () => {
    for (const value of OFF_VALUES) {
      setFlag(value)
      assert.throws(
        renderLayout,
        (error: unknown) =>
          typeof error === 'object' &&
          error !== null &&
          'digest' in error &&
          error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404',
        JSON.stringify(value)
      )
    }
  })

  test('flag ligada: renderiza a página', () => {
    setFlag('true')
    assert.equal(renderLayout(), 'conteúdo da dashboard')
  })

  test('página e BFF são dinâmicos: a flag nunca é congelada no build', () => {
    assert.equal(dashboardLayout.dynamic, 'force-dynamic')
    assert.match(dashboardRoute, /export const dynamic = 'force-dynamic'/)
  })
})

describe('flags no client (DEV-644)', () => {
  function Consumer() {
    return `coursesDashboard=${useFeatureFlags().coursesDashboard}`
  }

  test('fora do provider, tudo desligado', () => {
    assert.equal(
      renderToStaticMarkup(createElement(Consumer)),
      'coursesDashboard=false'
    )
  })

  test('o provider repassa o valor vindo do servidor', () => {
    assert.equal(
      renderToStaticMarkup(
        createElement(
          FeatureFlagsProvider,
          { flags: { coursesDashboard: true } },
          createElement(Consumer)
        )
      ),
      'coursesDashboard=true'
    )
  })

  test('nenhum componente client lê FEATURE_* nem importa o módulo das flags', () => {
    const srcDir = fileURLToPath(new URL('../../', import.meta.url))
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
          if (entry !== '__tests__') walk(path)
          continue
        }
        if (!/\.tsx?$/.test(entry)) continue
        const source = readFileSync(path, 'utf8')
        if (!/^\s*['"]use client['"]/.test(source)) continue
        if (
          /process\.env\.FEATURE_/.test(source) ||
          /import\s+\{[^}]*\}\s+from\s+['"]@\/lib\/feature-flags['"]/.test(
            source
          )
        ) {
          offenders.push(path.slice(srcDir.length))
        }
      }
    }
    walk(srcDir)
    assert.deepEqual(offenders, [])
  })
})
