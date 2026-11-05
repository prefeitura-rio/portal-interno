import type { EmpregabilidadeCurriculoCompleto } from '@/http-gorio/models'

/**
 * "Habilidades e competências" do currículo, como a ficha do Banco de
 * Currículos exibe (DEV-347). Os itens ficam na ordem em que a API os envia
 * (A–Z); currículos antigos, sem esses campos, viram seção vazia.
 */

export interface ItemHabilidade {
  id?: number
  nome: string
}

export interface HabilidadesDoCurriculo {
  /** Nome da área de atuação, ou `null` quando não informada. */
  areaAtuacao: string | null
  conhecimentos: ItemHabilidade[]
  comportamentosAtitudes: ItemHabilidade[]
}

function nomeDoItem(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const nome = (item as { nome?: unknown }).nome
  return typeof nome === 'string' ? nome.trim() : ''
}

function itensComNome(itens: unknown): ItemHabilidade[] {
  if (!Array.isArray(itens)) return []

  const resultado: ItemHabilidade[] = []
  for (const item of itens) {
    const nome = nomeDoItem(item)
    if (!nome) continue
    const id = (item as { id?: unknown }).id
    resultado.push(typeof id === 'number' ? { id, nome } : { nome })
  }
  return resultado
}

export function habilidadesDoCurriculo(
  curriculo: EmpregabilidadeCurriculoCompleto | null | undefined
): HabilidadesDoCurriculo {
  return {
    areaAtuacao: nomeDoItem(curriculo?.area_atuacao) || null,
    conhecimentos: itensComNome(curriculo?.conhecimentos),
    comportamentosAtitudes: itensComNome(curriculo?.comportamentos_atitudes),
  }
}

/** Sem área, conhecimentos nem comportamentos, a seção mostra só "Não informado". */
export function temHabilidades(habilidades: HabilidadesDoCurriculo): boolean {
  return (
    habilidades.areaAtuacao !== null ||
    habilidades.conhecimentos.length > 0 ||
    habilidades.comportamentosAtitudes.length > 0
  )
}
