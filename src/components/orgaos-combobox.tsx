'use client'

import { useEffect, useState } from 'react'
import { Combobox } from './ui/combobox'

interface Orgao {
  id: number
  nome: string
}

interface OrgaosComboboxProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function OrgaosCombobox({
  value,
  onValueChange,
  placeholder = 'Todas as secretarias',
  searchPlaceholder = 'Buscar secretaria...',
  emptyMessage = 'Nenhuma secretaria encontrada.',
  className,
}: OrgaosComboboxProps) {
  const [orgaos, setOrgaos] = useState<Array<{ value: string; label: string }>>(
    []
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrgaos = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/orgaos')

        if (response.ok) {
          const data = await response.json()
          const orgaosList = (data.data || []) as Orgao[]

          // Transform to combobox options format
          const options = orgaosList.map(orgao => ({
            value: orgao.id.toString(),
            label: orgao.nome,
          }))

          setOrgaos(options)
        } else {
          console.error('Failed to fetch organizations')
        }
      } catch (error) {
        console.error('Error fetching organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrgaos()
  }, [])

  if (loading) {
    return (
      <Combobox
        options={[]}
        value={value}
        onValueChange={onValueChange}
        placeholder="Carregando secretarias..."
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        className={className}
        disabled
      />
    )
  }

  return (
    <Combobox
      options={orgaos}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      className={className}
    />
  )
}
