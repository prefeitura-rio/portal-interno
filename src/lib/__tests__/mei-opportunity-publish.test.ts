import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import ts from 'typescript'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-90: o botão "Publicar oportunidade" do rascunho (fora do modo de edição)
// aplica as mesmas regras do fullFormSchema antes de chamar o publish.

const FORM_URL = new URL(
  '../../app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form.tsx',
  import.meta.url
)
const PAGE_URL = new URL(
  '../../app/(private)/(app)/gorio/oportunidades-mei/oportunidade-mei/[oportunidade-mei-id]/page.tsx',
  import.meta.url
)

registerSrcLoader()
const { getMEIOpportunityPublishPendingFields } = await import(FORM_URL.href)

const EXPIRATION = new Date('2026-11-30T18:00:00-03:00')

// Rascunho sintético completo, no formato dos valores do formulário
const completeDraft = {
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
  opportunity_expiration_date: EXPIRATION,
  service_execution_deadline: new Date('2026-12-15T18:00:00-03:00'),
  gallery_images: [''],
  cover_image:
    'https://storage.googleapis.com/rj-escritorio-dev-public/superapp/capa.png',
}

describe('getMEIOpportunityPublishPendingFields', () => {
  test('rascunho completo pode ser publicado', () => {
    assert.deepEqual(getMEIOpportunityPublishPendingFields(completeDraft), [])
  })

  test('rascunho sem campos obrigatórios lista os pendentes na ordem do formulário', () => {
    const pending = getMEIOpportunityPublishPendingFields({
      ...completeDraft,
      orgao_id: '',
      subclasses: [],
      address: '',
      forma_pagamento: '',
      cover_image: '',
    })
    assert.deepEqual(pending, [
      'Órgão demandante',
      'Subclasses CNAE',
      'Endereço',
      'Forma de pagamento',
      'Imagem de capa',
    ])
  })

  test('descrição curta demais impede a publicação', () => {
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields({
        ...completeDraft,
        description: 'Curta',
      }),
      ['Descrição do serviço']
    )
  })

  test('data limite de execução anterior ao prazo de expiração impede a publicação', () => {
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields({
        ...completeDraft,
        service_execution_deadline: new Date('2026-11-29T18:00:00-03:00'),
      }),
      ['Data limite para execução do serviço']
    )
  })

  test('rascunho sem prazo de expiração impede a publicação', () => {
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields({
        ...completeDraft,
        opportunity_expiration_date: undefined,
      }),
      ['Prazo para expiração da oportunidade']
    )
  })

  test('valores ausentes não são publicáveis', () => {
    assert.notDeepEqual(getMEIOpportunityPublishPendingFields(undefined), [])
    assert.notDeepEqual(getMEIOpportunityPublishPendingFields({}), [])
  })
})

// Chamadas `<objeto>.<método>(...)` dentro de handlePublishDirect, em ordem
function callsInHandlePublishDirect(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    PAGE_URL.pathname,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  let handler: ts.Node | undefined
  const findHandler = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(sourceFile) === 'handlePublishDirect'
    ) {
      handler = node.initializer
      return
    }
    ts.forEachChild(node, findHandler)
  }
  findHandler(sourceFile)
  assert.ok(handler, 'handlePublishDirect não encontrado na página')

  const calls: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      calls.push(
        ts.isPropertyAccessExpression(callee)
          ? callee.name.getText(sourceFile)
          : callee.getText(sourceFile)
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(handler)
  return calls
}

describe('botão "Publicar oportunidade" do rascunho', () => {
  test('valida o formulário antes de chamar o publish', () => {
    const calls = callsInHandlePublishDirect(readFileSync(PAGE_URL, 'utf8'))
    const validateAt = calls.indexOf('validateForPublish')
    const publishAt = calls.indexOf('publishOpportunity')
    assert.notEqual(validateAt, -1, 'handlePublishDirect não valida o rascunho')
    assert.notEqual(publishAt, -1, 'handlePublishDirect não publica')
    assert.ok(
      validateAt < publishAt,
      'a validação precisa acontecer antes do publish'
    )
    assert.equal(
      calls.filter(name => name === 'publishOpportunity').length,
      1,
      'handlePublishDirect deve publicar num único ponto, depois da validação'
    )
  })
})
