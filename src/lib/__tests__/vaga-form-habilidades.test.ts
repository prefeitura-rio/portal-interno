import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import { registerSrcLoader } from './support/register-src-loader.ts'

// DEV-685 (PREF-664): o bloco "Habilidades e competências" ligado ao
// formulário de vaga (Nova vaga e Editar vaga usam o mesmo componente):
// posição, valores padrão, obrigatoriedade ao publicar/enviar e não no
// rascunho, edição, duplicação e vaga antiga. Dados sintéticos.

const FORM_URL = new URL(
  '../../app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form.tsx',
  import.meta.url
)
const EDIT_PAGE_URL = new URL(
  '../../app/(private)/(app)/gorio/empregabilidade/[empregabilidade-id]/page.tsx',
  import.meta.url
)
const NEW_PAGE_URL = new URL(
  '../../app/(private)/(app)/gorio/empregabilidade/new/page.tsx',
  import.meta.url
)

registerSrcLoader()
const vagaForm = await import(FORM_URL.href)
const {
  ERRO_AREA_DO_GRUPO,
  ERRO_AREA_OBRIGATORIA,
  ERRO_AREA_REPETIDA,
  ERRO_COMPORTAMENTO_OBRIGATORIO,
  ERRO_CONHECIMENTO_OBRIGATORIO,
} = await import('../vaga-habilidades-bloco.ts')
const { getVagaHabilidadesDaVaga, getVagaHabilidadesParaApi } = await import(
  '../vaga-habilidades.ts'
)

const fonteForm = readFileSync(FORM_URL, 'utf8')

const RASCUNHO = {
  titulo: 'Vaga de teste',
  descricao: 'Descrição sintética',
  contratante: 'empresa-teste',
  regime_contratacao: 'clt',
  modelo_trabalho: 'presencial',
}
const PUBLICACAO_SEM_HABILIDADES = {
  ...RASCUNHO,
  bairro: 'Centro',
  data_limite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  id_orgao_parceiro: 'orgao-teste',
  requisitos: 'Requisitos sintéticos',
  responsabilidades: 'Responsabilidades sintéticas',
}
const DUAS_AREAS = [
  { id_area_atuacao: 3, conhecimento_ids: [10, 11] },
  { id_area_atuacao: 5, conhecimento_ids: [20] },
]

interface Issue {
  path: PropertyKey[]
  message: string
}

function issuesDeHabilidades(dados: Record<string, unknown>): Issue[] {
  const result = vagaForm.publishValidationSchema.safeParse(dados)
  if (result.success) return []
  return (result.error.issues as Issue[]).filter(
    issue =>
      issue.path[0] === 'areas_atuacao' ||
      issue.path[0] === 'comportamento_atitudes_ids'
  )
}

function mensagens(issues: Issue[]): string[] {
  return issues.map(issue => issue.message)
}

describe('posição do bloco no formulário', () => {
  const colunaEsquerda = fonteForm.indexOf('{/* Coluna Esquerda */}')
  const colunaDireita = fonteForm.indexOf('{/* Coluna Direita */}')
  const bloco = fonteForm.indexOf('<HabilidadesCompetenciasForm')
  const requisitos = fonteForm.indexOf('name="requisitos"')

  test('um só bloco, na coluna direita', () => {
    assert.ok(colunaEsquerda >= 0 && colunaDireita > colunaEsquerda)
    assert.equal(fonteForm.split('<HabilidadesCompetenciasForm').length - 1, 1)
    assert.ok(bloco > colunaDireita)
  })

  test('acima de "Requisitos", como primeiro campo da coluna direita', () => {
    assert.ok(requisitos > colunaDireita)
    assert.ok(bloco < requisitos)
    assert.doesNotMatch(
      fonteForm.slice(colunaDireita, bloco),
      /<FormField|<FormItem/
    )
  })

  test('Nova vaga e Editar vaga usam o mesmo formulário', () => {
    for (const url of [NEW_PAGE_URL, EDIT_PAGE_URL]) {
      const fonte = readFileSync(url, 'utf8')
      assert.match(fonte, /<NewEmpregabilidadeForm\b/)
      assert.match(fonte, /errosCamposApi=\{errosCamposApi\}/)
    }
  })
})

describe('valores padrão da vaga nova', () => {
  test('áreas e comportamentos começam vazios', () => {
    const padrao = fonteForm.slice(
      fonteForm.indexOf("titulo: '',"),
      fonteForm.indexOf("mode: 'onChange'")
    )
    assert.match(padrao, /areas_atuacao: \[\],/)
    assert.match(padrao, /comportamento_atitudes_ids: \[\],/)
  })

  test('o schema do formulário aceita as duas listas', () => {
    assert.equal(
      vagaForm.publishValidationSchema.safeParse({
        ...PUBLICACAO_SEM_HABILIDADES,
        areas_atuacao: DUAS_AREAS,
        comportamento_atitudes_ids: [1],
      }).success,
      true
    )
  })
})

