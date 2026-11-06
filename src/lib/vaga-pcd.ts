/**
 * Critério PcD da vaga de empregabilidade (DEV-408, história PREF-632).
 *
 * O formulário troca "Vaga PcD", "Acessibilidade PcD" e "Tipo de Deficiência
 * (PcD)" por uma pergunta de 3 opções, gravada no app-go-api como `opcao_pcd`
 * (DEV-407), com os tipos de deficiência aceitos em `tipos_pcd` e o bloqueio
 * de candidatura na chave `pcd` de `criterios_bloqueio`. O bloqueio só vale
 * para a vaga exclusiva; vaga exclusiva sem nenhum tipo é recusada pela API.
 *
 * DEV-422 (ajustes da homologação do PREF-632/640): marcar a exclusiva já liga
 * o bloqueio, sem o alerta e o botão "Ativar bloqueio" da DEV-408.
 */

export const OPCOES_PCD = ['aberta', 'preferencial', 'exclusiva'] as const

export type OpcaoPcd = (typeof OPCOES_PCD)[number]

export const OPCAO_PCD_PADRAO: OpcaoPcd = 'aberta'

export const OPCAO_PCD_LABEL: Record<OpcaoPcd, string> = {
  aberta: 'Não, é aberta a todos',
  preferencial: 'Preferencial para PcD',
  exclusiva: 'Exclusiva para PcD',
}

/** Linha de descrição de cada opção (DEV-422). */
export const OPCAO_PCD_DESCRICAO: Record<OpcaoPcd, string> = {
  aberta: 'Sem destaque nem restrição para PcD.',
  preferencial: 'Destaca a vaga para PcD. Qualquer pessoa pode se candidatar.',
  exclusiva: 'Só se candidata quem declarou ser PcD no cadastro.',
}

export const PCD_TITULO = 'Pessoas com deficiência'

export const PCD_PERGUNTA_LABEL = 'Esta vaga é para pessoas com deficiência?'

/** Aviso curto abaixo da opção exclusiva (DEV-422). */
export const PCD_EXCLUSIVA_AVISO =
  'Quem não declarou deficiência no cadastro não consegue se candidatar.'

/** Rótulo do campo de tipos, por opção que aceita tipos (DEV-422). */
export const TIPOS_PCD_LABEL: Record<'preferencial' | 'exclusiva', string> = {
  preferencial: 'Tipos de deficiência',
  exclusiva: 'Tipos de deficiência aceitos',
}

/** Texto de apoio abaixo do campo de tipos, por opção (DEV-422). */
export const TIPOS_PCD_APOIO: Record<'preferencial' | 'exclusiva', string> = {
  preferencial: 'Os tipos aparecem como destaque na vaga.',
  exclusiva:
    'Marque "Todos os tipos" para aceitar qualquer pessoa que declarou deficiência.',
}

export const TIPOS_PCD_PLACEHOLDER = 'Selecione os tipos'

export const TODOS_OS_TIPOS_PCD_LABEL = 'Todos os tipos'

/** Mesma mensagem que o app-go-api devolve no 400 (DEV-407). */
export const TIPO_PCD_OBRIGATORIO_MENSAGEM =
  'Selecione ao menos um tipo de deficiência.'

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

/**
 * Bloqueio PcD (tag e corpo da API): a vaga exclusiva bloqueia sempre e as
 * outras nunca (DEV-422). Vaga exclusiva gravada sem o bloqueio (criada antes
 * da DEV-422) passa a tê-lo ao ser salva ou duplicada.
 */
export function isBloqueioPcdAtivo(opcao: OpcaoPcd | undefined): boolean {
  return opcao === 'exclusiva'
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

/**
 * Chips do campo de tipos: "Todos os tipos" quando todos os disponíveis estão
 * marcados; senão o rótulo de cada tipo marcado, na ordem dos disponíveis.
 */
export function getChipsTiposPcd(
  tiposSelecionados: readonly string[],
  tiposDisponiveis: readonly { id: string; label: string }[]
): string[] {
  const ids = tiposDisponiveis.map(tipo => tipo.id)
  if (isTodosTiposPcdSelecionados(tiposSelecionados, ids)) {
    return [TODOS_OS_TIPOS_PCD_LABEL]
  }
  return tiposDisponiveis
    .filter(tipo => tiposSelecionados.includes(tipo.id))
    .map(tipo => tipo.label)
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
