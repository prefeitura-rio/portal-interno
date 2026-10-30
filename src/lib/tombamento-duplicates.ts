/**
 * DEV-147: um serviço novo só pode ter um tombamento. A API de busca aceita
 * dois `POST /api/v1/admin/tombamentos` para o mesmo `id_servico_novo`, e a
 * tabela de Serviços Municipais indexava a lista por `id_servico_novo`, então
 * o registro extra sumia da UI e não havia como destombá-lo.
 *
 * Funções puras, usadas pelo BFF (checagem antes de criar) e pela UI (todos os
 * tombamentos de cada serviço), sem dependência de servidor ou navegador.
 */

/** Tamanho de página usado para percorrer a lista de tombamentos. */
export const TOMBAMENTOS_PAGE_SIZE = 100

/**
 * Limite de páginas ao percorrer a lista (10.000 registros com 100 por
 * página). Passar dele é tratado como erro, para nunca concluir "não há
 * tombamento" sobre uma lista incompleta.
 */
export const TOMBAMENTOS_MAX_PAGES = 100

export const TOMBAMENTO_DUPLICATE_MESSAGE =
  'Este serviço já possui um tombamento. Destombe o serviço antes de criar outro tombamento.'

export interface TombamentoLike {
  id?: string
  id_servico_novo: string
}

export interface TombamentosPage<T> {
  /** Total de tombamentos que a busca encontrou. */
  found?: number
  tombamentos?: T[] | null
}

export type FetchTombamentosPage<T> = (
  page: number,
  perPage: number
) => Promise<TombamentosPage<T>>

/**
 * Percorre todas as páginas da lista de tombamentos. Falha (lança) se uma
 * página falhar ou se a lista passar de `maxPages` páginas: quem chama decide
 * o que fazer, e nunca recebe uma lista parcial como se fosse completa.
 */
export async function listAllTombamentos<T>(
  fetchPage: FetchTombamentosPage<T>,
  perPage: number = TOMBAMENTOS_PAGE_SIZE,
  maxPages: number = TOMBAMENTOS_MAX_PAGES
): Promise<T[]> {
  const all: T[] = []

  for (let page = 1; page <= maxPages; page++) {
    const { found, tombamentos } = await fetchPage(page, perPage)
    const items = tombamentos ?? []
    all.push(...items)

    const reachedTotal = typeof found === 'number' && all.length >= found
    if (items.length < perPage || reachedTotal) {
      return all
    }
  }

  throw new Error(
    `Lista de tombamentos maior que ${maxPages * perPage} registros`
  )
}

/** Todos os tombamentos do serviço novo, na ordem em que vieram. */
export function findTombamentosByNewService<T extends TombamentoLike>(
  tombamentos: readonly T[],
  idServicoNovo: string
): T[] {
  return tombamentos.filter(
    tombamento => tombamento.id_servico_novo === idServicoNovo
  )
}

/**
 * Agrupa os tombamentos por `id_servico_novo`, sem descartar nenhum: um
 * serviço com dois registros (criados antes desta checagem) fica com os dois.
 */
export function groupTombamentosByNewService<T extends TombamentoLike>(
  tombamentos: readonly T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const tombamento of tombamentos) {
    const current = grouped.get(tombamento.id_servico_novo)
    if (current) {
      current.push(tombamento)
    } else {
      grouped.set(tombamento.id_servico_novo, [tombamento])
    }
  }
  return grouped
}
