import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-685 (PREF-664): o erro da API (400 com `fields`, DEV-524) em cada
// habilidade vai ao campo do grupo citado. As mensagens abaixo são as que o
// app-go-api monta (vaga_habilidades_competencias.go), com ids sintéticos.

registerSrcLoader()
const {
  CAMPO_API_AREAS,
  CAMPO_API_COMPORTAMENTOS,
  CAMPO_API_CONHECIMENTOS,
  getAreasCitadas,
  getCamposErroApi,
  getDescricaoCamposErroApi,
  getErroValidacaoApi,
  getErrosApiHabilidades,
  getGruposCitados,
  getMensagemErroApi,
  getNomesFaltaEm,
  mesclarErroGrupo,
  semCamposErroApi,
} = await import('../vaga-habilidades-erros-api.ts')

const TI = 3
const ADM = 5
const AREAS = [
  { id_area_atuacao: TI, conhecimento_ids: [100], nome: 'Tecnologia' },
  { id_area_atuacao: ADM, conhecimento_ids: [200], nome: 'Administração' },
  { id_area_atuacao: null, conhecimento_ids: [] },
]

const MSG_REPETIDA = `Área de atuação repetida na vaga (id_area_atuacao ${ADM}): informe cada área uma vez, com todos os conhecimentos dela.`
const MSG_NAO_ENCONTRADA = `Área de atuação não encontrada: ${TI}, ${ADM}.`
const MSG_FORA_DA_AREA = `Cada conhecimento precisa ser da área em que foi marcado: conhecimento 900 não pertence à área de atuação ${ADM}.`
const MSG_MAX_CONHECIMENTOS = `Informe no máximo 300 conhecimentos por área de atuação (área ${TI}).`
const MSG_FALTA_EM =
  'Informe ao menos um conhecimento em cada área de atuação (falta em: Administração).'
const MSG_MAX_AREAS = 'Informe no máximo 50 áreas de atuação por vaga.'
const MSG_COMPORTAMENTO = 'Comportamento ou atitude não encontrado: 77.'

describe('áreas citadas na mensagem da API', () => {
  test('lê os ids nos formatos da API', () => {
    assert.deepEqual([...getAreasCitadas(MSG_REPETIDA)], [ADM])
    assert.deepEqual([...getAreasCitadas(MSG_NAO_ENCONTRADA)], [TI, ADM])
    assert.deepEqual([...getAreasCitadas(MSG_FORA_DA_AREA)], [ADM])
    assert.deepEqual([...getAreasCitadas(MSG_MAX_CONHECIMENTOS)], [TI])
    assert.deepEqual(
      [...getAreasCitadas('Conhecimento inválido na área de atuação 3: 0.')],
      [3]
    )
  })

  test('não confunde o id do conhecimento nem o limite com a área', () => {
    assert.equal(getAreasCitadas(MSG_FORA_DA_AREA).has(900), false)
    assert.equal(getAreasCitadas(MSG_MAX_AREAS).size, 0)
    assert.equal(getAreasCitadas(MSG_MAX_CONHECIMENTOS).has(300), false)
  })

  test('lê os nomes depois de "falta em:"', () => {
    assert.deepEqual(getNomesFaltaEm(MSG_FALTA_EM), ['Administração'])
    assert.deepEqual(getNomesFaltaEm('... (falta em: Tecnologia, 5).'), [
      'Tecnologia',
      '5',
    ])
    assert.deepEqual(getNomesFaltaEm(MSG_REPETIDA), [])
  })

  test('acha o grupo pelo id ou pelo nome (sem acento e sem caixa)', () => {
    assert.deepEqual(getGruposCitados(MSG_FORA_DA_AREA, AREAS), [1])
    assert.deepEqual(getGruposCitados(MSG_NAO_ENCONTRADA, AREAS), [0, 1])
    assert.deepEqual(getGruposCitados('(falta em: administracao).', AREAS), [1])
    assert.deepEqual(getGruposCitados('(falta em: 3).', AREAS), [0])
    assert.deepEqual(getGruposCitados(MSG_MAX_AREAS, AREAS), [])
  })
})

