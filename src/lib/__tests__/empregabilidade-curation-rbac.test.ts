import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-126: `DELETE`/`PUT /api/empregabilidade/vagas/[id]` e
// `PUT candidaturas/[id]/status`/`bulk-status` servem tanto ações que a UI
// esconde (excluir ou editar vaga publicada, pausada ou encerrada; aprovar
// candidatura) quanto ações que os editores fazem, e a regra por rota não
// distingue as duas. Aqui os handlers reais são chamados com os papéis do
// Heimdall e os clients Orval da empregabilidade substituídos por stubs
// (vagas, candidaturas e CPFs sintéticos).

const SRC_ROOT = new URL('../../', import.meta.url)

type ApiCall = { fn: string; id?: string; body?: unknown }
type TestGlobals = typeof globalThis & {
  __dev126Roles?: string[] | undefined
  __dev126VagaStatus?: string
  __dev126GetStatus?: number
  __dev126Calls?: ApiCall[]
}
const testGlobals = globalThis as TestGlobals

function moduleUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`
}

const STUBS: Record<string, string> = {
  'next/cache': moduleUrl('export function revalidateTag() {}'),
  '@/lib/heimdall-user': moduleUrl(`
    export async function getCurrentUserRoles() {
      return globalThis.__dev126Roles
    }
  `),
  '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas': moduleUrl(`
    function record(call) {
      globalThis.__dev126Calls.push(call)
    }
    export async function getApiV1EmpregabilidadeVagasId(id) {
      record({ fn: 'get', id })
      const status = globalThis.__dev126GetStatus ?? 200
      if (status !== 200) return { status, data: { error: 'falha' } }
      return {
        status: 200,
        data: {
          id,
          status: globalThis.__dev126VagaStatus,
          data_limite: new Date(Date.now() + 86400000).toISOString(),
        },
      }
    }
    export async function putApiV1EmpregabilidadeVagasIdSendToDraft(id) {
      record({ fn: 'send-to-draft', id })
      return { status: 200, data: { id, status: 'em_edicao' } }
    }
    export async function putApiV1EmpregabilidadeVagasIdSendToApproval(id) {
      record({ fn: 'send-to-approval', id })
      return { status: 200, data: { id, status: 'em_aprovacao' } }
    }
    export async function putApiV1EmpregabilidadeVagasId(id, body) {
      record({ fn: 'update', id, body })
      return { status: 200, data: { ...body, id } }
    }
    export async function deleteApiV1EmpregabilidadeVagasId(id) {
      record({ fn: 'delete', id })
      return { status: 200, data: {} }
    }
  `),
  '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas':
    moduleUrl(`
    export async function putApiV1EmpregabilidadeCandidaturasIdStatus(id, body) {
      globalThis.__dev126Calls.push({ fn: 'status', id, body })
      return { status: 200, data: { id, status: body.status } }
    }
    export async function putApiV1EmpregabilidadeCandidaturasBulkStatus(body) {
      globalThis.__dev126Calls.push({ fn: 'bulk-status', body })
      return { status: 200, data: {} }
    }
  `),
}

const CUSTOM_FETCH_GORIO_STUB = moduleUrl(`
  export async function customFetchGoRio(url, init) {
    globalThis.__dev126Calls.push({ fn: 'idiomas', id: url, body: init?.body })
    return { status: 200, data: [] }
  }