describe('publicar e enviar para aprovação exigem as habilidades', () => {
  test('sem nenhuma área nem comportamento (vaga nova, valores padrão)', () => {
    const issues = issuesDeHabilidades({
      ...PUBLICACAO_SEM_HABILIDADES,
      areas_atuacao: [],
      comportamento_atitudes_ids: [],
    })
    assert.deepEqual(
      issues.map(issue => [issue.path, issue.message]),
      [
        [['areas_atuacao'], ERRO_AREA_OBRIGATORIA],
        [['comportamento_atitudes_ids'], ERRO_COMPORTAMENTO_OBRIGATORIO],
      ]
    )
  })

  test('cada área precisa de área escolhida e de um conhecimento', () => {
    assert.deepEqual(
      mensagens(
        issuesDeHabilidades({
          ...PUBLICACAO_SEM_HABILIDADES,
          areas_atuacao: [
            { id_area_atuacao: 3, conhecimento_ids: [] },
            { id_area_atuacao: null, conhecimento_ids: [] },
          ],
          comportamento_atitudes_ids: [1],
        })
      ),
      [ERRO_CONHECIMENTO_OBRIGATORIO, ERRO_AREA_DO_GRUPO]
    )
  })

  test('área repetida é recusada', () => {
    assert.deepEqual(
      mensagens(
        issuesDeHabilidades({
          ...PUBLICACAO_SEM_HABILIDADES,
          areas_atuacao: [
            { id_area_atuacao: 3, conhecimento_ids: [10] },
            { id_area_atuacao: 3, conhecimento_ids: [11] },
          ],
          comportamento_atitudes_ids: [1],
        })
      ),
      [ERRO_AREA_REPETIDA]
    )
  })

  test('o rascunho salva sem exigir nada', () => {
    for (const habilidades of [
      {},
      { areas_atuacao: [], comportamento_atitudes_ids: [] },
      {
        areas_atuacao: [{ id_area_atuacao: null, conhecimento_ids: [] }],
      },
    ]) {
      assert.equal(
        vagaForm.draftValidationSchema.safeParse({
          ...RASCUNHO,
          ...habilidades,
        }).success,
        true
      )
    }
  })
})

describe('edição, rascunho, duplicar e vaga antiga', () => {
  const VAGA = {
    id: 'vaga-sintetica',
    areas_atuacao: [
      {
        id_area_atuacao: 3,
        nome: 'Tecnologia',
        conhecimento_ids: [10, 11],
        conhecimentos: [
          { id: 10, nome: 'Linux' },
          { id: 11, nome: 'SQL' },
        ],
      },
      {
        id_area_atuacao: 5,
        nome: 'Administração',
        conhecimento_ids: [20],
        conhecimentos: [{ id: 20, nome: 'Rotinas' }],
      },
    ],
    comportamento_atitudes_ids: [1, 2],
    comportamentos_atitudes: [
      { id: 1, nome: 'Trabalho em equipe' },
      { id: 2, nome: 'Proatividade' },
    ],
  }

  test('a edição carrega todas as áreas salvas, com os conhecimentos', () => {
    const valores = getVagaHabilidadesDaVaga(VAGA)
    assert.deepEqual(
      valores.areas_atuacao?.map(area => [
        area.id_area_atuacao,
        area.conhecimento_ids,
      ]),
      [
        [3, [10, 11]],
        [5, [20]],
      ]
    )
    assert.deepEqual(valores.comportamento_atitudes_ids, [1, 2])
  })

  test('rascunho e duplicar reenviam todas as áreas e comportamentos', () => {
    assert.deepEqual(
      getVagaHabilidadesParaApi(getVagaHabilidadesDaVaga(VAGA)),
      {
        areas_atuacao: DUAS_AREAS,
        comportamento_atitudes_ids: [1, 2],
      }
    )
  })

  test('vaga antiga abre vazia e passa a exigir para publicar', () => {
    for (const antiga of [
      { areas_atuacao: [], comportamento_atitudes_ids: [] },
      { id: 'vaga-sem-campos' },
    ]) {
      const valores = getVagaHabilidadesDaVaga(antiga)
      assert.deepEqual(valores.areas_atuacao ?? [], [])
      assert.deepEqual(
        mensagens(
          issuesDeHabilidades({ ...PUBLICACAO_SEM_HABILIDADES, ...valores })
        ),
        [ERRO_AREA_OBRIGATORIA, ERRO_COMPORTAMENTO_OBRIGATORIO]
      )
    }
  })
})
