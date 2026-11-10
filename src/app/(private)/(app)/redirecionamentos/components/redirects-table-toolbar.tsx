'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

export interface RedirectsToolbarFilters {
  searchInput: string
  hostFilter: string
  statusFilter: string
  ativaFilter: string
  hasActiveFilters: boolean
}

export interface RedirectsToolbarActions {
  onSearchChange: (value: string) => void
  onHostChange: (value: string) => void
  onStatusChange: (value: string) => void
  onAtivaChange: (value: string) => void
  onClearFilters: () => void
  onBulkStatus302: () => void
  onBulkStatus301: () => void
}

interface RedirectsTableToolbarProps {
  canonicalHosts: readonly string[]
  selectedCount: number
  filters: RedirectsToolbarFilters
  actions: RedirectsToolbarActions
}

export function RedirectsTableToolbar({
  canonicalHosts,
  selectedCount,
  filters,
  actions,
}: RedirectsTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar caminho, destino ou notas..."
            value={filters.searchInput}
            onChange={e => actions.onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={filters.hostFilter || 'all'}
          onValueChange={actions.onHostChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os hosts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os hosts</SelectItem>
            {canonicalHosts.map(host => (
              <SelectItem key={host} value={host} className="font-mono">
                {host}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.statusFilter || 'all'}
          onValueChange={actions.onStatusChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="302">302 · Temporário</SelectItem>
            <SelectItem value="301">301 · Permanente</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.ativaFilter || 'all'}
          onValueChange={actions.onAtivaChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="true">Ativas</SelectItem>
            <SelectItem value="false">Inativas</SelectItem>
          </SelectContent>
        </Select>

        {filters.hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={actions.onClearFilters}>
            <X className="mr-1 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {selectedCount > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              Mudar status ({selectedCount})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={actions.onBulkStatus302}>
              302 · Temporário
            </DropdownMenuItem>
            <DropdownMenuItem onClick={actions.onBulkStatus301}>
              301 · Permanente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
