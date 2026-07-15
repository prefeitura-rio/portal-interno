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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import type { ModelsCPFSecretariaResponse } from '@/http-rmi/models/modelsCPFSecretariaResponse'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CpfInput, isValidCpfDigits } from '../components/cpf-input'
import { useCpfSecretaria } from '../components/use-cpf-secretaria'
import { VinculoSecretariaPageHeader } from '../components/vinculo-secretaria-page-header'
import { VinculosTable } from '../components/vinculos-table'

export default function ConsultarVinculosSecretariaPage() {
  const [cpf, setCpf] = useState('')
  const [mappingToDelete, setMappingToDelete] =
    useState<ModelsCPFSecretariaResponse | null>(null)
  const {
    mappings,
    cpfConsultado,
    isLoading,
    isMutating,
    fetchVinculos,
    removeVinculo,
  } = useCpfSecretaria()

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    await fetchVinculos(cpf)
  }

  const handleConfirmDelete = async () => {
    if (!mappingToDelete?.cd_ua || !cpfConsultado) return
    await removeVinculo(cpfConsultado, mappingToDelete.cd_ua)
    setMappingToDelete(null)
  }

  return (
    <ContentLayout title="Consultar vínculos de secretaria">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Acesso restrito</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>Superadmin</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Consultar vínculos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <VinculoSecretariaPageHeader
            title="Consultar vínculos de secretaria"
            description="Informe um CPF para listar os vínculos com secretarias na base de apoio."
          />
        </div>

        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3 items-end max-w-xl"
        >
          <div className="flex-1 w-full space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <CpfInput
              id="cpf"
              value={cpf}
              onChange={setCpf}
              disabled={isLoading || isMutating}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || isMutating || !isValidCpfDigits(cpf)}
            className="cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Consultar
          </Button>
        </form>

        {cpfConsultado ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Resultados para CPF{' '}
              <span className="font-mono font-medium text-foreground">
                {cpfConsultado}
              </span>
            </p>
            <VinculosTable
              mappings={mappings}
              renderActions={mapping => (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer text-destructive hover:text-destructive"
                  disabled={isMutating || !mapping.cd_ua}
                  onClick={() => setMappingToDelete(mapping)}
                  aria-label="Remover vínculo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            />
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={!!mappingToDelete}
        onOpenChange={open => {
          if (!open) setMappingToDelete(null)
        }}
        title="Remover vínculo?"
        description={`Tem certeza que deseja remover o vínculo com a secretaria ${mappingToDelete?.cd_ua ?? ''}? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDelete()
        }}
      />
    </ContentLayout>
  )
}
