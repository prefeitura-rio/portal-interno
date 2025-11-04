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

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DateTimePicker,
  formatDateTimeToUTC,
} from '@/components/ui/datetime-picker'
import { ImageUpload } from '@/components/ui/image-upload'
import { useIsMobile } from '@/hooks/use-mobile'
import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type CustomField, FieldsCreator } from './fields-creator'

export type Accessibility = 'ACESSIVEL' | 'EXCLUSIVO' | 'NAO_ACESSIVEL'
const ACCESSIBILITY_OPTIONS: Accessibility[] = [
  'ACESSIVEL',
  'EXCLUSIVO',
  'NAO_ACESSIVEL',
] as const
const accessibilityLabel: Record<Accessibility, string> = {
  ACESSIVEL: 'Acessível para pessoas com deficiência',
  EXCLUSIVO: 'Exclusivo para pessoas com deficiência',
  NAO_ACESSIVEL: 'Não acessível para pessoas com deficiência',
}

// Define the schema for location/class information
const locationClassSchema = z.object({
  address: z
    .string()
    .min(1, { message: 'Endereço é obrigatório.' })
    .min(10, { message: 'Endereço deve ter pelo menos 10 caracteres.' }),
  neighborhood: z
    .string()
    .min(1, { message: 'Bairro é obrigatório.' })
    .min(3, { message: 'Bairro deve ter pelo menos 3 caracteres.' }),
  vacancies: z.coerce
    .number()
    .min(1, { message: 'Número de vagas deve ser maior que 0.' })
    .max(1000, { message: 'Número de vagas não pode exceder 1000.' }),
  classStartDate: z.date({
    required_error: 'Data de início das aulas é obrigatória.',
  }),
  classEndDate: z.date({
    required_error: 'Data de fim das aulas é obrigatória.',
  }),
  classTime: z.string().min(1, { message: 'Horário das aulas é obrigatório.' }),
  classDays: z.string().min(1, { message: 'Dias de aula é obrigatório.' }),
})

