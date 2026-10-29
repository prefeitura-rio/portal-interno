import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import ts from 'typescript'
import { isMEIImageURL } from '../mei-opportunity-images.ts'
import { UPLOAD_FOLDERS, isUploadFolder } from '../upload-folders.ts'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-74: capa e galeria da oportunidade MEI são enviadas do dispositivo pelo
// ImageUpload (POST /api/upload/signed-url) para superapp/images/mei/, e o
// formulário grava a URL pública devolvida. URLs antigas seguem válidas.

const FORM_URL = new URL(
  '../../app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form.tsx',
  import.meta.url
)

registerSrcLoader()
const { draftFormSchema, fullFormSchema } = await import(FORM_URL.href)

// URL pública no formato devolvido pela rota de signed URL (bucket sintético)
const NEW_UPLOAD_URL =
  'https://storage.googleapis.com/bucket-sintetico-staging/superapp/images/mei/00000000-0000-4000-8000-000000000000.webp'
// Imagem já salva antes do upload direto (bucket antigo)
const LEGACY_URL =
  'https://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/capa.png'
const EXTERNAL_URL = 'https://exemplo.invalido/imagem.png'

const baseOpportunity = {
  orgao_id: 'orgao-teste',
  subclasses: ['0000-0/00'],
  title: 'Oportunidade de teste',
  description: 'Descrição sintética do serviço usada apenas no teste.',
  outras_informacoes: '',
  address: 'Rua Sintética de Teste',
  number: '100',
  neighborhood: 'Centro',
  forma_pagamento: 'PIX',
  prazo_pagamento: '30 dias',
  opportunity_expiration_date: new Date('2026-11-30T18:00:00-03:00'),
  service_execution_deadline: new Date('2026-12-15T18:00:00-03:00'),
  gallery_images: [''],
  cover_image: NEW_UPLOAD_URL,
}

function imageIssuePaths(data: unknown, schema = fullFormSchema) {
  const result = schema.safeParse(data)
  if (result.success) return []
  return result.error.issues.map(
    (issue: { path: (string | number)[] }) => issue.path
  )
}

describe('pasta de upload "mei"', () => {
  test('é aceita pela rota e resolve para superapp/images/mei', () => {
    assert.equal(isUploadFolder('mei'), true)
    assert.equal(UPLOAD_FOLDERS.mei, 'superapp/images/mei')
  })

  test('não reaproveita a pasta de cursos nem a de empresas', () => {
    assert.notEqual(UPLOAD_FOLDERS.mei, UPLOAD_FOLDERS.courses)
    assert.notEqual(UPLOAD_FOLDERS.mei, UPLOAD_FOLDERS.empresas)
  })
})

describe('isMEIImageURL', () => {
  test('aceita a URL pública de um upload novo, de qualquer bucket do GCS', () => {
    assert.equal(isMEIImageURL(NEW_UPLOAD_URL), true)
  })

  test('aceita URLs antigas já salvas', () => {
    assert.equal(isMEIImageURL(LEGACY_URL), true)
  })

  test('aceita vazio (rascunho, galeria opcional)', () => {
    assert.equal(isMEIImageURL(''), true)
    assert.equal(isMEIImageURL('   '), true)
    assert.equal(isMEIImageURL(undefined), true)
    assert.equal(isMEIImageURL(null), true)
  })

  test('recusa URL fora do GCS ou texto que não é URL', () => {
    assert.equal(isMEIImageURL(EXTERNAL_URL), false)
    assert.equal(isMEIImageURL('http://storage.googleapis.com/x/y.png'), false)
    assert.equal(isMEIImageURL('storage.googleapis.com/x/y.png'), false)
    assert.equal(isMEIImageURL('javascript:alert(1)'), false)
  })
})

