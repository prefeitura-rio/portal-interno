"use client"

import { ContentLayout } from '@/components/admin-panel/content-layout'
import { DataTable } from "@/components/data-table/data-table"
import { DataTableActionBar, DataTableActionBarAction, DataTableActionBarSelection } from '@/components/data-table/data-table-action-bar'
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list"
import { DataTableSortList } from "@/components/data-table/data-table-sort-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDataTable } from "@/hooks/use-data-table"

import type { Column, ColumnDef } from "@tanstack/react-table"
import {
  AlertCircle,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  MoreHorizontal,
  Text,
  Trash2,
  Users,
  XCircle,
} from "lucide-react"
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs"
import * as React from "react"

interface Course {
  id: string
  title: string
  provider: string
  duration: number // in hours
  vacancies: number
  status: "active" | "inactive" | "draft" | "completed"
  created_at: string
}

// Comprehensive mock data
const data: Course[] = [
  {
    id: "1",
    title: "Desenvolvimento Web Frontend com React",
    provider: "TechEducation",
    duration: 40,
    vacancies: 25,
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    title: "Python para Ciência de Dados",
    provider: "DataScience Academy",
    duration: 60,
    vacancies: 15,
    status: "active",
    created_at: "2024-01-10T14:30:00Z",
  },
  {
    id: "3",
    title: "DevOps e Kubernetes",
    provider: "Cloud Masters",
    duration: 80,
    vacancies: 10,
    status: "inactive",
    created_at: "2024-01-05T09:15:00Z",
  },
  {
    id: "4",
    title: "Mobile Development com React Native",
    provider: "TechEducation",
    duration: 50,
    vacancies: 20,
    status: "draft",
    created_at: "2024-01-20T16:45:00Z",
  },
  {
    id: "5",
    title: "Machine Learning Fundamentals",
    provider: "AI Institute",
    duration: 70,
    vacancies: 12,
    status: "completed",
    created_at: "2023-12-20T11:00:00Z",
  },
  {
    id: "6",
    title: "Advanced JavaScript and TypeScript",
    provider: "JavaScript Academy",
    duration: 45,
    vacancies: 30,
    status: "active",
    created_at: "2024-01-12T08:30:00Z",
  },
  {
    id: "7",
    title: "Cybersecurity Essentials",
    provider: "SecureLearn",
    duration: 35,
    vacancies: 18,
    status: "active",
    created_at: "2024-01-18T13:20:00Z",
  },
  {
    id: "8",
    title: "UX/UI Design Masterclass",
    provider: "Design Hub",
    duration: 55,
    vacancies: 22,
    status: "inactive",
    created_at: "2024-01-08T15:10:00Z",
  },
  {
    id: "9",
    title: "Desenvolvimento Web Backend com Node.js",
    provider: "TechEducation",
    duration: 40,
    vacancies: 25,
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "10",
    title: "Desenvolvimento Web Backend com Node.js",
    provider: "TechEducation",
    duration: 40,
    vacancies: 25,
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "11",
    title: "Desenvolvimento Web Backend com Node.js",
    provider: "TechEducation",
    duration: 40,
    vacancies: 25,
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "12",
    title: "Desenvolvimento Web Backend com Node.js",
    provider: "TechEducation",
    duration: 40,
    vacancies: 25,
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "13",
    title: "Desenvolvimento Web Backend com Node.js",
    provider: "TechEducation",
    duration: 40,
    vacancies: 25,
    status: "active",
    created_at: "2024-01-15T10:00:00Z",
  },
]

