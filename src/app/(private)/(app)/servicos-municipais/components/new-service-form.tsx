'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { ServiceButton } from '@/types/service'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  useCanEditBuscaServices,
  useIsBuscaServicesAdmin,
} from '@/hooks/use-heimdall-user'
import { useServiceOperations } from '@/hooks/use-service-operations'
import { SECRETARIAS } from '@/lib/secretarias'
import {
  getCurrentTimestamp,
  transformToApiRequest,
} from '@/lib/service-data-transformer'
import { toast } from 'sonner'

// Define the schema for service form validation
const serviceFormSchema = z.object({
  managingOrgan: z.string().min(1, { message: 'Órgão gestor é obrigatório.' }),
  serviceCategory: z
    .string()
    .min(1, { message: 'Categoria do serviço é obrigatória.' }),
  targetAudience: z
    .string()
    .min(1, { message: 'Público específico é obrigatório.' }),
  title: z
    .string()
    .min(1, { message: 'Título do serviço é obrigatório.' })
    .min(3, { message: 'Título deve ter pelo menos 3 caracteres.' })
    .max(200, { message: 'Título não pode exceder 200 caracteres.' }),
  shortDescription: z
    .string()
    .min(1, { message: 'Descrição resumida é obrigatória.' })
    .min(10, {
      message: 'Descrição resumida deve ter pelo menos 10 caracteres.',
    })
    .max(500, {
      message: 'Descrição resumida não pode exceder 500 caracteres.',
    }),
  buttons: z
    .array(
      z.object({
        titulo: z
          .string()
          .min(1, { message: 'Título do botão é obrigatório.' }),
        descricao: z
          .string()
          .min(1, { message: 'Descrição do botão é obrigatória.' }),
        url_service: z.string().url({ message: 'URL inválida.' }),
        is_enabled: z.boolean(),
        ordem: z.number(),
      })
    )
    .optional(),
  whatServiceDoesNotCover: z
    .string()
    .max(300, { message: 'Este campo não pode exceder 300 caracteres.' })
    .optional(),
  serviceTime: z
    .string()
    .max(100, {
      message: 'Tempo para atendimento não pode exceder 100 caracteres.',
    })
    .optional(),
  serviceCost: z
    .string()
    .max(100, { message: 'Custo do serviço não pode exceder 100 caracteres.' })
    .optional(),
  isFree: z.boolean().optional(),
  requestResult: z
    .string()
    .max(500, {
      message: 'Resultado da solicitação não pode exceder 500 caracteres.',
    })
    .optional(),
  fullDescription: z
    .string()
    .max(2000, {
      message: 'Descrição completa não pode exceder 2000 caracteres.',
    })
    .optional(),
  requiredDocuments: z
    .string()
    .max(1000, {
      message: 'Documentos necessários não pode exceder 1000 caracteres.',
    })
    .optional(),
  instructionsForRequester: z
    .string()
    .max(1000, {
      message:
        'Instruções para o solicitante não pode exceder 1000 caracteres.',
    })
    .optional(),
  digitalChannels: z
    .array(z.string().url({ message: 'URL inválida.' }))
    .optional(),
  physicalChannels: z
    .array(z.string().min(1, { message: 'Endereço não pode estar vazio.' }))
    .optional(),
  legislacaoRelacionada: z
    .array(z.string().min(1, { message: 'Legislação não pode estar vazia.' }))
    .optional(),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

const defaultValues: ServiceFormData = {
  managingOrgan: '',
  serviceCategory: '',
  targetAudience: '',
  title: '',
  shortDescription: '',
  buttons: [],
  whatServiceDoesNotCover: '',
  serviceTime: '',
  serviceCost: '',
  isFree: false,
  requestResult: '',
  fullDescription: '',
  requiredDocuments: '',
  instructionsForRequester: '',
  digitalChannels: [],
  physicalChannels: [],
  legislacaoRelacionada: [],
}

interface NewServiceFormProps {
  onSubmit?: (data: ServiceFormData) => void
  isLoading?: boolean
  readOnly?: boolean
  initialData?: Partial<ServiceFormData>
  serviceStatus?: string
  onSendToApproval?: () => void
  onPublish?: () => void // Callback for when service is published
  serviceId?: string // For editing existing services
}

export function NewServiceForm({
  onSubmit,
  isLoading = false,
  readOnly = false,
  initialData,
  serviceStatus,
  onSendToApproval,
  onPublish,
  serviceId,
}: NewServiceFormProps) {
  const router = useRouter()
  const isBuscaServicesAdmin = useIsBuscaServicesAdmin()
  const canEditServices = useCanEditBuscaServices()
  const {
    createService,
    updateService,
    loading: operationLoading,
  } = useServiceOperations()

  // Removed tombamento hook since we're redirecting to detail page
  const [showSendToEditDialog, setShowSendToEditDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showSendToApprovalDialog, setShowSendToApprovalDialog] =
    useState(false)
  const [pendingFormData, setPendingFormData] =
    useState<ServiceFormData | null>(null)
  const [digitalChannels, setDigitalChannels] = useState<string[]>(
    initialData?.digitalChannels || ['']
  )
  const [channelErrors, setChannelErrors] = useState<string[]>(
    initialData?.digitalChannels?.map(() => '') || ['']
  )
  const [physicalChannels, setPhysicalChannels] = useState<string[]>(
    initialData?.physicalChannels || ['']
  )
  const [physicalChannelErrors, setPhysicalChannelErrors] = useState<string[]>(
    initialData?.physicalChannels?.map(() => '') || ['']
  )
  const [legislacaoRelacionada, setLegislacaoRelacionada] = useState<string[]>(
    initialData?.legislacaoRelacionada || ['']
  )
  const [legislacaoErrors, setLegislacaoErrors] = useState<string[]>(
    initialData?.legislacaoRelacionada?.map(() => '') || ['']
  )
  const [serviceButtons, setServiceButtons] = useState<ServiceButton[]>(
    initialData?.buttons && initialData.buttons.length > 0
      ? initialData.buttons
      : []
  )

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData
      ? { ...defaultValues, ...initialData }
      : defaultValues,
  })

  // Update form values when initialData changes
  React.useEffect(() => {
    if (initialData) {
      Object.keys(initialData).forEach(key => {
        const value = initialData[key as keyof ServiceFormData]
        if (value !== undefined) {
          form.setValue(key as keyof ServiceFormData, value)
        }
      })
    }
  }, [initialData, form])

  const handleCancel = () => {
    router.push('/servicos-municipais/servicos')
  }

  const addDigitalChannel = () => {
    setDigitalChannels([...digitalChannels, ''])
    setChannelErrors([...channelErrors, ''])
  }

  const removeDigitalChannel = (index: number) => {
    if (digitalChannels.length > 1) {
      const newChannels = digitalChannels.filter((_, i) => i !== index)
      const newErrors = channelErrors.filter((_, i) => i !== index)
      setDigitalChannels(newChannels)
      setChannelErrors(newErrors)
      form.setValue(
        'digitalChannels',
        newChannels.filter(channel => channel.trim() !== '')
      )
    }
  }

  const addPhysicalChannel = () => {
    setPhysicalChannels([...physicalChannels, ''])
    setPhysicalChannelErrors([...physicalChannelErrors, ''])
  }

  const removePhysicalChannel = (index: number) => {
    if (physicalChannels.length > 1) {
      const newChannels = physicalChannels.filter((_, i) => i !== index)
      const newErrors = physicalChannelErrors.filter((_, i) => i !== index)
      setPhysicalChannels(newChannels)
      setPhysicalChannelErrors(newErrors)
      form.setValue(
        'physicalChannels',
        newChannels.filter(channel => channel.trim() !== '')
      )
    }
  }

  const updateDigitalChannel = (index: number, value: string) => {
    const newChannels = [...digitalChannels]
    const newErrors = [...channelErrors]

    newChannels[index] = value

    // Validate URL
    if (value.trim() !== '') {
      try {
        new URL(value)
        newErrors[index] = ''
      } catch {
        newErrors[index] = 'URL inválida'
      }
    } else {
      newErrors[index] = ''
    }

    setDigitalChannels(newChannels)
    setChannelErrors(newErrors)

    // Only include valid URLs in form data
    const validChannels = newChannels
      .filter(channel => channel.trim() !== '')
      .filter(channel => {
        try {
          new URL(channel)
          return true
        } catch {
          return false
        }
      })

    form.setValue('digitalChannels', validChannels)
  }

  const updatePhysicalChannel = (index: number, value: string) => {
    const newChannels = [...physicalChannels]
    const newErrors = [...physicalChannelErrors]

    newChannels[index] = value

    // Validate address (simple validation - not empty)
    if (value.trim() !== '') {
      if (value.trim().length < 5) {
        newErrors[index] = 'Endereço muito curto'
      } else {
        newErrors[index] = ''
      }
    } else {
      newErrors[index] = ''
    }

    setPhysicalChannels(newChannels)
    setPhysicalChannelErrors(newErrors)

    // Only include valid addresses in form data
    const validChannels = newChannels
      .filter(channel => channel.trim() !== '')
      .filter(channel => channel.trim().length >= 5)

    form.setValue('physicalChannels', validChannels)
  }

  const addLegislacao = () => {
    setLegislacaoRelacionada([...legislacaoRelacionada, ''])
    setLegislacaoErrors([...legislacaoErrors, ''])
  }

  const removeLegislacao = (index: number) => {
    if (legislacaoRelacionada.length > 1) {
      const newLegislacoes = legislacaoRelacionada.filter((_, i) => i !== index)
      const newErrors = legislacaoErrors.filter((_, i) => i !== index)
      setLegislacaoRelacionada(newLegislacoes)
      setLegislacaoErrors(newErrors)
      form.setValue(
        'legislacaoRelacionada',
        newLegislacoes.filter(legislacao => legislacao.trim() !== '')
      )
    }
  }

  const updateLegislacao = (index: number, value: string) => {
    const newLegislacoes = [...legislacaoRelacionada]
    const newErrors = [...legislacaoErrors]

    newLegislacoes[index] = value

    // Validate legislation (simple validation - not empty and minimum length)
    if (value.trim() !== '') {
      if (value.trim().length < 5) {
        newErrors[index] = 'Legislação muito curta'
      } else {
        newErrors[index] = ''
      }
    } else {
      newErrors[index] = ''
    }

    setLegislacaoRelacionada(newLegislacoes)
    setLegislacaoErrors(newErrors)

    // Only include valid legislations in form data
    const validLegislacoes = newLegislacoes
      .filter(legislacao => legislacao.trim() !== '')
      .filter(legislacao => legislacao.trim().length >= 5)

    form.setValue('legislacaoRelacionada', validLegislacoes)
  }

  const addButton = () => {
    const newButton: ServiceButton = {
      titulo: '',
      descricao: '',
      url_service: '',
      is_enabled: true,
      ordem: serviceButtons.length,
    }
    setServiceButtons([...serviceButtons, newButton])
  }

  const removeButton = (index: number) => {
    const newButtons = serviceButtons.filter((_, i) => i !== index)
    // Update order numbers
    const reorderedButtons = newButtons.map((button, idx) => ({
      ...button,
      ordem: idx,
    }))
    setServiceButtons(reorderedButtons)
    form.setValue('buttons', reorderedButtons)
  }

  const updateButton = (
    index: number,
    field: keyof ServiceButton,
    value: any
  ) => {
    const newButtons = [...serviceButtons]
    newButtons[index] = {
      ...newButtons[index],
      [field]: value,
    }
    setServiceButtons(newButtons)
    form.setValue('buttons', newButtons)
  }

  const moveButton = (index: number, direction: 'up' | 'down') => {
    const newButtons = [...serviceButtons]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newButtons.length)
      return // Swap buttons
    ;[newButtons[index], newButtons[targetIndex]] = [
      newButtons[targetIndex],
      newButtons[index],
    ]

    // Update order numbers
    const reorderedButtons = newButtons.map((button, idx) => ({
      ...button,
      ordem: idx,
    }))

    setServiceButtons(reorderedButtons)
    form.setValue('buttons', reorderedButtons)
  }

  const handleSendToEditClick = (data: ServiceFormData) => {
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowSendToEditDialog(true)
  }

  const handlePublishClick = (data: ServiceFormData) => {
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowPublishDialog(true)
  }

  const handleSendToApprovalClick = (data: ServiceFormData) => {
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowSendToApprovalDialog(true)
  }

  const handleConfirmSendToEdit = async () => {
    if (!pendingFormData) return

    try {
      const apiData = transformToApiRequest(pendingFormData)
      apiData.status = 0 // Set to draft/in_edition status
      apiData.awaiting_approval = false // Remove from awaiting approval

      if (serviceId) {
        await updateService(serviceId, apiData)
      } else {
        await createService(apiData)
      }

      setPendingFormData(null)
      router.push('/servicos-municipais/servicos?tab=in_edition')
    } catch (error) {
      console.error('Error sending service to edit:', error)
      toast.error('Erro ao enviar serviço para edição. Tente novamente.')
    }
  }

  const handleConfirmPublish = async () => {
    if (!pendingFormData) return

    try {
      const apiData = transformToApiRequest(pendingFormData)

      // Set status to published and add published_at timestamp
      apiData.status = 1
      ;(apiData as any).published_at = getCurrentTimestamp()

      let savedService
      if (serviceId) {
        savedService = await updateService(serviceId, apiData)
      } else {
        savedService = await createService(apiData)
      }

      setPendingFormData(null)
      setShowPublishDialog(false)

      // If onPublish callback is provided, call it (for editing existing services)
      if (onPublish) {
        onPublish()
      } else {
        // Redirect to service detail page with tombamento flag (for new services)
        router.push(
          `/servicos-municipais/servicos/servico/${savedService.id}?tombamento=true`
        )
      }
    } catch (error) {
      console.error('Error publishing service:', error)
      toast.error('Erro ao publicar serviço. Tente novamente.')
    }
  }

  const handleConfirmSendToApproval = async () => {
    if (!pendingFormData) return

    try {
      console.log('Enviando serviço para aprovação:', pendingFormData)

      if (onSendToApproval) {
        // For editing existing services - use the provided handler
        onSendToApproval()
      } else {
        // For creating new services - create the service with awaiting_approval flag
        const apiData = transformToApiRequest(pendingFormData)
        apiData.awaiting_approval = true
        apiData.status = 0 // Draft status

        if (serviceId) {
          await updateService(serviceId, apiData)
          toast.success('Serviço atualizado e enviado para aprovação!')
        } else {
          await createService(apiData)
          toast.success('Serviço criado e enviado para aprovação!')
        }

        // Redirect to services table with awaiting_approval tab
        router.push('/servicos-municipais/servicos?tab=awaiting_approval')
      }

      setPendingFormData(null)
      setShowSendToApprovalDialog(false)
    } catch (error) {
      console.error('Error sending service to approval:', error)
      toast.error('Erro ao enviar serviço para aprovação. Tente novamente.')
    }
  }

  const preprocessFormData = (data: ServiceFormData): ServiceFormData => {
    // Filter out empty and invalid digital channels
    const validDigitalChannels = digitalChannels
      .filter(channel => channel.trim() !== '')
      .filter(channel => {
        try {
          new URL(channel)
          return true
        } catch {
          return false
        }
      })

    // Filter out empty and invalid physical channels
    const validPhysicalChannels = physicalChannels
      .filter(channel => channel.trim() !== '')
      .filter(channel => channel.trim().length >= 5)

    // Filter out empty and invalid legislações
    const validLegislacoes = legislacaoRelacionada
      .filter(legislacao => legislacao.trim() !== '')
      .filter(legislacao => legislacao.trim().length >= 5)

    // Filter out empty and invalid buttons
    const validButtons = serviceButtons.filter(
      button =>
        button.titulo.trim() !== '' &&
        button.descricao.trim() !== '' &&
        button.url_service.trim() !== ''
    )

    return {
      ...data,
      digitalChannels:
        validDigitalChannels.length > 0 ? validDigitalChannels : undefined,
      physicalChannels:
        validPhysicalChannels.length > 0 ? validPhysicalChannels : undefined,
      legislacaoRelacionada:
        validLegislacoes.length > 0 ? validLegislacoes : undefined,
      buttons: validButtons.length > 0 ? validButtons : undefined,
    }
  }

  const handleSubmit = async (data: ServiceFormData) => {
    try {
      const processedData = preprocessFormData(data)

      if (onSubmit) {
        await onSubmit(processedData)
      } else {
        // Default behavior - create service as draft
        const apiData = transformToApiRequest(processedData)
        apiData.status = 0 // Draft status

        if (serviceId) {
          await updateService(serviceId, apiData)
          toast.success('Serviço atualizado com sucesso!')
        } else {
          await createService(apiData)
          toast.success('Serviço criado com sucesso!')
          form.reset()
        }
      }
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error(
        serviceId
          ? 'Erro ao atualizar serviço. Tente novamente.'
          : 'Erro ao criar serviço. Tente novamente.'
      )
    }
  }

  // Function to determine which buttons should be shown based on user role and service status
  const getFormButtonConfiguration = () => {
    // Admin users (admin, superadmin, busca:services:admin) have full permissions
    if (isBuscaServicesAdmin) {
      if (serviceStatus === 'in_edition') {
        return {
          showSendToEdit: false, // Don't show "Enviar para edição" button for "Em Edição" status
          showPublish: true, // Admins can publish directly
        }
      }
      return {
        showSendToEdit: true,
        showPublish: true, // Admins can publish directly
      }
    }

    // Editor users (busca:services:editor) have restricted permissions
    if (canEditServices) {
      if (serviceStatus === 'in_edition') {
        return {
          showSendToEdit: false, // Don't show "Enviar para edição" button for "Em Edição" status
          showPublish: false, // Editors can't publish directly
          showSendToApproval: true, // Show "Enviar para aprovação" instead
        }
      }
      if (serviceStatus === 'published') {
        // Editors cannot edit published services
        return {
          showSendToEdit: false,
          showPublish: false,
          showSendToApproval: false,
        }
      }
      return {
        showSendToEdit: true,
        showPublish: false, // Editors can't publish directly
        showSendToApproval: true,
      }
    }

    // Default: no permissions
    return {
      showSendToEdit: false,
      showPublish: false,
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          id="service-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="managingOrgan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão gestor*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading || readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o órgão gestor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECRETARIAS.map(secretaria => (
                          <SelectItem key={secretaria} value={secretaria}>
                            {secretaria}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria do serviço*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading || readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria do serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Educação">Educação</SelectItem>
                        <SelectItem value="Cidade">Cidade</SelectItem>
                        <SelectItem value="Transporte">Transporte</SelectItem>
                        <SelectItem value="Licenças">Licenças</SelectItem>
                        <SelectItem value="Animais">Animais</SelectItem>
                        <SelectItem value="Ambiente">Ambiente</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Cidadania">Cidadania</SelectItem>
                        <SelectItem value="Família">Família</SelectItem>
                        <SelectItem value="Taxas">Taxas</SelectItem>
                        <SelectItem value="Servidor">Servidor</SelectItem>
                        <SelectItem value="Cultura">Cultura</SelectItem>
                        <SelectItem value="Segurança">Segurança</SelectItem>
                        <SelectItem value="Ouvidoria">Ouvidoria</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público específico*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading || readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o público específico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Público em geral">
                          Público em geral
                        </SelectItem>
                        <SelectItem value="Crianças">Crianças</SelectItem>
                        <SelectItem value="Adolescentes">
                          Adolescentes
                        </SelectItem>
                        <SelectItem value="Jovens">Jovens</SelectItem>
                        <SelectItem value="Adultos">Adultos</SelectItem>
                        <SelectItem value="Idosos">Idosos</SelectItem>
                        <SelectItem value="Mulheres">Mulheres</SelectItem>
                        <SelectItem value="Pessoas com Deficiência">
                          Pessoas com Deficiência
                        </SelectItem>
                        <SelectItem value="Empresários">Empresários</SelectItem>
                        <SelectItem value="Estudantes">Estudantes</SelectItem>
                        <SelectItem value="Profissionais">
                          Profissionais
                        </SelectItem>
                        <SelectItem value="Famílias">Famílias</SelectItem>
                        <SelectItem value="Pessoas em situação de vulnerabilidade">
                          Pessoas em situação de vulnerabilidade
                        </SelectItem>
                      </SelectContent>
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
                    <FormLabel>Título do serviço*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do serviço municipal"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição resumida do serviço*</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Descreva resumidamente o serviço oferecido"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Buttons Section */}
              <div className="space-y-4">
                <div>
                  <FormLabel>Hyperlinks dos serviços</FormLabel>
                  <div className="space-y-3 mt-2">
                    {serviceButtons.map((button, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3 bg-card"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Botão {index + 1}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => moveButton(index, 'up')}
                              disabled={
                                isLoading ||
                                operationLoading ||
                                index === 0 ||
                                readOnly
                              }
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => moveButton(index, 'down')}
                              disabled={
                                isLoading ||
                                operationLoading ||
                                index === serviceButtons.length - 1 ||
                                readOnly
                              }
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeButton(index)}
                              disabled={
                                isLoading || operationLoading || readOnly
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label
                              htmlFor={`button-titulo-${index}`}
                              className="text-sm font-medium"
                            >
                              Título do botão
                            </label>
                            <Input
                              id={`button-titulo-${index}`}
                              placeholder="Ex: Acessar serviço"
                              value={button.titulo}
                              onChange={e =>
                                updateButton(index, 'titulo', e.target.value)
                              }
                              disabled={isLoading || readOnly}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`button-descricao-${index}`}
                              className="text-sm font-medium"
                            >
                              Descrição
                            </label>
                            <Input
                              id={`button-descricao-${index}`}
                              placeholder="Ex: Acesse o portal do serviço"
                              value={button.descricao}
                              onChange={e =>
                                updateButton(index, 'descricao', e.target.value)
                              }
                              disabled={isLoading || readOnly}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`button-url-${index}`}
                              className="text-sm font-medium"
                            >
                              URL do serviço
                            </label>
                            <Input
                              id={`button-url-${index}`}
                              placeholder="https://pref.rio/servicos/iptu"
                              value={button.url_service}
                              onChange={e =>
                                updateButton(
                                  index,
                                  'url_service',
                                  e.target.value
                                )
                              }
                              disabled={isLoading || readOnly}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`button-enabled-${index}`}
                              checked={button.is_enabled}
                              onCheckedChange={checked =>
                                updateButton(index, 'is_enabled', checked)
                              }
                              disabled={isLoading || readOnly}
                            />
                            <label
                              htmlFor={`button-enabled-${index}`}
                              className="text-sm font-medium"
                            >
                              Botão habilitado
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addButton}
                        disabled={isLoading || operationLoading}
                        className="w-full"
                      >
                        Adicionar botão +
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="whatServiceDoesNotCover"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que o serviço não cobre</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Não atende casos emergenciais"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo para atendimento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 5 dias úteis, Imediato, 30 dias"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo do serviço (se houver)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: R$ 50,00, Taxa municipal"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Serviço gratuito</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="requestResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado da solicitação</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Descreva o que o cidadão receberá após a solicitação"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição completa do serviço</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        placeholder="Descrição detalhada do serviço, seus objetivos e benefícios"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredDocuments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documentos necessários</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Liste os documentos necessários para solicitar o serviço"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructionsForRequester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções para o solicitante</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Instruções passo a passo para o cidadão"
                        {...field}
                        disabled={isLoading || readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Digital Channels Section */}
              <div className="space-y-4">
                <div>
                  <FormLabel
                    className={
                      channelErrors.some(error => error)
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    Canais digitais
                  </FormLabel>
                  <div className="space-y-3 mt-2">
                    {digitalChannels.map((channel, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              placeholder="http://exemplo.com"
                              value={channel}
                              onChange={e =>
                                updateDigitalChannel(index, e.target.value)
                              }
                              disabled={isLoading || readOnly}
                              className={
                                channelErrors[index] ? 'border-destructive' : ''
                              }
                            />
                            {channelErrors[index] && (
                              <p className="text-sm text-destructive mt-1">
                                {channelErrors[index]}
                              </p>
                            )}
                          </div>
                          {index > 0 && !readOnly && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeDigitalChannel(index)}
                              disabled={isLoading || operationLoading}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addDigitalChannel}
                        disabled={isLoading || operationLoading}
                        className="w-full"
                      >
                        Adicionar campo adicional +
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Physical Channels Section */}
              <div className="space-y-4">
                <div>
                  <FormLabel
                    className={
                      physicalChannelErrors.some(error => error)
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    Canais presenciais
                  </FormLabel>
                  <div className="space-y-3 mt-2">
                    {physicalChannels.map((channel, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              placeholder="Ex: Rua das Flores, 123 - Centro"
                              value={channel}
                              onChange={e =>
                                updatePhysicalChannel(index, e.target.value)
                              }
                              disabled={isLoading || readOnly}
                              className={
                                physicalChannelErrors[index]
                                  ? 'border-destructive'
                                  : ''
                              }
                            />
                            {physicalChannelErrors[index] && (
                              <p className="text-sm text-destructive mt-1">
                                {physicalChannelErrors[index]}
                              </p>
                            )}
                          </div>
                          {index > 0 && !readOnly && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removePhysicalChannel(index)}
                              disabled={isLoading || operationLoading}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPhysicalChannel}
                        disabled={isLoading || operationLoading}
                        className="w-full"
                      >
                        Adicionar campo adicional +
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Legislação Relacionada Section */}
              <div className="space-y-4">
                <div>
                  <FormLabel
                    className={
                      legislacaoErrors.some(error => error)
                        ? 'text-destructive'
                        : ''
                    }
                  >
                    Legislação relacionada
                  </FormLabel>
                  <div className="space-y-3 mt-2">
                    {legislacaoRelacionada.map((legislacao, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              placeholder="Ex: Lei Municipal nº 1234/2023"
                              value={legislacao}
                              onChange={e =>
                                updateLegislacao(index, e.target.value)
                              }
                              disabled={isLoading || readOnly}
                              className={
                                legislacaoErrors[index]
                                  ? 'border-destructive'
                                  : ''
                              }
                            />
                            {legislacaoErrors[index] && (
                              <p className="text-sm text-destructive mt-1">
                                {legislacaoErrors[index]}
                              </p>
                            )}
                          </div>
                          {index > 0 && !readOnly && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeLegislacao(index)}
                              disabled={isLoading || operationLoading}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addLegislacao}
                        disabled={isLoading || operationLoading}
                        className="w-full"
                      >
                        Adicionar campo adicional +
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!readOnly && (
            <div className="flex flex-col gap-3 pt-6">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              {(() => {
                const buttonConfig = getFormButtonConfiguration()

                return (
                  <>
                    {buttonConfig.showSendToEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={form.handleSubmit(handleSendToEditClick)}
                        disabled={isLoading || operationLoading}
                      >
                        {isLoading || operationLoading
                          ? 'Enviando...'
                          : 'Enviar para edição'}
                      </Button>
                    )}
                    {buttonConfig.showSendToApproval && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={form.handleSubmit(handleSendToApprovalClick)}
                        disabled={isLoading || operationLoading}
                      >
                        {isLoading || operationLoading
                          ? 'Enviando...'
                          : 'Enviar para aprovação'}
                      </Button>
                    )}
                    {buttonConfig.showPublish && (
                      <Button
                        type="button"
                        className="w-full"
                        onClick={form.handleSubmit(handlePublishClick)}
                        disabled={isLoading || operationLoading}
                      >
                        {isLoading || operationLoading
                          ? 'Publicando...'
                          : 'Salvar e publicar'}
                      </Button>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </form>
      </Form>

      {/* Modal de confirmação para enviar para edição */}
      <ConfirmDialog
        open={showSendToEditDialog}
        onOpenChange={setShowSendToEditDialog}
        title="Enviar para edição"
        description="Tem certeza que deseja enviar este serviço para edição? Ele ficará disponível para o grupo editor revisar e fazer ajustes necessários."
        confirmText="Enviar para edição"
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmSendToEdit}
      />

      {/* Modal de confirmação para publicar serviço */}
      <ConfirmDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        title="Publicar serviço"
        description="Tem certeza que deseja publicar este serviço? Ele ficará disponível no pref.rio para todos os cidadãos."
        confirmText="Publicar serviço"
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmPublish}
      />

      {/* Modal de confirmação para enviar para aprovação */}
      <ConfirmDialog
        open={showSendToApprovalDialog}
        onOpenChange={setShowSendToApprovalDialog}
        title="Enviar para aprovação"
        description="Tem certeza que deseja enviar este serviço para aprovação? Ele ficará disponível para o grupo de administradores revisar."
        confirmText="Enviar para aprovação"
        cancelText="Cancelar"
        variant="default"
        onConfirm={handleConfirmSendToApproval}
      />
    </div>
  )
}
