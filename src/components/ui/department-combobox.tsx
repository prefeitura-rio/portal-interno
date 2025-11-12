'use client'

import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Department {
  cd_ua: string
  nome_ua?: string
  sigla_ua?: string
}

interface DepartmentComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DepartmentCombobox({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Selecione um órgão',
  className,
}: DepartmentComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)

  const limit = 20 // Items per page

  // Selected department for display
  const [selectedDepartment, setSelectedDepartment] =
    React.useState<Department | null>(null)
  const [selectedDepartmentLoaded, setSelectedDepartmentLoaded] =
    React.useState(false)

  // Fetch departments
  const fetchDepartments = React.useCallback(
    async (currentPage: number, searchQuery: string) => {
      try {
        setLoading(true)
        const url = new URL('/api/departments', window.location.origin)
        url.searchParams.set('page', currentPage.toString())
        url.searchParams.set('limit', limit.toString())
        if (searchQuery.trim()) {
          url.searchParams.set('search', searchQuery.trim())
        }

        const response = await fetch(url.toString())
        if (response.ok) {
          const data = await response.json()
          const fetchedDepartments = data.data || []

          // If appending (pagination), merge with existing and remove duplicates
          if (currentPage === 1) {
            setDepartments(fetchedDepartments)
          } else {
            setDepartments(prev => {
              // Create a Map to track unique departments by cd_ua
              const uniqueDepartments = new Map<string, Department>()

              // Add existing departments first
              prev.forEach(dept => {
                uniqueDepartments.set(dept.cd_ua, dept)
              })

              // Add new departments (will overwrite if duplicate)
              fetchedDepartments.forEach((dept: Department) => {
                uniqueDepartments.set(dept.cd_ua, dept)
              })

              // Convert Map back to array
              return Array.from(uniqueDepartments.values())
            })
          }

          // Calculate pagination info
          const total = data.total_count || data.pagination?.total || 0
          const calculatedTotalPages = Math.ceil(total / limit)
          setTotalPages(calculatedTotalPages)
          setHasMore(currentPage < calculatedTotalPages)
        }
      } catch (error) {
        console.error('Error fetching departments:', error)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounced search
  const debouncedSearch = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return (searchValue: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setPage(1)
        fetchDepartments(1, searchValue)
      }, 300)
    }
  }, [fetchDepartments])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    debouncedSearch(value)
  }

  // Load more (pagination)
  const loadMore = React.useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchDepartments(nextPage, search)
    }
  }, [loading, hasMore, page, search, fetchDepartments])

  // Initial load
  React.useEffect(() => {
    if (open) {
      setPage(1)
      fetchDepartments(1, '')
    }
  }, [open, fetchDepartments])

  // Reset selected department state when value changes
  React.useEffect(() => {
    if (!value) {
      setSelectedDepartment(null)
      setSelectedDepartmentLoaded(true)
    } else {
      setSelectedDepartment(null)
      setSelectedDepartmentLoaded(false)
    }
  }, [value])

  // Fetch selected department details if value exists and isn't already loaded
  React.useEffect(() => {
    const fetchSelectedDepartment = async () => {
      if (!value || selectedDepartmentLoaded) {
        return
      }

      // If department is already in the loaded list, use it
      const existingDepartment = departments.find(dept => dept.cd_ua === value)
      if (existingDepartment) {
        setSelectedDepartment(existingDepartment)
        setSelectedDepartmentLoaded(true)
        return
      }

      try {
        const response = await fetch(`/api/departments/${value}`)
        if (response.ok) {
          const data = await response.json()
          setSelectedDepartment(data.data || null)
        } else {
          setSelectedDepartment(null)
        }
      } catch (error) {
        console.error('Error fetching selected department:', error)
        setSelectedDepartment(null)
      } finally {
        setSelectedDepartmentLoaded(true)
      }
    }

    fetchSelectedDepartment()
  }, [value, departments, selectedDepartmentLoaded])

  // Display value for selected department
  const displayValue = React.useMemo(() => {
    if (!value) return placeholder

    // First, try to find in current departments list
    const dept = departments.find(d => d.cd_ua === value)
    if (dept) {
      return `${dept.nome_ua || dept.cd_ua}${dept.sigla_ua ? ` (${dept.sigla_ua})` : ''}`
    }

    // If not found in list, use selectedDepartment from API fetch
    if (selectedDepartment) {
      return `${selectedDepartment.nome_ua || selectedDepartment.cd_ua}${selectedDepartment.sigla_ua ? ` (${selectedDepartment.sigla_ua})` : ''}`
    }

    if (!selectedDepartmentLoaded) {
      return 'Carregando...'
    }

    return placeholder
  }, [
    value,
    departments,
    selectedDepartment,
    selectedDepartmentLoaded,
    placeholder,
  ])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange('')
    setSelectedDepartment(null)
  }

  return (
    <div className="flex gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'truncate! relative! overflow-hidden! flex-1 justify-between text-left',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <span className="truncate relative! overflow-hidden! flex-1 min-w-0">
              {displayValue}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar órgão..."
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Carregando...' : 'Nenhum órgão encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {departments.map(department => (
                  <CommandItem
                    key={department.cd_ua}
                    value={department.cd_ua}
                    onSelect={currentValue => {
                      onValueChange(currentValue === value ? '' : currentValue)
                      setSelectedDepartment(department)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === department.cd_ua ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {department.nome_ua || department.cd_ua}
                      </span>
                      {department.sigla_ua && (
                        <span className="text-xs text-muted-foreground">
                          {department.sigla_ua}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Load More Button */}
              {hasMore && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={loadMore}
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        Carregar mais ({page} de {totalPages})
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Loading indicator for first page */}
              {loading && page === 1 && departments.length === 0 && (
                <div className="py-6 text-center text-sm">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClear}
          disabled={disabled}
          className="shrink-0 h-14! w-14!"
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
