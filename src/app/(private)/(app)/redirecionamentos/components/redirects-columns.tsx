'use client'

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import type { ModelsRedirectRule } from '@/http-redirecionamentos/models'
import { formatDateBR } from '@/lib/format'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ExternalLink,
  History,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { maskCpf } from '../lib/redirects-utils'

export interface RedirectsColumnsCallbacks {
  onToggleEnabled: (rule: ModelsRedirectRule, checked: boolean) => void
  onEdit: (rule: ModelsRedirectRule) => void
  onHistory: (rule: ModelsRedirectRule) => void
  onDelete: (rule: ModelsRedirectRule) => void
}

export function createRedirectsColumns({
  onToggleEnabled,
  onEdit,
  onHistory,
  onDelete,
}: RedirectsColumnsCallbacks): ColumnDef<ModelsRedirectRule>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todas"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Selecionar linha"
        />
      ),
      size: 32,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'host',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Host" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">
          {row.original.host}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'path',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Caminho" />
      ),
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <span className="font-mono text-sm break-all">
            {row.original.path}
          </span>
          {row.original.notes && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {row.original.notes}
            </p>
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'match_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.match_type === 'prefix' ? 'Prefixo' : 'Exato'}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'destination',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Destino" />
      ),
      cell: ({ row }) => (
        <a
          href={row.original.destination}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[280px] items-center gap-1 font-mono text-sm text-primary underline-offset-4 hover:underline"
        >
          <span className="truncate">{row.original.destination}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'status_code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isPermanent = row.original.status_code === 301
        return (
          <Badge variant={isPermanent ? 'default' : 'secondary'}>
            {isPermanent ? '301 · Permanente' : '302 · Temporário'}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: 'enabled',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ativa" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.enabled ?? true}
            onCheckedChange={checked => onToggleEnabled(row.original, checked)}
            aria-label="Alternar regra ativa"
          />
          <span className="text-xs text-muted-foreground">
            {row.original.enabled ? 'Sim' : 'Não'}
          </span>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'updated_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Atualizada em e por" />
      ),
      cell: ({ row }) => {
        const timestamp = row.original.updated_at || row.original.created_at
        const actor = row.original.updated_by || row.original.created_by
        return (
          <div className="text-xs">
            <p className="text-foreground">
              {formatDateBR(timestamp, {
                dateStyle: 'short',
                timeStyle: 'short',
              }) || '—'}
            </p>
            <p className="font-mono text-muted-foreground">{maskCpf(actor)}</p>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHistory(row.original)}>
              <History className="mr-2 h-4 w-4" />
              Histórico
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 32,
      enableSorting: false,
    },
  ]
}