export default function Courses() {
  const [title] = useQueryState("title", parseAsString.withDefault(""))
  const [provider] = useQueryState("provider", parseAsString.withDefault(""))
  const [status] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([]),
  )

  // Client-side filtering for demo purposes
  const filteredData = React.useMemo(() => {
    return data.filter((course) => {
      const matchesTitle =
        title === "" ||
        course.title.toLowerCase().includes(title.toLowerCase())
      const matchesProvider =
        provider === "" ||
        course.provider.toLowerCase().includes(provider.toLowerCase())
      const matchesStatus =
        status.length === 0 || status.includes(course.status)

      return matchesTitle && matchesProvider && matchesStatus
    })
  }, [title, provider, status])

  const columns = React.useMemo<ColumnDef<Course>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Título do Curso" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{cell.getValue<Course["title"]>()}</span>
          </div>
        ),
        meta: {
          label: "Título",
          placeholder: "Buscar cursos...",
          variant: "text",
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Provedor" />
        ),
        cell: ({ cell }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{cell.getValue<Course["provider"]>()}</span>
          </div>
        ),
        meta: {
          label: "Provedor",
          placeholder: "Buscar provedor...",
          variant: "text",
          icon: Building2,
        },
        enableColumnFilter: true,
      },
      {
        id: "duration",
        accessorKey: "duration",
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Duração" />
        ),
        cell: ({ cell }) => {
          const duration = cell.getValue<Course["duration"]>()
          return (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{duration}h</span>
            </div>
          )
        },
        meta: {
          label: "Duração",
          variant: "range",
          range: [20, 100],
          unit: "h",
          icon: Clock,
        },
        enableColumnFilter: true,
      },
      {
        id: "vacancies",
        accessorKey: "vacancies",
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Vagas" />
        ),
        cell: ({ cell }) => {
          const vacancies = cell.getValue<Course["vacancies"]>()
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{vacancies}</span>
            </div>
          )
        },
        meta: {
          label: "Vagas",
          variant: "number",
          icon: Users,
        },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<Course["status"]>()
          const statusConfig = {
            active: { 
              icon: CheckCircle, 
              label: "Ativo", 
              variant: "default" as const,
              className: "text-green-600 border-green-200 bg-green-50"
            },
            inactive: { 
              icon: XCircle, 
              label: "Inativo", 
              variant: "secondary" as const,
              className: "text-gray-600 border-gray-200 bg-gray-50"
            },
            draft: { 
              icon: AlertCircle, 
              label: "Rascunho", 
              variant: "outline" as const,
              className: "text-yellow-600 border-yellow-200 bg-yellow-50"
            },
            completed: { 
              icon: CheckCircle, 
              label: "Concluído", 
              variant: "outline" as const,
              className: "text-blue-600 border-blue-200 bg-blue-50"
            },
          }
          
          const config = statusConfig[status]
          const Icon = config.icon

          return (
            <Badge variant={config.variant} className={`capitalize ${config.className}`}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          )
        },
        meta: {
          label: "Status",
          variant: "multiSelect",
          options: [
            { label: "Ativo", value: "active", icon: CheckCircle },
            { label: "Inativo", value: "inactive", icon: XCircle },
            { label: "Rascunho", value: "draft", icon: AlertCircle },
            { label: "Concluído", value: "completed", icon: CheckCircle },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }: { column: Column<Course, unknown> }) => (
          <DataTableColumnHeader column={column} title="Data de Criação" />
        ),
        cell: ({ cell }) => {
          const date = new Date(cell.getValue<Course["created_at"]>())
          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{date.toLocaleDateString('pt-BR')}</span>
            </div>
          )
        },
        meta: {
          label: "Data de Criação",
          variant: "date",
          icon: Calendar,
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        cell: function Cell({ row }) {
          const course = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Visualizar</DropdownMenuItem>
                <DropdownMenuItem>Editar</DropdownMenuItem>
                <DropdownMenuItem>Duplicar</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 32,
      },
    ],
    [],
  )

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount: -1,
    initialState: {
      sorting: [{ id: "created_at", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (row) => row.id,
    enableAdvancedFilter: true,
  })

  return (
    <ContentLayout title="Gestão de Cursos">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Cursos</h2>
            <p className="text-muted-foreground">
              Gerencie e monitore todos os cursos disponíveis na plataforma.
            </p>
          </div>
          <Button>
            <BookOpen className="mr-2 h-4 w-4" />
            Novo Curso
          </Button>
        </div>

        <DataTable table={table}>
          <DataTableAdvancedToolbar table={table}>
            <DataTableFilterList table={table} />
            <DataTableSortList table={table} />
          </DataTableAdvancedToolbar>
          
          <DataTableActionBar table={table}>
            <DataTableActionBarSelection table={table} />
            <DataTableActionBarAction
              tooltip="Baixar planilha(s) do(s) curso(s) selecionado(s)"
              onClick={() => {
                const selectedRows = table.getFilteredSelectedRowModel().rows
                console.log("Baixando planilha:", selectedRows.map(row => row.original))
                // TODO: Implement download logic
              }}
            >
              <Download />
              Baixar planilha(s)
            </DataTableActionBarAction>
            <DataTableActionBarAction
              tooltip="Excluir cursos selecionados"
              variant="destructive"
              onClick={() => {
                const selectedRows = table.getFilteredSelectedRowModel().rows
                console.log("Excluindo cursos:", selectedRows.map(row => row.original))
                // TODO: Implement deletion logic with confirmation
              }}
            >
              <Trash2 />
              Excluir
            </DataTableActionBarAction>
          </DataTableActionBar>
        </DataTable>
      </div>
    </ContentLayout>
  )
}