`)

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier]
    if (stub) {
      return { url: stub, shortCircuit: true }
    }
    if (specifier.endsWith('/custom-fetch-gorio')) {
      return { url: CUSTOM_FETCH_GORIO_STUB, shortCircuit: true }
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
const vagaRoute = await import(
  '../../app/api/empregabilidade/vagas/[id]/route.ts'
)
const idiomasRoute = await import(
  '../../app/api/empregabilidade/vagas/[id]/idiomas-requisito/route.ts'
)
const sendToDraftRoute = await import(
  '../../app/api/empregabilidade/vagas/[id]/send-to-draft/route.ts'
)
const sendToApprovalRoute = await import(
  '../../app/api/empregabilidade/vagas/[id]/send-to-approval/route.ts'
)
const statusRoute = await import(
  '../../app/api/empregabilidade/candidaturas/[id]/status/route.ts'
)
const bulkStatusRoute = await import(
  '../../app/api/empregabilidade/candidaturas/bulk-status/route.ts'
)
const {
  canDeleteVagaWithStatus,
  canApproveCandidatura,
  canFreezeOrDiscontinueVaga,
  canPublishVagaAsAtivo,
  hasEditorComCuradoriaRestrictions,
} = await import('../../types/heimdall-roles.ts')

const VAGA_ID = 'vaga-sintetica-1'
const CANDIDATURA_ID = 'candidatura-sintetica-1'
// CPF sintético (dígitos verificadores válidos, sem titular real)
const CPF = '52998224725'

const CURADORIA = ['go:empregabilidade:editor_com_curadoria']
const SEM_CURADORIA = ['go:empregabilidade:editor_sem_curadoria']
const PUBLISHERS = [
  ['go:empregabilidade:admin'],
  ['go:empregabilidade:editor_sem_curadoria'],
  ['go:admin'],
  ['admin'],
  ['superadmin'],
  ['go:empregabilidade:editor_com_curadoria', 'go:empregabilidade:admin'],
]
const APPROVERS = [
  ['go:empregabilidade:admin'],
  ['go:empregabilidade:editor_sem_curadoria'],
  ['go:admin'],
  ['admin'],
  ['superadmin'],
  ['go:empregabilidade:editor_com_curadoria', 'go:empregabilidade:admin'],
  [
    'go:empregabilidade:editor_com_curadoria',
    'go:empregabilidade:editor_sem_curadoria',
  ],
]
const OPEN_STATUSES = ['em_edicao', 'em_aprovacao']
const CLOSED_STATUSES = [
  'publicado_ativo',
  'publicado_expirado',
  'vaga_congelada',
  'vaga_descontinuada',
]

const params = (id: string) => Promise.resolve({ id })

function calls(fn: string): ApiCall[] {
  return (testGlobals.__dev126Calls ?? []).filter(call => call.fn === fn)
}

async function json(response: Response) {
  return { status: response.status, data: await response.json() }
}

/** Corpo que passa a validação do PUT de vaga publicada (10 campos). */
function vagaBody(extra: Record<string, unknown> = {}) {
  return {
    titulo: 'Vaga sintética',
    descricao: 'Descrição sintética',
    id_contratante: 'empresa-sintetica',
    id_regime_contratacao: 'regime-sintetico',
    id_modelo_trabalho: 'modelo-sintetico',
    bairro: 'Centro',
    data_limite: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    id_orgao_parceiro: 'orgao-sintetico',
    requisitos: 'Requisitos sintéticos',
    responsabilidades: 'Responsabilidades sintéticas',
    ...extra,
  }
}

async function deleteVaga(roles: string[] | undefined, status: string) {
  testGlobals.__dev126Roles = roles
  testGlobals.__dev126VagaStatus = status
  const request = new NextRequest(
    `https://admin.test/api/empregabilidade/vagas/${VAGA_ID}`,
    { method: 'DELETE' }
  )
  return json(await vagaRoute.DELETE(request, { params: params(VAGA_ID) }))
}

