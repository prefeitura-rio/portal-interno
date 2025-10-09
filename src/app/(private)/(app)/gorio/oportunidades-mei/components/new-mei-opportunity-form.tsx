'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import {
  DateTimePicker,
  formatDateTimeToUTC,
} from '@/components/ui/datetime-picker'
import { ImageUpload } from '@/components/ui/image-upload'
import { useOcupacoes, useServicos } from '@/hooks/use-cnaes'
import { useIsMobile } from '@/hooks/use-mobile'
import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Custom validation function for Google Cloud Storage URLs
const validateGoogleCloudStorageURL = (url: string | undefined) => {
  // Allow empty or undefined URLs for drafts
  if (!url || url.trim() === '') {
    return true
  }
  return url.startsWith(
    'https://storage.googleapis.com/rj-escritorio-dev-public/superapp/'
  )
}

// Create the full schema for complete validation (used for publishing)
const fullFormSchema = z.object({
  orgao: z.object({
    id: z.number(),
    nome: z.string().min(1, { message: 'Órgão é obrigatório.' }),
  }),
  cnae_id: z.number().min(1, { message: 'CNAE é obrigatório.' }),
  title: z
    .string()
    .min(1, { message: 'Título é obrigatório.' })
    .min(5, { message: 'Título deve ter pelo menos 5 caracteres.' })
    .max(100, { message: 'Título não pode exceder 100 caracteres.' }),
  activity_type: z
    .string()
    .min(1, { message: 'Tipo de atividade é obrigatório.' }),
  activity_specification: z
    .string()
    .min(1, { message: 'Especificação da atividade é obrigatória.' })
    .min(5, { message: 'Especificação deve ter pelo menos 5 caracteres.' }),
  description: z
    .string()
    .min(1, { message: 'Descrição é obrigatória.' })
    .min(20, { message: 'Descrição deve ter pelo menos 20 caracteres.' })
    .max(600, { message: 'Descrição não pode exceder 600 caracteres.' }),
  outras_informacoes: z.string().optional(),
  address: z
    .string()
    .min(1, { message: 'Endereço é obrigatório.' })
    .min(10, { message: 'Endereço deve ter pelo menos 10 caracteres.' }),
  number: z.string().min(1, { message: 'Número é obrigatório.' }),
  neighborhood: z
    .string()
    .min(1, { message: 'Bairro é obrigatório.' })
    .min(3, { message: 'Bairro deve ter pelo menos 3 caracteres.' }),
  forma_pagamento: z.string().optional(),
  prazo_pagamento: z.string().optional(),
  opportunity_expiration_date: z.date({
    required_error: 'Prazo para expiração da oportunidade é obrigatório.',
  }),
  service_execution_deadline: z.date().optional(),
  gallery_images: z
    .array(
      z.string().refine(
        val => {
          // Se estiver vazio, aceita (campo opcional)
          if (!val || val.trim() === '') return true
          // Se tiver conteúdo, valida se é URL válida
          try {
            new URL(val)
            return validateGoogleCloudStorageURL(val)
          } catch {
            return false
          }
        },
        {
          message:
            'Deve ser uma URL válida do bucket do Google Cloud Storage ou deixe em branco.',
        }
      )
    )
    .optional(),
  cover_image: z
    .string()
    .url({ message: 'Imagem de capa deve ser uma URL válida.' })
    .refine(validateGoogleCloudStorageURL, {
      message:
        'Imagem de capa deve ser uma URL do bucket do Google Cloud Storage.',
    }),
})

// Create a minimal schema for draft validation
const draftFormSchema = z.object({
  orgao: z
    .object({
      id: z.number(),
      nome: z.string(),
    })
    .optional(),
  cnae_id: z.number().optional(),
  title: z.string().optional(),
  activity_type: z.string().optional(),
  activity_specification: z.string().optional(),
  description: z.string().optional(),
  outras_informacoes: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  forma_pagamento: z.string().optional(),
  prazo_pagamento: z.string().optional(),
  opportunity_expiration_date: z.date().optional(),
  service_execution_deadline: z.date().optional(),
  gallery_images: z.array(z.string()).optional(),
  cover_image: z
    .string()
    .refine(validateGoogleCloudStorageURL, {
      message:
        'Imagem de capa deve ser uma URL do bucket do Google Cloud Storage.',
    })
    .optional(),
})

