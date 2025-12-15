'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Eye, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { ServiceButton } from '@/types/service'

import { MarkdownEditor } from '@/components/blocks/editor-md'
import { ServicePreviewModal } from '@/components/preview/service-preview-modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DepartmentCombobox } from '@/components/ui/department-combobox'
import { SubcategoryCombobox } from '@/components/ui/subcategory-combobox'
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
import {
  useCanEditBuscaServices,
  useIsBuscaServicesAdmin,
} from '@/hooks/use-heimdall-user'
import { useDepartment } from '@/hooks/use-department'
import { useServiceOperations } from '@/hooks/use-service-operations'
import {
  getCurrentTimestamp,
  transformToApiRequest,
} from '@/lib/service-data-transformer'
import { mapFormDataToPreview } from '@/lib/service-preview-mapper'
import { toast } from 'sonner'

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(item => typeof item === 'string')
    .map(item => item as string)
}

const sanitizeButtons = (value: unknown): ServiceButton[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(button => button && typeof button === 'object')
    .map((button, index) => {
      const typedButton = button as Partial<ServiceButton>

      return {
        titulo:
          typeof typedButton.titulo === 'string' ? typedButton.titulo : '',
        descricao:
          typeof typedButton.descricao === 'string'
            ? typedButton.descricao
            : '',
        url_service:
          typeof typedButton.url_service === 'string'
            ? typedButton.url_service
            : '',
        is_enabled:
          typeof typedButton.is_enabled === 'boolean'
            ? typedButton.is_enabled
            : true,
        ordem:
          typeof typedButton.ordem === 'number' &&
          !Number.isNaN(typedButton.ordem)
            ? typedButton.ordem
            : index,
      }
    })
}

type ButtonErrorState = {
  titulo?: string
  descricao?: string
  url_service?: string
}

const buildDigitalChannelErrors = (channels: string[]): string[] => {
  const hasMultipleFields = channels.length > 1
  const hasAnyFilled = channels.some(channel => channel.trim() !== '')

  return channels.map(channel => {
    const trimmed = channel.trim()

    if (!hasMultipleFields && !hasAnyFilled && trimmed === '') {
      return ''
    }

    if (trimmed === '') {
      return 'Preencha este canal digital ou remova o campo.'
    }

    if (trimmed.length > 5000) {
      return 'Canal digital não pode exceder 5000 caracteres.'
    }

    return ''
  })
}

const buildPhysicalChannelErrors = (channels: string[]): string[] => {
  const hasMultipleFields = channels.length > 1
  const hasAnyFilled = channels.some(channel => channel.trim() !== '')

  return channels.map(channel => {
    const trimmed = channel.trim()

    if (!hasMultipleFields && !hasAnyFilled && trimmed === '') {
      return ''
    }

    if (trimmed === '') {
      return 'Preencha este endereço ou remova o campo.'
    }

    if (trimmed.length < 5) {
      return 'Endereço muito curto.'
    }

    return ''
  })
}

const buildLegislacaoErrors = (entries: string[]): string[] => {
  const hasMultipleFields = entries.length > 1
  const hasAnyFilled = entries.some(entry => entry.trim() !== '')

  return entries.map(entry => {
    const trimmed = entry.trim()

    if (!hasMultipleFields && !hasAnyFilled && trimmed === '') {
      return ''
    }

    if (trimmed === '') {
      return 'Informe a legislação ou remova o campo.'
    }

    if (trimmed.length < 5) {
      return 'Legislação muito curta.'
    }

    return ''
  })
}

const isValidUrl = (value: string) => {
  try {
    const parsedUrl = new URL(value)
    return Boolean(parsedUrl)
  } catch {
    return false
  }
}

const isButtonCompleteAndValid = (button: ServiceButton) => {
  if (
    !button.titulo ||
    button.titulo.trim() === '' ||
    !button.descricao ||
    button.descricao.trim() === '' ||
    !button.url_service ||
    button.url_service.trim() === ''
  ) {
    return false
  }

  return isValidUrl(button.url_service)
}

const getValidDigitalChannels = (channels: string[]) =>
  channels
    .filter(channel => channel.trim() !== '')
    .filter(channel => channel.trim().length <= 5000)
    .map(channel => channel.trim())

