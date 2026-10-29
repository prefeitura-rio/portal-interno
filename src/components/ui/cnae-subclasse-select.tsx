'use client'

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
import { findMeiCnae, searchMeiCnaes } from '@/lib/mei-cnaes'
import { cn } from '@/lib/utils'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import * as React from 'react'

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
  searchPlaceholder = 'Digite o código ou o nome da atividade',
  emptyMessage = 'Nenhum CNAE permitido ao MEI encontrado.',
  className,
  disabled = false,
  maxDisplay = 3,
}: CnaeSubclasseSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Só as subclasses do Anexo XI da Resolução CGSN nº 140/2018 (lista local)
  const results = React.useMemo(() => searchMeiCnaes(search), [search])

  const handleToggle = (subclasse: string) => {
    if (value.includes(subclasse)) {
      onValueChange?.(value.filter(v => v !== subclasse))
      return
    }
    onValueChange?.([...value, subclasse])
  }

  const handleRemove = (
    e: React.MouseEvent<HTMLElement>,
    valueToRemove: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    onValueChange?.(value.filter(v => v !== valueToRemove))
  }

  // Descrição das subclasses salvas que não estão no Anexo XI (oportunidades
  // antigas): busca no RMI só para exibir; elas não aparecem para seleção
  const [legacyDenominacoes, setLegacyDenominacoes] = React.useState<
    Record<string, string>
  >({})

  React.useEffect(() => {
    const missingSubclasses = value.filter(
      subclasse => !findMeiCnae(subclasse) && !legacyDenominacoes[subclasse]
    )

    if (missingSubclasses.length === 0) return

    const fetchDenominacoes = async () => {
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

      const fetched = await Promise.all(fetchPromises)
      setLegacyDenominacoes(prev => {
        const updated = { ...prev }
        fetched.forEach(({ subclasse, denominacao }) => {
          updated[subclasse] = denominacao
        })
        return updated
      })
    }

    fetchDenominacoes()
  }, [value, legacyDenominacoes])

  const getDenominacao = (subclasse: string) =>
    findMeiCnae(subclasse)?.denominacao ||
    legacyDenominacoes[subclasse] ||
    subclasse

  const displayText = () => {
    if (value.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }

    const displayItems = value.slice(0, maxDisplay)
    const remaining = value.length - maxDisplay

    return (
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        {displayItems.map(subclasse => (
          <Badge
            key={subclasse}
            variant="secondary"
            className="mr-1 max-w-full inline-flex items-center gap-1"
          >
            <span className="truncate max-w-[200px]">
              {getDenominacao(subclasse)}
            </span>
            <span
              role="button"
              tabIndex={0}
              className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer shrink-0"
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
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {results.map(({ cnae, ocupacoesEncontradas }) => {
                const isSelected = value.includes(cnae.subclasse)
                return (
                  <CommandItem
                    key={cnae.subclasse}
                    value={cnae.subclasse}
                    onSelect={() => handleToggle(cnae.subclasse)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium">{cnae.denominacao}</span>
                      <span className="text-xs text-muted-foreground">
                        {cnae.subclasse}
                      </span>
                      {ocupacoesEncontradas.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Ocupação: {ocupacoesEncontradas.join('; ')}
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
