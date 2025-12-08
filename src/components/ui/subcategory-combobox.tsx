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
import type { ModelsSubcategory } from '@/http-busca-search/models'
import { cn } from '@/lib/utils'

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
  const [open, setOpen] = React.useState(false)
  const [subcategories, setSubcategories] = React.useState<ModelsSubcategory[]>(
    []
  )
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Fetch subcategories when category changes or popover opens
  const fetchSubcategories = React.useCallback(async (categoryName: string) => {
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
  React.useEffect(() => {
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
  const filteredSubcategories = React.useMemo(() => {
    if (!search.trim()) {
      return subcategories
    }

    const searchLower = search.toLowerCase()
    return subcategories.filter(subcategory =>
      subcategory.name?.toLowerCase().includes(searchLower)
    )
  }, [subcategories, search])

  // Display value for selected subcategory
  const displayValue = React.useMemo(() => {
    if (!value) return placeholder

    const subcategory = subcategories.find(s => s.name === value)
    if (subcategory) {
      return subcategory.name || value
    }

    // If subcategories are still loading or value is not found
    if (loading) {
      return 'Carregando...'
    }

    // Return the value itself if not found in list (for initial load scenarios)
    return value
  }, [value, subcategories, loading, placeholder])

  const handleClear = (e: React.MouseEvent) => {
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
              className="truncate relative! overflow-hidden! flex-1 min-w-0"
              title={
                typeof displayValue === 'string' ? displayValue : undefined
              }
            >
              {!category ? 'Selecione uma categoria primeiro' : displayValue}
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
              <CommandEmpty>
                {loading ? 'Carregando...' : 'Nenhuma subcategoria encontrada.'}
              </CommandEmpty>
              <CommandGroup>
                {filteredSubcategories.map(subcategory => (
                  <CommandItem
                    key={subcategory.name}
                    value={subcategory.name || ''}
                    onSelect={currentValue => {
                      onValueChange(currentValue === value ? '' : currentValue)
                      setOpen(false)
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