async function updateVaga(
  roles: string[] | undefined,
  status: string,
  body: Record<string, unknown>
) {
  testGlobals.__dev126Roles = roles
  testGlobals.__dev126VagaStatus = status
  const request = new NextRequest(
    `https://admin.test/api/empregabilidade/vagas/${VAGA_ID}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  return json(await vagaRoute.PUT(request, { params: params(VAGA_ID) }))
}

/** Ações que mudam a vaga sem passar pelo `PUT vagas/[id]`. */
const VAGA_CHANGE_ACTIONS: [
  string,
  string,
  (roles: string[] | undefined, status: string) => Promise<{ status: number }>,
][] = [
  [
    'idiomas-requisito',
    'idiomas',
    (roles, status) =>
      callVagaAction(idiomasRoute.PUT, 'idiomas-requisito', roles, status, {
        requisitos: [],
      }),
  ],
  [
    'send-to-draft',
    'send-to-draft',
    (roles, status) =>
      callVagaAction(sendToDraftRoute.PUT, 'send-to-draft', roles, status),
  ],
  [
    'send-to-approval',
    'send-to-approval',
    (roles, status) =>
      callVagaAction(
        sendToApprovalRoute.PUT,
        'send-to-approval',
        roles,
        status
      ),
  ],
]

async function callVagaAction(
  handler: (
    request: Request,
    context: { params: Promise<{ id: string }> }
  ) => Promise<Response>,
  action: string,
  roles: string[] | undefined,
  status: string,
  body?: unknown
) {
  testGlobals.__dev126Roles = roles
  testGlobals.__dev126VagaStatus = status
  const request = new NextRequest(
    `https://admin.test/api/empregabilidade/vagas/${VAGA_ID}/${action}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }
  )
  return json(await handler(request, { params: params(VAGA_ID) }))
}

async function setStatus(roles: string[] | undefined, status: string) {
  testGlobals.__dev126Roles = roles
  const request = new NextRequest(
    `https://admin.test/api/empregabilidade/candidaturas/${CANDIDATURA_ID}/status`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }
  )
  return json(
    await statusRoute.PUT(request, { params: params(CANDIDATURA_ID) })
  )
}

async function setBulkStatus(roles: string[] | undefined, status: string) {
  testGlobals.__dev126Roles = roles
  const request = new NextRequest(
    'https://admin.test/api/empregabilidade/candidaturas/bulk-status',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpfs: [CPF], status, id_vaga: VAGA_ID }),
    }
  )
  return json(await bulkStatusRoute.PUT(request))
}

beforeEach(() => {
  testGlobals.__dev126Calls = []
  testGlobals.__dev126GetStatus = undefined
})

describe('DELETE /api/empregabilidade/vagas/[id] (DEV-126)', () => {
  test('editor com curadoria não exclui vaga publicada, pausada ou encerrada (403, nada chega à API)', async () => {
    for (const status of CLOSED_STATUSES) {
      testGlobals.__dev126Calls = []
      const response = await deleteVaga(CURADORIA, status)
      assert.equal(response.status, 403, status)
      assert.equal(typeof response.data.error, 'string')
      assert.equal(calls('delete').length, 0, status)
    }
  })

  test('editor com curadoria exclui vaga em edição ou em aprovação', async () => {
    for (const status of OPEN_STATUSES) {
      testGlobals.__dev126Calls = []
      const response = await deleteVaga(CURADORIA, status)
      assert.equal(response.status, 200, status)
      assert.equal(calls('delete').length, 1, status)
    }
  })

  test('quem publica vagas exclui em qualquer status, sem ler a vaga', async () => {
    for (const roles of PUBLISHERS) {
      for (const status of [...OPEN_STATUSES, ...CLOSED_STATUSES]) {
        testGlobals.__dev126Calls = []
        const response = await deleteVaga(roles, status)
        assert.equal(response.status, 200, `${roles.join(',')} ${status}`)
        assert.equal(calls('get').length, 0)
        assert.equal(calls('delete').length, 1)
      }
    }
  })

  test('sem papéis ou sem conseguir ler a vaga: falha fechada', async () => {
    for (const roles of [undefined, []]) {
      testGlobals.__dev126Calls = []
      const response = await deleteVaga(roles, 'publicado_ativo')
      assert.equal(response.status, 403)
      assert.equal(calls('delete').length, 0)
    }
    for (const [upstream, expected] of [
      [404, 404],
      [500, 502],
    ]) {
      testGlobals.__dev126Calls = []
      testGlobals.__dev126GetStatus = upstream
      const response = await deleteVaga(CURADORIA, 'em_edicao')
      assert.equal(response.status, expected)
      assert.equal(calls('delete').length, 0)
    }
  })
})

