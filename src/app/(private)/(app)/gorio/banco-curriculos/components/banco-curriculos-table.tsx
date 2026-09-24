'use client'

import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBancoCurriculos } from '@/hooks/use-banco-curriculos'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import type { EmpregabilidadeBancoCurriculoItem } from '@/http-gorio/models'
import { formatDateBR } from '@/lib/format'
import {
  type ColumnDef,
  type PaginationState,
  type Updater,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Eye, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  NAO_INFORMADO,
  nomeDeExibicao,
  valorOuNaoInformado,
} from '../lib/format'

const PAGE_SIZE_PADRAO = 10
// A API aceita no máximo 100 por página.
const PAGE_SIZE_MAXIMO = 100
const PAGE_SIZE_OPCOES = [10, 20, 30, 40, 50, PAGE_SIZE_MAXIMO]
// Busca enquanto digita: espera a pessoa parar antes de ir na API.
const ATRASO_BUSCA_MS = 500

/**
 * Listagem do banco de currículos. Busca, página e tamanho de página ficam na
 * URL, para o operador voltar da ficha para a mesma lista.
 */
export function BancoCurriculosTable() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(
    Number(searchParams.get('pageSize')) || PAGE_SIZE_PADRAO,
    PAGE_SIZE_MAXIMO
  )
  const search = searchParams.get('search') ?? ''

  const [termo, setTermo] = useState(search)
  // Marca as mudanças de URL feitas pela própria digitação, para a sincronização
  // abaixo não sobrescrever o que a pessoa já digitou depois.
  const buscaDaDigitacaoRef = useRef(false)

  // Mantém o campo coerente quando a URL muda por voltar/avançar do navegador.
  useEffect(() => {
    if (buscaDaDigitacaoRef.current) {
      buscaDaDigitacaoRef.current = false
      return
    }
    setTermo(search)
  }, [search])

  const { data, isLoading, isError } = useBancoCurriculos({
    page,
    pageSize,
    search: search || undefined,
  })

  const total = data?.meta?.total ?? 0
  const pagination: PaginationState = { pageIndex: page - 1, pageSize }

  function atualizarUrl(proximo: {
    page: number
    pageSize: number
    search: string
  }) {
    const params = new URLSearchParams()
    if (proximo.search) params.set('search', proximo.search)
    if (proximo.page > 1) params.set('page', String(proximo.page))
    if (proximo.pageSize !== PAGE_SIZE_PADRAO) {
      params.set('pageSize', String(proximo.pageSize))
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }

  function aplicarBusca(valor: string) {
    const limpo = valor.trim()
    // Sem mudança não há o que atualizar, e o sinalizador ficaria preso.
    if (limpo === search) return
    buscaDaDigitacaoRef.current = true
    atualizarUrl({ page: 1, pageSize, search: limpo })
  }

  const aplicarBuscaComAtraso = useDebouncedCallback(
    (valor: string) => aplicarBusca(valor),
    ATRASO_BUSCA_MS
  )

  function handleTermo(valor: string) {
    setTermo(valor)
    aplicarBuscaComAtraso(valor)
  }

  // O botão continua valendo para quem prefere confirmar, e busca na hora.
  function handleFiltrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    aplicarBusca(termo)
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const proxima =
      typeof updater === 'function' ? updater(pagination) : updater
    const proximoPageSize = Math.min(proxima.pageSize, PAGE_SIZE_MAXIMO)
    atualizarUrl({
      // Trocar o tamanho da página volta para a primeira.
      page: proximoPageSize === pageSize ? proxima.pageIndex + 1 : 1,
      pageSize: proximoPageSize,
      search,
    })
  }

  const columns = useMemo<ColumnDef<EmpregabilidadeBancoCurriculoItem>[]>(
    () => [
      {
        id: 'nome',
        header: 'Nome',
        cell: ({ row }) => (
          <span className="font-medium">{nomeDeExibicao(row.original)}</span>
        ),
      },
      {
        id: 'profissao',
        header: 'Profissão',
        cell: ({ row }) => valorOuNaoInformado(row.original.profissao),
      },
      {
        id: 'escolaridade',
        header: 'Escolaridade',
        cell: ({ row }) => valorOuNaoInformado(row.original.escolaridade),
      },
      {
        id: 'data_inclusao',
        header: 'Data de inclusão',
        cell: ({ row }) =>
          formatDateBR(row.original.data_inclusao) || NAO_INFORMADO,
      },
      {
        id: 'acoes',
        header: () => <div className="text-right">Ações</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={`/gorio/banco-curriculos/${row.original.cpf}`}>
                <Eye className="mr-2 h-4 w-4" />
                Detalhar
              </Link>
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
    getRowId: row => row.cpf ?? '',
    state: { pagination },
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleFiltrar}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Input
          value={termo}
          onChange={event => handleTermo(event.target.value)}
          placeholder="Pesquisar por nome ou CPF"
          aria-label="Pesquisar por nome ou CPF"
          className="sm:max-w-sm"
        />
        <Button type="submit" variant="outline">
          <Search className="mr-2 h-4 w-4" />
          Filtrar
        </Button>
      </form>

      {isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar os currículos. Tente novamente em instantes.
        </p>
      ) : (
        <DataTable
          table={table}
          loading={isLoading}
          pageSizeOptions={PAGE_SIZE_OPCOES}
        />
      )}
    </div>
  )
}
