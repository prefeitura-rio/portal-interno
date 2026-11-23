import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-755: na tela de detalhe da vaga em rascunho (`em_edicao`), quem
// `canPublishVagaAsAtivo` libera vê "Publicar vaga" como ação visível ao lado
// de "Enviar para aprovação", e não só no menu "Mais opções". Sem a
// permissão, só "Enviar para aprovação" aparece.

const EMPREGABILIDADE = '../../app/(private)/(app)/gorio/empregabilidade/'
const COMPONENTE_URL = new URL(
  `${EMPREGABILIDADE}components/vaga-acoes-primarias.tsx`,
  import.meta.url
)
const PAGINA_URL = new URL(
  `${EMPREGABILIDADE}[empregabilidade-id]/page.tsx`,
  import.meta.url
)

registerSrcLoader()
const { createElement } = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { VagaAcoesPrimarias } = await import(COMPONENTE_URL.href)

function render(
  status: string,
  {
    canPublishVagaAsAtivo = false,
    canFreezeOrDiscontinueVaga = false,
  }: {
    canPublishVagaAsAtivo?: boolean
    canFreezeOrDiscontinueVaga?: boolean
  } = {}
): string {
  const noop = () => {}
  return renderToStaticMarkup(
    createElement(VagaAcoesPrimarias, {
      status,
      canPublishVagaAsAtivo,
      canFreezeOrDiscontinueVaga,
      disabled: false,
      onSendToApproval: noop,
      onPublish: noop,
      onUnfreeze: noop,
      onReactivate: noop,
    })
  )
}

/** Rótulos dos botões renderizados, na ordem. */
function botoes(html: string): string[] {
  return [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map(m =>
    m[1].replace(/<[^>]+>/g, '').trim()
  )
}

/** Tag de abertura do botão com o rótulo dado. */
function botao(html: string, rotulo: string): string {
  const tag = [...html.matchAll(/(<button[^>]*>)([\s\S]*?)<\/button>/g)].find(
    m => m[2].replace(/<[^>]+>/g, '').trim() === rotulo
  )?.[1]
  assert.ok(tag, `botão "${rotulo}" renderizado`)
  return tag
}

describe('ações visíveis da vaga em rascunho (em_edicao)', () => {
  test('com permissão de publicar: "Enviar para aprovação" e "Publicar vaga"', () => {
    const html = render('em_edicao', { canPublishVagaAsAtivo: true })
    assert.deepEqual(botoes(html), ['Enviar para aprovação', 'Publicar vaga'])
  })

  test('"Publicar vaga" é a ação principal; "Enviar para aprovação" fica secundária', () => {
    const html = render('em_edicao', { canPublishVagaAsAtivo: true })
    assert.match(botao(html, 'Publicar vaga'), /bg-primary/)
    assert.doesNotMatch(botao(html, 'Enviar para aprovação'), /bg-primary/)
  })

  test('sem permissão de publicar: só "Enviar para aprovação", como ação principal', () => {
    const html = render('em_edicao')
    assert.deepEqual(botoes(html), ['Enviar para aprovação'])
    assert.match(botao(html, 'Enviar para aprovação'), /bg-primary/)
  })
})

describe('ações visíveis dos outros status continuam como antes', () => {
  test('em_aprovacao: "Publicar vaga" só com a permissão', () => {
    assert.deepEqual(
      botoes(render('em_aprovacao', { canPublishVagaAsAtivo: true })),
      ['Publicar vaga']
    )
    assert.deepEqual(botoes(render('em_aprovacao')), [])
  })

  test('vaga_congelada: "Descongelar vaga" só com a permissão de pausar/encerrar', () => {
    assert.deepEqual(
      botoes(render('vaga_congelada', { canFreezeOrDiscontinueVaga: true })),
      ['Descongelar vaga']
    )
    assert.deepEqual(
      botoes(render('vaga_congelada', { canPublishVagaAsAtivo: true })),
      []
    )
  })

  test('vaga_descontinuada: "Reativar vaga" só com a permissão de pausar/encerrar', () => {
    assert.deepEqual(
      botoes(
        render('vaga_descontinuada', { canFreezeOrDiscontinueVaga: true })
      ),
      ['Reativar vaga']
    )
    assert.deepEqual(botoes(render('vaga_descontinuada')), [])
  })

  test('status publicados não ganham ação visível', () => {
    for (const status of ['publicado_ativo', 'publicado_expirado']) {
      assert.deepEqual(
        botoes(
          render(status, {
            canPublishVagaAsAtivo: true,
            canFreezeOrDiscontinueVaga: true,
          })
        ),
        []
      )
    }
  })
})

describe('tela de detalhe da vaga', () => {
  const pagina = readFileSync(PAGINA_URL, 'utf8')

  test('usa VagaAcoesPrimarias para as ações visíveis', () => {
    assert.match(
      pagina,
      /<VagaAcoesPrimarias[\s\S]*?onPublish=\{handlePublish\}/
    )
  })

  test('o menu "Mais opções" do rascunho não repete "Publicar vaga"', () => {
    const inicio = pagina.indexOf("{vaga.status === 'em_edicao' &&")
    assert.ok(inicio >= 0, 'bloco do rascunho no menu')
    const fim = pagina.indexOf("{vaga.status === 'em_aprovacao' && (", inicio)
    assert.ok(fim > inicio, 'bloco em_aprovacao depois do rascunho')
    assert.doesNotMatch(pagina.slice(inicio, fim), /onClick=\{handlePublish\}/)
  })
})
