import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { beforeEach, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// DEV-79: o middleware deixava passar qualquer papel de Cursos ou de
// Empregabilidade e o handler não conferia a `folder` do corpo, então um
// Editor de Cursos gerava URL de escrita pública em superapp/images/mei e
// /empresas. Aqui o handler real é chamado com os papéis do Heimdall, os
// cookies e o GCS substituídos por stubs (bucket e credenciais sintéticos).

const SRC_ROOT = new URL('../../../../../', import.meta.url)

/** Papéis que o Heimdall (cache do servidor) devolve para a sessão. */
type TestGlobals = typeof globalThis & {
  __dev79Roles?: string[] | undefined
  __dev79Cookies?: Record<string, string>
  __dev79SignedPaths?: string[]
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
          const value = globalThis.__dev79Cookies?.[name]
          return value === undefined ? undefined : { name, value }
        },
      }
    }
  `),
  '@/lib/heimdall-user': moduleUrl(`
    export async function getCurrentUserRoles() {
      return globalThis.__dev79Roles
    }
  `),
  '@google-cloud/storage': moduleUrl(`
    export class Storage {
      bucket(bucketName) {
        return {
          file(objectPath) {
            return {
              async getSignedUrl() {
                globalThis.__dev79SignedPaths.push(objectPath)
                return ['https://signed.test/' + bucketName + '/' + objectPath]
              },
            }
          },
        }
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

process.env.GCS_BUCKET_NAME = 'bucket-sintetico'
process.env.GCS_CLIENT_EMAIL =
  'upload@projeto-sintetico.iam.gserviceaccount.com'
process.env.GCS_PRIVATE_KEY = 'chave-sintetica'

const { NextRequest } = await import('next/server')
const { POST } = await import('../route.ts')
const { UPLOAD_FOLDER_ROLES, hasUploadFolderAccess } = await import(
  '../../../../../lib/route-permissions.ts'
)
const { UPLOAD_FOLDERS } = await import('../../../../../lib/upload-folders.ts')

function makeToken(): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'RS256', typ: 'JWT' })
  const payload = encode({
    sub: 'usuario-sintetico',
    exp: Math.floor(Date.now() / 1000) + 600,
  })
  return `${header}.${payload}.assinatura`
}