// Use the full schema as the main form schema
const formSchema = fullFormSchema

type FormData = z.infer<typeof formSchema>

// Helper type for form state
type PartialFormData = Partial<FormData> & {
  cnae?: {
    id: number
    codigo: string
    ocupacao: string
    servico: string
  }
  status?: 'canceled' | 'draft' | 'opened' | 'closed'
  originalStatus?: 'canceled' | 'draft' | 'opened' | 'closed'
}

// Type for backend API data
type BackendMEIOpportunityData = {
  orgao_id: number | null
  cnae_id: number | null
  cnae?: {
    id: number
    codigo: string
    ocupacao: string
    servico: string
  }
  titulo?: string
  descricao_servico?: string
  outras_informacoes?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
  forma_pagamento?: string
  prazo_pagamento?: string
  data_expiracao?: string
  data_limite_execucao?: string | null
  gallery_images?: string[]
  cover_image?: string | null
  status?: 'active' | 'draft' | 'canceled' | 'closed'
}

interface NewMEIOpportunityFormProps {
  initialData?: PartialFormData
  isReadOnly?: boolean
  onSubmit?: (data: BackendMEIOpportunityData) => void
  onSaveDraft?: (data: BackendMEIOpportunityData) => void
  onPublish?: (data: BackendMEIOpportunityData) => void
  isDraft?: boolean
  opportunityStatus?: string
}

export interface NewMEIOpportunityFormRef {
  triggerSubmit: () => void
  triggerPublish: () => void
  triggerSaveDraft: () => void
}

export const NewMEIOpportunityForm = forwardRef<
  NewMEIOpportunityFormRef,
  NewMEIOpportunityFormProps
