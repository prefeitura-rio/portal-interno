import assert from 'node:assert/strict'
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
  salvarIdiomasRequisito,
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