const getValidPhysicalChannels = (channels: string[]) =>
  channels
    .filter(channel => channel.trim() !== '')
    .filter(channel => channel.trim().length >= 5)
    .map(channel => channel.trim())

const getValidLegislacaoEntries = (entries: string[]) =>
  entries
    .filter(entry => entry.trim() !== '')
    .filter(entry => entry.trim().length >= 5)
    .map(entry => entry.trim())

const buildButtonErrors = (button: ServiceButton): ButtonErrorState => {
  const errors: ButtonErrorState = {}

  if (!button.titulo || button.titulo.trim() === '') {
    errors.titulo = 'Título do botão é obrigatório'
  }

  if (!button.descricao || button.descricao.trim() === '') {
    errors.descricao = 'Descrição do botão é obrigatória'
  }

  if (!button.url_service || button.url_service.trim() === '') {
    errors.url_service = 'URL é obrigatória'
  } else if (!isValidUrl(button.url_service)) {
    errors.url_service = 'URL inválida'
  }

  return errors
}

// Define the schema for service form validation
const serviceFormSchema = z.object({
  managingOrgan: z.string().min(1, { message: 'Órgão gestor é obrigatório.' }),
  serviceCategory: z
    .string()
    .min(1, { message: 'Categoria do serviço é obrigatória.' }),
  serviceSubcategory: z
    .string()
    .min(1, { message: 'Subcategoria do serviço é obrigatória.' }),
  targetAudience: z
    .string()
    .min(1, { message: 'Público específico é obrigatório.' }),
  title: z
    .string()
    .min(1, { message: 'Título do serviço é obrigatório.' })
    .min(3, { message: 'Título deve ter pelo menos 3 caracteres.' })
    .max(500, { message: 'Título não pode exceder 500 caracteres.' }),
  shortDescription: z
    .string()
    .min(1, { message: 'Descrição resumida é obrigatória.' })
    .min(10, {
      message: 'Descrição resumida deve ter pelo menos 10 caracteres.',
    })
    .max(5000, {
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
    .max(10000, { message: 'Este campo não pode exceder 10000 caracteres.' })
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
    .max(10000, {
      message: 'Resultado da solicitação não pode exceder 10000 caracteres.',
    })
    .optional(),
  fullDescription: z
    .string()
    .max(10000, {
      message: 'Descrição completa não pode exceder 10000 caracteres.',
    })
    .optional(),
  requiredDocuments: z
    .string()
    .max(10000, {
      message: 'Documentos necessários não pode exceder 10000 caracteres.',
    })
    .optional(),
  instructionsForRequester: z
    .string()
    .max(10000, {
      message:
        'Instruções para o solicitante não pode exceder 10000 caracteres.',
    })
    .optional(),
  digitalChannels: z
    .array(
      z.string().max(5000, {
        message: 'Canal digital não pode exceder 5000 caracteres.',
      })
    )
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
  serviceSubcategory: '',
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
  onSave?: () => void // Callback for when service is saved (for already published services)
  serviceId?: string // For editing existing services
  onFormChangesDetected?: (hasChanges: boolean) => void // Callback when form changes are detected
}

export function NewServiceForm({
  onSubmit,
  isLoading = false,
  readOnly = false,
  initialData,
  serviceStatus,
  onSendToApproval,
  onPublish,
  onSave,
  serviceId,
  onFormChangesDetected,
}: NewServiceFormProps) {
  const router = useRouter()
  const isBuscaServicesAdmin = useIsBuscaServicesAdmin()
  const canEditServices = useCanEditBuscaServices()
  const {
    createService,
    updateService,
    loading: operationLoading,
  } = useServiceOperations()

  const sanitizedInitialData = React.useMemo(() => {
    if (!initialData) {
      return undefined
    }

    try {
      const sanitizedDigitalChannels = sanitizeStringArray(
        (initialData.digitalChannels ?? []) as unknown
      )
      const sanitizedPhysicalChannels = sanitizeStringArray(
        (initialData.physicalChannels ?? []) as unknown
      )
      const sanitizedLegislacao = sanitizeStringArray(
        (initialData.legislacaoRelacionada ?? []) as unknown
      )
      const sanitizedButtons = sanitizeButtons(
        (initialData.buttons ?? []) as unknown
      )

      return {
        ...initialData,
        digitalChannels: sanitizedDigitalChannels,
        physicalChannels: sanitizedPhysicalChannels,
        legislacaoRelacionada: sanitizedLegislacao,
        buttons: sanitizedButtons,
      }
    } catch (error) {
      console.error('Error sanitizing initial data:', error)
      return {
        ...initialData,
        digitalChannels: [],
        physicalChannels: [],
        legislacaoRelacionada: [],
        buttons: [],
      }
    }
  }, [initialData])

  // Removed tombamento hook since we're redirecting to detail page
  const [showSendToEditDialog, setShowSendToEditDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showSendToApprovalDialog, setShowSendToApprovalDialog] =
    useState(false)
  const [pendingFormData, setPendingFormData] =
    useState<ServiceFormData | null>(null)
  const [digitalChannels, setDigitalChannels] = useState<string[]>(() => {
    try {
      return sanitizedInitialData && sanitizedInitialData.digitalChannels?.length > 0
        ? sanitizedInitialData.digitalChannels
        : ['']
    } catch {
      return ['']
    }
  })
  const [channelErrors, setChannelErrors] = useState<string[]>(() => {
    try {
      return sanitizedInitialData && sanitizedInitialData.digitalChannels?.length > 0
        ? sanitizedInitialData.digitalChannels.map(() => '')
        : ['']
    } catch {
      return ['']
    }
  })
  const [physicalChannels, setPhysicalChannels] = useState<string[]>(() => {
    try {
      return sanitizedInitialData && sanitizedInitialData.physicalChannels?.length > 0
        ? sanitizedInitialData.physicalChannels
        : ['']
    } catch {
      return ['']
    }
  })
  const [physicalChannelErrors, setPhysicalChannelErrors] = useState<string[]>(() => {
    try {
      return sanitizedInitialData && sanitizedInitialData.physicalChannels?.length > 0
        ? sanitizedInitialData.physicalChannels.map(() => '')
        : ['']
    } catch {
      return ['']
    }
  })
  const [legislacaoRelacionada, setLegislacaoRelacionada] = useState<string[]>(() => {
    try {
      return sanitizedInitialData &&
        sanitizedInitialData.legislacaoRelacionada?.length > 0
        ? sanitizedInitialData.legislacaoRelacionada
        : ['']
    } catch {
      return ['']
    }
  })
  const [legislacaoErrors, setLegislacaoErrors] = useState<string[]>(() => {
    try {
      return sanitizedInitialData &&
        sanitizedInitialData.legislacaoRelacionada?.length > 0
        ? sanitizedInitialData.legislacaoRelacionada.map(() => '')
        : ['']
    } catch {
      return ['']
    }
  })
  const [serviceButtons, setServiceButtons] = useState<ServiceButton[]>(() => {
    try {
      return sanitizedInitialData?.buttons && sanitizedInitialData.buttons.length > 0
        ? sanitizedInitialData.buttons
        : []
    } catch {
      return []
    }
  })
  const [buttonErrors, setButtonErrors] = useState<ButtonErrorState[]>(() => {
    try {
      return sanitizedInitialData?.buttons && sanitizedInitialData.buttons.length > 0
        ? sanitizedInitialData.buttons.map(() => ({}))
        : []
    } catch {
      return []
    }
  })
  const [hasFormChanges, setHasFormChanges] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: sanitizedInitialData
      ? { ...defaultValues, ...sanitizedInitialData }
      : defaultValues,
  })

  // Get department name for preview
  const managingOrgan = form.watch('managingOrgan')
  const { department } = useDepartment(managingOrgan)

  const watchedValues = form.watch()

  const syncButtonsFormValue = React.useCallback(
    (buttons: ServiceButton[]) => {
      const validButtons = buttons.filter(isButtonCompleteAndValid)
      form.setValue('buttons', validButtons, {
        shouldDirty: buttons.length > 0,
        shouldTouch: true,
      })
    },
    [form]
  )

  React.useEffect(() => {
    if (!sanitizedInitialData) {
      return
    }

    const normalizedDigitalChannels =
      sanitizedInitialData.digitalChannels.length > 0
        ? sanitizedInitialData.digitalChannels
        : ['']
    const normalizedPhysicalChannels =
      sanitizedInitialData.physicalChannels.length > 0
        ? sanitizedInitialData.physicalChannels
        : ['']
    const normalizedLegislacao =
      sanitizedInitialData.legislacaoRelacionada.length > 0
        ? sanitizedInitialData.legislacaoRelacionada
        : ['']
    const normalizedButtons =
      sanitizedInitialData.buttons && sanitizedInitialData.buttons.length > 0
        ? sanitizedInitialData.buttons
        : []
    const validInitialButtons = normalizedButtons.filter(
      isButtonCompleteAndValid
    )

    setDigitalChannels(normalizedDigitalChannels)
    setChannelErrors(buildDigitalChannelErrors(normalizedDigitalChannels))

    setPhysicalChannels(normalizedPhysicalChannels)
    setPhysicalChannelErrors(
      buildPhysicalChannelErrors(normalizedPhysicalChannels)
    )

    setLegislacaoRelacionada(normalizedLegislacao)
    setLegislacaoErrors(buildLegislacaoErrors(normalizedLegislacao))

    setServiceButtons(normalizedButtons)
    setButtonErrors(normalizedButtons.map(buildButtonErrors))

    form.reset({
      ...defaultValues,
      ...sanitizedInitialData,
      buttons: validInitialButtons,
    })
  }, [sanitizedInitialData, form])

  // Notify parent component when form changes are detected
  React.useEffect(() => {
    if (onFormChangesDetected) {
      onFormChangesDetected(hasFormChanges)
    }
  }, [hasFormChanges, onFormChangesDetected])

  // Check for form changes - optimized with useMemo to prevent excessive recalculations
  const hasChanges = React.useMemo(() => {
    if (readOnly || !sanitizedInitialData) {
      return false
    }

    const formData = watchedValues as Partial<ServiceFormData>

    // Helper function to normalize arrays for comparison
    const normalizeArray = (arr: any[] | undefined) => {
      if (!arr || arr.length === 0) return undefined
      return arr.filter(item => {
        if (typeof item === 'string') return item.trim() !== ''
        return true
      })
    }

    // Helper function for deep equality check
    const deepEqual = (a: any, b: any): boolean => {
      if (a === b) return true
      if (a == null || b == null) return false
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((val, index) => deepEqual(val, b[index]))
      }
      if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        if (keysA.length !== keysB.length) return false
        return keysA.every(key => deepEqual(a[key], b[key]))
      }
      return false
    }

    // Check regular form fields
    const fieldsToCheck: (keyof ServiceFormData)[] = [
      'managingOrgan',
      'serviceCategory',
      'serviceSubcategory',
      'targetAudience',
      'title',
      'shortDescription',
      'whatServiceDoesNotCover',
      'serviceTime',
      'serviceCost',
      'isFree',
      'requestResult',
      'fullDescription',
      'requiredDocuments',
      'instructionsForRequester',
    ]

    for (const field of fieldsToCheck) {
      const currentValue = formData[field]
      const initialValue = sanitizedInitialData?.[field]
      if (currentValue !== initialValue) {
        return true
      }
    }

    // Check arrays
    const normalizedCurrentDigital = normalizeArray(digitalChannels)
    const normalizedInitialDigital = normalizeArray(
      sanitizedInitialData?.digitalChannels
    )
    if (!deepEqual(normalizedCurrentDigital, normalizedInitialDigital)) {
      return true
    }

    const normalizedCurrentPhysical = normalizeArray(physicalChannels)
    const normalizedInitialPhysical = normalizeArray(
      sanitizedInitialData?.physicalChannels
    )
    if (!deepEqual(normalizedCurrentPhysical, normalizedInitialPhysical)) {
      return true
    }

    const normalizedCurrentLegislacao = normalizeArray(legislacaoRelacionada)
    const normalizedInitialLegislacao = normalizeArray(
      sanitizedInitialData?.legislacaoRelacionada
    )
    if (!deepEqual(normalizedCurrentLegislacao, normalizedInitialLegislacao)) {
      return true
    }

    if (!deepEqual(serviceButtons, sanitizedInitialData?.buttons || [])) {
      return true
    }

    return false
  }, [
    watchedValues,
    sanitizedInitialData,
    readOnly,
    digitalChannels,
    physicalChannels,
    legislacaoRelacionada,
    serviceButtons,
  ])

  // Update state when hasChanges memoized value changes
  React.useEffect(() => {
    setHasFormChanges(hasChanges)
  }, [hasChanges])

  const handleCancel = () => {
    router.push('/servicos-municipais/servicos')
  }

  const handlePreview = () => {
    // Validate before showing preview
    if (!ensureDynamicListsValid({ showFeedback: true })) {
      return
    }
    setShowPreviewModal(true)
  }

  const addDigitalChannel = () => {
    const newChannels = [...digitalChannels, '']
    setDigitalChannels(newChannels)
    setChannelErrors(buildDigitalChannelErrors(newChannels))
    form.setValue('digitalChannels', getValidDigitalChannels(newChannels), {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const removeDigitalChannel = (index: number) => {
    if (digitalChannels.length > 1) {
      const newChannels = digitalChannels.filter((_, i) => i !== index)
      setDigitalChannels(newChannels)
      setChannelErrors(buildDigitalChannelErrors(newChannels))
      form.setValue('digitalChannels', getValidDigitalChannels(newChannels), {
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }

  const addPhysicalChannel = () => {
    const newChannels = [...physicalChannels, '']
    setPhysicalChannels(newChannels)
    setPhysicalChannelErrors(buildPhysicalChannelErrors(newChannels))
    form.setValue('physicalChannels', getValidPhysicalChannels(newChannels), {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const removePhysicalChannel = (index: number) => {
    if (physicalChannels.length > 1) {
      const newChannels = physicalChannels.filter((_, i) => i !== index)
      setPhysicalChannels(newChannels)
      setPhysicalChannelErrors(buildPhysicalChannelErrors(newChannels))
      form.setValue('physicalChannels', getValidPhysicalChannels(newChannels), {
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }

  const updateDigitalChannel = (index: number, value: string) => {
    const newChannels = [...digitalChannels]
    newChannels[index] = value

    setDigitalChannels(newChannels)
    setChannelErrors(buildDigitalChannelErrors(newChannels))
    form.setValue('digitalChannels', getValidDigitalChannels(newChannels), {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const updatePhysicalChannel = (index: number, value: string) => {
    const newChannels = [...physicalChannels]
    newChannels[index] = value

    setPhysicalChannels(newChannels)
    setPhysicalChannelErrors(buildPhysicalChannelErrors(newChannels))
    form.setValue('physicalChannels', getValidPhysicalChannels(newChannels), {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const addLegislacao = () => {
    const newLegislacoes = [...legislacaoRelacionada, '']
    setLegislacaoRelacionada(newLegislacoes)
    setLegislacaoErrors(buildLegislacaoErrors(newLegislacoes))
    form.setValue(
      'legislacaoRelacionada',
      getValidLegislacaoEntries(newLegislacoes),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    )
  }

  const removeLegislacao = (index: number) => {
    if (legislacaoRelacionada.length > 1) {
      const newLegislacoes = legislacaoRelacionada.filter((_, i) => i !== index)
      setLegislacaoRelacionada(newLegislacoes)
      setLegislacaoErrors(buildLegislacaoErrors(newLegislacoes))
      form.setValue(
        'legislacaoRelacionada',
        getValidLegislacaoEntries(newLegislacoes),
        {
          shouldDirty: true,
          shouldTouch: true,
        }
      )
    }
  }

  const updateLegislacao = (index: number, value: string) => {
    const newLegislacoes = [...legislacaoRelacionada]
    newLegislacoes[index] = value

    setLegislacaoRelacionada(newLegislacoes)
    setLegislacaoErrors(buildLegislacaoErrors(newLegislacoes))
    form.setValue(
      'legislacaoRelacionada',
      getValidLegislacaoEntries(newLegislacoes),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    )
  }

  const addButton = () => {
    const newButton: ServiceButton = {
      titulo: '',
      descricao: '',
      url_service: '',
      is_enabled: true,
      ordem: serviceButtons.length,
    }
    const updatedButtons = [...serviceButtons, newButton]
    setServiceButtons(updatedButtons)
    setButtonErrors([...buttonErrors, buildButtonErrors(newButton)])
    syncButtonsFormValue(updatedButtons)
  }

  const removeButton = (index: number) => {
    const newButtons = serviceButtons.filter((_, i) => i !== index)
    // Update order numbers
    const reorderedButtons = newButtons.map((button, idx) => ({
      ...button,
      ordem: idx,
    }))
    setServiceButtons(reorderedButtons)
    setButtonErrors(reorderedButtons.map(buildButtonErrors))
    syncButtonsFormValue(reorderedButtons)
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
    setButtonErrors(newButtons.map(buildButtonErrors))
    syncButtonsFormValue(newButtons)
  }

  const moveButton = (index: number, direction: 'up' | 'down') => {
    const newButtons = [...serviceButtons]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newButtons.length)
      return // Swap buttons and errors
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
    setButtonErrors(reorderedButtons.map(buildButtonErrors))
    syncButtonsFormValue(reorderedButtons)
  }

  const validateAllButtons = React.useCallback((): boolean => {
    const newErrors = serviceButtons.map(button => buildButtonErrors(button))

    setButtonErrors(newErrors)
    syncButtonsFormValue(serviceButtons)

    // Return true if there are no errors
    return newErrors.every(
      error => !error.titulo && !error.descricao && !error.url_service
    )
  }, [serviceButtons, syncButtonsFormValue])

  const validateDigitalChannels = React.useCallback(() => {
    const errors = buildDigitalChannelErrors(digitalChannels)
    setChannelErrors(errors)
    form.setValue('digitalChannels', getValidDigitalChannels(digitalChannels), {
      shouldDirty: true,
      shouldTouch: true,
    })
    return errors.every(error => !error)
  }, [digitalChannels, form])

  const validatePhysicalChannels = React.useCallback(() => {
    const errors = buildPhysicalChannelErrors(physicalChannels)
    setPhysicalChannelErrors(errors)
    form.setValue(
      'physicalChannels',
      getValidPhysicalChannels(physicalChannels),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    )
    return errors.every(error => !error)
  }, [physicalChannels, form])

  const validateLegislacao = React.useCallback(() => {
    const errors = buildLegislacaoErrors(legislacaoRelacionada)
    setLegislacaoErrors(errors)
    form.setValue(
      'legislacaoRelacionada',
      getValidLegislacaoEntries(legislacaoRelacionada),
      {
        shouldDirty: true,
        shouldTouch: true,
      }
    )
    return errors.every(error => !error)
  }, [legislacaoRelacionada, form])

  const ensureDynamicListsValid = React.useCallback(
    (options: { showFeedback?: boolean } = {}) => {
      const { showFeedback = false } = options
      const digitalValid = validateDigitalChannels()
      const physicalValid = validatePhysicalChannels()
      const legislacaoValid = validateLegislacao()
      const buttonsValid = validateAllButtons()

      const allValid =
        digitalValid && physicalValid && legislacaoValid && buttonsValid

      if (!allValid && showFeedback) {
        toast.error('Preencha os campos destacados antes de continuar.')
      }

      return allValid
    },
    [
      validateDigitalChannels,
      validatePhysicalChannels,
      validateLegislacao,
      validateAllButtons,
    ]
  )

  const handleInvalidSubmit = React.useCallback(() => {
    ensureDynamicListsValid()
  }, [ensureDynamicListsValid])

  const handleSendToEditClick = (data: ServiceFormData) => {
    if (!ensureDynamicListsValid({ showFeedback: true })) {
      return
    }
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowSendToEditDialog(true)
  }

  const handlePublishClick = (data: ServiceFormData) => {
    if (!ensureDynamicListsValid({ showFeedback: true })) {
      return
    }
    const processedData = preprocessFormData(data)
    setPendingFormData(processedData)
    setShowPublishDialog(true)
  }

  const handleSendToApprovalClick = (data: ServiceFormData) => {
    if (!ensureDynamicListsValid({ showFeedback: true })) {
      return
    }
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

      // If service is already published, just save maintaining the published status
      // Don't update published_at timestamp
      if (serviceStatus === 'published' && serviceId) {
        apiData.status = 1 // Keep as published
        // Don't set published_at - preserve the original publication date
        
        await updateService(serviceId, apiData)
        
        setPendingFormData(null)
        setShowPublishDialog(false)

        // Use onSave callback if provided (for refetch), otherwise just show toast
        // Don't call onPublish to avoid calling the publish endpoint again
        if (onSave) {
          onSave()
        } else {
          toast.success('Edição salva com sucesso!')
        }
        return
      }

      // For new services or services not yet published, set status to published and add published_at timestamp
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
    // Filter out empty digital channels and those exceeding character limit
    const validDigitalChannels = getValidDigitalChannels(digitalChannels)
    const validPhysicalChannels = getValidPhysicalChannels(physicalChannels)
    const validLegislacoes = getValidLegislacaoEntries(legislacaoRelacionada)
    const validButtons = serviceButtons.filter(isButtonCompleteAndValid)

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
    if (!ensureDynamicListsValid({ showFeedback: true })) {
      return
    }

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
          setDigitalChannels([''])
          setChannelErrors([''])
          setPhysicalChannels([''])
          setPhysicalChannelErrors([''])
          setLegislacaoRelacionada([''])
          setLegislacaoErrors([''])
          setServiceButtons([])
          setButtonErrors([])
          syncButtonsFormValue([])
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
          publishButtonText: 'Salvar e publicar', // For new services or services in edition
        }
      }
      if (serviceStatus === 'published' && serviceId) {
        // If editing a published service, show "Salvar edição" instead
        return {
          showSendToEdit: true,
          showPublish: true,
          publishButtonText: 'Salvar edição', // For editing published services
        }
      }
      return {
        showSendToEdit: true,
        showPublish: true, // Admins can publish directly
        publishButtonText: 'Salvar e publicar', // For new services
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
      if (serviceStatus === 'awaiting_approval') {
        // CRITICAL: Editors cannot edit or send to edition services awaiting approval
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
          onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
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
                    <FormControl>
                      <DepartmentCombobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={isLoading || readOnly}
                        placeholder={readOnly ? '' : 'Selecione o órgão gestor'}
                      />
                    </FormControl>
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
                      onValueChange={(value) => {
                        field.onChange(value)
                        // Clear subcategory when category changes
                        form.setValue('serviceSubcategory', '')
                      }}
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
                        <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Cidadania">Cidadania</SelectItem>
                        <SelectItem value="Servidor">Servidor</SelectItem>
                        <SelectItem value="Cultura">Cultura</SelectItem>
                        <SelectItem value="Defesa Civil">Defesa Civil</SelectItem>
                        <SelectItem value="Segurança">Segurança</SelectItem>
                        <SelectItem value="Cursos">Cursos</SelectItem>
                        <SelectItem value="Tributos">Tributos</SelectItem>
                        <SelectItem value="Trabalho">Trabalho</SelectItem>
                        <SelectItem value="Ouvidoria">Ouvidoria</SelectItem>
                        <SelectItem value="Trânsito">Trânsito</SelectItem>
                        <SelectItem value="Ordem Pública">Ordem Pública</SelectItem>
                        <SelectItem value="Obras">Obras</SelectItem>
                        <SelectItem value="Central Anticorrupção">Central Anticorrupção</SelectItem>
                        <SelectItem value="Lei de Acesso à Informação (LAI)">Lei de Acesso à Informação (LAI)</SelectItem>
                        <SelectItem value="Lei Geral de Proteção de Dados (LGPD)">Lei Geral de Proteção de Dados (LGPD)</SelectItem>
                        <SelectItem value="Peticionamentos">Peticionamentos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceSubcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria do serviço*</FormLabel>
                    <FormControl>
                      <SubcategoryCombobox
                        category={form.watch('serviceCategory')}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={isLoading || readOnly}
                        placeholder="Selecione a subcategoria"
                      />
                    </FormControl>
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Descreva resumidamente o serviço oferecido"
                        disabled={isLoading || readOnly}
                        maxLength={5000}
                        showCharCount={true}
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
                              className={
                                buttonErrors[index]?.titulo
                                  ? 'border-destructive'
                                  : ''
                              }
                            />
                            {buttonErrors[index]?.titulo && (
                              <p className="text-sm text-destructive mt-1">
                                {buttonErrors[index].titulo}
                              </p>
                            )}
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
                              className={
                                buttonErrors[index]?.descricao
                                  ? 'border-destructive'
                                  : ''
                              }
                            />
                            {buttonErrors[index]?.descricao && (
                              <p className="text-sm text-destructive mt-1">
                                {buttonErrors[index].descricao}
                              </p>
                            )}
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
                              className={
                                buttonErrors[index]?.url_service
                                  ? 'border-destructive'
                                  : ''
                              }
                            />
                            {buttonErrors[index]?.url_service && (
                              <p className="text-sm text-destructive mt-1">
                                {buttonErrors[index].url_service}
                              </p>
                            )}
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Ex: Não atende casos emergenciais"
                        disabled={isLoading || readOnly}
                        maxLength={10000}
                        showCharCount={true}
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
                  <Card className="p-4 bg-card">
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          className="border-1 border-foreground!"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading || readOnly}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Serviço gratuito</FormLabel>
                      </div>
                    </FormItem>
                  </Card>
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Descreva o que o cidadão receberá após a solicitação"
                        disabled={isLoading || readOnly}
                        maxLength={10000}
                        showCharCount={true}
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Descrição detalhada do serviço, seus objetivos e benefícios"
                        disabled={isLoading || readOnly}
                        maxLength={10000}
                        showCharCount={true}
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Liste os documentos necessários para solicitar o serviço"
                        disabled={isLoading || readOnly}
                        maxLength={10000}
                        showCharCount={true}
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Instruções passo a passo para o cidadão"
                        disabled={isLoading || readOnly}
                        maxLength={10000}
                        showCharCount={true}
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
                              placeholder="Ex: Portal de Serviços - http://exemplo.com"
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

              {/* Preview Button */}
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handlePreview}
                disabled={isLoading || operationLoading}
              >
                <Eye className="mr-2 h-4 w-4" />
                Pré-visualizar
              </Button>

              {(() => {
                const buttonConfig = getFormButtonConfiguration()
                // Disable action buttons if editing existing service and no changes were made
                const shouldDisableActions = initialData && !hasFormChanges

                return (
                  <>
                    {buttonConfig.showSendToEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={form.handleSubmit(
                          handleSendToEditClick,
                          handleInvalidSubmit
                        )}
                        disabled={
                          isLoading || operationLoading || shouldDisableActions
                        }
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
                        onClick={form.handleSubmit(
                          handleSendToApprovalClick,
                          handleInvalidSubmit
                        )}
                        disabled={
                          isLoading || operationLoading || shouldDisableActions
                        }
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
                        onClick={form.handleSubmit(
                          handlePublishClick,
                          handleInvalidSubmit
                        )}
                        disabled={
                          isLoading || operationLoading || shouldDisableActions
                        }
                      >
                        {isLoading || operationLoading
                          ? serviceStatus === 'published' && serviceId
                            ? 'Salvando...'
                            : 'Publicando...'
                          : buttonConfig.publishButtonText || 'Salvar e publicar'}
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
        title={
          serviceStatus === 'published' && serviceId
            ? 'Salvar edição'
            : 'Publicar serviço'
        }
        description={
          serviceStatus === 'published' && serviceId
            ? 'Tem certeza que deseja salvar as alterações realizadas no serviço? Esse serviço já está publicado e as alterações aparecerão imediatamente no pref.rio.'
            : 'Tem certeza que deseja publicar este serviço? Ele ficará disponível no para todos os cidadãos no pref.rio.'
        }
        confirmText={
          serviceStatus === 'published' && serviceId
            ? 'Salvar edição'
            : 'Publicar serviço'
        }
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

      {/* Preview Modal */}
      <ServicePreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        serviceData={mapFormDataToPreview({
          ...watchedValues,
          digitalChannels,
          physicalChannels,
          legislacaoRelacionada,
          buttons: serviceButtons,
        } as ServiceFormData)}
        orgaoGestorName={department?.nome_ua || null}
      />
    </div>
  )
}
