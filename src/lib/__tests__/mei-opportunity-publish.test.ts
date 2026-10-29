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
const { getMEIOpportunityPublishPendingFields, toMEIOpportunityFormValues } =
  await import(FORM_URL.href)

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

  test('rascunho sem data limite de execução impede a publicação (obrigatória desde DEV-89)', () => {
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields({
        ...completeDraft,
        service_execution_deadline: undefined,
      }),
      ['Data limite para execução do serviço']
    )
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields(
        toMEIOpportunityFormValues({
          ...completeDraft,
          service_execution_deadline: null,
        })
      ),
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

// Rascunho salvo como a página o recebe de useMEIOpportunity (datas em string)
const savedDraft = {
  ...completeDraft,
  opportunity_expiration_date: '2026-11-30T21:00:00Z',
  service_execution_deadline: '2026-12-15T21:00:00Z',
  status: 'draft',
}

describe('validação dos dados salvos do rascunho', () => {
  test('rascunho salvo completo pode ser publicado', () => {
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields(
        toMEIOpportunityFormValues(savedDraft)
      ),
      []
    )
  })

  test('rascunho salvo incompleto não é publicável, mesmo que o formulário tenha edições canceladas completas', () => {
    // O que se publica é o registro salvo (sem endereço e sem capa); edições
    // feitas em "Editar" e descartadas em "Cancelar" não contam
    const saved = { ...savedDraft, address: '', cover_image: '' }
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields(toMEIOpportunityFormValues(saved)),
      ['Endereço', 'Imagem de capa']
    )
  })

  test('prazo de expiração ausente no registro salvo fica pendente', () => {
    const saved = { ...savedDraft, opportunity_expiration_date: '' }
    assert.equal(
      toMEIOpportunityFormValues(saved).opportunity_expiration_date,
      undefined
    )
    assert.deepEqual(
      getMEIOpportunityPublishPendingFields(toMEIOpportunityFormValues(saved)),
      ['Prazo para expiração da oportunidade']
    )
  })
})

function parseTsx(url: URL): ts.SourceFile {
  return ts.createSourceFile(
    url.pathname,
    readFileSync(url, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
}

function findInitializer(
  sourceFile: ts.SourceFile,
  matches: (node: ts.Node) => ts.Node | undefined
): ts.Node | undefined {
  let found: ts.Node | undefined
  const visit = (node: ts.Node) => {
    if (found) return
    found = matches(node)
    if (!found) ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

// Nomes das funções chamadas dentro de `node`, em ordem
function callNames(sourceFile: ts.SourceFile, node: ts.Node): string[] {
  const calls: string[] = []
  const visit = (current: ts.Node) => {
    if (ts.isCallExpression(current)) {
      const callee = current.expression
      calls.push(
        ts.isPropertyAccessExpression(callee)
          ? callee.name.getText(sourceFile)
          : callee.getText(sourceFile)
      )
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
  return calls
}

describe('validateForPublish do formulário', () => {
  test('restaura o formulário aos dados salvos antes de validar', () => {
    const sourceFile = parseTsx(FORM_URL)
    const method = findInitializer(sourceFile, node =>
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === 'validateForPublish'
        ? node.initializer
        : undefined
    )
    assert.ok(method, 'validateForPublish não encontrado no formulário')
    const calls = callNames(sourceFile, method)
    const savedAt = calls.lastIndexOf('toMEIOpportunityFormValues')
    const resetAt = calls.indexOf('reset')
    assert.notEqual(savedAt, -1, 'não valida os dados salvos (initialData)')
    assert.ok(resetAt > savedAt, 'não restaura o formulário aos dados salvos')
    assert.ok(
      calls.lastIndexOf('trigger') > resetAt,
      'os erros precisam ser destacados depois de restaurar os dados salvos'
    )
  })
})

// Chamadas dentro de handlePublishDirect, em ordem
function callsInHandlePublishDirect(): string[] {
  const sourceFile = parseTsx(PAGE_URL)
  const handler = findInitializer(sourceFile, node =>
    ts.isVariableDeclaration(node) &&
    node.name.getText(sourceFile) === 'handlePublishDirect'
      ? node.initializer
      : undefined
  )
  assert.ok(handler, 'handlePublishDirect não encontrado na página')
  return callNames(sourceFile, handler)
}

describe('botão "Publicar oportunidade" do rascunho', () => {
  test('valida os dados salvos antes de chamar o publish', () => {
    const calls = callsInHandlePublishDirect()
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
