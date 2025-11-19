'use client'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import * as React from 'react'

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

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  maxDisplay?: number
}

export function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Selecione opções...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhuma opção encontrada.',
  className,
  disabled = false,
  maxDisplay = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedValue: string) => {
    const newValue = value.includes(selectedValue)
      ? value.filter(v => v !== selectedValue)
      : [...value, selectedValue]
    onValueChange?.(newValue)
  }

  const handleRemove = (
    e: React.MouseEvent<HTMLElement>,
    valueToRemove: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    onValueChange?.(value.filter(v => v !== valueToRemove))
  }

  const selectedOptions = options.filter(option =>
    value.includes(option.value)
  )

  const displayText = () => {
    if (selectedOptions.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }

    if (selectedOptions.length <= maxDisplay) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map(option => (
            <Badge
              key={option.value}
              variant="secondary"
              className="mr-1 mb-1"
            >
              {option.label}
              <span
                role="button"
                tabIndex={0}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                onMouseDown={e => handleRemove(e, option.value)}
                onClick={e => handleRemove(e, option.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleRemove(e as any, option.value)
                  }
                }}
              >
                <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </span>
            </Badge>
          ))}
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {selectedOptions.slice(0, maxDisplay).map(option => (
          <Badge key={option.value} variant="secondary" className="mr-1">
            {option.label}
            <span
              role="button"
              tabIndex={0}
              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              onMouseDown={e => handleRemove(e, option.value)}
              onClick={e => handleRemove(e, option.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRemove(e as any, option.value)
                }
              }}
            >
              <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </span>
          </Badge>
        ))}
        <Badge variant="secondary" className="mr-1">
          +{selectedOptions.length - maxDisplay} mais
        </Badge>
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
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map(option => {
                const isSelected = value.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className="flex items-center gap-2"
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
                    <span className="truncate flex-1">{option.label}</span>
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
