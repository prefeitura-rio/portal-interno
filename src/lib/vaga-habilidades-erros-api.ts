/**
 * Erros da API nas habilidades e competências da vaga (DEV-685, PREF-664).
 *
 * O app-go-api (DEV-524) recusa as habilidades com 400 e o erro de cada campo
 * em `fields`, nas chaves `areas_atuacao`, `areas_atuacao.conhecimento_ids` e
 * `comportamento_atitudes_ids`. A mensagem cita a área do problema pelo id
 * ("área de atuação 3", "id_area_atuacao 3", "(área 3)", "não encontrada: 3,
 * 5") ou pelo nome ("falta em: Administração"). Estas funções puras levam
 * cada mensagem ao campo do formulário: a área ou os conhecimentos do grupo
 * citado, os comportamentos ou, sem grupo citado, o bloco das áreas.
 */

import type { VagaAreaAtuacaoSelecionada } from './vaga-habilidades'
import type { ErroGrupoHabilidades } from './vaga-habilidades-bloco'

export const CAMPO_API_AREAS = 'areas_atuacao'
export const CAMPO_API_CONHECIMENTOS = 'areas_atuacao.conhecimento_ids'
export const CAMPO_API_COMPORTAMENTOS = 'comportamento_atitudes_ids'

/** Erro de cada campo devolvido pela API (`fields`): campo → mensagem. */
export type CamposErroApi = Record<string, string>

/** Erros da API no bloco, na forma que o componente mostra. */
export interface ErrosApiHabilidades {
  /** Erro das áreas que não cita nenhum grupo da tela. */
  areas?: string
  /** Erro de cada grupo, na mesma ordem das áreas. */
  grupos?: (ErroGrupoHabilidades | undefined)[]
  /** Erro dos comportamentos e atitudes. */
  comportamentos?: string
}

/** Corpo de erro de validação que o BFF repassa ao formulário. */
export interface ErroValidacaoApi {
  error?: string
  fields?: CamposErroApi
}

function isObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Só os pares campo → mensagem em texto, sem mensagem vazia. */
function camposEmTexto(value: unknown): CamposErroApi | undefined {
  if (!isObjeto(value)) return undefined
  const campos: CamposErroApi = {}
  for (const [campo, mensagem] of Object.entries(value)) {
    if (typeof mensagem === 'string' && mensagem.trim() !== '') {
      campos[campo] = mensagem.trim()
    }
  }
  return Object.keys(campos).length > 0 ? campos : undefined
}

/**
 * `fields` de um corpo de erro: o do BFF (`{ error, fields }`) ou o da Go API
 * embrulhado em `message` por rotas antigas (`{ message: { fields } }`).
 */
export function getCamposErroApi(corpo: unknown): CamposErroApi | undefined {
  if (!isObjeto(corpo)) return undefined
  return camposEmTexto(corpo.fields) ?? getCamposErroApi(corpo.message)
}

/**
 * Corpo 400 da Go API saneado para o BFF repassar: só `error` (texto) e
 * `fields` (texto por campo). Qualquer outra coisa da resposta fica de fora.
 */
export function getErroValidacaoApi(corpo: unknown): ErroValidacaoApi {
  const erro: ErroValidacaoApi = {}
  if (!isObjeto(corpo)) return erro
  if (typeof corpo.error === 'string' && corpo.error.trim() !== '') {
    erro.error = corpo.error.trim()
  }
  const fields = camposEmTexto(corpo.fields)
  if (fields) erro.fields = fields
  return erro
}

/** Mensagens dos campos para o resumo do toast. */
export function getDescricaoCamposErroApi(
  campos: CamposErroApi | undefined
): string | undefined {
  if (!campos) return undefined
  const mensagens = [...new Set(Object.values(campos))]
  return mensagens.length > 0 ? mensagens.join(' ') : undefined
}

/**
 * Mensagem do erro para o toast: o `error` do corpo (ou o padrão) seguido das
 * mensagens dos campos, quando há.
 */
export function getMensagemErroApi(corpo: unknown, padrao: string): string {
  const erro =
    isObjeto(corpo) && typeof corpo.error === 'string' && corpo.error.trim()
      ? corpo.error.trim()
      : padrao
  const descricao = getDescricaoCamposErroApi(getCamposErroApi(corpo))
  return descricao ? `${erro} ${descricao}` : erro
}

/** Tira os campos dados do mapa (o usuário mexeu neles). */
export function semCamposErroApi(
  campos: CamposErroApi | undefined,
  remover: string[]
): CamposErroApi | undefined {
  if (!campos) return campos
  if (!remover.some(campo => campo in campos)) return campos
  const restantes: CamposErroApi = {}
  for (const [campo, mensagem] of Object.entries(campos)) {
    if (!remover.includes(campo)) restantes[campo] = mensagem
  }
  return Object.keys(restantes).length > 0 ? restantes : undefined
}

