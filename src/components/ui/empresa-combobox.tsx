'use client'

import type { EmpregabilidadeEmpresa } from '@/http-gorio/models'
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

const limit = 20

function getEmpresaDisplayName(empresa: EmpregabilidadeEmpresa): string {
  return (
    empresa.nome_fantasia ||
    empresa.razao_social ||
    empresa.cnpj ||
    'Empresa sem nome'
  )
}

/** Returns true if the string looks like a CNPJ (only digits, length 14 or more when stripped) */
function isCnpjSearch(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 14
}

/** Extracts 14 digits for CNPJ param */
function extractCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14)
}

interface EmpresaComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  clearButtonSize?: string
}

export function EmpresaCombobox({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Todas as empresas',
  className,
  clearButtonSize = 'h-9! w-9!',
}: EmpresaComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [empresas, setEmpresas] = React.useState<EmpregabilidadeEmpresa[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)

  const [selectedEmpresa, setSelectedEmpresa] =
    React.useState<EmpregabilidadeEmpresa | null>(null)
  const [selectedEmpresaLoaded, setSelectedEmpresaLoaded] =
    React.useState(false)

  const fetchEmpresas = React.useCallback(
    async (currentPage: number, searchQuery: string) => {
      try {
        setLoading(true)
        const url = new URL(
          '/api/empregabilidade/empresas',
          window.location.origin
        )
        url.searchParams.set('page', currentPage.toString())
        url.searchParams.set('page_size', limit.toString())

        if (searchQuery.trim()) {
          if (isCnpjSearch(searchQuery)) {
            url.searchParams.set('cnpj', extractCnpj(searchQuery))
          } else {
            url.searchParams.set('search', searchQuery.trim())
          }
        }

        const response = await fetch(url.toString())
        if (response.ok) {
          const data = await response.json()
          const raw = data.empresas
          const fetchedEmpresas = raw?.data ?? (Array.isArray(raw) ? raw : [])

          if (currentPage === 1) {
            setEmpresas(fetchedEmpresas)
          } else {
            setEmpresas(prev => {
              const byCnpj = new Map<string, EmpregabilidadeEmpresa>()
              for (const e of prev) {
                if (e.cnpj) byCnpj.set(e.cnpj, e)
              }
              for (const e of fetchedEmpresas) {
                if (e.cnpj) byCnpj.set(e.cnpj, e)
              }
              return Array.from(byCnpj.values())
            })
          }

          const total = raw?.meta?.total ?? 0
          const calculatedTotalPages = Math.ceil(total / limit)
          setTotalPages(calculatedTotalPages)
          setHasMore(currentPage < calculatedTotalPages)
        }
      } catch (error) {
        console.error('Error fetching empresas:', error)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const debouncedSearch = React.useCallback(
    (searchValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setPage(1)
        fetchEmpresas(1, searchValue)
      }, 300)
    },
    [fetchEmpresas]
  )

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    debouncedSearch(value)
  }

  const loadMore = React.useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchEmpresas(nextPage, search)
    }
  }, [loading, hasMore, page, search, fetchEmpresas])

  React.useEffect(() => {
    if (open) {
      setPage(1)
      fetchEmpresas(1, '')
    }
  }, [open, fetchEmpresas])

  React.useEffect(() => {
    if (!value) {
      setSelectedEmpresa(null)
      setSelectedEmpresaLoaded(true)
      return
    }

    const existing = empresas.find(e => e.cnpj === value)
    if (existing) {
      setSelectedEmpresa(existing)
      setSelectedEmpresaLoaded(true)
      return
    }

    let isCancelled = false
    const fetchSelected = async () => {
      setSelectedEmpresaLoaded(false)
      try {
        const res = await fetch(
          `/api/empregabilidade/empresas/${encodeURIComponent(value)}`
        )
        if (isCancelled) return
        if (res.ok) {
          const data = await res.json()
          setSelectedEmpresa(data.empresa ?? null)
        } else {
          setSelectedEmpresa(null)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching selected empresa:', error)
          setSelectedEmpresa(null)
        }
      } finally {
        if (!isCancelled) {
          setSelectedEmpresaLoaded(true)
        }
      }
    }

    fetchSelected()
    return () => {
      isCancelled = true
    }
  }, [value, empresas])

  const displayValue = React.useMemo(() => {
    if (!value) return placeholder

    const emp = empresas.find(e => e.cnpj === value)
    if (emp) return getEmpresaDisplayName(emp)

    if (selectedEmpresa) return getEmpresaDisplayName(selectedEmpresa)
    if (!selectedEmpresaLoaded) return 'Carregando...'

    return placeholder
  }, [value, empresas, selectedEmpresa, selectedEmpresaLoaded, placeholder])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange('')
    setSelectedEmpresa(null)
  }

  return (
    <div className="flex gap-2 w-full min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'truncate! relative! overflow-hidden! flex-1 justify-between text-left min-w-0 w-full',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <span
              className="truncate relative! overflow-hidden! flex-1 min-w-0"
              title={
                typeof displayValue === 'string' ? displayValue : undefined
              }
            >
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
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Carregando...' : 'Nenhuma empresa encontrada.'}
              </CommandEmpty>
              <CommandGroup>
                {empresas.map(empresa => (
                  <CommandItem
                    key={empresa.cnpj ?? ''}
                    value={empresa.cnpj ?? ''}
                    onSelect={currentValue => {
                      onValueChange(currentValue === value ? '' : currentValue)
                      setSelectedEmpresa(empresa)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === (empresa.cnpj ?? '')
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {getEmpresaDisplayName(empresa)}
                      </span>
                      {empresa.cnpj && (
                        <span className="text-xs text-muted-foreground">
                          CNPJ:{' '}
                          {empresa.cnpj.replace(/\D/g, '').length === 14
                            ? empresa.cnpj
                                .replace(/\D/g, '')
                                .replace(
                                  /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                                  '$1.$2.$3/$4-$5'
                                )
                            : empresa.cnpj}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

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

              {loading && page === 1 && empresas.length === 0 && (
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
          className={cn('shrink-0', clearButtonSize)}
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
