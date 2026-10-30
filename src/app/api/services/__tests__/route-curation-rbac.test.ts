import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-125: publicar, despublicar e devolver serviço para edição ficaram só
// para o admin de Serviços, mas o PUT /api/services/[id] e o POST
// /api/services repassavam `status` e `awaiting_approval` do corpo, então o
// Editor fazia o mesmo pela rota de edição. Aqui os handlers reais são
// chamados com os papéis do Heimdall e a API de busca substituídos por stubs.

const SRC_ROOT = new URL('../../../../', import.meta.url)

interface ServiceStub {
  status: number
  awaiting_approval: boolean
}

type TestGlobals = typeof globalThis & {
  __dev125Roles?: string[] | undefined
  __dev125Current?: ServiceStub | null
  __dev125Writes?: { method: string; body: Record<string, unknown> }[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  'next/cache': moduleUrl('export function revalidateTag() {}'),
  '@/lib/heimdall-user': moduleUrl(`
    export async function getCurrentUserRoles() {
      return globalThis.__dev125Roles
    }
  `),
  '@/http-busca-search/tombamentos/tombamentos': moduleUrl(`
    export async function getApiV1AdminTombamentos() {
      return { status: 200, data: { tombamentos: [] } }
    }
    export async function postApiV1AdminTombamentos(body) {
      globalThis.__dev125Writes.push({ method: 'POST_TOMBAMENTO', body })
      return { status: 201, data: { id: 'tombamento-sintetico', ...body } }
    }
  `),
  '@/http-busca-search/admin/admin': moduleUrl(`
    function service(fields) {
      return {
        id: 'servico-sintetico',
        nome_servico: 'Serviço sintético',
        resumo: 'Resumo',
        orgao_gestor: ['orgao'],
        ...fields,
      }
    }
    export function getGetApiV1AdminServicesUrl() {
      return 'https://busca.test/api/v1/admin/services'
    }
    export async function getApiV1AdminServices() {
      const current = globalThis.__dev125Current
      return {
        status: 200,
        data: { services: current ? [service(current)] : [] },
      }
    }
    export async function putApiV1AdminServicesId(id, body) {
      globalThis.__dev125Writes.push({ method: 'PUT', body })
      return { status: 200, data: service(body) }
    }
    export async function postApiV1AdminServices(body) {
      globalThis.__dev125Writes.push({ method: 'POST', body })
      return { status: 201, data: service(body) }
    }
    export async function deleteApiV1AdminServicesId() {
      globalThis.__dev125Writes.push({ method: 'DELETE', body: {} })
      return { status: 204 }
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

const { NextRequest } = await import('next/server')
const { PUT, DELETE } = await import('../[service-id]/route.ts')
const { POST } = await import('../route.ts')
const { PATCH: SEND_TO_APPROVAL } = await import(
  '../[service-id]/send-to-approval/route.ts'
)
const { POST: CREATE_TOMBAMENTO } = await import('../../tombamentos/route.ts')

const EDITOR = ['busca:services:editor']
const CURATORS = [
  ['busca:services:admin'],
  ['admin'],
  ['superadmin'],
  ['busca:services:editor', 'busca:services:admin'],
]

const IN_EDITION: ServiceStub = { status: 0, awaiting_approval: false }
const AWAITING_APPROVAL: ServiceStub = { status: 0, awaiting_approval: true }
const PUBLISHED: ServiceStub = { status: 1, awaiting_approval: false }

function serviceBody(fields: Record<string, unknown>): Record<string, unknown> {
  return {
    nome_servico: 'Serviço sintético',
    resumo: 'Resumo',
    orgao_gestor: ['orgao'],
    ...fields,
  }
}

async function update(
  roles: string[] | undefined,
  current: ServiceStub | null,
  body: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> }> {
  testGlobals.__dev125Roles = roles
  testGlobals.__dev125Current = current
  const request = new NextRequest(
    'https://admin.test/api/services/servico-sintetico',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  const response = await PUT(request, {
    params: Promise.resolve({ 'service-id': 'servico-sintetico' }),
  })
  return { status: response.status, data: await response.json() }
}

async function create(
  roles: string[] | undefined,
  body: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> }> {
  testGlobals.__dev125Roles = roles
  const request = new Request('https://admin.test/api/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await POST(request)
  return { status: response.status, data: await response.json() }
}

const SERVICE_PARAMS = {
  params: Promise.resolve({ 'service-id': 'servico-sintetico' }),
}

async function sendToApproval(
  roles: string[] | undefined,
  current: ServiceStub | null
): Promise<{ status: number; data: Record<string, unknown> }> {
  testGlobals.__dev125Roles = roles
  testGlobals.__dev125Current = current
  const request = new NextRequest(
    'https://admin.test/api/services/servico-sintetico/send-to-approval',
    { method: 'PATCH' }
  )
  const response = await SEND_TO_APPROVAL(request, SERVICE_PARAMS)
  return { status: response.status, data: await response.json() }
}

async function remove(
  roles: string[] | undefined
): Promise<{ status: number }> {
  testGlobals.__dev125Roles = roles
  testGlobals.__dev125Current = IN_EDITION
  const request = new NextRequest(
    'https://admin.test/api/services/servico-sintetico',
    { method: 'DELETE' }
  )
  const response = await DELETE(request, SERVICE_PARAMS)
  return { status: response.status }
}

beforeEach(() => {
  testGlobals.__dev125Writes = []
})

describe('PUT /api/services/[id]: curadoria só para o admin (DEV-125)', () => {
  test('Editor não publica pelo PUT (status 1): 403 e nada é gravado', async () => {
    for (const current of [IN_EDITION, AWAITING_APPROVAL]) {
      const { status, data } = await update(
        EDITOR,
        current,
        serviceBody({ status: 1, awaiting_approval: false })
      )
      assert.equal(status, 403)
      assert.equal(typeof data.error, 'string')
    }
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('Editor não despublica nem altera serviço publicado: 403', async () => {
    for (const body of [
      serviceBody({ status: 0, awaiting_approval: false }),
      serviceBody({}),
    ]) {
      const { status } = await update(EDITOR, PUBLISHED, body)
      assert.equal(status, 403)
    }
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('Editor não devolve para edição nem altera serviço em aprovação: 403', async () => {
    const { status } = await update(
      EDITOR,
      AWAITING_APPROVAL,
      serviceBody({ status: 0, awaiting_approval: false })
    )
    assert.equal(status, 403)
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('Sem papéis (Heimdall fora) vale a regra do Editor: 403', async () => {
    const { status } = await update(
      undefined,
      IN_EDITION,
      serviceBody({ status: 1 })
    )
    assert.equal(status, 403)
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('Editor segue salvando e enviando para aprovação serviço em edição', async () => {
    for (const body of [
      serviceBody({ status: 0 }),
      serviceBody({ status: 0, awaiting_approval: true }),
      serviceBody({}),
    ]) {
      const { status } = await update(EDITOR, IN_EDITION, body)
      assert.equal(status, 200)
    }
    assert.equal(testGlobals.__dev125Writes?.length, 3)
  })

  test('Editor recebe 404 para serviço inexistente, sem gravar', async () => {
    const { status } = await update(EDITOR, null, serviceBody({ status: 0 }))
    assert.equal(status, 404)
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('admin de Serviços, admin e superadmin publicam, despublicam e devolvem', async () => {
    for (const roles of CURATORS) {
      for (const [current, body] of [
        [IN_EDITION, serviceBody({ status: 1, awaiting_approval: false })],
        [PUBLISHED, serviceBody({ status: 0, awaiting_approval: false })],
        [
          AWAITING_APPROVAL,
          serviceBody({ status: 0, awaiting_approval: false }),
        ],
        [PUBLISHED, serviceBody({ status: 1 })],
      ] as const) {
        const { status } = await update(roles, current, body)
        assert.equal(status, 200, `${roles.join(',')} ${JSON.stringify(body)}`)
      }
    }
  })
})

describe('POST /api/services: criar publicado só para o admin (DEV-125)', () => {
  test('Editor não cria serviço publicado: 403 e nada é gravado', async () => {
    for (const roles of [EDITOR, undefined]) {
      const { status, data } = await create(roles, serviceBody({ status: 1 }))
      assert.equal(status, 403)
      assert.equal(typeof data.error, 'string')
    }
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('Editor segue criando rascunho, com ou sem envio para aprovação', async () => {
    for (const body of [
      serviceBody({}),
      serviceBody({ status: 0 }),
      serviceBody({ status: 0, awaiting_approval: true }),
    ]) {
      const { status } = await create(EDITOR, body)
      assert.equal(status, 200)
    }
    assert.equal(testGlobals.__dev125Writes?.length, 3)
  })

  test('admin de Serviços, admin e superadmin criam já publicado', async () => {
    for (const roles of CURATORS) {
      const { status } = await create(roles, serviceBody({ status: 1 }))
      assert.equal(status, 200, roles.join(','))
    }
  })
})

describe('PATCH /api/services/[id]/send-to-approval: só de serviço em edição (DEV-125)', () => {
  test('Editor não envia serviço publicado nem em aprovação: 403 e nada é gravado', async () => {
    for (const current of [PUBLISHED, AWAITING_APPROVAL]) {
      const { status, data } = await sendToApproval(EDITOR, current)
      assert.equal(status, 403)
      assert.equal(typeof data.error, 'string')
    }
    const { status } = await sendToApproval(undefined, PUBLISHED)
    assert.equal(status, 403)
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('Editor segue enviando serviço em edição para aprovação', async () => {
    const { status } = await sendToApproval(EDITOR, IN_EDITION)
    assert.equal(status, 200)
    assert.deepEqual(
      testGlobals.__dev125Writes?.map(write => [
        write.body.status,
        write.body.awaiting_approval,
      ]),
      [[0, true]]
    )
  })

  test('serviço inexistente: 404', async () => {
    const { status } = await sendToApproval(EDITOR, null)
    assert.equal(status, 404)
  })
})

describe('DELETE /api/services/[id]: só o admin de Serviços exclui (DEV-125)', () => {
  test('Editor e sem papéis recebem 403 e nada é excluído', async () => {
    for (const roles of [EDITOR, undefined]) {
      const { status } = await remove(roles)
      assert.equal(status, 403)
    }
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('admin de Serviços, admin e superadmin excluem', async () => {
    for (const roles of CURATORS) {
      const { status } = await remove(roles)
      assert.equal(status, 200, roles.join(','))
    }
    assert.equal(testGlobals.__dev125Writes?.length, CURATORS.length)
  })
})

describe('POST /api/tombamentos: só o admin de Serviços tomba (DEV-125)', () => {
  async function tombar(roles: string[] | undefined): Promise<number> {
    testGlobals.__dev125Roles = roles
    const request = new Request('https://admin.test/api/tombamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origem: '1746_v2_llm',
        id_servico_antigo: 'servico-antigo-sintetico',
        id_servico_novo: 'servico-sintetico',
      }),
    })
    const response = await CREATE_TOMBAMENTO(request)
    return response.status
  }

  test('Editor e sem papéis recebem 403 e nada é gravado', async () => {
    for (const roles of [EDITOR, undefined]) {
      assert.equal(await tombar(roles), 403)
    }
    assert.deepEqual(testGlobals.__dev125Writes, [])
  })

  test('admin de Serviços, admin e superadmin tombam', async () => {
    for (const roles of CURATORS) {
      assert.equal(await tombar(roles), 200, roles.join(','))
    }
    assert.equal(testGlobals.__dev125Writes?.length, CURATORS.length)
  })
})