describe('PUT /api/empregabilidade/vagas/[id] (DEV-126)', () => {
  test('editor com curadoria não edita vaga publicada, pausada ou encerrada', async () => {
    for (const status of CLOSED_STATUSES) {
      testGlobals.__dev126Calls = []
      const response = await updateVaga(CURADORIA, status, vagaBody())
      assert.equal(response.status, 403, status)
      assert.equal(calls('update').length, 0, status)
    }
  })

  test('editor com curadoria não muda o status pelo corpo', async () => {
    for (const extra of [
      { status: 'publicado_ativo' },
      { Status: 'publicado_ativo' },
      { STATUS: 'em_aprovacao' },
      { ſtatus: 'publicado_ativo' },
      { status: 'em_edicao', Status: 'publicado_ativo' },
    ]) {
      testGlobals.__dev126Calls = []
      const response = await updateVaga(CURADORIA, 'em_edicao', vagaBody(extra))
      assert.equal(response.status, 403, JSON.stringify(extra))
      assert.equal(calls('update').length, 0, JSON.stringify(extra))
    }
  })

  test('editor com curadoria edita vaga em edição ou em aprovação (com o status atual ou sem status)', async () => {
    for (const status of OPEN_STATUSES) {
      for (const body of [vagaBody(), vagaBody({ status })]) {
        testGlobals.__dev126Calls = []
        const response = await updateVaga(CURADORIA, status, body)
        assert.equal(response.status, 200, status)
        assert.equal(calls('update').length, 1, status)
      }
    }
  })

  test('quem publica vagas edita em qualquer status', async () => {
    for (const roles of PUBLISHERS) {
      for (const status of CLOSED_STATUSES) {
        testGlobals.__dev126Calls = []
        const response = await updateVaga(roles, status, vagaBody())
        assert.equal(response.status, 200, `${roles.join(',')} ${status}`)
        assert.equal(calls('update').length, 1)
      }
    }
  })

  test('sem papéis: falha fechada', async () => {
    for (const roles of [undefined, []]) {
      testGlobals.__dev126Calls = []
      const response = await updateVaga(roles, 'publicado_ativo', vagaBody())
      assert.equal(response.status, 403)
      assert.equal(calls('update').length, 0)
    }
  })
})

describe('idiomas, envio para rascunho e para aprovação de vaga (DEV-126)', () => {
  test('editor com curadoria não muda vaga publicada, pausada ou encerrada (403, nada chega à API)', async () => {
    for (const [name, fn, call] of VAGA_CHANGE_ACTIONS) {
      for (const status of CLOSED_STATUSES) {
        testGlobals.__dev126Calls = []
        const response = await call(CURADORIA, status)
        assert.equal(response.status, 403, `${name} ${status}`)
        assert.equal(calls(fn).length, 0, `${name} ${status}`)
      }
    }
  })

  test('editor com curadoria segue com vaga em edição ou em aprovação', async () => {
    for (const [name, fn, call] of VAGA_CHANGE_ACTIONS) {
      for (const status of OPEN_STATUSES) {
        testGlobals.__dev126Calls = []
        const response = await call(CURADORIA, status)
        assert.equal(response.status, 200, `${name} ${status}`)
        assert.equal(calls(fn).length, 1, `${name} ${status}`)
      }
    }
  })

  test('quem publica vagas segue em qualquer status', async () => {
    for (const roles of PUBLISHERS) {
      for (const [name, fn, call] of VAGA_CHANGE_ACTIONS) {
        testGlobals.__dev126Calls = []
        const response = await call(roles, 'publicado_ativo')
        assert.equal(response.status, 200, `${name} ${roles.join(',')}`)
        assert.equal(calls(fn).length, 1, `${name} ${roles.join(',')}`)
      }
    }
  })

  test('sem papéis ou sem conseguir ler a vaga: falha fechada', async () => {
    for (const [name, fn, call] of VAGA_CHANGE_ACTIONS) {
      for (const roles of [undefined, []]) {
        testGlobals.__dev126Calls = []
        assert.equal((await call(roles, 'publicado_ativo')).status, 403, name)
        assert.equal(calls(fn).length, 0, name)
      }
      testGlobals.__dev126Calls = []
      testGlobals.__dev126GetStatus = 500
      assert.equal((await call(CURADORIA, 'em_edicao')).status, 502, name)
      assert.equal(calls(fn).length, 0, name)
      testGlobals.__dev126GetStatus = undefined
    }
  })
})