// Define the schema for remote class information
const remoteClassSchema = z.object({
  vacancies: z.coerce
    .number()
    .min(1, { message: 'Número de vagas deve ser maior que 0.' })
    .max(1000, { message: 'Número de vagas não pode exceder 1000.' }),
  classStartDate: z.date({
    required_error: 'Data de início das aulas é obrigatória.',
  }),
  classEndDate: z.date({
    required_error: 'Data de fim das aulas é obrigatória.',
  }),
  classTime: z.string().min(1, { message: 'Horário das aulas é obrigatório.' }),
  classDays: z.string().min(1, { message: 'Dias de aula é obrigatório.' }),
})

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
const fullFormSchema = z
  .discriminatedUnion('modalidade', [
    z.object({
      title: z
        .string()
        .min(1, { message: 'Título é obrigatório.' })
        .min(5, { message: 'Título deve ter pelo menos 5 caracteres.' })
        .max(100, { message: 'Título não pode exceder 100 caracteres.' }),
      description: z
        .string()
        .min(1, { message: 'Descrição é obrigatória.' })
        .min(20, { message: 'Descrição deve ter pelo menos 20 caracteres.' })
        .max(600, { message: 'Descrição não pode exceder 600 caracteres.' }),
      enrollment_start_date: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollment_end_date: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      orgao: z.object({
        id: z.number(),
        nome: z.string().min(1, { message: 'Órgão é obrigatório.' }),
      }),
      modalidade: z.literal('ONLINE'),
      // theme: z.enum(['Educação', 'Saúde', 'Esportes'], {
      //   required_error: 'Tema é obrigatório.',
      // }),
      theme: z.enum(['Educação', 'Saúde', 'Esportes']).optional(),
      workload: z
        .string()
        .min(1, { message: 'Carga horária é obrigatória.' })
        .min(3, { message: 'Carga horária deve ter pelo menos 3 caracteres.' })
        .max(50, { message: 'Carga horária não pode exceder 50 caracteres.' }),
      target_audience: z
        .string()
        .min(1, { message: 'Público-alvo é obrigatório.' })
        .min(10, { message: 'Público-alvo deve ter pelo menos 10 caracteres.' })
        .max(600, { message: 'Público-alvo não pode exceder 600 caracteres.' }),
      // Required image fields
      institutional_logo: z
        .string()
        .url({ message: 'Logo institucional deve ser uma URL válida.' })
        .refine(validateGoogleCloudStorageURL, {
          message:
            'Logo institucional deve ser uma URL do bucket do Google Cloud Storage.',
        }),
      cover_image: z
        .string()
        .url({ message: 'Imagem de capa deve ser uma URL válida.' })
        .refine(validateGoogleCloudStorageURL, {
          message:
            'Imagem de capa deve ser uma URL do bucket do Google Cloud Storage.',
        }),
      is_visible: z.boolean({
        required_error: 'Visibilidade do curso é obrigatória.',
      }),
      // Optional fields
      pre_requisitos: z.string().optional(),
      has_certificate: z.boolean().optional(),

      // External partner fields
      is_external_partner: z.boolean().optional(),
      external_partner_name: z.string().optional(),
      external_partner_url: z.string().url().optional().or(z.literal('')),
      external_partner_logo_url: z
        .string()
        .url()
        .optional()
        .or(z.literal(''))
        .refine(validateGoogleCloudStorageURL, {
          message:
            'Logo do parceiro externo deve ser uma URL do bucket do Google Cloud Storage.',
        }),
      external_partner_contact: z.string().optional(),

      accessibility: z
        .enum(['ACESSIVEL', 'EXCLUSIVO', 'NAO_ACESSIVEL'])
        .nullable()
        .optional()
        .or(z.literal('')),
      facilitator: z.string().optional(),
      objectives: z.string().optional(),
      expected_results: z.string().optional(),
      program_content: z.string().optional(),
      methodology: z.string().optional(),
      resources_used: z.string().optional(),
      material_used: z.string().optional(),
      teaching_material: z.string().optional(),
      custom_fields: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            required: z.boolean(),
            field_type: z
              .enum([
                'text',
                'number',
                'email',
                'date',
                'select',
                'textarea',
                'checkbox',
                'radio',
                'multiselect',
              ])
              .default('text'),
            options: z
              .array(
                z.object({
                  id: z.string(),
                  value: z.string(),
                })
              )
              .optional(),
          })
        )
        .optional(),
      remote_class: remoteClassSchema,
    }),
    z.object({
      title: z
        .string()
        .min(1, { message: 'Título é obrigatório.' })
        .min(5, { message: 'Título deve ter pelo menos 5 caracteres.' })
        .max(100, { message: 'Título não pode exceder 100 caracteres.' }),
      description: z
        .string()
        .min(1, { message: 'Descrição é obrigatória.' })
        .min(20, { message: 'Descrição deve ter pelo menos 20 caracteres.' })
        .max(600, { message: 'Descrição não pode exceder 600 caracteres.' }),
      enrollment_start_date: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollment_end_date: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      orgao: z.object({
        id: z.number(),
        nome: z.string().min(1, { message: 'Órgão é obrigatório.' }),
      }),
      modalidade: z.enum(['PRESENCIAL', 'HIBRIDO']),
      // theme: z.enum(['Educação', 'Saúde', 'Esportes'], {
      //   required_error: 'Tema é obrigatório.',
      // }),
      theme: z.enum(['Educação', 'Saúde', 'Esportes']).optional(),
      workload: z
        .string()
        .min(1, { message: 'Carga horária é obrigatória.' })
        .min(3, { message: 'Carga horária deve ter pelo menos 3 caracteres.' })
        .max(50, { message: 'Carga horária não pode exceder 50 caracteres.' }),
      target_audience: z
        .string()
        .min(1, { message: 'Público-alvo é obrigatório.' })
        .min(10, { message: 'Público-alvo deve ter pelo menos 10 caracteres.' })
        .max(600, { message: 'Público-alvo não pode exceder 600 caracteres.' }),
      // Required image fields
      institutional_logo: z
        .string()
        .url({ message: 'Logo institucional deve ser uma URL válida.' })
        .refine(validateGoogleCloudStorageURL, {
          message:
            'Logo institucional deve ser uma URL do bucket do Google Cloud Storage.',
        }),
      cover_image: z
        .string()
        .url({ message: 'Imagem de capa deve ser uma URL válida.' })
        .refine(validateGoogleCloudStorageURL, {
          message:
            'Imagem de capa deve ser uma URL do bucket do Google Cloud Storage.',
        }),
      is_visible: z.boolean({
        required_error: 'Visibilidade do curso é obrigatória.',
      }),
      // Optional fields
      pre_requisitos: z.string().optional(),
      has_certificate: z.boolean().optional(),

      // External partner fields
      is_external_partner: z.boolean().optional(),
      external_partner_name: z.string().optional(),
      external_partner_url: z.string().url().optional().or(z.literal('')),
      external_partner_logo_url: z
        .string()
        .url()
        .optional()
        .or(z.literal(''))
        .refine(validateGoogleCloudStorageURL, {
          message:
            'Logo do parceiro externo deve ser uma URL do bucket do Google Cloud Storage.',
        }),
      external_partner_contact: z.string().optional(),

      facilitator: z.string().optional(),
      objectives: z.string().optional(),
      expected_results: z.string().optional(),
      program_content: z.string().optional(),
      methodology: z.string().optional(),
      resources_used: z.string().optional(),
      material_used: z.string().optional(),
      teaching_material: z.string().optional(),
      custom_fields: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            required: z.boolean(),
            field_type: z
              .enum([
                'text',
                'number',
                'email',
                'date',
                'select',
                'textarea',
                'checkbox',
                'radio',
                'multiselect',
              ])
              .default('text'),
            options: z
              .array(
                z.object({
                  id: z.string(),
                  value: z.string(),
                })
              )
              .optional(),
          })
        )
        .optional(),
      locations: z.array(locationClassSchema).min(1, {
        message: 'Pelo menos uma unidade deve ser informada.',
      }),
    }),
  ])
  .refine(data => data.enrollment_end_date >= data.enrollment_start_date, {
    message: 'A data final deve ser igual ou posterior à data inicial.',
    path: ['enrollment_end_date'],
  })
  .refine(
    data => {
      if (data.modalidade === 'ONLINE') {
        return (
          data.remote_class.classEndDate >= data.remote_class.classStartDate
        )
      }
      return data.locations.every(
        location => location.classEndDate >= location.classStartDate
      )
    },
    {
      message:
        'A data final das aulas deve ser igual ou posterior à data inicial.',
      path: ['modalidade'],
    }
  )
  .refine(
    data => {
      if (!data.is_external_partner) return true
      return data.external_partner_name?.trim()
    },
    {
      message: 'Nome do parceiro externo é obrigatório.',
      path: ['external_partner_name'],
    }
  )
  .refine(
    data => {
      if (!data.is_external_partner) return true
      return data.external_partner_url?.trim()
    },
    {
      message: 'URL do parceiro externo é obrigatória.',
      path: ['external_partner_url'],
    }
  )

