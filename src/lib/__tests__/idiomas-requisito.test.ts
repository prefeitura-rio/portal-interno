import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'

// DEV-405: ao criar ou duplicar vaga, a gravação dos idiomas exigidos
// (PUT /api/empregabilidade/vagas/{id}/idiomas-requisito) era feita sem
// conferir a resposta: com a falha dela, a vaga ficava com o bloqueio de idioma
// ativo (criterios_bloqueio, DEV-400) e nenhum idioma gravado, e o fluxo dizia
// "sucesso". Agora a falha precisa virar erro. IDs sintéticos.

const {
  IDIOMAS_REQUISITO_ERRO_PADRAO,
  IdiomasRequisitoError,
  getIdiomasRequisitoFalhaAviso,
  getVagaEdicaoHref,
  isIdiomasRequisitoError,
  precisaSalvarIdiomasRequisito,
  salvarIdiomasRequisito,
  salvarIdiomasRequisitoDaEdicao,
} = await import('../idiomas-requisito.ts')

const VAGA_ID = '00000000-0000-4000-8000-000000000001'
const IDIOMAS = [
  {
    id_idioma: '00000000-0000-4000-8000-0000000000a1',
    id_nivel_minimo: '00000000-0000-4000-8000-0000000000b1',
  },
]

interface Chamada {
  input: string
  init?: RequestInit
}