describe('aprovar candidatura por status e em lote (DEV-126)', () => {
  test('curadoria sozinha ou sem papéis recebe 403 ao aprovar', async () => {
    for (const roles of [CURADORIA, undefined, []]) {
      testGlobals.__dev126Calls = []
      const single = await setStatus(roles, 'approved')
      assert.equal(single.status, 403, String(roles))
      const bulk = await setBulkStatus(roles, 'approved')
      assert.equal(bulk.status, 403, String(roles))
      assert.equal(calls('status').length + calls('bulk-status').length, 0)
    }
  })

  test('admins do módulo aprovam por status e em lote', async () => {
    for (const roles of APPROVERS) {
      testGlobals.__dev126Calls = []
      assert.equal((await setStatus(roles, 'approved')).status, 200)
      assert.equal((await setBulkStatus(roles, 'approved')).status, 200)
      assert.deepEqual(calls('status')[0]?.body, { status: 'aprovada' })
      assert.equal(
        (calls('bulk-status')[0]?.body as { status?: string }).status,
        'aprovada'
      )
    }
  })

  test('editores seguem com os demais status', async () => {
    for (const roles of [CURADORIA, SEM_CURADORIA]) {
      for (const status of ['pending', 'cancelled', 'aprovada']) {
        testGlobals.__dev126Calls = []
        assert.equal((await setStatus(roles, status)).status, 200, status)
        assert.notEqual(
          (calls('status')[0]?.body as { status?: string }).status,
          'aprovada'
        )
      }
      for (const status of ['pending', 'rejected']) {
        testGlobals.__dev126Calls = []
        assert.equal((await setBulkStatus(roles, status)).status, 200, status)
      }
    }
  })
})

describe('predicados da UI com mais de um papel (DEV-126)', () => {
  test('o papel que publica prevalece sobre a curadoria', () => {
    for (const roles of PUBLISHERS) {
      const withCuradoria = [...new Set([...roles, ...CURADORIA])]
      assert.equal(hasEditorComCuradoriaRestrictions(withCuradoria), false)
      assert.equal(canPublishVagaAsAtivo(withCuradoria), true)
      assert.equal(canFreezeOrDiscontinueVaga(withCuradoria), true)
      assert.equal(
        canDeleteVagaWithStatus(withCuradoria, 'publicado_ativo'),
        true
      )
    }
  })

  test('editor com curadoria sozinho segue restrito', () => {
    assert.equal(hasEditorComCuradoriaRestrictions(CURADORIA), true)
    assert.equal(canPublishVagaAsAtivo(CURADORIA), false)
    assert.equal(canFreezeOrDiscontinueVaga(CURADORIA), false)
    assert.equal(canDeleteVagaWithStatus(CURADORIA, 'vaga_congelada'), false)
    assert.equal(canDeleteVagaWithStatus(CURADORIA, 'em_aprovacao'), true)
  })

  test('admin e editor sem curadoria prevalecem sobre a curadoria', () => {
    assert.equal(
      canApproveCandidatura([...CURADORIA, 'go:empregabilidade:admin']),
      true
    )
    assert.equal(canApproveCandidatura([...CURADORIA, ...SEM_CURADORIA]), true)
    assert.equal(canApproveCandidatura(SEM_CURADORIA), true)
    assert.equal(canApproveCandidatura(CURADORIA), false)
  })
})
