'use client'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import * as React from 'react'
import { useCnaesBySubclasse } from '@/hooks/use-cnaes'
import { Badge } from '@/components/ui/badge'
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

export interface CnaeSubclasseOption {
  subclasse: string
  denominacao: string
  id?: string
}

interface CnaeSubclasseSelectProps {
  value?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  maxDisplay?: number
}

export function CnaeSubclasseSelect({
  value = [],
  onValueChange,
  placeholder = 'Buscar por subclasse CNAE...',
  searchPlaceholder = 'Digite a subclasse (ex: 4724-5/00)',
  emptyMessage = 'Nenhum CNAE encontrado.',
  className,
  disabled = false,
  maxDisplay = 3,
}: CnaeSubclasseSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const { cnaes, isLoading } = useCnaesBySubclasse(
    search,
    open && search.trim().length > 0
  )

  const handleSelect = (selectedSubclasse: string, denominacao: string) => {
    // Check if already selected
    if (value.includes(selectedSubclasse)) {
      return
    }

    const newValue = [...value, selectedSubclasse]
    onValueChange?.(newValue)
    setSearch('')
    setOpen(false)
  }

  const handleRemove = (
    e: React.MouseEvent<HTMLElement>,
    valueToRemove: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    onValueChange?.(value.filter(v => v !== valueToRemove))
  }

  // Map of selected subclasses to their denominacoes
  // We need to track this separately since we only store subclasse strings
  const [selectedDenominacoes, setSelectedDenominacoes] = React.useState<
    Record<string, string>
  >({})

  // Fetch denominacoes for existing selected subclasses on mount and when value changes
  React.useEffect(() => {
    const fetchDenominacoes = async () => {
      const missingSubclasses = value.filter(
        subclasse => !selectedDenominacoes[subclasse]
      )

      if (missingSubclasses.length === 0) return

      // Fetch each missing subclass using the API route
      const fetchPromises = missingSubclasses.map(async subclasse => {
        try {
          const params = new URLSearchParams({
            subclasse: subclasse.trim(),
            per_page: '1',
          })

          const response = await fetch(`/api/cnaes?${params.toString()}`)

          if (!response.ok) {
            return { subclasse, denominacao: subclasse }
          }

          const result = await response.json()

          if (result.success && result.cnaes && result.cnaes.length > 0) {
            const cnae = result.cnaes[0]
            return {
              subclasse,
              denominacao: cnae.denominacao || subclasse,
            }
          }
          return { subclasse, denominacao: subclasse }
        } catch {
          return { subclasse, denominacao: subclasse }
        }
      })

      const results = await Promise.all(fetchPromises)
      setSelectedDenominacoes(prev => {
        const updated = { ...prev }
        results.forEach(({ subclasse, denominacao }) => {
          updated[subclasse] = denominacao
        })
        return updated
      })
    }

    fetchDenominacoes()
  }, [value, selectedDenominacoes])

  // Update denominacoes when CNAEs are found from search
  React.useEffect(() => {
    cnaes.forEach(cnae => {
      if (cnae.subclasse && value.includes(cnae.subclasse)) {
        setSelectedDenominacoes(prev => ({
          ...prev,
          [cnae.subclasse!]: (cnae.denominacao ||
            cnae.subclasse ||
            '') as string,
        }))
      }
    })
  }, [cnaes, value])

  const displayText = () => {
    if (value.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }

    const displayItems = value.slice(0, maxDisplay)
    const remaining = value.length - maxDisplay

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {displayItems.map(subclasse => (
          <Badge key={subclasse} variant="secondary" className="mr-1">
            {selectedDenominacoes[subclasse] || subclasse}
            <span
              role="button"
              tabIndex={0}
              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              onMouseDown={e => handleRemove(e, subclasse)}
              onClick={e => handleRemove(e, subclasse)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRemove(e as any, subclasse)
                }
              }}
            >
              <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </span>
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="secondary" className="mr-1">
            +{remaining} mais
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between text-left font-normal min-h-10 h-auto',
            className
          )}
          disabled={disabled}
        >
          <div className="flex-1 overflow-hidden">{displayText()}</div>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading
                ? 'Buscando...'
                : search.trim().length === 0
                  ? 'Digite uma subclasse CNAE para buscar'
                  : emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {cnaes.map(cnae => {
                if (!cnae.subclasse) return null

                const isSelected = value.includes(cnae.subclasse)
                return (
                  <CommandItem
                    key={cnae.id || cnae.subclasse}
                    value={cnae.subclasse}
                    onSelect={() => {
                      if (!isSelected && cnae.denominacao) {
                        handleSelect(cnae.subclasse!, cnae.denominacao)
                        setSelectedDenominacoes(prev => ({
                          ...prev,
                          [cnae.subclasse!]: cnae.denominacao as string,
                        }))
                      }
                    }}
                    className="flex items-center gap-2"
                    disabled={isSelected}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">
                        {cnae.denominacao || cnae.subclasse}
                      </span>
                      {cnae.subclasse && (
                        <span className="text-xs text-muted-foreground">
                          {cnae.subclasse}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