function fetchFalso(resposta: () => Promise<Response>) {
  const chamadas: Chamada[] = []
  const impl = async (input: string, init?: RequestInit) => {
    chamadas.push({ input, init })
    return resposta()
  }
  return { impl, chamadas }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('salvarIdiomasRequisito', () => {
  test('resposta 2xx resolve e envia o PUT com os requisitos da vaga', async () => {
    const { impl, chamadas } = fetchFalso(async () => json(200, { ok: true }))

    await salvarIdiomasRequisito(VAGA_ID, IDIOMAS, impl)

    assert.equal(chamadas.length, 1)
    assert.equal(
      chamadas[0].input,
      `/api/empregabilidade/vagas/${VAGA_ID}/idiomas-requisito`
    )
    assert.equal(chamadas[0].init?.method, 'PUT')
    assert.deepEqual(JSON.parse(String(chamadas[0].init?.body)), {
      requisitos: [
        {
          id_vaga: VAGA_ID,
          id_idioma: IDIOMAS[0].id_idioma,
          id_nivel_minimo: IDIOMAS[0].id_nivel_minimo,
        },
      ],
    })
  })

  test('resposta 400 lança IdiomasRequisitoError com a mensagem da API', async () => {
    const { impl } = fetchFalso(async () =>
      json(400, { error: 'nível mínimo inválido' })
    )

    await assert.rejects(
      salvarIdiomasRequisito(VAGA_ID, IDIOMAS, impl),
      err => {
        assert.ok(isIdiomasRequisitoError(err))
        assert.equal(err.message, 'nível mínimo inválido')
        assert.equal(err.vagaId, VAGA_ID)
        return true
      }
    )
  })

  test('resposta 500 sem corpo JSON lança com a mensagem padrão', async () => {
    const { impl } = fetchFalso(
      async () => new Response('Internal Server Error', { status: 500 })
    )

    await assert.rejects(
      salvarIdiomasRequisito(VAGA_ID, IDIOMAS, impl),
      err => {
        assert.ok(err instanceof IdiomasRequisitoError)
        assert.equal(err.message, IDIOMAS_REQUISITO_ERRO_PADRAO)
        return true
      }
    )
  })

  test('erro de rede lança IdiomasRequisitoError, com a causa original', async () => {
    const falhaDeRede = new TypeError('Failed to fetch')
    const { impl } = fetchFalso(async () => {
      throw falhaDeRede
    })

    await assert.rejects(
      salvarIdiomasRequisito(VAGA_ID, IDIOMAS, impl),
      err => {
        assert.ok(isIdiomasRequisitoError(err))
        assert.equal(err.message, IDIOMAS_REQUISITO_ERRO_PADRAO)
        assert.equal(err.cause, falhaDeRede)
        return true
      }
    )
  })

  test('outro erro qualquer não é confundido com falha dos idiomas', () => {
    assert.equal(isIdiomasRequisitoError(new Error('outro')), false)
    assert.equal(isIdiomasRequisitoError(null), false)
  })
})

describe('aviso da falha', () => {
  test('não fala em sucesso e manda revisar o bloqueio de idioma', () => {
    const erro = new IdiomasRequisitoError(VAGA_ID, 'falhou')
    for (const acao of ['criada', 'duplicada'] as const) {
      const { title, description } = getIdiomasRequisitoFalhaAviso(acao, erro)
      assert.match(title, new RegExp(`Vaga ${acao}`))
      assert.match(title, /idiomas exigidos não foram salvos/)
      assert.doesNotMatch(`${title} ${description}`, /sucesso/i)
      assert.match(description, /bloqueio de idioma/)
      assert.match(description, /falhou/)
    }
  })

  test('leva à edição da vaga criada', () => {
    assert.equal(
      getVagaEdicaoHref(VAGA_ID),
      `/gorio/empregabilidade/${VAGA_ID}?edit=true`
    )
  })
})

// DEV-744: a edição da vaga chamava o PUT dos idiomas em todo salvamento,
// mesmo sem idioma a gravar nem a remover (critério de idioma desligado numa
// vaga sem idioma), e a falha dessa chamada desnecessária aparecia como
// "Erro ao atualizar requisitos de idioma" para quem editava outro campo.
describe('salvarIdiomasRequisitoDaEdicao', () => {
  test('sem idioma no formulário nem gravado na vaga, não chama o PUT', async () => {
    const { impl, chamadas } = fetchFalso(async () =>
      json(403, { error: 'não deveria ser chamado' })
    )

    for (const gravados of [[], undefined, null]) {
      for (const novos of [[], undefined, null]) {
        assert.equal(
          await salvarIdiomasRequisitoDaEdicao(VAGA_ID, novos, gravados, impl),
          false
        )
      }
    }
    assert.equal(chamadas.length, 0)
  })

  test('com idioma no formulário, grava os idiomas', async () => {
    const { impl, chamadas } = fetchFalso(async () => json(200, { ok: true }))

    assert.equal(
      await salvarIdiomasRequisitoDaEdicao(VAGA_ID, IDIOMAS, [], impl),
      true
    )
    assert.equal(chamadas.length, 1)
    assert.equal(chamadas[0].init?.method, 'PUT')
    assert.equal(
      JSON.parse(String(chamadas[0].init?.body)).requisitos[0].id_idioma,
      IDIOMAS[0].id_idioma
    )
  })

  test('critério desligado numa vaga que tinha idiomas envia a lista vazia, que os remove', async () => {
    const { impl, chamadas } = fetchFalso(async () => json(200, { ok: true }))

    assert.equal(
      await salvarIdiomasRequisitoDaEdicao(VAGA_ID, [], IDIOMAS, impl),
      true
    )
    assert.equal(chamadas.length, 1)
    assert.deepEqual(JSON.parse(String(chamadas[0].init?.body)), {
      requisitos: [],
    })
  })

  test('falha do PUT necessário vira IdiomasRequisitoError com a mensagem da API', async () => {
    const { impl } = fetchFalso(async () =>
      json(403, { error: 'Vaga publicada não pode ser alterada' })
    )

    await assert.rejects(
      salvarIdiomasRequisitoDaEdicao(VAGA_ID, IDIOMAS, IDIOMAS, impl),
      err => {
        assert.ok(isIdiomasRequisitoError(err))
        assert.equal(err.message, 'Vaga publicada não pode ser alterada')
        return true
      }
    )
  })

  test('precisaSalvarIdiomasRequisito só ignora as duas listas vazias', () => {
    assert.equal(precisaSalvarIdiomasRequisito([], []), false)
    assert.equal(precisaSalvarIdiomasRequisito(undefined, undefined), false)
    assert.equal(precisaSalvarIdiomasRequisito(IDIOMAS, []), true)
    assert.equal(precisaSalvarIdiomasRequisito([], IDIOMAS), true)
    assert.equal(precisaSalvarIdiomasRequisito([], 'não é lista'), false)
  })
})

describe('tela de edição da vaga', () => {
  const pagina = readFileSync(
    new URL(
      '../../app/(private)/(app)/gorio/empregabilidade/[empregabilidade-id]/page.tsx',
      import.meta.url
    ),
    'utf8'
  )

  test('grava os idiomas pelo helper que pula o PUT sem nada a gravar', () => {
    assert.match(pagina, /salvarIdiomasRequisitoDaEdicao\(/)
    assert.doesNotMatch(pagina, /\/idiomas-requisito`/)
  })

  test('salvar, salvar rascunho e salvar e publicar usam a mesma gravação', () => {
    const chamadas = pagina.match(
      /await saveIdiomasRequisito\(vaga\.id, data\.idiomas_requisito\)/g
    )
    assert.equal(chamadas?.length, 3)
  })
})
