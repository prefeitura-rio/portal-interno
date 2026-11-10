'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Download, Plus, SearchCheck, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CsvImportDialog } from './components/csv-import-dialog'
import { RedirectFormDialog } from './components/redirect-form-dialog'
import { RedirectsDataTable } from './components/redirects-data-table'
import { TestUrlDialog } from './components/test-url-dialog'
import { useRedirectHosts } from './hooks/use-redirects'

const FALLBACK_CANONICAL_HOSTS = ['www.1746.rio', 'carioca.rio'] as const

export default function RedirecionamentosPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [testUrlOpen, setTestUrlOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: hostsData } = useRedirectHosts()

  const canonicalHosts = useMemo(() => {
    const fromApi =
      hostsData?.data
        ?.filter(entry => entry.kind === 'canonical' && entry.hostname)
        .map(entry => entry.hostname as string) ?? []
    return fromApi.length > 0 ? fromApi : [...FALLBACK_CANONICAL_HOSTS]
  }, [hostsData])

  const handleExportCsv = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/redirecionamentos/exportar')
      if (!response.ok) {
        throw new Error('Erro ao exportar regras em CSV')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') ?? ''
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
      const filename = filenameMatch?.[1] ?? 'redirecionamentos.csv'

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao exportar regras em CSV'
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ContentLayout title="Redirecionamentos">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Configurações</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Redirecionamentos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Redirecionamentos
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as regras de redirecionamento dos portais legados
                (1746.rio e carioca.rio) para o pref.rio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setTestUrlOpen(true)}>
                <SearchCheck className="mr-2 h-4 w-4" />
                Testar URL
              </Button>
              <Button
                variant="outline"
                disabled={isExporting}
                onClick={handleExportCsv}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova regra
              </Button>
            </div>
          </div>
        </div>

        <RedirectsDataTable canonicalHosts={canonicalHosts} />

        <RedirectFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          rule={null}
          canonicalHosts={canonicalHosts}
        />

        <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />

        <TestUrlDialog open={testUrlOpen} onOpenChange={setTestUrlOpen} />
      </div>
    </ContentLayout>
  )
}