// Create a minimal schema for draft validation (only basic field presence)
const draftFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  enrollment_start_date: z.date().optional(),
  enrollment_end_date: z.date().optional(),
  orgao: z
    .object({
      id: z.number(),
      nome: z.string(),
    })
    .optional(),
  modalidade: z.enum(['PRESENCIAL', 'HIBRIDO', 'ONLINE']).optional(),
  // theme: z.enum(['Educação', 'Saúde', 'Esportes']).optional(),
  theme: z.enum(['Educação', 'Saúde', 'Esportes']).optional(),
  workload: z.string().optional(),
  target_audience: z.string().optional(),
  institutional_logo: z
    .string()
    .refine(validateGoogleCloudStorageURL, {
      message:
        'Logo institucional deve ser uma URL do bucket do Google Cloud Storage.',
    })
    .optional(),
  cover_image: z
    .string()
    .refine(validateGoogleCloudStorageURL, {
      message:
        'Imagem de capa deve ser uma URL do bucket do Google Cloud Storage.',
    })
    .optional(),
  pre_requisitos: z.string().optional(),
  has_certificate: z.boolean().optional(),

  // External partner fields
  is_external_partner: z.boolean().optional(),
  external_partner_name: z.string().optional(),
  external_partner_url: z.string().optional(),
  external_partner_logo_url: z
    .string()
    .refine(validateGoogleCloudStorageURL, {
      message:
        'Logo do parceiro externo deve ser uma URL do bucket do Google Cloud Storage.',
    })
    .optional(),
  external_partner_contact: z.string().optional(),

  facilitator: z.string().optional(),
  objectives: z.string().optional(),
  expected_results: z.string().optional(),
  program_content: z.string().optional(),
  methodology: z.string().optional(),
  resources_used: z.string().optional(),
  material_used: z.string().optional(),
  teaching_material: z.string().optional(),
  is_visible: z.boolean().optional(),
  custom_fields: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        required: z.boolean(),
        field_type: z
          .enum(['text', 'select', 'multiselect', 'radio'])
          .default('text'),
        options: z
          .array(
            z.object({
              id: z.string(),
              value: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  locations: z
    .array(
      z.object({
        address: z.string().optional(),
        neighborhood: z.string().optional(),
        vacancies: z.number().optional(),
        classStartDate: z.date().optional(),
        classEndDate: z.date().optional(),
        classTime: z.string().optional(),
        classDays: z.string().optional(),
      })
    )
    .optional(),
  remote_class: z
    .object({
      vacancies: z.number().optional(),
      classStartDate: z.date().optional(),
      classEndDate: z.date().optional(),
      classTime: z.string().optional(),
      classDays: z.string().optional(),
    })
    .optional(),
})

// Use the full schema as the main form schema for form validation display
const formSchema = fullFormSchema

type FormData = z.infer<typeof formSchema>

// Helper type for form state before modalidade is selected
type PartialFormData = Omit<
  FormData,
  'modalidade' | 'locations' | 'remote_class'
> & {
  modalidade?: 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE'
  locations?: z.infer<typeof locationClassSchema>[]
  remote_class?: z.infer<typeof remoteClassSchema>
  theme?: 'Educação' | 'Saúde' | 'Esportes'
  workload?: string
  target_audience?: string
  pre_requisitos?: string
  has_certificate?: boolean

  // External partner fields
  is_external_partner?: boolean
  external_partner_name?: string
  external_partner_url?: string
  external_partner_logo_url?: string
  external_partner_contact?: string

  accessibility?: Accessibility | undefined | '' | null
  facilitator?: string
  objectives?: string
  expected_results?: string
  program_content?: string
  methodology?: string
  resources_used?: string
  material_used?: string
  teaching_material?: string
  institutional_logo?: string | null
  cover_image?: string | null
  is_visible?: boolean
  custom_fields?: CustomField[]
  status?: 'canceled' | 'draft' | 'opened' | 'closed'
  originalStatus?: 'canceled' | 'draft' | 'opened' | 'closed'
}

// Type for backend API data (with snake_case field names and UTC strings for dates)
type BackendCourseData = {
  title: string
  description: string
  enrollment_start_date: string | undefined
  enrollment_end_date: string | undefined
  orgao: { id: number; nome: string }
  organization: string
  orgao_id: number | null
  modalidade?: 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE'
  theme?: string
  workload: string
  target_audience: string
  institutional_logo: string | null
  cover_image: string | null
  is_visible?: boolean
  pre_requisitos?: string
  has_certificate?: boolean

  // External partner fields
  is_external_partner?: boolean
  external_partner_name?: string
  external_partner_url?: string
  external_partner_logo_url?: string
  external_partner_contact?: string

  accessibility?: Accessibility | undefined | '' | null
  facilitator?: string
  objectives?: string
  expected_results?: string
  program_content?: string
  methodology?: string
  resources_used?: string
  material_used?: string
  teaching_material?: string
  custom_fields?: CustomField[]
  locations?: Array<{
    address: string
    neighborhood: string
    vacancies: number
    class_start_date: string | undefined
    class_end_date: string | undefined
    class_time: string
    class_days: string
  }>
  remote_class?: {
    vacancies: number
    class_start_date: string | undefined
    class_end_date: string | undefined
    class_time: string
    class_days: string
  }
  turno: string
  formato_aula: string
  instituicao_id: number
  status?: 'canceled' | 'draft' | 'opened' | 'closed'
}

interface NewCourseFormProps {
  initialData?: PartialFormData
  isReadOnly?: boolean
  onSubmit?: (data: BackendCourseData) => void
  onSaveDraft?: (data: BackendCourseData) => void
  onPublish?: (data: BackendCourseData) => void
  isDraft?: boolean
  courseStatus?: string
}

export interface NewCourseFormRef {
  triggerSubmit: () => void
  triggerPublish: () => void
  triggerSaveDraft: () => void
}

export const NewCourseForm = forwardRef<NewCourseFormRef, NewCourseFormProps>(
  (
    {
      initialData,
      isReadOnly = false,
      onSubmit,
      onSaveDraft,
      onPublish,
      isDraft = false,
      courseStatus,
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

    const instituicaoId = Number(
      process.env.NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT ?? ''
    )

    // Dialog states
    const [confirmDialog, setConfirmDialog] = useState<{
      open: boolean
      type:
        | 'create_course'
        | 'save_draft'
        | 'publish_course'
        | 'save_changes'
        | null
    }>({
      open: false,
      type: null,
    })

    const form = useForm<PartialFormData>({
      resolver: zodResolver(formSchema as any), // Type assertion needed due to discriminated union
      defaultValues: initialData
        ? {
            title: initialData.title || '',
            description: initialData.description || '',
            enrollment_start_date:
              initialData.enrollment_start_date || new Date(),
            enrollment_end_date: initialData.enrollment_end_date || new Date(),
            orgao: initialData.orgao,
            modalidade: initialData.modalidade,
            theme: initialData.theme || undefined,
            workload: initialData.workload || '',
            target_audience: initialData.target_audience || '',
            pre_requisitos: initialData.pre_requisitos || '',
            has_certificate: initialData.has_certificate || false,

            // External partner fields
            is_external_partner: initialData.is_external_partner || false,
            external_partner_name: initialData.external_partner_name || '',
            external_partner_url: initialData.external_partner_url || '',
            external_partner_logo_url:
              initialData.external_partner_logo_url || '',
            external_partner_contact:
              initialData.external_partner_contact || '',
            accessibility: initialData.accessibility || '' || null,
            facilitator: initialData.facilitator || '',
            objectives: initialData.objectives || '',
            expected_results: initialData.expected_results || '',
            program_content: initialData.program_content || '',
            methodology: initialData.methodology || '',
            resources_used: initialData.resources_used || '',
            material_used: initialData.material_used || '',
            teaching_material: initialData.teaching_material || '',
            institutional_logo: initialData.institutional_logo || '',
            cover_image: initialData.cover_image || '',
            is_visible: initialData?.is_visible ?? true,
            custom_fields: initialData.custom_fields || [],
            // Handle locations and remote_class based on modalidade
            locations: initialData.locations || [],
            remote_class: initialData.remote_class,
          }
        : {
            title: '',
            description: '',
            enrollment_start_date: new Date(),
            enrollment_end_date: new Date(),
            orgao: undefined,
            modalidade: undefined,
            theme: undefined,
            locations: [],
            remote_class: undefined,
            workload: '',
            target_audience: '',
            pre_requisitos: '',
            has_certificate: false,

            // External partner fields
            is_external_partner: false,
            external_partner_name: '',
            external_partner_url: '',
            external_partner_logo_url: '',
            external_partner_contact: '',

            accessibility: '',
            facilitator: '',
            objectives: '',
            expected_results: '',
            program_content: '',
            methodology: '',
            resources_used: '',
            material_used: '',
            teaching_material: '',
            institutional_logo: '',
            cover_image: '',
            is_visible: true,
            custom_fields: [],
          },
      mode: 'onChange', // Enable real-time validation
    })

    const modalidade = form.watch('modalidade')
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'locations',
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

    // Transform form data to snake_case for backend API
    const transformFormDataToSnakeCase = (data: PartialFormData) => {
      // Transform remote_class fields to snake_case if it exists
      const transformedRemoteClass = data.remote_class
        ? {
            vacancies: data.remote_class.vacancies,
            class_start_date: data.remote_class.classStartDate
              ? formatDateTimeToUTC(data.remote_class.classStartDate)
              : undefined,
            class_end_date: data.remote_class.classEndDate
              ? formatDateTimeToUTC(data.remote_class.classEndDate)
              : undefined,
            class_time: data.remote_class.classTime,
            class_days: data.remote_class.classDays,
          }
        : undefined

      // Transform locations fields to snake_case if they exist
      const transformedLocations = data.locations?.map(location => ({
        address: location.address,
        neighborhood: location.neighborhood,
        vacancies: location.vacancies,
        class_start_date: location.classStartDate
          ? formatDateTimeToUTC(location.classStartDate)
          : undefined,
        class_end_date: location.classEndDate
          ? formatDateTimeToUTC(location.classEndDate)
          : undefined,
        class_time: location.classTime,
        class_days: location.classDays,
      }))

      return {
        title: data.title,
        description: data.description,
        enrollment_start_date: data.enrollment_start_date
          ? formatDateTimeToUTC(data.enrollment_start_date)
          : undefined,
        enrollment_end_date: data.enrollment_end_date
          ? formatDateTimeToUTC(data.enrollment_end_date)
          : undefined,
        orgao: data.orgao,
        // Bind orgao.nome to organization field
        organization: data.orgao?.nome || '',
        // Include orgao_id for backend compatibility
        orgao_id: data.orgao?.id || null,
        modalidade: data.modalidade,
        theme: data.theme || undefined,
        workload: data.workload,
        target_audience: data.target_audience,
        institutional_logo: data.institutional_logo,
        cover_image: data.cover_image,
        is_visible: data.is_visible,
        pre_requisitos: data.pre_requisitos,
        has_certificate: data.has_certificate || false,

        // External partner fields - clear when not external partner
        is_external_partner: data.is_external_partner,
        external_partner_name: data.is_external_partner
          ? data.external_partner_name
          : '',
        external_partner_url: data.is_external_partner
          ? data.external_partner_url
          : '',
        external_partner_logo_url: data.is_external_partner
          ? data.external_partner_logo_url
          : '',
        external_partner_contact: data.is_external_partner
          ? data.external_partner_contact
          : '',
        accessibility: data.accessibility,
        facilitator: data.facilitator,
        objectives: data.objectives,
        expected_results: data.expected_results,
        program_content: data.program_content,
        methodology: data.methodology,
        resources_used: data.resources_used,
        material_used: data.material_used,
        teaching_material: data.teaching_material,
        custom_fields: data.custom_fields,
        locations: transformedLocations,
        remote_class: transformedRemoteClass,
        // Add the new fields that should always be sent
        turno: 'LIVRE',
        formato_aula: data.modalidade === 'ONLINE' ? 'GRAVADO' : 'PRESENCIAL',
        instituicao_id: instituicaoId,
        // Ensure status is always included if it exists
        ...(data.status && { status: data.status }),
      }
    }

    // Transform form data for draft with default values for required fields
    const transformFormDataForDraft = (data: any) => {
      const currentDate = new Date()
      const nextMonth = new Date(
        currentDate.getTime() + 30 * 24 * 60 * 60 * 1000
      )

      // Fill in default values for required fields when saving as draft
      const modalidade = data.modalidade || 'PRESENCIAL'

      const draftData: PartialFormData = {
        title: data.title || 'Rascunho de curso. Edite antes de publicar!',
        description:
          data.description ||
          'Descrição em desenvolvimento. Edite antes de publicar!',
        enrollment_start_date: data.enrollment_start_date || currentDate,
        enrollment_end_date: data.enrollment_end_date || nextMonth,
        orgao:
          data.orgao ||
          (orgaos.length > 0 ? orgaos[0] : { id: 1, nome: 'Órgão Padrão' }),
        modalidade: modalidade as 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE',
        theme: data.theme || undefined,
        workload: data.workload,
        target_audience: data.target_audience,
        institutional_logo: data.institutional_logo || '',
        cover_image: data.cover_image || '',
        is_visible: data.is_visible,
        pre_requisitos: data.pre_requisitos,
        has_certificate: data.has_certificate || false,

        // External partner fields - clear when not external partner
        is_external_partner: data.is_external_partner,
        external_partner_name: data.is_external_partner
          ? data.external_partner_name
          : '',
        external_partner_url: data.is_external_partner
          ? data.external_partner_url
          : '',
        external_partner_logo_url: data.is_external_partner
          ? data.external_partner_logo_url
          : '',
        external_partner_contact: data.is_external_partner
          ? data.external_partner_contact
          : '',
        accessibility: data.accessibility,
        facilitator: data.facilitator,
        objectives: data.objectives,
        expected_results: data.expected_results,
        program_content: data.program_content,
        methodology: data.methodology,
        resources_used: data.resources_used,
        material_used: data.material_used,
        teaching_material: data.teaching_material,
        custom_fields: data.custom_fields,
        // Handle modalidade-specific data
        locations:
          modalidade !== 'ONLINE'
            ? data.locations && data.locations.length > 0
              ? data.locations
              : [
                  {
                    address: '',
                    neighborhood: '',
                    vacancies: 1,
                    classStartDate: currentDate,
                    classEndDate: nextMonth,
                    classTime: '',
                    classDays: '',
                  },
                ]
            : undefined,
        remote_class:
          modalidade === 'ONLINE'
            ? data.remote_class || {
                vacancies: 1,
                classStartDate: currentDate,
                classEndDate: nextMonth,
                classTime: 'Horário em definição',
                classDays: 'Dias em definição',
              }
            : undefined,
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

    // Handle modalidade change to properly initialize fields
    const handleModalidadeChange = (
      value: 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE'
    ) => {
      if (value === 'ONLINE') {
        // Clear locations array and initialize remote class fields
        form.setValue('locations', [])
        form.setValue('remote_class', {
          vacancies: 1,
          classStartDate: new Date(),
          classEndDate: new Date(),
          classTime: '',
          classDays: '',
        })
      } else if (value === 'PRESENCIAL' || value === 'HIBRIDO') {
        // Clear remote class and initialize locations if not already set
        form.setValue('remote_class', undefined)

        const currentLocations = form.getValues('locations')
        if (!currentLocations || currentLocations.length === 0) {
          form.setValue('locations', [
            {
              address: '',
              neighborhood: '',
              vacancies: 1,
              classStartDate: new Date(),
              classEndDate: new Date(),
              classTime: '',
              classDays: '',
            },
          ])
        }
      }
    }

    const addLocation = () => {
      append({
        address: '',
        neighborhood: '',
        vacancies: 1,
        classStartDate: new Date(),
        classEndDate: new Date(),
        classTime: '',
        classDays: '',
      })
    }

    const removeLocation = (index: number) => {
      remove(index)
    }

    const handleSubmit = (data: PartialFormData) => {
      if (initialData) {
        // Editing an existing course - show "Salvar Alterações" dialog
        setConfirmDialog({
          open: true,
          type: 'save_changes',
        })
      } else {
        // Creating a new course - show "Criar Curso" dialog
        setConfirmDialog({
          open: true,
          type: 'create_course',
        })
      }
    }

    const confirmCreateCourse = async (values: PartialFormData) => {
      try {
        // Validate the complete form data
        const validatedData = fullFormSchema.parse(values)

        // Transform to snake_case for backend
        const transformedData = transformFormDataToSnakeCase(validatedData)

        // Log for demonstration - show how dates are converted to UTC format
        console.log('Original dates from form:', {
          enrollment_start_date: validatedData.enrollment_start_date,
          enrollment_end_date: validatedData.enrollment_end_date,
        })
        console.log('Converted to UTC format for API:', {
          enrollment_start_date: transformedData.enrollment_start_date,
          enrollment_end_date: transformedData.enrollment_end_date,
        })

        if (initialData) {
          // Editing an existing course - ensure status is preserved if not explicitly set
          const editData = {
            ...transformedData,
            status:
              initialData.originalStatus || initialData.status || 'opened',
          }
          console.log('ENVIOU O EDIT DATA:', JSON.stringify(editData, null, 2))

          if (onSubmit) {
            onSubmit(editData)
          }
        } else {
          // Creating a new course - add the status for course created
          const courseData = {
            ...transformedData,
            status: 'opened' as const,
          }

          console.log('Form submitted successfully!')
          console.log('Form values:', courseData)

          if (onSubmit) {
            onSubmit(courseData)
          } else {
            toast.success('Curso criado com sucesso!')
            // Redirect to courses page with 'created' tab active
            router.push('/gorio/courses?tab=created')
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

    // Function to save draft without validation
    const handleSaveDraftDirectly = async () => {
      try {
        const currentValues = form.getValues()

        // Use minimal validation for drafts - only check basic field types
        const validatedData = draftFormSchema.parse(currentValues)

        // Transform to snake_case for backend with default values filled in
        const transformedData = transformFormDataForDraft(validatedData)

        // Adiciona o status para rascunho
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
          // Redirect to courses page with 'draft' tab active
          router.push('/gorio/courses?tab=draft')
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
        type: 'publish_course',
      })
    }

    const confirmPublishCourse = async () => {
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

        // Adiciona o status para publicação
        const publishData = {
          ...transformedData,
          status: 'opened' as const,
        }

        console.log('Publishing course...')
        console.log('Publish values:', publishData)

        if (onPublish) {
          onPublish(publishData)
        }
        toast.success('Curso publicado com sucesso!')
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation errors:', error.errors)
          toast.error('Erro de validação', {
            description:
              'Por favor, verifique os campos destacados antes de publicar.',
          })
        } else {
          console.error('Error publishing course:', error)
          toast.error('Erro ao publicar curso', {
            description: 'Ocorreu um erro ao publicar o curso.',
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição*</FormLabel>
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

              <div className="flex flex-wrap items-start gap-4">
                <FormField
                  control={form.control}
                  name="enrollment_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-w-[280px]">
                      <FormLabel>Início das inscrições*</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value || undefined}
                          onChange={field.onChange}
                          placeholder="Selecionar data e hora de início"
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enrollment_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1 min-w-[280px]">
                      <FormLabel>Fim das inscrições*</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecionar data e hora de fim"
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
                name="orgao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão (Quem oferece o curso)*</FormLabel>
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

              {/* External Partner Checkbox */}
              <FormField
                control={form.control}
                name="is_external_partner"
                render={({ field }) => (
                  <Card className="p-4 bg-card">
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          className="border-1 border-foreground!"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Curso de parceiro externo</FormLabel>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Marque esta opção se o curso é oferecido por uma
                          organização parceira externa.
                        </p>
                      </div>
                    </FormItem>
                  </Card>
                )}
              />

              {/* External Partner Fields - Show only when checkbox is checked */}
              {form.watch('is_external_partner') && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Informações do Parceiro Externo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="external_partner_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do parceiro externo*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex. PUC RJ"
                              {...field}
                              disabled={isReadOnly}
                              required={form.watch('is_external_partner')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="external_partner_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            URL para a página do parceiro externo*
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://"
                              type="url"
                              {...field}
                              disabled={isReadOnly}
                              required={form.watch('is_external_partner')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="external_partner_logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            URL para a logo do parceiro externo
                          </FormLabel>
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="https://"
                                  type="url"
                                  {...field}
                                  disabled={isReadOnly}
                                />
                              </FormControl>
                            </div>
                            {field.value && (
                              <div className="flex-shrink-0">
                                <div className="w-16 h-16 border border-gray-200 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                                  <img
                                    key={field.value} // Force re-render when URL changes
                                    src={field.value}
                                    alt="Preview da logo do parceiro"
                                    className="max-w-full max-h-full object-contain"
                                    onError={e => {
                                      const target =
                                        e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const errorText =
                                        target.nextElementSibling as HTMLElement
                                      if (errorText) {
                                        errorText.textContent =
                                          'Erro ao carregar'
                                        errorText.style.display = 'block'
                                      }
                                    }}
                                    onLoad={e => {
                                      const target =
                                        e.target as HTMLImageElement
                                      target.style.display = 'block'
                                      const errorText =
                                        target.nextElementSibling as HTMLElement
                                      if (errorText)
                                        errorText.style.display = 'none'
                                    }}
                                  />
                                  <span
                                    className="text-xs text-gray-500"
                                    style={{ display: 'none' }}
                                  >
                                    Erro ao carregar
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="external_partner_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Canal de informações do parceiro externo
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex. Número de whatsapp, email, link de FAQ, etc."
                              className="min-h-[80px]"
                              {...field}
                              disabled={isReadOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tema</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tema" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Educação">Educação</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Esportes">Esportes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modalidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade*</FormLabel>
                    <Select
                      onValueChange={value => {
                        const modalidadeValue = value as
                          | 'PRESENCIAL'
                          | 'HIBRIDO'
                          | 'ONLINE'
                        field.onChange(modalidadeValue)
                        handleModalidadeChange(modalidadeValue)
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a modalidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                        <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                        <SelectItem value="ONLINE">Online</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional rendering based on modalidade */}
              {modalidade === 'ONLINE' && (
                <Card className="-mt-2">
                  <div>
                    <CardTitle className="px-2! md:px-4! flex flex-start">
                      Informações das Aulas Remotas
                    </CardTitle>
                  </div>
                  <CardContent className="space-y-4 px-2 md:px-4">
                    <FormField
                      control={form.control}
                      name="remote_class.vacancies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de vagas*</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              value={field.value || ''}
                              onChange={e =>
                                field.onChange(Number(e.target.value))
                              }
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-wrap items-start gap-4">
                      <FormField
                        control={form.control}
                        name="remote_class.classStartDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col flex-1 min-w-[280px]">
                            <FormLabel>Início das aulas*</FormLabel>
                            <FormControl>
                              <DateTimePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Selecionar data e hora de início"
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="remote_class.classEndDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col flex-1 min-w-[280px]">
                            <FormLabel>Fim das aulas*</FormLabel>
                            <FormControl>
                              <DateTimePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Selecionar data e hora de fim"
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
                      name="remote_class.classTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário das aulas*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o horário das aulas (ex: 19:00 - 22:00, Manhã, Tarde, Noite, etc.)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="remote_class.classDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dias de aula*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite os dias das aulas (ex: Segunda, Quarta e Sexta, Segunda a Sexta, etc.)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {(modalidade === 'PRESENCIAL' || modalidade === 'HIBRIDO') && (
                <div className="space-y-4 -mt-2">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                          {index === 0
                            ? 'Informações da Unidade'
                            : `Informações da Unidade ${index + 1}`}
                        </CardTitle>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLocation(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`locations.${index}.address`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço da unidade*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`locations.${index}.neighborhood`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`locations.${index}.vacancies`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de vagas*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  value={field.value || ''}
                                  onChange={e =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  onBlur={field.onBlur}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-wrap items-start gap-4">
                          <FormField
                            control={form.control}
                            name={`locations.${index}.classStartDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col flex-1 min-w-[280px]">
                                <FormLabel>Início das aulas*</FormLabel>
                                <FormControl>
                                  <DateTimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Selecionar data e hora de início"
                                    disabled={isReadOnly}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`locations.${index}.classEndDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col flex-1 min-w-[280px]">
                                <FormLabel>Fim das aulas*</FormLabel>
                                <FormControl>
                                  <DateTimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Selecionar data e hora de fim"
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
                          name={`locations.${index}.classTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário das aulas*</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Digite o horário das aulas (ex: 19:00 - 22:00, Manhã, Tarde, Noite, etc.)"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`locations.${index}.classDays`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dias de aula*</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Digite os dias das aulas (ex: Segunda, Quarta e Sexta, Segunda a Sexta, etc.)"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addLocation}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar outra unidade
                  </Button>
                </div>
              )}

              <FormField
                control={form.control}
                name="workload"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Horária*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite a carga horária (ex: 40 horas, 80h, 2 meses, etc.)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público-alvo*</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Servidores públicos, estudantes, profissionais da área de tecnologia..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Optional Fields Section */}
              <Card className="w-full pointer-events-auto">
                <CardHeader>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem
                      value="optional-fields"
                      className="border-none"
                    >
                      <AccordionTrigger
                        disabled={false}
                        className="text-lg font-semibold text-foreground hover:no-underline [&[data-state=open]>svg]:rotate-180"
                      >
                        Informações Adicionais do Curso (Opcionais)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6 pt-4">
                          <FormField
                            control={form.control}
                            name="has_certificate"
                            render={({ field }) => (
                              <Card className="p-4 bg-card">
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      className="border-1 border-foreground!"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={isReadOnly}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      Geração interna de certificado
                                    </FormLabel>
                                    <p className="text-[0.8rem] text-muted-foreground">
                                      Marque esta opção se o certificado será
                                      gerado pelo portal interno (url do
                                      certificado ou de forma automática após
                                      marcar aluno como concluído.)
                                    </p>
                                  </div>
                                </FormItem>
                              </Card>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pre_requisitos"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Pré-requisitos para receber certificado
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Conhecimento básico em informática, ensino médio completo..."
                                    className="min-h-[80px]"
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
                            name="accessibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Acessibilidade</FormLabel>
                                <Select
                                  onValueChange={value =>
                                    field.onChange(value as Accessibility)
                                  }
                                  value={field.value || undefined}
                                  disabled={isReadOnly}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione a acessibilidade" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ACCESSIBILITY_OPTIONS.map(opt => (
                                      <SelectItem key={opt} value={opt}>
                                        {accessibilityLabel[opt]}
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
                            name="facilitator"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Facilitador</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Nome do facilitador ou instrutor"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="objectives"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Objetivos da capacitação</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Desenvolver habilidades em gestão de projetos, capacitar para uso de ferramentas específicas..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="expected_results"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Resultados esperados</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Ao final do curso, os participantes estarão aptos a..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="program_content"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Conteúdo programático</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Módulo 1: Introdução, Módulo 2: Conceitos básicos..."
                                    className="min-h-[120px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="methodology"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Metodologia</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Aulas expositivas, exercícios práticos, estudos de caso..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="resources_used"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recursos Utilizados</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Computadores, projetor, software específico..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="material_used"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Material utilizado</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Apostilas, slides, vídeos..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="teaching_material"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Material didático</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Livros, artigos, exercícios práticos..."
                                    className="min-h-[80px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardHeader>
              </Card>
            </div>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="institutional_logo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        label="Logo institucional*"
                        previewClassName="max-h-[200px] max-w-full rounded-lg object-contain"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="is_visible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibilidade do Curso*</FormLabel>
                    <Select
                      onValueChange={value => field.onChange(value === 'true')}
                      value={field.value ? 'true' : 'false'}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a visibilidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">
                          Curso visível publicamente
                        </SelectItem>
                        <SelectItem value="false">
                          Curso não visível publicamente
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {field.value
                        ? 'O curso estará visível na homepage para todos os usuários.'
                        : 'O curso não estará visível na homepage, somente para pessoas que tiverem o link.'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="custom_fields"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FieldsCreator
                        fields={field.value || []}
                        onFieldsChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              courseStatus !== 'cancelled' &&
              courseStatus !== 'finished' &&
              courseStatus !== 'canceled' && (
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full py-6"
                >
                  {form.formState.isSubmitting
                    ? 'Enviando...'
                    : initialData
                      ? 'Salvar Alterações'
                      : 'Criar Curso'}
                </Button>
              )}
          </div>
        </form>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
          title={
            confirmDialog.type === 'create_course'
              ? 'Criar Curso'
              : confirmDialog.type === 'save_draft'
                ? 'Salvar Rascunho'
                : confirmDialog.type === 'save_changes'
                  ? 'Salvar Alterações'
                  : confirmDialog.type === 'publish_course'
                    ? 'Publicar Curso'
                    : 'Salvar Alterações'
          }
          description={
            confirmDialog.type === 'create_course'
              ? 'Tem certeza que deseja criar este curso? Esta ação tornará o curso visível para inscrições.'
              : confirmDialog.type === 'save_draft'
                ? 'Tem certeza que deseja salvar este rascunho? O curso não será publicado ainda.'
                : confirmDialog.type === 'save_changes'
                  ? 'Tem certeza que deseja salvar as alterações neste curso?'
                  : confirmDialog.type === 'publish_course'
                    ? 'Tem certeza que deseja publicar este curso? Esta ação tornará o curso visível para inscrições.'
                    : 'Tem certeza que deseja salvar as alterações neste curso?'
          }
          confirmText={
            confirmDialog.type === 'create_course'
              ? 'Criar Curso'
              : confirmDialog.type === 'save_draft'
                ? 'Salvar Rascunho'
                : confirmDialog.type === 'save_changes'
                  ? 'Salvar Alterações'
                  : confirmDialog.type === 'publish_course'
                    ? 'Publicar Curso'
                    : 'Salvar Alterações'
          }
          variant="default"
          onConfirm={() => {
            const currentValues = form.getValues()
            if (confirmDialog.type === 'create_course') {
              confirmCreateCourse(currentValues)
            } else if (confirmDialog.type === 'save_draft') {
              handleSaveDraftDirectly()
            } else if (confirmDialog.type === 'publish_course') {
              confirmPublishCourse()
            } else if (confirmDialog.type === 'save_changes') {
              // This handles the case when editing an existing course
              confirmCreateCourse(currentValues)
            }
          }}
        />
      </Form>
    )
  }
)

NewCourseForm.displayName = 'NewCourseForm'
