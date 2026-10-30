import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-127: `request-changes`, DELETE e PUT de /api/courses/[course-id] servem
// tanto a curadoria da Casa Civil quanto ações do Editor, e a API de cursos não
// distingue os papéis nelas. Aqui os handlers reais são chamados com os papéis
// do Heimdall, o cookie de sessão, o client Orval de cursos e o `fetch` da API
// substituídos por stubs (curso e token sintéticos).

const SRC_ROOT = new URL('../../', import.meta.url)

type ApiCall = { method: string; courseId: number; body?: unknown }
type TestGlobals = typeof globalThis & {
  __dev127Roles?: string[] | undefined
  __dev127Cookies?: Record<string, string>
  __dev127CourseStatus?: string
  __dev127GetResponse?: { status: number; data: unknown } | undefined
  __dev127Calls?: ApiCall[]
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
          const value = globalThis.__dev127Cookies?.[name]
          return value === undefined ? undefined : { name, value }
        },
      }
    }
  `),
  'next/cache': moduleUrl(`
    export function revalidateTag() {}
  `),
  '@/lib/heimdall-user': moduleUrl(`
    export async function getCurrentUserRoles() {
      return globalThis.__dev127Roles
    }
  `),
  '@/http-gorio/courses/courses': moduleUrl(`
    export async function getApiV1CoursesCourseId(courseId) {
      globalThis.__dev127Calls.push({ method: 'GET', courseId })
      if (globalThis.__dev127GetResponse) return globalThis.__dev127GetResponse
      return {
        status: 200,
        data: {
          success: true,
          data: { id: courseId, status: globalThis.__dev127CourseStatus },
        },
      }
    }
    export async function putApiV1CoursesCourseId(courseId, body) {
      globalThis.__dev127Calls.push({ method: 'PUT', courseId, body })
      return { status: 200, data: { id: courseId, status: body.status } }
    }
    export async function deleteApiV1CoursesCourseId(courseId) {
      globalThis.__dev127Calls.push({ method: 'DELETE', courseId })
      return { status: 200, data: { success: true } }
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

process.env.COURSES_BASE_API_URL = 'https://cursos-api.test'

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit
) => {
  const url = String(input)
  const match = url.match(/\/api\/v1\/courses\/(\d+)\/request-changes$/)
  testGlobals.__dev127Calls?.push({
    method: `${init?.method ?? 'GET'} request-changes`,
    courseId: match ? Number(match[1]) : Number.NaN,
  })
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}) as typeof fetch

const { NextRequest } = await import('next/server')
const courseRoute = await import('../../app/api/courses/[course-id]/route.ts')
const requestChangesRoute = await import(
  '../../app/api/courses/[course-id]/request-changes/route.ts'
)
const { normalizeCourseStatus } = await import('../course-curation-guard.ts')

const COURSE_ID = '42'
const params = () => Promise.resolve({ 'course-id': COURSE_ID })

const EDITOR = ['go:cursos:editor']
const CURATION_ROLES = [
  ['go:cursos:casa_civil'],
  ['go:admin'],
  ['admin'],
  ['superadmin'],
]
const PUBLISHED_LIKE = [
  'published',
  'opened',
  'ABERTO',
  'scheduled',
  'accepting_enrollments',
  'in_progress',
  'finished',
]

function backendCalls(method: string): ApiCall[] {
  return (testGlobals.__dev127Calls ?? []).filter(c => c.method === method)
}

async function json(response: Response) {
  return { status: response.status, data: await response.json() }
}

async function requestChanges(roles: string[] | undefined, status: string) {
  testGlobals.__dev127Roles = roles
  testGlobals.__dev127CourseStatus = status
  const request = new NextRequest(
    `https://admin.test/api/courses/${COURSE_ID}/request-changes`,
    { method: 'PUT' }
  )
  return json(await requestChangesRoute.PUT(request, { params: params() }))
}

async function deleteCourse(roles: string[] | undefined, status: string) {
  testGlobals.__dev127Roles = roles
  testGlobals.__dev127CourseStatus = status
  const request = new NextRequest(
    `https://admin.test/api/courses/${COURSE_ID}`,
    { method: 'DELETE' }
  )
  return json(await courseRoute.DELETE(request, { params: params() }))
}

