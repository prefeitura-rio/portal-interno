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
  criado_em?: number
}

/**
 * Quantas vezes o BFF relê a lista esperando o tombamento recém-criado
 * aparecer, e o intervalo entre as leituras (20 x 250 ms = 5 s). A lista da
 * API de busca (Typesense) leva por volta de 1 s para mostrar um registro
 * novo; antes disso, uma checagem de duplicidade não o enxerga.
 */
export const TOMBAMENTO_VISIBILITY_ATTEMPTS = 20
export const TOMBAMENTO_VISIBILITY_DELAY_MS = 250

export const TOMBAMENTO_UNCONFIRMED_MESSAGE =
  'Não foi possível confirmar o tombamento agora. Nada foi gravado; tente novamente em instantes.'

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

const SEQUENTIAL_ID = /^\d+$/

/**
 * Ordena dois tombamentos do mais antigo para o mais novo. A API de busca
 * deixa o Typesense gerar o id, que é sequencial na ordem de escrita: com os
 * dois ids numéricos, vale o id. Fora isso, `criado_em` (segundos) e, por
 * último, o id como texto, para que a ordem seja sempre a mesma.
 */
export function compareTombamentoAge(
  a: TombamentoLike,
  b: TombamentoLike
): number {
  const idA = a.id ?? ''
  const idB = b.id ?? ''
  if (SEQUENTIAL_ID.test(idA) && SEQUENTIAL_ID.test(idB)) {
    const numA = idA.replace(/^0+(?=\d)/, '')
    const numB = idB.replace(/^0+(?=\d)/, '')
    if (numA.length !== numB.length) {
      return numA.length < numB.length ? -1 : 1
    }
    return numA < numB ? -1 : numA > numB ? 1 : 0
  }
  const createdDiff =
    (a.criado_em ?? Number.MAX_SAFE_INTEGER) -
    (b.criado_em ?? Number.MAX_SAFE_INTEGER)
  if (createdDiff !== 0) {
    return createdDiff < 0 ? -1 : 1
  }
  return idA < idB ? -1 : idA > idB ? 1 : 0
}

/**
 * O tombamento que fica quando um serviço novo tem mais de um: o mais antigo.
 * Todo POST concorrente chega à mesma resposta olhando a mesma lista, então
 * só o mais antigo sobrevive e cada um dos outros é apagado por quem o criou.
 */
export function pickSurvivingTombamento<T extends TombamentoLike>(
  tombamentos: readonly T[]
): T | undefined {
  let survivor: T | undefined
  for (const tombamento of tombamentos) {
    if (!survivor || compareTombamentoAge(tombamento, survivor) < 0) {
      survivor = tombamento
    }
  }
  return survivor
}

/**
 * Relê os tombamentos do serviço novo até o registro `createdId` aparecer na
 * lista, e devolve todos os tombamentos do serviço nessa leitura. Uma leitura
 * que falha conta como "ainda não apareceu". Devolve `null` se o registro não
 * aparecer em `attempts` leituras.
 */
export async function waitForTombamentoVisible<T extends TombamentoLike>(
  listService: () => Promise<T[]>,
  createdId: string,
  attempts: number = TOMBAMENTO_VISIBILITY_ATTEMPTS,
  delayMs: number = TOMBAMENTO_VISIBILITY_DELAY_MS,
  sleep: (ms: number) => Promise<void> = ms =>
    new Promise(resolve => setTimeout(resolve, ms))
): Promise<T[] | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const current = await listService()
      if (current.some(tombamento => tombamento.id === createdId)) {
        return current
      }
    } catch {
      // Leitura falhou: tenta de novo até o limite.
    }
    if (attempt < attempts) {
      await sleep(delayMs)
    }
  }
  return null
}

/**
 * Fila por chave: tarefas com a mesma chave rodam uma de cada vez, na ordem em
 * que chegaram; chaves diferentes não esperam umas pelas outras. Vale dentro
 * de um processo; entre réplicas, quem garante é `pickSurvivingTombamento`.
 */
export function createKeyedLock(): <R>(
  key: string,
  task: () => Promise<R>
) => Promise<R> {
  const tails = new Map<string, Promise<unknown>>()

  return async function withLock<R>(
    key: string,
    task: () => Promise<R>
  ): Promise<R> {
    const previous = tails.get(key) ?? Promise.resolve()
    const run = previous.then(task)
    const tail = run.then(
      () => undefined,
      () => undefined
    )
    tails.set(key, tail)
    try {
      return await run
    } finally {
      if (tails.get(key) === tail) {
        tails.delete(key)
      }
    }
  }
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