async function requestSignedUrl(
  roles: string[] | undefined,
  body: Record<string, unknown>
): Promise<{ status: number; data: Record<string, unknown> }> {
  testGlobals.__dev79Roles = roles
  const request = new NextRequest('https://admin.test/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await POST(request)
  return { status: response.status, data: await response.json() }
}

const EDITOR_CURSOS = ['go:cursos:editor']
const EDITOR_EMPREGABILIDADE = ['go:empregabilidade:editor_sem_curadoria']
const GO_ADMIN = ['go:admin']

beforeEach(() => {
  testGlobals.__dev79Cookies = { access_token: makeToken() }
  testGlobals.__dev79SignedPaths = []
})

describe('POST /api/upload/signed-url confere o módulo da pasta (DEV-79)', () => {
  test('Editor de Cursos não gera URL em mei nem em empresas (403)', async () => {
    for (const folder of ['mei', 'empresas']) {
      const { status, data } = await requestSignedUrl(EDITOR_CURSOS, {
        contentType: 'image/png',
        folder,
      })
      assert.equal(status, 403, `folder=${folder}`)
      assert.equal(data.signedUrl, undefined)
      assert.equal(data.publicUrl, undefined)
    }
    assert.deepEqual(testGlobals.__dev79SignedPaths, [])
  })

  test('Editor de Cursos segue gerando URL em courses', async () => {
    const { status, data } = await requestSignedUrl(EDITOR_CURSOS, {
      contentType: 'image/png',
      folder: 'courses',
    })
    assert.equal(status, 200)
    assert.match(
      String(data.publicUrl),
      /^https:\/\/storage\.googleapis\.com\/bucket-sintetico\/superapp\/images\/courses\/[0-9a-f-]{36}\.png$/
    )
  })

  test('sem folder vale a pasta padrão (courses), com o papel dela', async () => {
    const editorCursos = await requestSignedUrl(EDITOR_CURSOS, {
      contentType: 'image/webp',
    })
    assert.equal(editorCursos.status, 200)
    const editorEmpregabilidade = await requestSignedUrl(
      EDITOR_EMPREGABILIDADE,
      { contentType: 'image/webp' }
    )
    assert.equal(editorEmpregabilidade.status, 403)
  })

  test('Editor de Empregabilidade só gera URL em empresas', async () => {
    const empresas = await requestSignedUrl(EDITOR_EMPREGABILIDADE, {
      contentType: 'image/jpeg',
      folder: 'empresas',
    })
    assert.equal(empresas.status, 200)
    assert.match(
      String(empresas.data.publicUrl),
      /\/superapp\/images\/empresas\/[0-9a-f-]{36}\.jpg$/
    )
    for (const folder of ['courses', 'mei']) {
      const { status } = await requestSignedUrl(EDITOR_EMPREGABILIDADE, {
        contentType: 'image/jpeg',
        folder,
      })
      assert.equal(status, 403, `folder=${folder}`)
    }
  })

  test('go:admin (papel da página MEI) gera URL em mei', async () => {
    const { status, data } = await requestSignedUrl(GO_ADMIN, {
      contentType: 'image/png',
      folder: 'mei',
    })
    assert.equal(status, 200)
    assert.match(
      String(data.publicUrl),
      /\/superapp\/images\/mei\/[0-9a-f-]{36}\.png$/
    )
  })

  test('sem papéis (Heimdall indisponível) nenhuma pasta passa', async () => {
    for (const roles of [undefined, []]) {
      for (const folder of Object.keys(UPLOAD_FOLDERS)) {
        const { status } = await requestSignedUrl(roles, {
          contentType: 'image/png',
          folder,
        })
        assert.equal(status, 403, `roles=${String(roles)} folder=${folder}`)
      }
    }
    assert.deepEqual(testGlobals.__dev79SignedPaths, [])
  })

  test('pasta inválida continua 400 e sessão ausente continua 401', async () => {
    const invalid = await requestSignedUrl(GO_ADMIN, {
      contentType: 'image/png',
      folder: '../outra-pasta',
    })
    assert.equal(invalid.status, 400)

    testGlobals.__dev79Cookies = {}
    const anonymous = await requestSignedUrl(GO_ADMIN, {
      contentType: 'image/png',
      folder: 'courses',
    })
    assert.equal(anonymous.status, 401)
  })
})

describe('UPLOAD_FOLDER_ROLES repete os papéis da página dona (DEV-79)', () => {
  test('toda pasta de upload tem regra', () => {
    assert.deepEqual(
      Object.keys(UPLOAD_FOLDER_ROLES).sort(),
      Object.keys(UPLOAD_FOLDERS).sort()
    )
  })

  test('mei exige os papéis da página MEI, que Cursos e Empregabilidade não têm', () => {
    assert.equal(hasUploadFolderAccess('mei', ['go:cursos:editor']), false)
    assert.equal(
      hasUploadFolderAccess('mei', ['go:empregabilidade:admin']),
      false
    )
    for (const role of ['admin', 'superadmin', 'go:admin']) {
      assert.equal(hasUploadFolderAccess('mei', [role]), true, role)
    }
  })

  test('empresas exige papel de Empregabilidade; courses, de Cursos', () => {
    assert.equal(hasUploadFolderAccess('empresas', ['go:cursos:editor']), false)
    assert.equal(
      hasUploadFolderAccess('empresas', ['go:empregabilidade:admin']),
      true
    )
    assert.equal(
      hasUploadFolderAccess('courses', ['go:empregabilidade:admin']),
      false
    )
    assert.equal(
      hasUploadFolderAccess('courses', ['go:cursos:casa_civil']),
      true
    )
  })
})
