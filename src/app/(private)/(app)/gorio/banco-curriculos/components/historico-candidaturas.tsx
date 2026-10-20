'use client'

import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useBancoCurriculoCandidaturas } from '@/hooks/use-banco-curriculos'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import type { EmpregabilidadeBancoCurriculoCandidatura } from '@/http-gorio/models'
import { formatDateBR } from '@/lib/format'
import { origemCandidaturaLabel } from '@/lib/status-config/empregabilidade'
import {
  type ColumnDef,
  type PaginationState,
  type Updater,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NAO_INFORMADO, valorOuNaoInformado } from '../lib/format'
import {
  Campo,
  DetalhesVaga,
  StatusCandidato,
  StatusVaga,
  orgaoDaVaga,
} from './detalhes-vaga'

const PAGE_SIZE_PADRAO = 10
// A API aceita no máximo 100 por página.
const PAGE_SIZE_OPCOES = [10, 20, 30, 40, 50, 100]
const ATRASO_BUSCA_MS = 500

interface HistoricoCandidaturasProps {
  cpf: string
}

/**
 * Aba "Candidaturas" da ficha: as vagas a que o cidadão se candidatou ou foi
 * associado, com o detalhe de cada vaga numa gaveta.
 */
export function HistoricoCandidaturas({ cpf }: HistoricoCandidaturasProps) {
  const [termo, setTermo] = useState('')
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE_PADRAO,
  })
  const [selecionada, setSelecionada] =
    useState<EmpregabilidadeBancoCurriculoCandidatura | null>(null)

  const { data, isLoading, isError } = useBancoCurriculoCandidaturas(cpf, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
  })
  const total = data?.meta?.total ?? 0

  const aplicarBusca = useDebouncedCallback((valor: string) => {
    setSearch(valor.trim())
    setPagination(atual => ({ ...atual, pageIndex: 0 }))
  }, ATRASO_BUSCA_MS)

  function handlePaginationChange(updater: Updater<PaginationState>) {
    setPagination(atual => {
      const proxima = typeof updater === 'function' ? updater(atual) : updater
      // Trocar o tamanho da página volta para a primeira.
      return proxima.pageSize === atual.pageSize
        ? proxima
        : { ...proxima, pageIndex: 0 }
    })
  }

  const columns = useMemo<
    ColumnDef<EmpregabilidadeBancoCurriculoCandidatura>[]
  >(
    () => [
      {
        id: 'vaga',
        header: 'Título da vaga',
        cell: ({ row }) => (
          <span className="font-medium">
            {valorOuNaoInformado(row.original.vaga?.titulo)}
          </span>
        ),
      },
      {
        id: 'orgao',
        header: 'Órgão',
        cell: ({ row }) => orgaoDaVaga(row.original.vaga),
      },
      {
        id: 'data_candidatura',
        header: 'Data da candidatura',
        cell: ({ row }) =>
          formatDateBR(row.original.data_candidatura) || NAO_INFORMADO,
      },
      {
        id: 'origem',
        header: 'Origem',
        cell: ({ row }) => origemCandidaturaLabel(row.original.origem),
      },
      {
        id: 'status_vaga',
        header: 'Status da vaga',
        cell: ({ row }) => <StatusVaga status={row.original.vaga?.status} />,
      },
      {
        id: 'status_candidato',
        header: 'Situação do candidato',
        cell: ({ row }) => <StatusCandidato status={row.original.status} />,
      },
      {
        id: 'acoes',
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelecionada(row.original)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Detalhar
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getRowId: (row, index) => row.id ?? String(index),
    state: { pagination },
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pagination.pageSize)),
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <Input
        value={termo}
        onChange={event => {
          setTermo(event.target.value)
          aplicarBusca(event.target.value)
        }}
        placeholder="Pesquisar por título da vaga"
        aria-label="Pesquisar por título da vaga"
        className="sm:max-w-sm"
      />

      {isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar as candidaturas. Tente novamente em
          instantes.
        </p>
      ) : (
        <DataTable
          table={table}
          loading={isLoading}
          pageSizeOptions={PAGE_SIZE_OPCOES}
        />
      )}

      <DetalheCandidatura
        candidatura={selecionada}
        onClose={() => setSelecionada(null)}
      />
    </div>
  )
}

function DetalheCandidatura({
  candidatura,
  onClose,
}: {
  candidatura: EmpregabilidadeBancoCurriculoCandidatura | null
  onClose: () => void
}) {
  const vaga = candidatura?.vaga

  return (
    <Sheet open={!!candidatura} onOpenChange={aberto => !aberto && onClose()}>
      <SheetContent className="md:max-w-xl!">
        <SheetHeader>
          <SheetTitle>{valorOuNaoInformado(vaga?.titulo)}</SheetTitle>
          <SheetDescription>
            Candidatura em{' '}
            {formatDateBR(candidatura?.data_candidatura) || NAO_INFORMADO}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Situação do candidato na vaga">
              <StatusCandidato status={candidatura?.status} />
            </Campo>
            <Campo rotulo="Status da vaga">
              <StatusVaga status={vaga?.status} />
            </Campo>
            <Campo rotulo="Origem">
              {origemCandidaturaLabel(candidatura?.origem)}
            </Campo>
          </dl>
          {vaga && <DetalhesVaga vaga={vaga} />}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Fechar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