const PADROES_ID_AREA = [
  /área de atuação\s+(\d+)/giu,
  /id_area_atuacao\s+(\d+)/giu,
  /\(área\s+(\d+)\)/giu,
]

/** Ids de área que a mensagem cita. */
export function getAreasCitadas(mensagem: string): Set<number> {
  const ids = new Set<number>()
  const adicionar = (texto: string) => {
    const id = Number(texto)
    if (Number.isSafeInteger(id) && id > 0) ids.add(id)
  }
  for (const padrao of PADROES_ID_AREA) {
    for (const achado of mensagem.matchAll(padrao)) adicionar(achado[1])
  }
  const naoEncontradas = /não encontrada:\s*([\d,\s]+)/iu.exec(mensagem)
  if (naoEncontradas) {
    for (const parte of naoEncontradas[1].split(',')) adicionar(parte.trim())
  }
  return ids
}

function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
}

/** Nomes (ou ids) depois de "falta em:", como a API lista as áreas. */
export function getNomesFaltaEm(mensagem: string): string[] {
  const achado = /falta em:\s*([^)]*)\)/iu.exec(mensagem)
  if (!achado) return []
  return achado[1]
    .split(',')
    .map(nome => nome.trim())
    .filter(nome => nome !== '')
}

/** Índices dos grupos que a mensagem cita, pelo id ou pelo nome da área. */
export function getGruposCitados(
  mensagem: string,
  areas: VagaAreaAtuacaoSelecionada[]
): number[] {
  const ids = getAreasCitadas(mensagem)
  const nomes = new Set(getNomesFaltaEm(mensagem).map(normalizarNome))
  const indices: number[] = []
  areas.forEach((area, indice) => {
    const id = area.id_area_atuacao
    if (typeof id !== 'number') return
    const nome = area.nome
    if (
      ids.has(id) ||
      nomes.has(String(id)) ||
      (nome !== undefined && nome !== '' && nomes.has(normalizarNome(nome)))
    ) {
      indices.push(indice)
    }
  })
  return indices
}

function juntarMensagem(atual: string | undefined, nova: string): string {
  if (!atual || atual === nova) return nova
  return `${atual} ${nova}`
}

/**
 * Erros da API levados aos campos do bloco: `areas_atuacao` vai à área e
 * `areas_atuacao.conhecimento_ids` aos conhecimentos de cada grupo citado (sem
 * grupo citado, ao bloco das áreas), e `comportamento_atitudes_ids` aos
 * comportamentos. Outros campos são ignorados. Devolve `{}` sem erro.
 */
export function getErrosApiHabilidades(
  campos: CamposErroApi | undefined,
  areas: VagaAreaAtuacaoSelecionada[] | undefined
): ErrosApiHabilidades {
  const erros: ErrosApiHabilidades = {}
  if (!campos) return erros
  const lista = areas ?? []
  const grupos: (ErroGrupoHabilidades | undefined)[] = lista.map(
    () => undefined
  )

  const levarAosGrupos = (
    mensagem: string | undefined,
    chave: keyof ErroGrupoHabilidades
  ) => {
    if (!mensagem) return
    const citados = getGruposCitados(mensagem, lista)
    if (citados.length === 0) {
      erros.areas = juntarMensagem(erros.areas, mensagem)
      return
    }
    for (const indice of citados) {
      const erro = grupos[indice] ?? {}
      erro[chave] = juntarMensagem(erro[chave], mensagem)
      grupos[indice] = erro
    }
  }

  levarAosGrupos(campos[CAMPO_API_AREAS], 'area')
  levarAosGrupos(campos[CAMPO_API_CONHECIMENTOS], 'conhecimentos')
  if (grupos.some(Boolean)) erros.grupos = grupos
  if (campos[CAMPO_API_COMPORTAMENTOS]) {
    erros.comportamentos = campos[CAMPO_API_COMPORTAMENTOS]
  }
  return erros
}

/**
 * O erro do formulário (validação local ao publicar) vale antes do da API no
 * mesmo campo; cada campo do grupo é escolhido à parte.
 */
export function mesclarErroGrupo(
  local: ErroGrupoHabilidades | undefined,
  api: ErroGrupoHabilidades | undefined
): ErroGrupoHabilidades | undefined {
  const area = local?.area ?? api?.area
  const conhecimentos = local?.conhecimentos ?? api?.conhecimentos
  if (!area && !conhecimentos) return undefined
  const erro: ErroGrupoHabilidades = {}
  if (area) erro.area = area
  if (conhecimentos) erro.conhecimentos = conhecimentos
  return erro
}
