'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
} from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DepartmentCombobox } from '@/components/ui/department-combobox'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Combobox } from '@/components/ui/combobox'
import { MultiSelect } from '@/components/ui/multi-select'
import { neighborhoodZone } from '@/lib/neighborhood_zone'
import { useRouter } from 'next/navigation'

// Form schema - minimal validation for now (only UI)
const formSchema = z.object({
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  contratante: z.string().optional(),
  regime_contratacao: z.string().optional(),
  modelo_trabalho: z.string().optional(),
  vaga_pcd: z.boolean().optional(),
  tipo_pcd: z.array(z.string()).optional(),
  valor_vaga: z.number().optional(),
  bairro: z.string().optional(),
  data_limite: z.date().optional(),
  requisitos: z.string().optional(),
  diferenciais: z.string().optional(),
  responsabilidades: z.string().optional(),
  beneficios: z.string().optional(),
  etapas: z.string().optional(),
  informacoes_complementares: z.string().optional(),
  id_orgao_parceiro: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface NewEmpregabilidadeFormProps {
  initialData?: Partial<FormData>
  isReadOnly?: boolean
  onSubmit?: (data: FormData) => void
  onSaveDraft?: (data: FormData) => void
  onFormChangesDetected?: (hasChanges: boolean) => void
}

export interface NewEmpregabilidadeFormRef {
  triggerSubmit: () => void
  triggerSaveDraft: () => void
}

export const NewEmpregabilidadeForm = forwardRef<
  NewEmpregabilidadeFormRef,
  NewEmpregabilidadeFormProps
>(
  (
    {
      initialData,
      isReadOnly = false,
      onSubmit,
      onSaveDraft,
      onFormChangesDetected,
    },
    ref
  ) => {
    const router = useRouter()

    // Memoize neighborhood options for the combobox
    const neighborhoodOptions = useMemo(() => {
      const uniqueNeighborhoods = Array.from(
        new Set(neighborhoodZone.map(n => n.bairro))
      )
        .sort()
        .map(bairro => ({
          value: bairro,
          label: bairro,
        }))
      return uniqueNeighborhoods
    }, [])

    // Mock data for enums - will be replaced with API calls later
    const regimeContratacaoOptions = [
      { value: 'clt', label: 'CLT' },
      { value: 'pj', label: 'PJ' },
      { value: 'estagiario', label: 'Estagiário' },
      { value: 'temporario', label: 'Temporário' },
    ]

    const modeloTrabalhoOptions = [
      { value: 'presencial', label: 'Presencial' },
      { value: 'remoto', label: 'Remoto' },
      { value: 'hibrido', label: 'Híbrido' },
    ]

    const tipoPcdOptions = [
      { value: 'fisica', label: 'Deficiência Física' },
      { value: 'visual', label: 'Deficiência Visual' },
      { value: 'auditiva', label: 'Deficiência Auditiva' },
      { value: 'intelectual', label: 'Deficiência Intelectual' },
      { value: 'psicossocial', label: 'Deficiência Psicossocial' },
    ]

    // Mock empresas - will be replaced with API call later
    const empresasOptions = [
      { value: 'empresa1', label: 'Empresa 1' },
      { value: 'empresa2', label: 'Empresa 2' },
    ]

    const form = useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: initialData || {
        titulo: '',
        descricao: '',
        contratante: '',
        regime_contratacao: '',
        modelo_trabalho: '',
        vaga_pcd: false,
        tipo_pcd: [],
        valor_vaga: undefined,
        bairro: '',
        data_limite: undefined,
        requisitos: '',
        diferenciais: '',
        responsabilidades: '',
        beneficios: '',
        etapas: '',
        informacoes_complementares: '',
        id_orgao_parceiro: '',
      },
      mode: 'onChange',
    })

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      triggerSubmit: () => {
        form.handleSubmit(handleSubmit)()
      },
      triggerSaveDraft: () => {
        handleSaveDraft()
      },
    }))

    const handleSubmit = (data: FormData) => {
      console.log('Form submitted:', data)
      if (onSubmit) {
        onSubmit(data)
      }
    }

    const handleSaveDraft = () => {
      const currentValues = form.getValues()
      console.log('Saving draft:', currentValues)
      if (onSaveDraft) {
        onSaveDraft(currentValues)
      }
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16">
            {/* Coluna Esquerda */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Desenvolvedor Full Stack"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição*</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        placeholder="Descreva a vaga de forma clara e objetiva..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contratante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contratante*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresasOptions.map(empresa => (
                            <SelectItem
                              key={empresa.value}
                              value={empresa.value}
                            >
                              {empresa.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="regime_contratacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime de Contratação*</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o regime" />
                          </SelectTrigger>
                          <SelectContent>
                            {regimeContratacaoOptions.map(regime => (
                              <SelectItem
                                key={regime.value}
                                value={regime.value}
                              >
                                {regime.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelo_trabalho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo de Trabalho*</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o modelo" />
                          </SelectTrigger>
                          <SelectContent>
                            {modeloTrabalhoOptions.map(modelo => (
                              <SelectItem
                                key={modelo.value}
                                value={modelo.value}
                              >
                                {modelo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="vaga_pcd"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Vaga PCD</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Marque se esta vaga é exclusiva para pessoas com
                        deficiência
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_pcd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Deficiência (PCD)</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={tipoPcdOptions}
                        value={field.value || []}
                        onValueChange={field.onChange}
                        placeholder="Selecione os tipos de deficiência"
                        searchPlaceholder="Buscar tipo de deficiência..."
                        emptyMessage="Nenhum tipo encontrado."
                        disabled={isReadOnly || !form.watch('vaga_pcd')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_vaga"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Vaga (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 5000.00"
                        {...field}
                        onChange={e => {
                          const value = e.target.value
                          field.onChange(
                            value === '' ? undefined : Number.parseFloat(value)
                          )
                        }}
                        value={field.value || ''}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro*</FormLabel>
                    <FormControl>
                      <Combobox
                        options={neighborhoodOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione o bairro"
                        searchPlaceholder="Buscar bairro..."
                        emptyMessage="Nenhum bairro encontrado."
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_limite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Limite*</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a data e hora limite"
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_orgao_parceiro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão Parceiro</FormLabel>
                    <FormControl>
                      <DepartmentCombobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={isReadOnly}
                        placeholder="Selecione um órgão"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Coluna Direita */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="requisitos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requisitos*</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        placeholder="Liste os requisitos necessários para a vaga..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="diferenciais"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diferenciais</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Liste os diferenciais que seriam desejáveis..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsabilidades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsabilidades*</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        placeholder="Descreva as principais responsabilidades da função..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="beneficios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benefícios</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Liste os benefícios oferecidos..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="etapas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapas do Processo Seletivo</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Descreva as etapas do processo seletivo..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="informacoes_complementares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informações Complementares</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Informações adicionais relevantes..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isReadOnly}
            >
              Salvar Rascunho
            </Button>
            <Button type="submit" disabled={isReadOnly}>
              Publicar Vaga
            </Button>
          </div>
        </form>
      </Form>
    )
  }
)

NewEmpregabilidadeForm.displayName = 'NewEmpregabilidadeForm'
