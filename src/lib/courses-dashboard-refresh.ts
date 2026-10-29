/**
 * Revalidação periódica do Dashboard de Capacitações (DEV-106).
 *
 * A Casa Civil pediu que os números da página (cards de pipeline e tabela
 * por secretaria) se atualizem sozinhos ao menos uma vez a cada 2 horas,
 * sem recarregar a página nem clicar em "Atualizar".
 *
 * Este módulo não depende do React nem do Next, para ser testado com os
 * timers falsos do `node:test`.
 */

/** Intervalo da revalidação automática: 2 horas, o máximo pedido. */
export const COURSES_DASHBOARD_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000

/**
 * Opções do TanStack Query para o consolidado por secretaria. A revalidação
 * vale também com a aba em segundo plano: quem deixa o dashboard aberto em
 * outra aba volta e encontra números de no máximo 2 horas atrás.
 */
export const COURSES_DASHBOARD_REFRESH_QUERY_OPTIONS = {
  refetchInterval: COURSES_DASHBOARD_REFRESH_INTERVAL_MS,
  refetchIntervalInBackground: true,
} as const

/**
 * Chama `refresh` a cada `intervalMs` e devolve a função que para o timer
 * (para o cleanup do `useEffect`). Intervalo ausente, não finito ou não
 * positivo não agenda nada.
 */
export function startPeriodicRefresh(
  refresh: () => void,
  intervalMs: number | undefined
): () => void {
  if (
    intervalMs === undefined ||
    !Number.isFinite(intervalMs) ||
    intervalMs <= 0
  ) {
    return () => {}
  }

  const handle = setInterval(refresh, intervalMs)
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    clearInterval(handle)
  }
}
