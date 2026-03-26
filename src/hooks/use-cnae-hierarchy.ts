import type { ModelsCNAE } from '@/http-rmi/models/modelsCNAE'
import { useEffect, useState } from 'react'

interface CNAEHierarchyOption {
  value: string
  label: string
  fullData?: ModelsCNAE
}

interface UseCNAEHierarchyOptions {
  secao?: string
  divisao?: string
  grupo?: string
  classe?: string
  enabled?: boolean
}

export function useCNAESecoes() {
  const [secoes, setSecoes] = useState<CNAEHierarchyOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchSecoes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/cnaes?per_page=1000')

        if (!response.ok) {
          throw new Error('Failed to fetch seções')
        }

        const result = await response.json()
        const data = result?.cnaes || []
        // Extract unique seções
        const uniqueSecoes = Array.from(
          new Set(
            data
              .filter((item: ModelsCNAE) => item.secao)
              .map((item: ModelsCNAE) => item.secao!)
          )
        ).sort() as string[]

        setSecoes(
          uniqueSecoes.map(secao => ({
            value: secao,
            label: `Seção ${secao}`,
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSecoes()
  }, [])

  return {
    secoes,
    isLoading,
    error,
  }
}

export function useCNAEDivisoes(options?: UseCNAEHierarchyOptions) {
  const { secao, enabled = true } = options || {}
  const [divisoes, setDivisoes] = useState<CNAEHierarchyOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !secao) {
      setDivisoes([])
      return
    }

    const fetchDivisoes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          secao,
          per_page: '1000',
        })
        const response = await fetch(`/api/cnaes?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch divisões')
        }

        const result = await response.json()
        const data = result?.cnaes || []
        // Extract unique divisões for this seção
        const uniqueDivisoes = Array.from(
          new Set(
            data
              .filter((item: ModelsCNAE) => item.divisao)
              .map((item: ModelsCNAE) => item.divisao!)
          )
        ).sort() as string[]

        setDivisoes(
          uniqueDivisoes.map(divisao => ({
            value: divisao,
            label: `Divisão ${divisao}`,
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchDivisoes()
  }, [secao, enabled])

  return {
    divisoes,
    isLoading,
    error,
  }
}

export function useCNAEGrupos(options?: UseCNAEHierarchyOptions) {
  const { secao, divisao, enabled = true } = options || {}
  const [grupos, setGrupos] = useState<CNAEHierarchyOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !secao || !divisao) {
      setGrupos([])
      return
    }

    const fetchGrupos = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          secao,
          divisao,
          per_page: '1000',
        })
        const response = await fetch(`/api/cnaes?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch grupos')
        }

        const result = await response.json()
        const data = result?.cnaes || []
        // Extract unique grupos for this seção and divisão
        const uniqueGrupos = Array.from(
          new Set(
            data
              .filter((item: ModelsCNAE) => item.grupo)
              .map((item: ModelsCNAE) => item.grupo!)
          )
        ).sort() as string[]

        setGrupos(
          uniqueGrupos.map(grupo => ({
            value: grupo,
            label: `Grupo ${grupo}`,
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchGrupos()
  }, [secao, divisao, enabled])

  return {
    grupos,
    isLoading,
    error,
  }
}

export function useCNAEClasses(options?: UseCNAEHierarchyOptions) {
  const { secao, divisao, grupo, enabled = true } = options || {}
  const [classes, setClasses] = useState<CNAEHierarchyOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !secao || !divisao || !grupo) {
      setClasses([])
      return
    }

    const fetchClasses = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          secao,
          divisao,
          grupo,
          per_page: '1000',
        })
        const response = await fetch(`/api/cnaes?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch classes')
        }

        const result = await response.json()
        const data = result?.cnaes || []
        // Extract unique classes for this seção, divisão and grupo
        const uniqueClasses = Array.from(
          new Set(
            data
              .filter((item: ModelsCNAE) => item.classe)
              .map((item: ModelsCNAE) => item.classe!)
          )
        ).sort() as string[]

        setClasses(
          uniqueClasses.map(classe => ({
            value: classe,
            label: `Classe ${classe}`,
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchClasses()
  }, [secao, divisao, grupo, enabled])

  return {
    classes,
    isLoading,
    error,
  }
}

export function useCNAESubclasses(options?: UseCNAEHierarchyOptions) {
  const { secao, divisao, grupo, classe, enabled = true } = options || {}
  const [subclasses, setSubclasses] = useState<CNAEHierarchyOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setSubclasses([])
      return
    }

    const fetchSubclasses = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          per_page: '1000',
        })

        // If classe is provided, filter by it, otherwise get all subclasses
        if (classe && secao && divisao && grupo) {
          params.append('secao', secao)
          params.append('divisao', divisao)
          params.append('grupo', grupo)
          params.append('classe', classe)
        }

        const response = await fetch(`/api/cnaes?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch subclasses')
        }

        const result = await response.json()
        const data = result?.cnaes || []
        // Extract unique subclasses with their full data
        const subclassesMap = new Map<string, ModelsCNAE>()

        data.forEach((item: ModelsCNAE) => {
          if (item.subclasse && item.denominacao) {
            if (!subclassesMap.has(item.subclasse)) {
              subclassesMap.set(item.subclasse, item)
            }
          }
        })

        const subclassesList = Array.from(subclassesMap.entries())
          .map(([subclasse, fullData]) => ({
            value: subclasse,
            label: `${subclasse} - ${fullData.denominacao || subclasse}`,
            fullData,
          }))
          .sort((a, b) => a.value.localeCompare(b.value))

        setSubclasses(subclassesList)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubclasses()
  }, [secao, divisao, grupo, classe, enabled])

  return {
    subclasses,
    isLoading,
    error,
  }
}
