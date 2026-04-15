'use client'

import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react'
import type { MouseEvent } from 'react'

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
import { useIsAdmin } from '@/hooks/use-heimdall-user'
import type { ModelsSubcategory } from '@/http-busca-search/models'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
interface SubcategoryComboboxProps {
  category?: string
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  clearButtonSize?: string
}

export function SubcategoryCombobox({
  category,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Selecione uma subcategoria',
  className,
  clearButtonSize = 'h-9! w-9!',
}: SubcategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [subcategories, setSubcategories] = useState<ModelsSubcategory[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const isAdmin = useIsAdmin()

  // Fetch subcategories when category changes or popover opens
  const fetchSubcategories = useCallback(async (categoryName: string) => {
    if (!categoryName) {
      setSubcategories([])
      return
    }

    try {
      setLoading(true)
      const url = new URL('/api/subcategories', window.location.origin)
      url.searchParams.set('category', categoryName)
      url.searchParams.set('sort_by', 'popularity')
      url.searchParams.set('order', 'desc')
      url.searchParams.set('include_empty', 'true')
      url.searchParams.set('include_inactive', 'true')

      const response = await fetch(url.toString())

      if (response.ok) {
        const result = await response.json()
        setSubcategories(result.data?.subcategories || [])
      } else {
        console.error('Failed to fetch subcategories:', response.statusText)
        setSubcategories([])
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      setSubcategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch subcategories when category changes
  useEffect(() => {
    if (category) {
      fetchSubcategories(category)
    } else {
      setSubcategories([])
      // Clear the selected subcategory if category is cleared
      if (value) {
        onValueChange('')
      }
    }
  }, [category, fetchSubcategories, value, onValueChange])

  // Filtered subcategories based on search
  const filteredSubcategories = useMemo(() => {
    if (!search.trim()) {
      return subcategories
    }

    const searchLower = search.toLowerCase()
    return subcategories.filter(subcategory =>
      subcategory.name?.toLowerCase().includes(searchLower)
    )
  }, [subcategories, search])

  // Check if search text would create a new subcategory
  // Only allow creation for admin or superadmin users
  const canCreateNew = useMemo(() => {
    if (!search.trim() || !isAdmin) return false

    const searchLower = search.toLowerCase()
    const exactMatch = subcategories.some(
      s => s.name?.toLowerCase() === searchLower
    )

    return !exactMatch && filteredSubcategories.length === 0
  }, [search, subcategories, filteredSubcategories, isAdmin])

  // Check if the current value is a new subcategory (not in the original list)
  const isNewSubcategory = useMemo(() => {
    if (!value || loading) return false
    return !subcategories.some(s => s.name === value)
  }, [value, subcategories, loading])

  // Display value for selected subcategory
  const displayValue = useMemo(() => {
    if (!value) return placeholder

    const subcategory = subcategories.find(s => s.name === value)
    if (subcategory) {
      return subcategory.name || value
    }

    // If subcategories are still loading or value is not found
    if (loading) {
      return 'Carregando...'
    }

    // Return the value itself if not found in list (for initial load scenarios or new subcategory)
    return value
  }, [value, subcategories, loading, placeholder])

  const handleClear = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onValueChange('')
  }

  const isDisabled = disabled || !category

  return (
    <div className="flex gap-2 w-full min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isDisabled}
            className={cn(
              'truncate! relative! overflow-hidden! flex-1 justify-between text-left min-w-0 w-full',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <span
              className="truncate relative! overflow-hidden! flex-1 min-w-0 flex items-center gap-2"
              title={
                typeof displayValue === 'string' ? displayValue : undefined
              }
            >
              {!category ? (
                'Selecione uma categoria primeiro'
              ) : (
                <>
                  {displayValue}
                  {isNewSubcategory && value && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 shrink-0">
                      Nova
                    </span>
                  )}
                </>
              )}
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
              placeholder="Buscar subcategoria..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {!loading &&
                !canCreateNew &&
                filteredSubcategories.length === 0 && (
                  <CommandEmpty>Nenhuma subcategoria encontrada.</CommandEmpty>
                )}
              <CommandGroup>
                {filteredSubcategories.map(subcategory => (
                  <CommandItem
                    key={subcategory.name}
                    value={subcategory.name || ''}
                    onSelect={currentValue => {
                      onValueChange(currentValue === value ? '' : currentValue)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === subcategory.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {subcategory.name || ''}
                      </span>
                      {subcategory.count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {subcategory.count} serviço
                          {subcategory.count !== 1 ? 's' : ''} ao total
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}

                {/* Create new subcategory option */}
                {canCreateNew && (
                  <CommandItem
                    value={search}
                    onSelect={currentValue => {
                      onValueChange(currentValue)
                      setOpen(false)
                      setSearch('')
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Criar "{search}"</span>
                      <span className="text-xs text-muted-foreground">
                        Nova subcategoria
                      </span>
                    </div>
                  </CommandItem>
                )}
              </CommandGroup>

              {/* Loading indicator */}
              {loading && subcategories.length === 0 && (
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
          disabled={isDisabled}
          className={cn('shrink-0', clearButtonSize)}
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
