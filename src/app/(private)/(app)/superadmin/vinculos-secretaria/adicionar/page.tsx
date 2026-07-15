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
import { DepartmentCombobox } from '@/components/ui/department-combobox'
import { Label } from '@/components/ui/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { CpfInput, digitsOnlyCpf } from '../components/cpf-input'
import { useCpfSecretaria } from '../components/use-cpf-secretaria'
import { VinculoSecretariaPageHeader } from '../components/vinculo-secretaria-page-header'
import { VinculosTable } from '../components/vinculos-table'

const addVinculoSchema = z.object({
  cpf: z.string().refine(value => digitsOnlyCpf(value).length === 11, {
    message: 'Informe um CPF válido com 11 dígitos.',
  }),
  cd_ua: z.string().min(1, 'Selecione uma secretaria.'),
})

type AddVinculoForm = z.infer<typeof addVinculoSchema>

export default function AdicionarVinculoSecretariaPage() {
  const { mappings, cpfConsultado, isMutating, addVinculo, fetchVinculos } =
    useCpfSecretaria()

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddVinculoForm>({
    resolver: zodResolver(addVinculoSchema),
    defaultValues: {
      cpf: '',
      cd_ua: '',
    },
  })

  const cpfValue = watch('cpf')

  const onSubmit = handleSubmit(async data => {
    const success = await addVinculo(digitsOnlyCpf(data.cpf), data.cd_ua)
    if (success) {
      setValue('cd_ua', '')
    }
  })

  return (
    <ContentLayout title="Adicionar vínculo de secretaria">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Acesso restrito</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>Superadmin</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Adicionar vínculo</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <VinculoSecretariaPageHeader
            title="Adicionar vínculo de secretaria"
            description="Vincule um CPF a uma secretaria (cd_ua) na base de apoio."
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Controller
              name="cpf"
              control={control}
              render={({ field }) => (
                <CpfInput
                  id="cpf"
                  value={field.value}
                  onChange={value => {
                    field.onChange(value)
                  }}
                  onBlur={() => {
                    field.onBlur()
                    if (digitsOnlyCpf(field.value).length === 11) {
                      void fetchVinculos(field.value)
                    }
                  }}
                  disabled={isMutating}
                />
              )}
            />
            {errors.cpf ? (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Secretaria</Label>
            <Controller
              name="cd_ua"
              control={control}
              render={({ field }) => (
                <DepartmentCombobox
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isMutating}
                  placeholder="Selecione a secretaria"
                />
              )}
            />
            {errors.cd_ua ? (
              <p className="text-sm text-destructive">{errors.cd_ua.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isMutating}
            className="cursor-pointer"
          >
            {isMutating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Adicionar vínculo
          </Button>
        </form>

        {cpfConsultado && cpfConsultado === digitsOnlyCpf(cpfValue) ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Vínculos atuais do CPF{' '}
              <span className="font-mono font-medium text-foreground">
                {cpfConsultado}
              </span>
            </p>
            <VinculosTable mappings={mappings} />
          </div>
        ) : null}
      </div>
    </ContentLayout>
  )
}
