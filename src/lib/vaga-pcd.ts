/**
 * Critério PcD da vaga de empregabilidade (DEV-408, história PREF-632).
 *
 * O formulário troca "Vaga PcD", "Acessibilidade PcD" e "Tipo de Deficiência
 * (PcD)" por uma pergunta de 3 opções, gravada no app-go-api como `opcao_pcd`
 * (DEV-407), com os tipos de deficiência aceitos em `tipos_pcd` e o bloqueio
 * de candidatura na chave `pcd` de `criterios_bloqueio`. O bloqueio só vale
 * para a vaga exclusiva; vaga exclusiva sem nenhum tipo é recusada pela API.
 */

export const OPCOES_PCD = ['aberta', 'preferencial', 'exclusiva'] as const

export type OpcaoPcd = (typeof OPCOES_PCD)[number]

export const OPCAO_PCD_PADRAO: OpcaoPcd = 'aberta'

export const OPCAO_PCD_LABEL: Record<OpcaoPcd, string> = {
  aberta: 'Não, é aberta a todos',
  preferencial: 'Preferencial para PcD',
  exclusiva: 'Exclusiva para PcD',
}

export const PCD_PERGUNTA_LABEL =
  'A vaga é destinada a pessoas com deficiência (PcD)?'

export const TODOS_OS_TIPOS_PCD_LABEL = 'Todos os tipos'

/** Mesma mensagem que o app-go-api devolve no 400 (DEV-407). */
export const TIPO_PCD_OBRIGATORIO_MENSAGEM =
  'Selecione ao menos um tipo de deficiência.'

export const BLOQUEIO_PCD_AVISO_TITULO = 'Bloqueio ainda não ativado'

export const ATIVAR_BLOQUEIO_PCD_LABEL = 'Ativar bloqueio'

/** Chave do critério PcD em `criterios_bloqueio`. */
export const CRITERIO_BLOQUEIO_PCD = 'pcd'

export function isOpcaoPcd(value: unknown): value is OpcaoPcd {
  return (
    typeof value === 'string' &&
    (OPCOES_PCD as readonly string[]).includes(value)
  )
}

/**
 * Opção PcD de uma vaga lida da API. Usa `opcao_pcd`; sem ele (resposta de
 * uma API anterior à DEV-407) aplica o mesmo de/para da migração ao campo
 * descontinuado `acessibilidade_pcd`: sem valor é aberta, `exclusivo_pcd` é
 * exclusiva e qualquer outro valor (`preferencial_pcd`, `para_pcd`) é
 * preferencial.
 */
export function getOpcaoPcdDaVaga(vaga: {
  opcao_pcd?: unknown
  acessibilidade_pcd?: unknown
}): OpcaoPcd {
  if (isOpcaoPcd(vaga.opcao_pcd)) return vaga.opcao_pcd
  const acessibilidade = vaga.acessibilidade_pcd
  if (typeof acessibilidade !== 'string' || acessibilidade === '') {
    return OPCAO_PCD_PADRAO
  }
  return acessibilidade === 'exclusivo_pcd' ? 'exclusiva' : 'preferencial'
}

/**
 * Estado gravado do bloqueio PcD: a chave `pcd` em `criterios_bloqueio` da
 * vaga (campo que o cliente Orval ainda não descreve).
 */
export function getBloqueioPcdDaVaga(vaga: object): boolean {
  const criterios =
    'criterios_bloqueio' in vaga ? vaga.criterios_bloqueio : undefined
  return Array.isArray(criterios) && criterios.includes(CRITERIO_BLOQUEIO_PCD)
}

/** A lista de tipos de deficiência aparece na vaga preferencial e na exclusiva. */
export function aceitaTiposPcd(opcao: OpcaoPcd | undefined): boolean {
  return opcao === 'preferencial' || opcao === 'exclusiva'
}

/** Vaga exclusiva sem nenhum tipo de deficiência marcado. */
export function faltaTipoPcd(
  opcao: OpcaoPcd | undefined,
  tiposSelecionados: readonly string[] | undefined | null
): boolean {
  return opcao === 'exclusiva' && (tiposSelecionados?.length ?? 0) === 0
}

/** Bloqueio PcD que vai à API: só a vaga exclusiva bloqueia. */
export function isBloqueioPcdAtivo(
  opcao: OpcaoPcd | undefined,
  bloqueio: boolean | undefined
): boolean {
  return opcao === 'exclusiva' && bloqueio === true
}

/** Alerta "Bloqueio ainda não ativado": vaga exclusiva com o bloqueio desligado. */
export function mostraAvisoBloqueioPcd(
  opcao: OpcaoPcd | undefined,
  bloqueio: boolean | undefined
): boolean {
  return opcao === 'exclusiva' && bloqueio !== true
}

/**
 * Tipos de deficiência no formato do corpo da vaga. Sempre um array, porque no
 * PUT o campo ausente mantém os tipos gravados e só `[]` remove; vaga aberta
 * não aceita tipo, então vai `[]`.
 */
export function getTiposPcdParaApi(
  opcao: OpcaoPcd | undefined,
  tiposSelecionados: readonly string[] | undefined | null
): { id: string }[] {
  if (!aceitaTiposPcd(opcao)) return []
  const ids = (tiposSelecionados ?? []).filter(id => id.trim() !== '')
  return Array.from(new Set(ids)).map(id => ({ id }))
}

/** "Todos os tipos" fica marcado quando todos os tipos disponíveis estão. */
export function isTodosTiposPcdSelecionados(
  tiposSelecionados: readonly string[],
  tiposDisponiveis: readonly string[]
): boolean {
  return (
    tiposDisponiveis.length > 0 &&
    tiposDisponiveis.every(id => tiposSelecionados.includes(id))
  )
}

/** Marcar "Todos os tipos" seleciona todos; desmarcar limpa a seleção. */
export function alternarTodosTiposPcd(
  marcar: boolean,
  tiposDisponiveis: readonly string[]
): string[] {
  return marcar ? [...tiposDisponiveis] : []
}

export function alternarTipoPcd(
  tiposSelecionados: readonly string[],
  id: string,
  marcar: boolean
): string[] {
  if (marcar) {
    return tiposSelecionados.includes(id)
      ? [...tiposSelecionados]
      : [...tiposSelecionados, id]
  }
  return tiposSelecionados.filter(selecionado => selecionado !== id)
}