describe('getErrosApiHabilidades', () => {
  test('erro de área vai à área do grupo citado', () => {
    const erros = getErrosApiHabilidades(
      { [CAMPO_API_AREAS]: MSG_REPETIDA },
      AREAS
    )
    assert.deepEqual(erros, {
      grupos: [undefined, { area: MSG_REPETIDA }, undefined],
    })
  })

  test('erro de conhecimento vai aos conhecimentos do grupo citado', () => {
    const erros = getErrosApiHabilidades(
      { [CAMPO_API_CONHECIMENTOS]: MSG_FORA_DA_AREA },
      AREAS
    )
    assert.deepEqual(erros.grupos, [
      undefined,
      { conhecimentos: MSG_FORA_DA_AREA },
      undefined,
    ])
    assert.equal(erros.areas, undefined)
  })

  test('cita vários grupos: cada um recebe a mensagem', () => {
    const erros = getErrosApiHabilidades(
      { [CAMPO_API_AREAS]: MSG_NAO_ENCONTRADA },
      AREAS
    )
    assert.equal(erros.grupos?.[0]?.area, MSG_NAO_ENCONTRADA)
    assert.equal(erros.grupos?.[1]?.area, MSG_NAO_ENCONTRADA)
    assert.equal(erros.grupos?.[2], undefined)
  })

  test('sem grupo citado, o erro fica no bloco das áreas', () => {
    assert.deepEqual(
      getErrosApiHabilidades({ [CAMPO_API_AREAS]: MSG_MAX_AREAS }, AREAS),
      { areas: MSG_MAX_AREAS }
    )
    assert.deepEqual(
      getErrosApiHabilidades(
        { [CAMPO_API_AREAS]: 'Adicione ao menos uma área de atuação.' },
        []
      ),
      { areas: 'Adicione ao menos uma área de atuação.' }
    )
  })

  test('comportamentos vão ao campo de comportamentos', () => {
    assert.deepEqual(
      getErrosApiHabilidades(
        { [CAMPO_API_COMPORTAMENTOS]: MSG_COMPORTAMENTO },
        AREAS
      ),
      { comportamentos: MSG_COMPORTAMENTO }
    )
  })

  test('área e conhecimento no mesmo grupo, e outros campos ignorados', () => {
    const erros = getErrosApiHabilidades(
      {
        [CAMPO_API_AREAS]: MSG_REPETIDA,
        [CAMPO_API_CONHECIMENTOS]: MSG_FALTA_EM,
        titulo: 'Título é obrigatório.',
      },
      AREAS
    )
    assert.deepEqual(erros, {
      grupos: [
        undefined,
        { area: MSG_REPETIDA, conhecimentos: MSG_FALTA_EM },
        undefined,
      ],
    })
  })

  test('sem campos (ou sem erro das habilidades) devolve {}', () => {
    assert.deepEqual(getErrosApiHabilidades(undefined, AREAS), {})
    assert.deepEqual(getErrosApiHabilidades({ titulo: 'x' }, AREAS), {})
  })
})

describe('corpo do erro', () => {
  test('lê `fields` do BFF e o da Go API embrulhado em `message`', () => {
    assert.deepEqual(
      getCamposErroApi({ error: 'x', fields: { areas_atuacao: 'a' } }),
      { areas_atuacao: 'a' }
    )
    assert.deepEqual(
      getCamposErroApi({ message: { fields: { areas_atuacao: 'a' } } }),
      { areas_atuacao: 'a' }
    )
  })

  test('descarta o que não é mensagem em texto', () => {
    assert.equal(getCamposErroApi(null), undefined)
    assert.equal(getCamposErroApi({ fields: 'texto' }), undefined)
    assert.equal(getCamposErroApi({ fields: { a: 1, b: ' ' } }), undefined)
    assert.deepEqual(getCamposErroApi({ fields: { a: 1, b: ' ok ' } }), {
      b: 'ok',
    })
    assert.equal(getCamposErroApi({ fields: ['a'] }), undefined)
  })

  test('o BFF repassa só `error` e `fields` em texto', () => {
    assert.deepEqual(
      getErroValidacaoApi({
        error: 'Dados inválidos.',
        fields: { areas_atuacao: MSG_REPETIDA, outro: { x: 1 } },
        stack: 'interno',
      }),
      { error: 'Dados inválidos.', fields: { areas_atuacao: MSG_REPETIDA } }
    )
    assert.deepEqual(getErroValidacaoApi('texto'), {})
    assert.deepEqual(getErroValidacaoApi({ error: 42 }), {})
  })

  test('mensagem do toast com os campos', () => {
    assert.equal(
      getMensagemErroApi(
        { error: 'Dados inválidos.', fields: { a: 'Um.', b: 'Dois.' } },
        'Erro ao salvar vaga'
      ),
      'Dados inválidos. Um. Dois.'
    )
    assert.equal(
      getMensagemErroApi({}, 'Erro ao salvar vaga'),
      'Erro ao salvar vaga'
    )
    assert.equal(getDescricaoCamposErroApi({ a: 'Um.', b: 'Um.' }), 'Um.')
    assert.equal(getDescricaoCamposErroApi(undefined), undefined)
  })
})

describe('ao mexer no campo', () => {
  test('tira só os campos dados', () => {
    const campos = {
      [CAMPO_API_AREAS]: 'a',
      [CAMPO_API_CONHECIMENTOS]: 'c',
      [CAMPO_API_COMPORTAMENTOS]: 'b',
    }
    assert.deepEqual(
      semCamposErroApi(campos, [CAMPO_API_AREAS, CAMPO_API_CONHECIMENTOS]),
      { [CAMPO_API_COMPORTAMENTOS]: 'b' }
    )
    assert.equal(semCamposErroApi(campos, ['titulo']), campos)
    assert.equal(
      semCamposErroApi({ [CAMPO_API_COMPORTAMENTOS]: 'b' }, [
        CAMPO_API_COMPORTAMENTOS,
      ]),
      undefined
    )
    assert.equal(semCamposErroApi(undefined, [CAMPO_API_AREAS]), undefined)
  })

  test('o erro da validação local vale antes do da API, campo a campo', () => {
    assert.deepEqual(
      mesclarErroGrupo(
        { area: 'local' },
        { area: 'api', conhecimentos: 'api' }
      ),
      { area: 'local', conhecimentos: 'api' }
    )
    assert.deepEqual(mesclarErroGrupo(undefined, { conhecimentos: 'api' }), {
      conhecimentos: 'api',
    })
    assert.equal(mesclarErroGrupo(undefined, undefined), undefined)
  })
})