describe('schemas do formulário de oportunidade MEI', () => {
  test('publicar aceita capa e galeria com a URL devolvida pelo upload', () => {
    assert.deepEqual(
      imageIssuePaths({
        ...baseOpportunity,
        gallery_images: [NEW_UPLOAD_URL, NEW_UPLOAD_URL],
      }),
      []
    )
  })

  test('editar sem novo upload mantém válidas a capa e a galeria antigas', () => {
    assert.deepEqual(
      imageIssuePaths({
        ...baseOpportunity,
        cover_image: LEGACY_URL,
        gallery_images: [LEGACY_URL, NEW_UPLOAD_URL],
      }),
      []
    )
  })

  test('publicar exige a capa e recusa capa ou galeria fora do GCS', () => {
    assert.deepEqual(imageIssuePaths({ ...baseOpportunity, cover_image: '' }), [
      ['cover_image'],
    ])
    assert.deepEqual(
      imageIssuePaths({
        ...baseOpportunity,
        cover_image: EXTERNAL_URL,
        gallery_images: ['', EXTERNAL_URL],
      }),
      [['gallery_images', 1], ['cover_image']]
    )
  })

  test('rascunho aceita capa vazia e a URL de um upload novo', () => {
    assert.deepEqual(
      imageIssuePaths(
        { cover_image: '', gallery_images: [''] },
        draftFormSchema
      ),
      []
    )
    assert.deepEqual(
      imageIssuePaths(
        { cover_image: NEW_UPLOAD_URL, gallery_images: [NEW_UPLOAD_URL] },
        draftFormSchema
      ),
      []
    )
  })
})

// Lê o JSX do formulário: cada <ImageUpload> com o `name` do FormField que o
// envolve e o `uploadFolder` que ele recebe.
function imageUploadsByField(source: string) {
  const sourceFile = ts.createSourceFile(
    FORM_URL.pathname,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

  const attribute = (
    element: ts.JsxSelfClosingElement | ts.JsxOpeningElement,
    name: string
  ) => {
    const attr = element.attributes.properties.find(
      (prop): prop is ts.JsxAttribute =>
        ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === name
    )
    if (!attr?.initializer) return undefined
    if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text
    return attr.initializer.expression?.getText(sourceFile)
  }

  const enclosingFieldName = (node: ts.Node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (
        (ts.isJsxSelfClosingElement(current) ||
          ts.isJsxOpeningElement(current)) &&
        current.tagName.getText(sourceFile) === 'FormField'
      ) {
        return attribute(current, 'name')
      }
    }
    return undefined
  }

  const uploads: { field?: string; uploadFolder?: string }[] = []
  const inputsInGallery: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sourceFile)
      const field = enclosingFieldName(node)
      if (tag === 'ImageUpload') {
        uploads.push({ field, uploadFolder: attribute(node, 'uploadFolder') })
      }
      if (tag === 'Input' && field?.includes('gallery_images')) {
        inputsInGallery.push(field)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return { uploads, inputsInGallery }
}

describe('formulário de oportunidade MEI usa upload do dispositivo', () => {
  const { uploads, inputsInGallery } = imageUploadsByField(
    readFileSync(FORM_URL, 'utf8')
  )

  test('a capa usa o ImageUpload na pasta mei', () => {
    assert.deepEqual(
      uploads.filter(upload => upload.field === 'cover_image'),
      [{ field: 'cover_image', uploadFolder: 'mei' }]
    )
  })

  test('cada item da galeria usa o ImageUpload na pasta mei', () => {
    assert.deepEqual(
      uploads.filter(upload => upload.field?.includes('gallery_images')),
      [{ field: '`gallery_images.${index}`', uploadFolder: 'mei' }]
    )
  })

  test('a galeria não tem mais campo de URL colada', () => {
    assert.deepEqual(inputsInGallery, [])
  })

  test('nenhum ImageUpload do formulário cai na pasta padrão (cursos)', () => {
    assert.ok(uploads.length >= 2)
    for (const upload of uploads) assert.equal(upload.uploadFolder, 'mei')
  })
})