async function updateCourse(
  roles: string[] | undefined,
  currentStatus: string,
  body: Record<string, unknown>
) {
  testGlobals.__dev127Roles = roles
  testGlobals.__dev127CourseStatus = currentStatus
  const request = new NextRequest(
    `https://admin.test/api/courses/${COURSE_ID}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return json(await courseRoute.PUT(request, { params: params() }))
}

beforeEach(() => {
  testGlobals.__dev127Cookies = { access_token: 'token-sintetico' }
  testGlobals.__dev127Calls = []
  testGlobals.__dev127GetResponse = undefined
})

describe('PUT /api/courses/[id]/request-changes (DEV-127)', () => {
  test('Editor não devolve curso em revisão (403, nada chega à API)', async () => {
    for (const status of ['in_review', 'approved']) {
      testGlobals.__dev127Calls = []
      const { status: code, data } = await requestChanges(EDITOR, status)
      assert.equal(code, 403, `status=${status}`)
      assert.equal(data.success, false)
      assert.deepEqual(backendCalls('PUT request-changes'), [])
    }
  })

  test('Casa Civil e admins devolvem curso em revisão', async () => {
    for (const roles of CURATION_ROLES) {
      testGlobals.__dev127Calls = []
      const { status } = await requestChanges(roles, 'in_review')
      assert.equal(status, 200, `roles=${roles}`)
      assert.equal(backendCalls('PUT request-changes').length, 1)
      assert.deepEqual(backendCalls('GET'), [], 'curadoria não lê o curso')
    }
  })

  test('Editor segue propondo edição de curso publicado e encerrado', async () => {
    for (const status of PUBLISHED_LIKE) {
      testGlobals.__dev127Calls = []
      const { status: code } = await requestChanges(EDITOR, status)
      assert.equal(code, 200, `status=${status}`)
      assert.deepEqual(backendCalls('PUT request-changes'), [
        { method: 'PUT request-changes', courseId: 42 },
      ])
    }
  })
})

describe('DELETE /api/courses/[id] (DEV-127)', () => {
  test('Editor não conclui exclusão de curso pending_deletion (403)', async () => {
    const { status, data } = await deleteCourse(EDITOR, 'pending_deletion')
    assert.equal(status, 403)
    assert.equal(data.success, false)
    assert.deepEqual(backendCalls('DELETE'), [])
  })

  test('Editor não exclui curso fora de rascunho (403)', async () => {
    for (const status of [
      'published',
      'in_review',
      'needs_changes',
      'closed',
    ]) {
      testGlobals.__dev127Calls = []
      const { status: code } = await deleteCourse(EDITOR, status)
      assert.equal(code, 403, `status=${status}`)
      assert.deepEqual(backendCalls('DELETE'), [])
    }
  })

  test('Casa Civil e admins concluem a exclusão', async () => {
    for (const roles of CURATION_ROLES) {
      testGlobals.__dev127Calls = []
      const { status } = await deleteCourse(roles, 'pending_deletion')
      assert.equal(status, 200, `roles=${roles}`)
      assert.equal(backendCalls('DELETE').length, 1)
      assert.deepEqual(backendCalls('GET'), [])
    }
  })

  test('Editor segue excluindo rascunho (draft e o legado CRIADO)', async () => {
    for (const status of ['draft', 'CRIADO']) {
      testGlobals.__dev127Calls = []
      const { status: code } = await deleteCourse(EDITOR, status)
      assert.equal(code, 200, `status=${status}`)
      assert.equal(backendCalls('DELETE').length, 1)
    }
  })
})

describe('PUT /api/courses/[id] com status no corpo (DEV-127)', () => {
  test('Editor não publica, reabre nem muda status pelo PUT (403)', async () => {
    const cases: Array<[string, string]> = [
      ['draft', 'opened'],
      ['draft', 'published'],
      ['in_review', 'opened'],
      ['in_review', 'needs_changes'],
      ['needs_changes', 'published'],
      ['pending_deletion', 'draft'],
      ['closed', 'opened'],
      ['canceled', 'opened'],
      ['published', 'canceled'],
      ['published', 'closed'],
      ['ENCERRADO', 'published'],
    ]
    for (const [current, requested] of cases) {
      testGlobals.__dev127Calls = []
      const { status, data } = await updateCourse(EDITOR, current, {
        title: 'Curso sintético',
        status: requested,
      })
      assert.equal(status, 403, `${current} -> ${requested}`)
      assert.equal(data.success, false)
      assert.deepEqual(backendCalls('PUT'), [], `${current} -> ${requested}`)
    }
  })

  test('Editor não manda status que não é texto (403)', async () => {
    for (const requested of [null, 1, ['opened'], { value: 'opened' }]) {
      testGlobals.__dev127Calls = []
      const { status } = await updateCourse(EDITOR, 'draft', {
        status: requested,
      })
      assert.equal(status, 403, JSON.stringify(requested))
      assert.deepEqual(backendCalls('PUT'), [])
    }
  })

  test('Editor não escapa com outra caixa da chave status (403)', async () => {
    // O encoding/json do Go casa `Status`, `STATUS` e `ſtatus` (U+017F) com o
    // campo `status`, e com chave repetida vale a última.
    const bodies: Array<Record<string, unknown>> = [
      { Status: 'opened' },
      { STATUS: 'opened' },
      { ſtatus: 'opened' },
      { sTaTuS: 'published' },
      { status: 'draft', Status: 'opened' },
    ]
    for (const body of bodies) {
      testGlobals.__dev127Calls = []
      const { status } = await updateCourse(EDITOR, 'draft', {
        title: 'Curso sintético',
        ...body,
      })
      assert.equal(status, 403, JSON.stringify(body))
      assert.deepEqual(backendCalls('PUT'), [], JSON.stringify(body))
    }
  })

  test('Casa Civil publica pelo PUT (status opened)', async () => {
    for (const roles of CURATION_ROLES) {
      testGlobals.__dev127Calls = []
      const { status } = await updateCourse(roles, 'draft', {
        title: 'Curso sintético',
        status: 'opened',
      })
      assert.equal(status, 200, `roles=${roles}`)
      assert.equal(backendCalls('PUT')[0]?.body?.status, 'opened')
      assert.deepEqual(backendCalls('GET'), [])
    }
  })

  test('Editor segue salvando sem mudar o status', async () => {
    const cases: Array<[string, string]> = [
      ['draft', 'draft'],
      ['needs_changes', 'needs_changes'],
      ['finished', 'published'],
      ['in_progress', 'published'],
      ['accepting_enrollments', 'accepting_enrollments'],
      ['CRIADO', 'draft'],
    ]
    for (const [current, requested] of cases) {
      testGlobals.__dev127Calls = []
      const { status } = await updateCourse(EDITOR, current, {
        title: 'Curso sintético',
        status: requested,
      })
      assert.equal(status, 200, `${current} -> ${requested}`)
      assert.equal(backendCalls('PUT')[0]?.body?.status, requested)
    }
  })

  test('PUT sem status no corpo não lê o curso', async () => {
    const { status } = await updateCourse(EDITOR, 'in_review', {
      title: 'Curso sintético',
    })
    assert.equal(status, 200)
    assert.deepEqual(backendCalls('GET'), [])
    assert.equal(backendCalls('PUT').length, 1)
  })
})

describe('falha fechada ao ler o curso (DEV-127)', () => {
  test('curso inexistente devolve o 404 da API sem chamar a ação', async () => {
    testGlobals.__dev127GetResponse = {
      status: 404,
      data: { error: 'Curso não encontrado' },
    }
    const del = await deleteCourse(EDITOR, 'draft')
    assert.equal(del.status, 404)
    assert.match(String(del.data.error), /Curso não encontrado/)
    const changes = await requestChanges(EDITOR, 'published')
    assert.equal(changes.status, 404)
    const put = await updateCourse(EDITOR, 'draft', { status: 'draft' })
    assert.equal(put.status, 404)
    assert.deepEqual(backendCalls('DELETE'), [])
    assert.deepEqual(backendCalls('PUT'), [])
    assert.deepEqual(backendCalls('PUT request-changes'), [])
  })

  test('API de cursos fora (5xx) vira 502 e recusa', async () => {
    testGlobals.__dev127GetResponse = { status: 503, data: 'indisponível' }
    const { status } = await deleteCourse(EDITOR, 'draft')
    assert.equal(status, 502)
    assert.deepEqual(backendCalls('DELETE'), [])
  })

  test('resposta sem status do curso recusa (502)', async () => {
    testGlobals.__dev127GetResponse = {
      status: 200,
      data: { success: true, data: { id: 42 } },
    }
    const { status } = await requestChanges(EDITOR, 'published')
    assert.equal(status, 502)
    assert.deepEqual(backendCalls('PUT request-changes'), [])
  })

  test('sem papéis do Heimdall vale a regra do Editor', async () => {
    const { status } = await deleteCourse(undefined, 'pending_deletion')
    assert.equal(status, 403)
    assert.deepEqual(backendCalls('DELETE'), [])
  })
})

describe('normalizeCourseStatus espelha StatusCurso.Normalize do app-go-api', () => {
  test('status derivados e legados', () => {
    for (const status of PUBLISHED_LIKE) {
      assert.equal(normalizeCourseStatus(status), 'published', status)
    }
    assert.equal(normalizeCourseStatus('CRIADO'), 'draft')
    assert.equal(normalizeCourseStatus('ENCERRADO'), 'closed')
    for (const status of [
      'draft',
      'in_review',
      'needs_changes',
      'approved',
      'pending_deletion',
      'closed',
      'canceled',
    ]) {
      assert.equal(normalizeCourseStatus(status), status)
    }
  })
})