>(
  (
    {
      initialData,
      isReadOnly = false,
      onSubmit,
      onSaveDraft,
      onPublish,
      isDraft = false,
      opportunityStatus,
    },
    ref
  ) => {
    const router = useRouter()
    const isMobile = useIsMobile()

    // Function to truncate text for mobile
    const truncateText = (text: string, maxLength = 36) => {
      if (isMobile && text.length > maxLength) {
        return `${text.substring(0, maxLength)}...`
      }
      return text
    }

    // State for organizations
    const [orgaos, setOrgaos] = useState<Array<{ id: number; nome: string }>>(
      []
    )
    const [loadingOrgaos, setLoadingOrgaos] = useState(false)

    // State for selected occupation to fetch services
    const [selectedOcupacao, setSelectedOcupacao] = useState<string>('')
    // State for selected CNAE object
    const [selectedCnae, setSelectedCnae] = useState<{
      id: number
      codigo: string
      ocupacao: string
      servico: string
    } | null>(null)

    // Fetch occupations and services using hooks
    const { ocupacoes, isLoading: isLoadingOcupacoes } = useOcupacoes()
    const { cnaes, isLoading: isLoadingServicos } =
      useServicos(selectedOcupacao)

    // Dialog states
    const [confirmDialog, setConfirmDialog] = useState<{
      open: boolean
      type:
        | 'create_opportunity'
        | 'save_draft'
        | 'publish_opportunity'
        | 'save_changes'
        | null
    }>({
      open: false,
      type: null,
    })

    const form = useForm({
      resolver: zodResolver(formSchema),
      defaultValues: initialData
        ? {
            orgao: initialData.orgao,
            cnae_id: initialData.cnae_id,
            title: initialData.title || '',
            activity_type: initialData.activity_type || '',
            activity_specification: initialData.activity_specification || '',
            description: initialData.description || '',
            outras_informacoes: initialData.outras_informacoes || '',
            address: initialData.address || '',
            number: initialData.number || '',
            neighborhood: initialData.neighborhood || '',
            forma_pagamento: initialData.forma_pagamento || '',
            prazo_pagamento: initialData.prazo_pagamento || '',
            opportunity_expiration_date:
              initialData.opportunity_expiration_date || new Date(),
            service_execution_deadline: initialData.service_execution_deadline,
            gallery_images:
              initialData.gallery_images &&
              initialData.gallery_images.length > 0
                ? initialData.gallery_images
                : [''],
            cover_image: initialData.cover_image || '',
          }
        : {
            orgao: undefined,
            cnae_id: undefined,
            title: '',
            activity_type: '',
            activity_specification: '',
            description: '',
            outras_informacoes: '',
            address: '',
            number: '',
            neighborhood: '',
            forma_pagamento: '',
            prazo_pagamento: '',
            opportunity_expiration_date: new Date(),
            service_execution_deadline: undefined,
            gallery_images: [''],
            cover_image: '',
          },
      mode: 'onChange',
    })

    const { fields, append, remove } = useFieldArray({
      control: form.control as any,
      name: 'gallery_images',
    })

    // Fetch organizations on component mount
    React.useEffect(() => {
      const fetchOrgaos = async () => {
        try {
          setLoadingOrgaos(true)
          const response = await fetch('/api/orgaos')

          if (response.ok) {
            const data = await response.json()
            setOrgaos(data.data || [])
          } else {
            console.error('Failed to fetch organizations')
            toast.error('Erro ao carregar organizações')
          }
        } catch (error) {
          console.error('Error fetching organizations:', error)
          toast.error('Erro ao carregar organizações')
        } finally {
          setLoadingOrgaos(false)
        }
      }

      fetchOrgaos()
    }, [])

    // Set selected occupation and cnae when initial data is provided
    React.useEffect(() => {
      if (initialData?.activity_type) {
        setSelectedOcupacao(initialData.activity_type)
      }
      if (initialData?.cnae) {
        setSelectedCnae(initialData.cnae)
      }
    }, [initialData?.activity_type, initialData?.cnae])

    // Transform form data to snake_case for backend API
    const transformFormDataToSnakeCase = (
      data: PartialFormData
    ): BackendMEIOpportunityData => {
      return {
        orgao_id: data.orgao?.id || null,
        cnae_id: data.cnae_id || null,
        cnae: data.cnae || selectedCnae || undefined,
        titulo: data.title,
        descricao_servico: data.description,
        outras_informacoes: data.outras_informacoes || '',
        logradouro: data.address,
        numero: data.number,
        bairro: data.neighborhood,
        cidade: 'RJ', // Sempre enviar "RJ" como cidade
        forma_pagamento: data.forma_pagamento,
        prazo_pagamento: data.prazo_pagamento || '',
        data_expiracao: data.opportunity_expiration_date
          ? formatDateTimeToUTC(data.opportunity_expiration_date)
          : undefined,
        data_limite_execucao: data.service_execution_deadline
          ? formatDateTimeToUTC(data.service_execution_deadline)
          : null,
        gallery_images:
          data.gallery_images?.filter(img => img && img.trim() !== '') || [],
        cover_image: data.cover_image || null,
        ...(data.status && {
          status: data.status as 'active' | 'draft' | 'canceled' | 'closed',
        }),
      }
    }

    // Transform form data for draft with default values
    const transformFormDataForDraft = (data: any) => {
      const currentDate = new Date()
      const nextMonth = new Date(
        currentDate.getTime() + 30 * 24 * 60 * 60 * 1000
      )

      const draftData: PartialFormData = {
        orgao:
          data.orgao ||
          (orgaos.length > 0 ? orgaos[0] : { id: 1, nome: 'Órgão Padrão' }),
        cnae_id: data.cnae_id || 1,
        title:
          data.title || 'Rascunho de oportunidade. Edite antes de publicar!',
        activity_type: data.activity_type || '',
        activity_specification: data.activity_specification || '',
        description:
          data.description ||
          'Descrição em desenvolvimento. Edite antes de publicar!',
        outras_informacoes: data.outras_informacoes || '',
        address: data.address || '',
        number: data.number || '',
        neighborhood: data.neighborhood || '',
        forma_pagamento: data.forma_pagamento || '',
        prazo_pagamento: data.prazo_pagamento || '',
        opportunity_expiration_date:
          data.opportunity_expiration_date || nextMonth,
        service_execution_deadline: data.service_execution_deadline || null,
        gallery_images: data.gallery_images || [''],
        cover_image: data.cover_image || '',
      }

      return transformFormDataToSnakeCase(draftData)
    }

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      triggerSubmit: () => {
        form.handleSubmit(handleSubmit)()
      },
      triggerPublish: () => {
        handlePublish()
      },
      triggerSaveDraft: () => {
        handleSaveDraft()
      },
    }))

    const addGalleryImage = () => {
      append('')
    }

    const removeGalleryImage = (index: number) => {
      remove(index)
    }

    const handleSubmit = (data: PartialFormData) => {
      if (initialData) {
        // Editing an existing opportunity
        setConfirmDialog({
          open: true,
          type: 'save_changes',
        })
      } else {
        // Creating a new opportunity
        setConfirmDialog({
          open: true,
          type: 'create_opportunity',
        })
      }
    }

    const confirmCreateOpportunity = async (values: PartialFormData) => {
      try {
        // Validate the complete form data
        const validatedData = fullFormSchema.parse(values)

        // Transform to snake_case for backend
        const transformedData = transformFormDataToSnakeCase(validatedData)

        if (initialData) {
          // Editing an existing opportunity
          // Map 'opened' to 'active' for backend compatibility
          let status: 'active' | 'draft' | 'canceled' | 'closed' = 'active'
          const currentStatus = initialData.originalStatus || initialData.status
          if (currentStatus === 'draft') status = 'draft'
          else if (currentStatus === 'canceled') status = 'canceled'
          else if (currentStatus === 'closed') status = 'closed'
          else status = 'active'

          const editData = {
            ...transformedData,
            status,
          }

          if (onSubmit) {
            onSubmit(editData)
          }
        } else {
          // Creating a new opportunity
          const opportunityData = {
            ...transformedData,
            status: 'active' as const,
          }

          console.log('Form submitted successfully!')
          console.log('Form values:', opportunityData)

          if (onSubmit) {
            onSubmit(opportunityData)
          } else {
            toast.success('Oportunidade criada com sucesso!')
            router.push('/gorio/oportunidades-mei')
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation errors:', error.errors)
          toast.error('Erro de validação', {
            description: 'Por favor, verifique os campos destacados.',
          })
        } else {
          console.error('Unexpected error:', error)
          toast.error('Erro inesperado', {
            description: 'Ocorreu um erro ao processar o formulário.',
          })
        }
      }
    }

    async function handleSaveDraft() {
      setConfirmDialog({
        open: true,
        type: 'save_draft',
      })
    }

    const handleSaveDraftDirectly = async () => {
      try {
        const currentValues = form.getValues()

        // Use minimal validation for drafts
        const validatedData = draftFormSchema.parse(currentValues)

        // Transform to snake_case for backend with default values filled in
        const transformedData = transformFormDataForDraft(validatedData)

        const draftData = {
          ...transformedData,
          status: 'draft' as const,
        }

        console.log('Saving draft...')
        console.log('Draft values:', draftData)

        if (onSaveDraft) {
          onSaveDraft(draftData)
        } else if (onSubmit) {
          onSubmit(draftData)
        } else {
          toast.success('Rascunho salvo com sucesso!')
          router.push('/gorio/oportunidades-mei?tab=draft')
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation errors:', error.errors)
          toast.error('Erro ao salvar rascunho', {
            description:
              'Ocorreu um erro de formato nos dados. Tente novamente.',
          })
        } else {
          console.error('Error saving draft:', error)
          toast.error('Erro ao salvar rascunho', {
            description: 'Ocorreu um erro ao salvar o rascunho.',
          })
        }
      }
    }

    async function handlePublish() {
      setConfirmDialog({
        open: true,
        type: 'publish_opportunity',
      })
    }

    const confirmPublishOpportunity = async () => {
      try {
        // Trigger form validation to show visual errors
        const isValid = await form.trigger()

        if (!isValid) {
          toast.error('Erro de validação', {
            description:
              'Por favor, verifique os campos destacados antes de publicar.',
          })
          return
        }

        const currentValues = form.getValues()

        // Validate the complete form data before publishing
        const validatedData = fullFormSchema.parse(currentValues)

        // Transform to snake_case for backend
        const transformedData = transformFormDataToSnakeCase(validatedData)

        const publishData = {
          ...transformedData,
          status: 'active' as const,
        }

        console.log('Publishing opportunity...')
        console.log('Publish values:', publishData)

        if (onPublish) {
          onPublish(publishData)
        }
        toast.success('Oportunidade publicada com sucesso!')
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation errors:', error.errors)
          toast.error('Erro de validação', {
            description:
              'Por favor, verifique os campos destacados antes de publicar.',
          })
        } else {
          console.error('Error publishing opportunity:', error)
          toast.error('Erro ao publicar oportunidade', {
            description: 'Ocorreu um erro ao publicar a oportunidade.',
          })
        }
      }
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="orgao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão demandante*</FormLabel>
                    <Select
                      onValueChange={value => {
                        const selectedOrgao = orgaos.find(
                          org => org.id.toString() === value
                        )
                        if (selectedOrgao) {
                          field.onChange(selectedOrgao)
                        }
                      }}
                      value={field.value?.id?.toString() || ''}
                      disabled={isReadOnly || loadingOrgaos}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingOrgaos
                                ? 'Carregando organizações...'
                                : orgaos.length === 0
                                  ? 'Nenhuma organização encontrada'
                                  : 'Selecione um órgão'
                            }
                          >
                            {field.value?.nome &&
                              truncateText(field.value.nome)}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      {!loadingOrgaos && orgaos.length > 0 && (
                        <SelectContent>
                          {orgaos.map(orgao => (
                            <SelectItem
                              key={orgao.id}
                              value={orgao.id.toString()}
                            >
                              {orgao.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      )}
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título*</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de atividade (Ocupação)*</FormLabel>
                    <FormControl>
                      <Combobox
                        options={ocupacoes.map(ocupacao => ({
                          value: ocupacao,
                          label: ocupacao,
                        }))}
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value)
                          setSelectedOcupacao(value)
                          // Clear activity_specification and cnae when occupation changes
                          form.setValue('activity_specification', '')
                          form.setValue('cnae_id', undefined as any)
                          setSelectedCnae(null)
                        }}
                        placeholder={
                          isLoadingOcupacoes
                            ? 'Carregando ocupações...'
                            : 'Selecione uma ocupação'
                        }
                        searchPlaceholder="Buscar ocupação..."
                        emptyMessage="Nenhuma ocupação encontrada."
                        disabled={isReadOnly || isLoadingOcupacoes}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity_specification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especificação da atividade (Serviço)*</FormLabel>
                    <FormControl>
                      <Combobox
                        options={cnaes.map(cnae => ({
                          value: cnae.id.toString(),
                          label: `${cnae.servico}${cnae.codigo ? ` (${cnae.codigo})` : ''}`,
                        }))}
                        value={selectedCnae?.id.toString() || ''}
                        onValueChange={value => {
                          // Find CNAE by ID
                          const foundCnae = cnaes.find(
                            c => c.id.toString() === value
                          )
                          if (foundCnae) {
                            field.onChange(foundCnae.servico)
                            form.setValue('cnae_id', foundCnae.id)
                            setSelectedCnae(foundCnae)
                          }
                        }}
                        placeholder={
                          !selectedOcupacao
                            ? 'Selecione uma ocupação primeiro'
                            : isLoadingServicos
                              ? 'Carregando serviços...'
                              : 'Selecione um serviço'
                        }
                        searchPlaceholder="Buscar serviço..."
                        emptyMessage="Nenhum serviço encontrado."
                        disabled={
                          isReadOnly || !selectedOcupacao || isLoadingServicos
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do serviço*</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
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
                name="outras_informacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outras informações</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[80px]"
                        placeholder="Informações adicionais relevantes..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Endereço*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Rua das Flores"
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
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número*</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          {...field}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Centro"
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="forma_pagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de pagamento</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TED">TED</SelectItem>
                            <SelectItem value="DOC">DOC</SelectItem>
                            <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prazo_pagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo de pagamento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 30 dias"
                          {...field}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-start gap-4">
                <FormField
                  control={form.control}
                  name="opportunity_expiration_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-w-[280px]">
                      <FormLabel>
                        Prazo para expiração da oportunidade*
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecionar data e hora"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="service_execution_deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-w-[280px]">
                      <FormLabel>
                        Data limite para execução do serviço*
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecionar data e hora"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="cover_image"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        label="Imagem de capa*"
                        previewClassName="max-h-[200px] max-w-full rounded-lg object-contain"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Imagens para galeria</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <FormField
                          control={form.control}
                          name={`gallery_images.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="https://storage.googleapis.com/..."
                                  {...field}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeGalleryImage(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {form.watch(`gallery_images.${index}`) && (
                        <div className="w-full rounded-lg border overflow-hidden">
                          <img
                            src={form.watch(`gallery_images.${index}`)}
                            alt={`Pré-visualização ${index + 1}`}
                            className="w-full h-auto max-h-[200px] object-contain bg-muted"
                            onError={e => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addGalleryImage}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar imagem
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4 lg:mt-10">
            {!initialData && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className="w-full py-6"
              >
                Salvar Rascunho
              </Button>
            )}
            {isDraft && (
              <Button
                type="button"
                onClick={handlePublish}
                className="w-full py-6"
              >
                Salvar e Publicar
              </Button>
            )}
            {isDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className="w-full py-6"
              >
                Salvar Rascunho
              </Button>
            )}

            {!isDraft &&
              opportunityStatus !== 'cancelled' &&
              opportunityStatus !== 'finished' &&
              opportunityStatus !== 'canceled' && (
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full py-6"
                >
                  {form.formState.isSubmitting
                    ? 'Enviando...'
                    : initialData
                      ? 'Salvar Alterações'
                      : 'Criar Oportunidade'}
                </Button>
              )}
          </div>
        </form>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
          title={
            confirmDialog.type === 'create_opportunity'
              ? 'Criar Oportunidade'
              : confirmDialog.type === 'save_draft'
                ? 'Salvar Rascunho'
                : confirmDialog.type === 'save_changes'
                  ? 'Salvar Alterações'
                  : confirmDialog.type === 'publish_opportunity'
                    ? 'Publicar Oportunidade'
                    : 'Salvar Alterações'
          }
          description={
            confirmDialog.type === 'create_opportunity'
              ? 'Tem certeza que deseja criar esta oportunidade? Esta ação tornará a oportunidade visível.'
              : confirmDialog.type === 'save_draft'
                ? 'Tem certeza que deseja salvar este rascunho? A oportunidade não será publicada ainda.'
                : confirmDialog.type === 'save_changes'
                  ? 'Tem certeza que deseja salvar as alterações nesta oportunidade?'
                  : confirmDialog.type === 'publish_opportunity'
                    ? 'Tem certeza que deseja publicar esta oportunidade? Esta ação tornará a oportunidade visível.'
                    : 'Tem certeza que deseja salvar as alterações nesta oportunidade?'
          }
          confirmText={
            confirmDialog.type === 'create_opportunity'
              ? 'Criar Oportunidade'
              : confirmDialog.type === 'save_draft'
                ? 'Salvar Rascunho'
                : confirmDialog.type === 'save_changes'
                  ? 'Salvar Alterações'
                  : confirmDialog.type === 'publish_opportunity'
                    ? 'Publicar Oportunidade'
                    : 'Salvar Alterações'
          }
          variant="default"
          onConfirm={() => {
            const currentValues = form.getValues()
            if (confirmDialog.type === 'create_opportunity') {
              confirmCreateOpportunity(currentValues)
            } else if (confirmDialog.type === 'save_draft') {
              handleSaveDraftDirectly()
            } else if (confirmDialog.type === 'publish_opportunity') {
              confirmPublishOpportunity()
            } else if (confirmDialog.type === 'save_changes') {
              confirmCreateOpportunity(currentValues)
            }
          }}
        />
      </Form>
    )
  }
)

NewMEIOpportunityForm.displayName = 'NewMEIOpportunityForm'
