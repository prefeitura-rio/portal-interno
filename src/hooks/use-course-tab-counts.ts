import {
  type CourseTab,
  type CourseTabCounts,
  fetchCourseTabCounts,
} from '@/lib/courses-tab-counts'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseCourseTabCountsParams {
  /** Abas exibidas para o usuário (só elas são contadas) */
  tabs: readonly CourseTab[]
  /** Busca parcial no título do curso */
  search?: string
}

export interface UseCourseTabCountsResult {
  counts: CourseTabCounts
  loading: boolean
  refetch: () => void
}

/**
 * Total de cursos de cada aba da listagem de cursos, com a mesma busca da
 * tabela.
 */
export function useCourseTabCounts(
  params: UseCourseTabCountsParams
): UseCourseTabCountsResult {
  const { tabs, search } = params
  // Chave estável para não refazer a consulta a cada render
  const tabsKey = tabs.join(',')
  const [counts, setCounts] = useState<CourseTabCounts>({})
  const [loading, setLoading] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const fetchCounts = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    const result = await fetchCourseTabCounts(
      tabsKey ? (tabsKey.split(',') as CourseTab[]) : [],
      { search },
      fetch,
      window.location.origin,
      controller.signal
    )

    // Ignora respostas de uma consulta substituída por outra mais nova
    if (controller.signal.aborted) return
    setCounts(result)
    setLoading(false)
  }, [tabsKey, search])

  useEffect(() => {
    fetchCounts()
    return () => controllerRef.current?.abort()
  }, [fetchCounts])

  return { counts, loading, refetch: fetchCounts }
}
