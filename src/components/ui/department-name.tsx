'use client'

import { useDepartment } from '@/hooks/use-department'

interface DepartmentNameProps {
  cd_ua?: string | null
  showNotFound?: boolean
}

/**
 * Component to fetch and display department name by cd_ua
 * Used in data tables and read-only views
 *
 * @param cd_ua - The department ID (cd_ua)
 * @param showNotFound - Whether to show "Órgão não encontrado" message (default: true)
 *                       Set to false to show nothing when department is not found
 */
export function DepartmentName({
  cd_ua,
  showNotFound = true,
}: DepartmentNameProps) {
  const { department, loading, error } = useDepartment(cd_ua)

  // Handle error state gracefully
  if (error) {
    console.error(`Error loading department ${cd_ua}:`, error)
    return <span className="text-muted-foreground">Órgão não encontrado</span>
  }

  if (loading) {
    return <span className="text-muted-foreground">Carregando...</span>
  }

  if (!cd_ua) {
    return <span className="text-muted-foreground">Não informado</span>
  }

  if (!department) {
    if (!showNotFound) {
      return null
    }
    return <span className="text-muted-foreground">Órgão não encontrado</span>
  }

  return <span>{department.nome_ua || department.cd_ua}</span>
}
