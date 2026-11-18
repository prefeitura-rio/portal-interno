import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, describe, test } from 'node:test'

// DEV-644: o BFF da Dashboard de Capacitações fica atrás da flag de runtime
// FEATURE_COURSES_DASHBOARD. Desligada (ausente, 'false' ou qualquer valor
// diferente de 'true'), GET responde 404 sem chamar nenhuma API. O handler real
// é chamado com o consolidado e os clients substituídos por stubs.

const SRC_ROOT = new URL('../../../../../', import.meta.url)

type TestGlobals = typeof globalThis & { __dev644BuildCalls?: number }
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  '@/http-gorio/courses/courses': moduleUrl(
    'export async function getApiV1Courses() { throw new Error("não deveria ser chamado") }'
  ),
  '@/http-gorio/inscricoes/inscricoes': moduleUrl(
    'export async function getApiV1CoursesCourseIdEnrollments() { throw new Error("não deveria ser chamado") }'
  ),
  '@/http-rmi/departments/departments': moduleUrl(
    'export async function getDepartmentsCdUa() { throw new Error("não deveria ser chamado") }'
  ),
  '@/lib/department-names': moduleUrl(
    'export async function resolveDepartmentNames() { return new Map() }'
  ),
  '@/lib/courses-dashboard': moduleUrl(`
    export const DASHBOARD_PUBLISHED_STATUSES = ['opened']
    export async function buildCoursesDashboard() {
      globalThis.__dev644BuildCalls += 1
      return {
        ok: true,
        summary: { secretarias: [], totals: { publishedCourses: 0 } },
        enrollmentStats: { failed: 0, fromStale: 0, failures: {} },
      }
    }
  `),
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier]
    if (stub) {
      return { url: stub, shortCircuit: true }
    }
    if (specifier === 'next/server') {
      return nextResolve('next/server.js', context)
    }
    if (specifier.startsWith('@/')) {
      const target = new URL(`${specifier.slice(2)}.ts`, SRC_ROOT)
      return nextResolve(target.href, context)
    }
    return nextResolve(specifier, context)
  },
})

const { GET } = await import('../route.ts')

const ORIGINAL_FLAG = process.env.FEATURE_COURSES_DASHBOARD

function setFlag(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'FEATURE_COURSES_DASHBOARD')
  } else {
    process.env.FEATURE_COURSES_DASHBOARD = value
  }
}

beforeEach(() => {
  testGlobals.__dev644BuildCalls = 0
})

afterEach(() => {
  setFlag(ORIGINAL_FLAG)
})

describe('GET /api/courses/dashboard: flag de runtime (DEV-644)', () => {
  for (const value of [undefined, 'false', '', 'TRUE', '1', ' true']) {
    test(`flag ${JSON.stringify(value ?? null)}: 404 sem chamar a API`, async () => {
      setFlag(value)
      const response = await GET()
      assert.equal(response.status, 404)
      assert.deepEqual(await response.json(), {
        error: 'Not found',
        success: false,
      })
      assert.equal(testGlobals.__dev644BuildCalls, 0)
    })
  }

  test('flag "true": monta o consolidado como antes', async () => {
    setFlag('true')
    const response = await GET()
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.success, true)
    assert.equal(testGlobals.__dev644BuildCalls, 1)
  })

  test('a flag é lida a cada requisição, sem reimportar o módulo', async () => {
    setFlag('true')
    assert.equal((await GET()).status, 200)
    setFlag('false')
    assert.equal((await GET()).status, 404)
    setFlag('true')
    assert.equal((await GET()).status, 200)
  })
})
