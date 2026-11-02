import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-152: "Publicar diretamente" (rascunho existente e curso novo) levava o
// curso a publicado sem a checagem de datas que `approve` e `publish` aplicam.
// Aqui os handlers reais são chamados com o cookie de sessão e o `fetch` da API
// de cursos substituídos por stubs (curso e token sintéticos).

const SRC_ROOT = new URL('../../', import.meta.url)

type ApiCall = { method: string; path: string }
type TestGlobals = typeof globalThis & {
  __dev152Cookies?: Record<string, string>
  __dev152Course?: unknown
  __dev152GetStatus?: number
  __dev152Calls?: ApiCall[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  'next/headers': moduleUrl(`
    export async function cookies() {
      return {
        get(name) {
          const value = globalThis.__dev152Cookies?.[name]
          return value === undefined ? undefined : { name, value }
        },
      }
    }
  `),
  'next/cache': moduleUrl(`
    export function revalidateTag() {}
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
    if (
      specifier.startsWith('.') &&
      !/\.[cm]?[jt]s$/.test(specifier) &&
      context.parentURL?.startsWith(SRC_ROOT.href)
    ) {
      for (const suffix of ['.ts', '/index.ts']) {
        const target = new URL(`${specifier}${suffix}`, context.parentURL)
        if (existsSync(fileURLToPath(target))) {
          return nextResolve(target.href, context)
        }
      }
    }
    return nextResolve(specifier, context)
  },
})

const API = 'https://cursos-api.test'
process.env.COURSES_BASE_API_URL = API

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit
) => {
  const url = new URL(String(input))
  const method = init?.method ?? 'GET'
  testGlobals.__dev152Calls?.push({ method, path: url.pathname })
  if (method === 'GET') {
    const status = testGlobals.__dev152GetStatus ?? 200
    if (status !== 200) return jsonResponse(status, { error: 'falhou' })
    return jsonResponse(200, {
      success: true,
      data: testGlobals.__dev152Course,
    })
  }
  if (method === 'POST' && url.pathname === '/api/v1/courses/draft') {
    return jsonResponse(201, { success: true, data: { id: 77 } })
  }
  return jsonResponse(200, { success: true, data: { id: 42 } })
}) as typeof fetch

const { NextRequest } = await import('next/server')
const publishDirectlyRoute = await import(
  '../../app/api/courses/[course-id]/publish-directly/route.ts'
)
const approveRoute = await import(
  '../../app/api/courses/[course-id]/approve/route.ts'
)
const publishRoute = await import(
  '../../app/api/courses/[course-id]/publish/route.ts'
)
const createAndPublishRoute = await import(
  '../../app/api/courses/publish-directly/route.ts'
)

const COURSE_ID = '42'
const params = () => Promise.resolve({ 'course-id': COURSE_ID })
const DATE_ERROR =
  'A data de início das aulas deve ser igual ou posterior ao início das inscrições.'

const ENROLLMENT_START = '2026-12-01T09:00:00-03:00'
const BEFORE_ENROLLMENT = '2026-11-20T09:00:00-03:00'
const AFTER_ENROLLMENT = '2026-12-10T09:00:00-03:00'

function presencialCourse(classStart: string) {
  return {
    id: 42,
    title: 'Curso sintético',
    orgao_id: 'org-sintetico',
    status: 'draft',
    enrollment_start_date: ENROLLMENT_START,
    locations: [
      {
        address: 'Rua Sintética, 1',
        schedules: [{ class_start_date: classStart }],
      },
    ],
  }
}

function onlineCourse(classStart: string) {
  return {
    id: 42,
    title: 'Curso sintético online',
    orgao_id: 'org-sintetico',
    status: 'draft',
    enrollment_start_date: ENROLLMENT_START,
    remote_class: [{ class_start_date: classStart }],
  }
}

function writeCalls(): ApiCall[] {
  return (testGlobals.__dev152Calls ?? []).filter(c => c.method !== 'GET')
}

async function json(response: Response) {
  return { status: response.status, data: await response.json() }
}

async function publishDirectly() {
  const request = new NextRequest(
    `https://admin.test/api/courses/${COURSE_ID}/publish-directly`,
    { method: 'PUT' }
  )
  return json(await publishDirectlyRoute.PUT(request, { params: params() }))
}

async function createAndPublish(body: unknown) {
  const request = new Request(
    'https://admin.test/api/courses/publish-directly',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return json(await createAndPublishRoute.POST(request))
}

beforeEach(() => {
  testGlobals.__dev152Cookies = { access_token: 'token-sintetico' }
  testGlobals.__dev152Calls = []
  testGlobals.__dev152Course = undefined
  testGlobals.__dev152GetStatus = 200
})

describe('PUT /api/courses/[id]/publish-directly (DEV-152)', () => {
  test('turma presencial com aulas antes das inscrições: 422 e nada muda na API', async () => {
    testGlobals.__dev152Course = presencialCourse(BEFORE_ENROLLMENT)
    const { status, data } = await publishDirectly()
    assert.equal(status, 422)
    assert.deepEqual(data, { error: DATE_ERROR, success: false })
    assert.deepEqual(writeCalls(), [])
  })

  test('turma online com aulas antes das inscrições: 422 e nada muda na API', async () => {
    testGlobals.__dev152Course = onlineCourse(BEFORE_ENROLLMENT)
    const { status } = await publishDirectly()
    assert.equal(status, 422)
    assert.deepEqual(writeCalls(), [])
  })

  test('datas consistentes: envia para revisão e aprova, como antes', async () => {
    testGlobals.__dev152Course = presencialCourse(AFTER_ENROLLMENT)
    const { status, data } = await publishDirectly()
    assert.equal(status, 200)
    assert.equal(data.success, true)
    assert.deepEqual(writeCalls(), [
      { method: 'PUT', path: `/api/v1/courses/${COURSE_ID}/send-to-review` },
      { method: 'PUT', path: `/api/v1/courses/${COURSE_ID}/approve` },
    ])
  })

  test('aulas no mesmo instante do início das inscrições não bloqueiam', async () => {
    testGlobals.__dev152Course = presencialCourse(ENROLLMENT_START)
    const { status } = await publishDirectly()
    assert.equal(status, 200)
  })

  test('GET do curso falhando não bloqueia, como em approve e publish', async () => {
    testGlobals.__dev152GetStatus = 500
    const { status } = await publishDirectly()
    assert.equal(status, 200)
    assert.equal(writeCalls().length, 2)
  })

  test('sem sessão: 401 sem chamar a API', async () => {
    testGlobals.__dev152Cookies = {}
    const { status } = await publishDirectly()
    assert.equal(status, 401)
    assert.deepEqual(testGlobals.__dev152Calls, [])
  })
})

describe('POST /api/courses/publish-directly, curso novo (DEV-152)', () => {
  test('turma com aulas antes das inscrições: 422 sem criar o rascunho', async () => {
    const { status, data } = await createAndPublish(
      presencialCourse(BEFORE_ENROLLMENT)
    )
    assert.equal(status, 422)
    assert.deepEqual(data, { error: DATE_ERROR, success: false })
    assert.deepEqual(testGlobals.__dev152Calls, [])
  })

  test('datas consistentes: cria, envia para revisão e aprova, como antes', async () => {
    const { status, data } = await createAndPublish(
      onlineCourse(AFTER_ENROLLMENT)
    )
    assert.equal(status, 200)
    assert.equal(data.courseId, 77)
    assert.deepEqual(writeCalls(), [
      { method: 'POST', path: '/api/v1/courses/draft' },
      { method: 'PUT', path: '/api/v1/courses/77/send-to-review' },
      { method: 'PUT', path: '/api/v1/courses/77/approve' },
    ])
  })
})

describe('approve e publish seguem com a mesma regra (DEV-152)', () => {
  for (const [name, route, action] of [
    ['approve', approveRoute, 'approve'],
    ['publish', publishRoute, 'publish'],
  ] as const) {
    test(`${name}: datas inconsistentes recusadas com 422`, async () => {
      testGlobals.__dev152Course = onlineCourse(BEFORE_ENROLLMENT)
      const request = new NextRequest(
        `https://admin.test/api/courses/${COURSE_ID}/${action}`,
        { method: 'PUT' }
      )
      const { status, data } = await json(
        await route.PUT(request, { params: params() })
      )
      assert.equal(status, 422)
      assert.equal(data.error, DATE_ERROR)
      assert.deepEqual(writeCalls(), [])
    })

    test(`${name}: datas consistentes seguem para a API`, async () => {
      testGlobals.__dev152Course = presencialCourse(AFTER_ENROLLMENT)
      const request = new NextRequest(
        `https://admin.test/api/courses/${COURSE_ID}/${action}`,
        { method: 'PUT' }
      )
      const { status } = await json(
        await route.PUT(request, { params: params() })
      )
      assert.equal(status, 200)
      assert.deepEqual(writeCalls(), [
        { method: 'PUT', path: `/api/v1/courses/${COURSE_ID}/${action}` },
      ])
    })
  }
})

describe('validateCourseDates (DEV-152)', () => {
  test('cobre presencial, remote_class em array e em objeto com schedules', async () => {
    const { validateCourseDates } = await import('../course-publish-dates.ts')
    assert.equal(
      validateCourseDates(presencialCourse(BEFORE_ENROLLMENT)),
      DATE_ERROR
    )
    assert.equal(
      validateCourseDates(onlineCourse(BEFORE_ENROLLMENT)),
      DATE_ERROR
    )
    assert.equal(
      validateCourseDates({
        enrollment_start_date: ENROLLMENT_START,
        remote_class: { schedules: [{ class_start_date: BEFORE_ENROLLMENT }] },
      }),
      DATE_ERROR
    )
    assert.equal(validateCourseDates(presencialCourse(AFTER_ENROLLMENT)), null)
    assert.equal(validateCourseDates(onlineCourse(ENROLLMENT_START)), null)
  })

  test('sem início das inscrições, datas inválidas ou formato inesperado: não bloqueia', async () => {
    const { validateCourseDates } = await import('../course-publish-dates.ts')
    assert.equal(validateCourseDates(undefined), null)
    assert.equal(validateCourseDates('curso'), null)
    assert.equal(
      validateCourseDates({
        remote_class: [{ class_start_date: BEFORE_ENROLLMENT }],
      }),
      null
    )
    assert.equal(
      validateCourseDates({
        enrollment_start_date: 'não é data',
        remote_class: [{ class_start_date: BEFORE_ENROLLMENT }],
      }),
      null
    )
    assert.equal(
      validateCourseDates({
        enrollment_start_date: ENROLLMENT_START,
        locations: 'não é lista',
        remote_class: [{ class_start_date: 'não é data' }, null],
      }),
      null
    )
  })
})
