'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
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

import { MarkdownEditor } from '@/components/blocks/editor-md'
import { Combobox } from '@/components/ui/combobox'
import { DepartmentCombobox } from '@/components/ui/department-combobox'
import { MultiSelect } from '@/components/ui/multi-select'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  DateTimePicker,
  formatDateTimeToUTC,
} from '@/components/ui/datetime-picker'
import { ImageUpload } from '@/components/ui/image-upload'
import { useIsMobile } from '@/hooks/use-mobile'
import { getCachedCategorias, setCachedCategorias } from '@/lib/categoria-utils'
import { neighborhoodZone } from '@/lib/neighborhood_zone'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type CustomField, FieldsCreator } from './fields-creator'

export type Accessibility = 'ACESSIVEL' | 'EXCLUSIVO'
const ACCESSIBILITY_OPTIONS: Accessibility[] = [
  'ACESSIVEL',
  'EXCLUSIVO',
] as const
const accessibilityLabel: Record<Accessibility, string> = {
  ACESSIVEL: 'Acessível para pessoas com deficiência',
  EXCLUSIVO: 'Exclusivo para pessoas com deficiência',
}

export type CourseManagementType =
  | 'OWN_ORG'
  | 'EXTERNAL_MANAGED_BY_ORG'
  | 'EXTERNAL_MANAGED_BY_PARTNER'

const COURSE_MANAGEMENT_OPTIONS: {
  value: CourseManagementType
  label: string
  description: string
}[] = [
  {
    value: 'OWN_ORG',
    label: 'Curso gerido pelo próprio órgão',
    description: 'Curso oferecido e gerido pelo próprio órgão.',
  },
  {
    value: 'EXTERNAL_MANAGED_BY_ORG',
    label: 'Curso de parceiro externo - Gerido pelo órgão',
    description:
      'Curso oferecido por parceiro externo, mas gerido pelo órgão.',
  },
  {
    value: 'EXTERNAL_MANAGED_BY_PARTNER',
    label: 'Curso de parceiro externo - Gerido pelo parceiro',
    description:
      'Curso oferecido por parceiro externo e gerido pelo próprio parceiro.',
  },
] as const

export type FormacaoType = 'Curso' | 'Palestra' | 'Oficina' | 'Workshop'
const FORMACAO_TYPES: readonly FormacaoType[] = [
  'Curso',
  'Palestra',
  'Oficina',
  'Workshop',
] as const

// Category type from API
export interface Category {
  id: number
  nome: string
}

// Static category options removed - using dynamic categories from API

// Define the schema for schedule (turma) information
const scheduleSchema = z.object({
  id: z.string().optional(),
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

// Define the schema for location/class information
const locationClassSchema = z.object({
  id: z.string().optional(),
  address: z
    .string()
    .min(1, { message: 'Endereço é obrigatório.' })
    .min(10, { message: 'Endereço deve ter pelo menos 10 caracteres.' }),
  neighborhood: z
    .string()
    .min(1, { message: 'Bairro é obrigatório.' })
    .min(3, { message: 'Bairro deve ter pelo menos 3 caracteres.' }),
  zona: z.string().optional(),
  schedules: z
    .array(scheduleSchema)
    .min(1, { message: 'Pelo menos uma turma deve ser informada.' }),
})

// Define the schema for remote schedule (turma remote) information
const remoteScheduleSchema = z.object({
  id: z.string().optional(), // Schedule UUID from backend
  vacancies: z.coerce
    .number()
    .min(1, { message: 'Número de vagas deve ser maior que 0.' })
    .max(1000, { message: 'Número de vagas não pode exceder 1000.' }),
  classStartDate: z.date().optional().nullable(),
  classEndDate: z.date().optional().nullable(),
  classTime: z.string().optional().nullable(),
  classDays: z.string().optional().nullable(),
})

// Define the schema for remote class information (array of schedules)
const remoteClassSchema = z
  .array(remoteScheduleSchema)
  .min(1, { message: 'Pelo menos uma turma deve ser informada.' })

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
      category: z
        .array(z.number())
        .min(1, { message: 'Pelo menos uma categoria é obrigatória.' }),
      enrollment_start_date: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollment_end_date: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      theme: z.enum(['Curso', 'Palestra', 'Oficina', 'Workshop']).optional(),
      orgao_id: z.string().min(1, { message: 'Órgão é obrigatório.' }),
      modalidade: z.literal('ONLINE'),
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

      // Course management type
      course_management_type: z
        .enum(['OWN_ORG', 'EXTERNAL_MANAGED_BY_ORG', 'EXTERNAL_MANAGED_BY_PARTNER'])
        .optional(),
      // External partner fields
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

      accessibility: z.enum(['ACESSIVEL', 'EXCLUSIVO']).optional(),
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
      category: z
        .array(z.number())
        .min(1, { message: 'Pelo menos uma categoria é obrigatória.' }),
      enrollment_start_date: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollment_end_date: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      orgao_id: z.string().min(1, { message: 'Órgão é obrigatório.' }),
      modalidade: z.literal('PRESENCIAL'),
      theme: z.enum(['Curso', 'Palestra', 'Oficina', 'Workshop']).optional(),
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

      // Course management type
      course_management_type: z
        .enum(['OWN_ORG', 'EXTERNAL_MANAGED_BY_ORG', 'EXTERNAL_MANAGED_BY_PARTNER'])
        .default('OWN_ORG'),
      // External partner fields
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

      accessibility: z.enum(['ACESSIVEL', 'EXCLUSIVO']).optional(),
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
      category: z
        .array(z.number())
        .min(1, { message: 'Pelo menos uma categoria é obrigatória.' }),
      enrollment_start_date: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollment_end_date: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      theme: z.enum(['Curso', 'Palestra', 'Oficina', 'Workshop']).optional(),
      orgao_id: z.string().min(1, { message: 'Órgão é obrigatório.' }),
      modalidade: z.literal('LIVRE_FORMACAO_ONLINE'),
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
      // Link para formação - obrigatório para LIVRE_FORMACAO_ONLINE
      formacao_link: z
        .string()
        .min(1, { message: 'Link para formação é obrigatório.' })
        .url({ message: 'Link para formação deve ser uma URL válida.' }),
      // Optional fields
      pre_requisitos: z.string().optional(),
      has_certificate: z.boolean().optional(),

      // Course management type
      course_management_type: z
        .enum(['OWN_ORG', 'EXTERNAL_MANAGED_BY_ORG', 'EXTERNAL_MANAGED_BY_PARTNER'])
        .optional(),
      // External partner fields
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
        .enum(['ACESSIVEL', 'EXCLUSIVO'])
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
    }),
  ])
  .refine(data => data.enrollment_end_date >= data.enrollment_start_date, {
    message: 'A data final deve ser igual ou posterior à data inicial.',
    path: ['enrollment_end_date'],
  })
  .refine(
    data => {
      if (data.modalidade === 'ONLINE') {
        return data.remote_class.every(
          schedule => {
            const hasStartDate = !!schedule.classStartDate
            const hasEndDate = !!schedule.classEndDate

            // Both dates must be either filled or empty (not mixed)
            if (hasStartDate !== hasEndDate) {
              return false
            }

            // If both are empty, it's valid
            if (!hasStartDate && !hasEndDate) {
              return true
            }

            // If both are filled, validate the date range
            if (hasStartDate && hasEndDate && schedule.classStartDate && schedule.classEndDate) {
              return schedule.classEndDate >= schedule.classStartDate
            }
            return true
          }
        )
      }
      if (data.modalidade === 'LIVRE_FORMACAO_ONLINE') {
        return true // Não precisa validar datas para livre formação
      }
      return data.locations.every(location =>
        location.schedules.every(
          schedule => {
            const hasStartDate = !!schedule.classStartDate
            const hasEndDate = !!schedule.classEndDate

            // Both dates must be either filled or empty (not mixed)
            if (hasStartDate !== hasEndDate) {
              return false
            }

            // If both are empty, it's valid
            if (!hasStartDate && !hasEndDate) {
              return true
            }

            // If both are filled, validate the date range
            if (hasStartDate && hasEndDate && schedule.classStartDate && schedule.classEndDate) {
              return schedule.classEndDate >= schedule.classStartDate
            }
            return true
          }
        )
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
      if (data.course_management_type === 'OWN_ORG') return true
      return data.external_partner_name?.trim()
    },
    {
      message: 'Nome do parceiro externo é obrigatório.',
      path: ['external_partner_name'],
    }
  )
  .refine(
    data => {
      if (data.course_management_type !== 'EXTERNAL_MANAGED_BY_PARTNER')
        return true
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
  category: z.array(z.number()).optional(),
  enrollment_start_date: z.date().optional(),
  enrollment_end_date: z.date().optional(),
  orgao_id: z.string().optional(),
  modalidade: z.enum(['PRESENCIAL', 'ONLINE', 'LIVRE_FORMACAO_ONLINE']).optional(),
  workload: z.string().optional(),
  target_audience: z.string().optional(),
  theme: z.enum(['Curso', 'Palestra', 'Oficina', 'Workshop']).optional(),
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

  // Course management type
  course_management_type: z
    .enum(['OWN_ORG', 'EXTERNAL_MANAGED_BY_ORG', 'EXTERNAL_MANAGED_BY_PARTNER'])
    .optional(),
  // External partner fields
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
  formacao_link: z.string().url().optional().or(z.literal('')),
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
        id: z.string().optional(),
        address: z.string().optional(),
        neighborhood: z.string().optional(),
        zona: z.string().optional(),
        schedules: z
          .array(
            z.object({
              id: z.string().optional(),
              vacancies: z.number().optional(),
              classStartDate: z.date().optional(),
              classEndDate: z.date().optional(),
              classTime: z.string().optional(),
              classDays: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  remote_class: z
    .array(
      z.object({
        id: z.string().optional(),
        vacancies: z.number().optional(),
        classStartDate: z.date().optional().nullable(),
        classEndDate: z.date().optional().nullable(),
        classTime: z.string().optional().nullable(),
        classDays: z.string().optional().nullable(),
      })
    )
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
  modalidade?: 'PRESENCIAL' | 'ONLINE' | 'LIVRE_FORMACAO_ONLINE'
  locations?: z.infer<typeof locationClassSchema>[]
  remote_class?: z.infer<typeof remoteClassSchema>
  remote_class_id?: string  // UUID of the remote_class container
  formacao_link?: string
  category?: number[]
  workload?: string
  target_audience?: string
  theme?: FormacaoType
  pre_requisitos?: string
  has_certificate?: boolean

  // Course management type
  course_management_type?: CourseManagementType
  // External partner fields
  external_partner_name?: string
  external_partner_url?: string
  external_partner_logo_url?: string
  external_partner_contact?: string

  accessibility?: Accessibility | null | undefined | ''
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
  categorias?: Array<{ id: number }>
  enrollment_start_date: string | undefined
  enrollment_end_date: string | undefined
  orgao_id: string | null
  modalidade?: 'PRESENCIAL' | 'ONLINE' | 'LIVRE_FORMACAO_ONLINE'
  workload: string
  target_audience: string
  theme?: string
  institutional_logo: string | null
  cover_image: string | null
  is_visible?: boolean
  pre_requisitos?: string
  has_certificate?: boolean

  // Course management type
  course_management_type?: CourseManagementType
  // External partner fields
  external_partner_name?: string
  external_partner_url?: string
  external_partner_logo_url?: string
  external_partner_contact?: string

  accessibility?: Accessibility | null | undefined | ''
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
    neighborhood_zone?: string
    schedules: Array<{
      vacancies: number
      class_start_date: string | undefined
      class_end_date: string | undefined
      class_time: string
      class_days: string
    }>
  }>
  remote_class?: {
    schedules: Array<{
      vacancies: number
      class_start_date: string | undefined
      class_end_date: string | undefined
      class_time: string
      class_days: string
    }>
  }
  turno: string
  formato_aula: string
  instituicao_id: number
  status?: 'canceled' | 'draft' | 'opened' | 'closed'
  formacao_link?: string
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
  resetForm: () => void
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

    // State for categories
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(false)

    // Memoize category options to avoid re-rendering the dropdown unnecessarily
    const categoryOptions = useMemo(() => {
      return categories.map(category => ({
        id: category.id,
        nome: category.nome,
      }))
    }, [categories])

    // Memoize neighborhood options for the combobox
    const neighborhoodOptions = useMemo(() => {
      const uniqueNeighborhoods = Array.from(
        new Set(neighborhoodZone.map(n => n.bairro))
      )
      return uniqueNeighborhoods
        .sort()
        .map(bairro => ({
          value: bairro,
          label: bairro,
        }))
    }, [])

    const instituicaoId = Number(
      process.env.NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT ?? ''
    )

    // Helper function to prepare default values from initialData
    const prepareDefaultValues = useCallback((data: PartialFormData | undefined): PartialFormData => {
      if (!data) {
        return {
          title: '',
          description: '',
          category: [],
          enrollment_start_date: new Date(),
          enrollment_end_date: new Date(),
          orgao_id: '',
          modalidade: 'PRESENCIAL',
          theme: 'Curso',
          locations: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              address: '',
              neighborhood: '',
              zona: '',
              schedules: [
                {
                  id: '00000000-0000-0000-0000-000000000000',
                  vacancies: 1,
                  classStartDate: new Date(),
                  classEndDate: new Date(),
                  classTime: '',
                  classDays: '',
                },
              ],
            },
          ],
          remote_class: undefined,
          workload: '',
          target_audience: '',
          pre_requisitos: '',
          has_certificate: false,
          course_management_type: 'OWN_ORG',
          external_partner_name: '',
          external_partner_url: '',
          external_partner_logo_url: '',
          external_partner_contact: '',
          accessibility: undefined,
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
          formacao_link: '',
          custom_fields: [],
        }
      }

      return {
        title: data.title || '',
        description: data.description || '',
        category:
          data.category ||
          ((data as any).categorias?.map((c: any) => c.id) as
            | number[]
            | undefined) ||
          [],
        enrollment_start_date:
          data.enrollment_start_date || new Date(),
        enrollment_end_date: data.enrollment_end_date || new Date(),
        orgao_id: data.orgao_id || '',
        modalidade: data.modalidade,
        theme: data.theme || 'Curso',
        workload: data.workload || '',
        target_audience: data.target_audience || '',
        pre_requisitos: data.pre_requisitos || '',
        has_certificate: data.has_certificate || false,
        course_management_type:
          data.course_management_type ||
          ((data as any).is_external_partner
            ? data.external_partner_url
              ? 'EXTERNAL_MANAGED_BY_PARTNER'
              : 'EXTERNAL_MANAGED_BY_ORG'
            : 'OWN_ORG'),
        external_partner_name: data.external_partner_name || '',
        external_partner_url: data.external_partner_url || '',
        external_partner_logo_url: data.external_partner_logo_url || '',
        external_partner_contact: data.external_partner_contact || '',
        accessibility: data.accessibility || undefined,
        facilitator: data.facilitator || '',
        objectives: data.objectives || '',
        expected_results: data.expected_results || '',
        program_content: data.program_content || '',
        methodology: data.methodology || '',
        resources_used: data.resources_used || '',
        material_used: data.material_used || '',
        teaching_material: data.teaching_material || '',
        institutional_logo: data.institutional_logo || '',
        cover_image: data.cover_image || '',
        is_visible: data?.is_visible ?? true,
        formacao_link: data.formacao_link || '',
        custom_fields: data.custom_fields || [],
        locations: (data.locations || []).map((location: any) => {
          let zona = location.zona || location.neighborhood_zone || ''
          if (location.neighborhood && !zona) {
            const neighborhoodData = neighborhoodZone.find(
              n => n.bairro === location.neighborhood
            )
            if (neighborhoodData) {
              zona = neighborhoodData.zona
            }
          }

          if (
            location.schedules &&
            Array.isArray(location.schedules) &&
            location.schedules.length > 0
          ) {
            return {
              ...location,
              zona,
              schedules: location.schedules.map((schedule: any) => ({
                id: schedule.id,
                vacancies: schedule.vacancies,
                classStartDate: schedule.class_start_date
                  ? new Date(schedule.class_start_date)
                  : schedule.classStartDate || new Date(),
                classEndDate: schedule.class_end_date
                  ? new Date(schedule.class_end_date)
                  : schedule.classEndDate || new Date(),
                classTime: schedule.class_time || schedule.classTime || '',
                classDays: schedule.class_days || schedule.classDays || '',
              })),
            }
          }
          return {
            ...location,
            zona,
            schedules: [
              {
                vacancies: location.vacancies || 1,
                classStartDate: location.classStartDate || new Date(),
                classEndDate: location.classEndDate || new Date(),
                classTime: location.classTime || '',
                classDays: location.classDays || '',
              },
            ],
          }
        }),
        remote_class_id: (() => {
          const remoteClassData = (data as any).remote_class
          if (remoteClassData?.id) {
            return remoteClassData.id
          }
          return undefined
        })(),
        remote_class: (() => {
          if (!data.remote_class) {
            return undefined
          }

          const remoteClassData = data.remote_class as any

          if (
            remoteClassData.schedules &&
            Array.isArray(remoteClassData.schedules)
          ) {
            return remoteClassData.schedules.map((schedule: any) => ({
              id: schedule.id,
              vacancies: schedule.vacancies,
              classStartDate: schedule.class_start_date
                ? new Date(schedule.class_start_date)
                : null,
              classEndDate: schedule.class_end_date
                ? new Date(schedule.class_end_date)
                : null,
              classTime: schedule.class_time || null,
              classDays: schedule.class_days || null,
            }))
          }

          if (Array.isArray(remoteClassData)) {
            return remoteClassData
          }

          return [remoteClassData]
        })(),
      }
    }, [])

    // Fetch categories from API with cache
    useEffect(() => {
      const fetchCategories = async () => {
        // Check cache first
        const cachedData = getCachedCategorias()
        if (cachedData) {
          setCategories(cachedData)
          return
        }

        // If no cache, fetch from API
        try {
          setLoadingCategories(true)
          const response = await fetch('/api/categorias?page=1&pageSize=100')
          const data = await response.json()
          const categoriesData = data || []

          // Update state and cache
          setCategories(categoriesData)
          setCachedCategorias(categoriesData)
        } catch (error) {
          console.error('Erro ao buscar categorias:', error)
          toast.error('Erro ao carregar categorias')
        } finally {
          setLoadingCategories(false)
        }
      }

      fetchCategories()
    }, [])

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
      defaultValues: prepareDefaultValues(initialData),
      mode: 'onChange', // Enable real-time validation
    })

    const modalidade = form.watch('modalidade')
    const courseManagementType = form.watch('course_management_type')
    const externalPartnerUrl = form.watch('external_partner_url')

    // Sync formacao_link with external_partner_url when modalidade is LIVRE_FORMACAO_ONLINE
    useEffect(() => {
      if (modalidade === 'LIVRE_FORMACAO_ONLINE') {
        // Always sync formacao_link with external_partner_url when it's available
        if (externalPartnerUrl && externalPartnerUrl.trim() !== '') {
          const currentFormacaoLink = form.getValues('formacao_link')
          // Only update if different to avoid unnecessary re-renders
          if (currentFormacaoLink !== externalPartnerUrl) {
            form.setValue('formacao_link', externalPartnerUrl, { shouldValidate: true, shouldDirty: false })
          }
        }
      }
    }, [modalidade, externalPartnerUrl, form])

    // UseFieldArray for locations (PRESENCIAL/HIBRIDO)
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'locations',
    })

    // UseFieldArray for remote schedules (ONLINE)
    const {
      fields: remoteScheduleFields,
      append: appendRemoteSchedule,
      remove: removeRemoteSchedule,
    } = useFieldArray({
      control: form.control,
      name: 'remote_class',
    })

    // Helper function to get schedules for a location
    const getLocationSchedules = (locationIndex: number) => {
      const location = form.watch(`locations.${locationIndex}`)
      return location?.schedules || []
    }

    // Helper function to add a schedule to a location
    const addSchedule = (locationIndex: number) => {
      const currentSchedules =
        form.getValues(`locations.${locationIndex}.schedules`) || []
      form.setValue(`locations.${locationIndex}.schedules`, [
        ...currentSchedules,
        {
          id: '00000000-0000-0000-0000-000000000000',
          vacancies: 1,
          classStartDate: new Date(),
          classEndDate: new Date(),
          classTime: '',
          classDays: '',
        },
      ])
    }

    // Helper function to remove a schedule from a location
    const removeSchedule = (locationIndex: number, scheduleIndex: number) => {
      const currentSchedules =
        form.getValues(`locations.${locationIndex}.schedules`) || []
      if (currentSchedules.length > 1) {
        const newSchedules = currentSchedules.filter(
          (_: any, idx: number) => idx !== scheduleIndex
        )
        form.setValue(`locations.${locationIndex}.schedules`, newSchedules)
      }
    }

    // Helper function to add a remote schedule (for ONLINE courses)
    const addRemoteSchedule = () => {
      appendRemoteSchedule({
        id: '00000000-0000-0000-0000-000000000000',
        vacancies: 1,
        classStartDate: null,
        classEndDate: null,
        classTime: null,
        classDays: null,
      })
    }

    // Transform form data to snake_case for backend API
    const transformFormDataToSnakeCase = (data: PartialFormData) => {
      // Transform remote_class fields to snake_case if it exists
      // Backend expects: { remote_class: { schedules: [...] } }
      const transformedRemoteClass = data.remote_class
        ? Array.isArray(data.remote_class)
          ? {
              schedules: data.remote_class.map(schedule => ({
                vacancies: schedule.vacancies,
                class_start_date: schedule.classStartDate
                  ? formatDateTimeToUTC(schedule.classStartDate)
                  : undefined,
                class_end_date: schedule.classEndDate
                  ? formatDateTimeToUTC(schedule.classEndDate)
                  : undefined,
                class_time: schedule.classTime || '',
                class_days: schedule.classDays || '',
              })),
            }
          : {
              // Legacy single object format - wrap in schedules array
              schedules: [
                {
                  vacancies: (data.remote_class as any).vacancies,
                  class_start_date: (data.remote_class as any).classStartDate
                    ? formatDateTimeToUTC(
                        (data.remote_class as any).classStartDate
                      )
                    : undefined,
                  class_end_date: (data.remote_class as any).classEndDate
                    ? formatDateTimeToUTC(
                        (data.remote_class as any).classEndDate
                      )
                    : undefined,
                  class_time: (data.remote_class as any).classTime || '',
                  class_days: (data.remote_class as any).classDays || '',
                },
              ],
            }
        : undefined

      // Transform locations fields to snake_case if they exist
      const transformedLocations = data.locations?.map(location => ({
        id: (location as any).id || '00000000-0000-0000-0000-000000000000',
        address: location.address,
        neighborhood: location.neighborhood,
        neighborhood_zone: location.zona,
        schedules: location.schedules.map(schedule => ({
          id: (schedule as any).id || '00000000-0000-0000-0000-000000000000',
          vacancies: schedule.vacancies,
          class_start_date: schedule.classStartDate
            ? formatDateTimeToUTC(schedule.classStartDate)
            : undefined,
          class_end_date: schedule.classEndDate
            ? formatDateTimeToUTC(schedule.classEndDate)
            : undefined,
          class_time: schedule.classTime,
          class_days: schedule.classDays,
        })),
      }))

      return {
        title: data.title,
        description: data.description,
        categorias: data.category ? data.category.map(id => ({ id })) : [],
        enrollment_start_date: data.enrollment_start_date
          ? formatDateTimeToUTC(data.enrollment_start_date)
          : undefined,
        enrollment_end_date: data.enrollment_end_date
          ? formatDateTimeToUTC(data.enrollment_end_date)
          : undefined,
        theme: data.theme || undefined,
        orgao_id: data.orgao_id || null,
        modalidade: data.modalidade,
        workload: data.workload,
        target_audience: data.target_audience,
        institutional_logo: data.institutional_logo,
        cover_image: data.cover_image,
        is_visible: data.is_visible,
        pre_requisitos: data.pre_requisitos,
        has_certificate: data.has_certificate || false,

        // Course management type
        course_management_type:
          data.course_management_type || 'OWN_ORG',
        // External partner fields - clear when OWN_ORG
        external_partner_name:
          data.course_management_type !== 'OWN_ORG'
            ? data.external_partner_name
            : '',
        external_partner_url:
          data.course_management_type === 'EXTERNAL_MANAGED_BY_PARTNER'
            ? data.external_partner_url
            : '',
        external_partner_logo_url:
          data.course_management_type !== 'OWN_ORG'
            ? data.external_partner_logo_url
            : '',
        external_partner_contact:
          data.course_management_type === 'EXTERNAL_MANAGED_BY_PARTNER'
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
        formacao_link: data.formacao_link,
        locations: transformedLocations,
        remote_class: transformedRemoteClass,
        // Add the new fields that should always be sent
        turno: 'LIVRE',
        formato_aula: data.modalidade === 'ONLINE' || data.modalidade === 'LIVRE_FORMACAO_ONLINE' ? 'GRAVADO' : 'PRESENCIAL',
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
        category: data.category,
        enrollment_start_date: data.enrollment_start_date || currentDate,
        enrollment_end_date: data.enrollment_end_date || nextMonth,
        theme: data.theme || undefined,
        orgao_id: data.orgao_id || '',
        modalidade: modalidade as 'PRESENCIAL' | 'ONLINE' | 'LIVRE_FORMACAO_ONLINE',
        workload: data.workload,
        target_audience: data.target_audience,
        institutional_logo: data.institutional_logo || '',
        cover_image: data.cover_image || '',
        is_visible: data.is_visible,
        pre_requisitos: data.pre_requisitos,
        has_certificate: data.has_certificate || false,

        // Course management type
        course_management_type:
          data.course_management_type || 'OWN_ORG',
        // External partner fields - clear when OWN_ORG
        external_partner_name:
          data.course_management_type !== 'OWN_ORG'
            ? data.external_partner_name
            : '',
        external_partner_url:
          data.course_management_type === 'EXTERNAL_MANAGED_BY_PARTNER'
            ? data.external_partner_url
            : '',
        external_partner_logo_url:
          data.course_management_type !== 'OWN_ORG'
            ? data.external_partner_logo_url
            : '',
        external_partner_contact:
          data.course_management_type === 'EXTERNAL_MANAGED_BY_PARTNER'
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
                    id: '00000000-0000-0000-0000-000000000000',
                    address: '',
                    neighborhood: '',
                    zona: '',
                    schedules: [
                      {
                        id: '00000000-0000-0000-0000-000000000000',
                        vacancies: 1,
                        classStartDate: currentDate,
                        classEndDate: nextMonth,
                        classTime: 'Horário em definição',
                        classDays: 'Dias em definição',
                      },
                    ],
                  },
                ]
            : undefined,
        remote_class:
          modalidade === 'ONLINE'
            ? data.remote_class && data.remote_class.length > 0
              ? data.remote_class
              : [
                  {
                    id: '00000000-0000-0000-0000-000000000000',
                    vacancies: 1,
                    classStartDate: null,
                    classEndDate: null,
                    classTime: null,
                    classDays: null,
                  },
                ]
            : undefined,
      }

      return transformFormDataToSnakeCase(draftData)
    }

    // Helper function to format validation errors for toast messages
    const formatValidationErrors = (error: z.ZodError): string => {
      const requiredFields = error.errors
        .filter(
          err =>
            err.code === 'too_small' ||
            err.code === 'invalid_type' ||
            err.code === 'invalid_string' ||
            err.code === 'invalid_date'
        )
        .map(err => {
          const path = err.path.join('.')
          // Map technical field names to user-friendly labels
          const fieldLabels: Record<string, string> = {
            title: 'Título',
            description: 'Descrição',
            category: 'Categorias',
            enrollment_start_date: 'Data de início das inscrições',
            enrollment_end_date: 'Data de fim das inscrições',
            orgao_id: 'Órgão',
            modalidade: 'Modalidade',
            workload: 'Carga horária',
            target_audience: 'Público-alvo',
            institutional_logo: 'Logo institucional',
            cover_image: 'Imagem de capa',
            is_visible: 'Visibilidade do curso',
            locations: 'Unidades',
            'locations.0.address': 'Endereço da unidade',
            'locations.0.neighborhood': 'Bairro',
            'locations.0.schedules': 'Turmas',
            remote_class: 'Turmas online',
            'remote_class.0.vacancies': 'Número de vagas',
            'remote_class.0.classStartDate': 'Data de início das aulas',
            'remote_class.0.classEndDate': 'Data de fim das aulas',
            'remote_class.0.classTime': 'Horário das aulas',
            'remote_class.0.classDays': 'Dias de aula',
          }

          // Try to get user-friendly label, otherwise use path
          return fieldLabels[path] || path
        })

      if (requiredFields.length > 0) {
        const uniqueFields = Array.from(new Set(requiredFields))
        if (uniqueFields.length === 1) {
          return `Por favor, preencha o campo obrigatório: ${uniqueFields[0]}.`
        }
        if (uniqueFields.length <= 3) {
          return `Por favor, preencha os campos obrigatórios: ${uniqueFields.join(', ')}.`
        }
        return `Por favor, preencha os ${uniqueFields.length} campos obrigatórios destacados no formulário.`
      }

      return 'Por favor, verifique os campos obrigatórios destacados no formulário.'
    }

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      triggerSubmit: async () => {
        // Sync formacao_link with external_partner_url before validation if modalidade is LIVRE_FORMACAO_ONLINE
        const modalidade = form.getValues('modalidade')
        const externalPartnerUrl = form.getValues('external_partner_url')
        if (modalidade === 'LIVRE_FORMACAO_ONLINE' && externalPartnerUrl && externalPartnerUrl.trim() !== '') {
          form.setValue('formacao_link', externalPartnerUrl, { shouldValidate: false })
        }
        
        // Always validate first, even when called via ref
        const isValid = await form.trigger()
        
        if (!isValid) {
          // Try full schema validation for more detailed errors
          try {
            const currentValues = form.getValues()
            // Ensure formacao_link is synced before validation
            if (currentValues.modalidade === 'LIVRE_FORMACAO_ONLINE' && currentValues.external_partner_url && !currentValues.formacao_link) {
              currentValues.formacao_link = currentValues.external_partner_url
            }
            fullFormSchema.parse(currentValues)
          } catch (error) {
            if (error instanceof z.ZodError) {
              const errorMessage = formatValidationErrors(error)
              toast.error('Campos obrigatórios não preenchidos', {
                description: errorMessage,
                duration: 5000,
              })
              return
            }
          }
          
          // Fallback to generic message if schema validation doesn't catch it
          toast.error('Campos obrigatórios não preenchidos', {
            description:
              'Por favor, preencha todos os campos obrigatórios destacados antes de salvar.',
            duration: 5000,
          })
          return
        }
        
        // Validate with full schema as well
        try {
          const currentValues = form.getValues()
          // Ensure formacao_link is synced before validation
          if (currentValues.modalidade === 'LIVRE_FORMACAO_ONLINE' && currentValues.external_partner_url && !currentValues.formacao_link) {
            currentValues.formacao_link = currentValues.external_partner_url
            form.setValue('formacao_link', currentValues.external_partner_url, { shouldValidate: true })
          }
          fullFormSchema.parse(currentValues)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = formatValidationErrors(error)
            toast.error('Campos obrigatórios não preenchidos', {
              description: errorMessage,
              duration: 5000,
            })
            return
          }
        }
        
        // If validation passes, proceed with submit
        const currentValues = form.getValues()
        handleSubmit(currentValues)
      },
      triggerPublish: async () => {
        // Sync formacao_link with external_partner_url before validation if modalidade is LIVRE_FORMACAO_ONLINE
        const modalidade = form.getValues('modalidade')
        const externalPartnerUrl = form.getValues('external_partner_url')
        if (modalidade === 'LIVRE_FORMACAO_ONLINE' && externalPartnerUrl && externalPartnerUrl.trim() !== '') {
          form.setValue('formacao_link', externalPartnerUrl, { shouldValidate: false })
        }
        
        // Always validate first, even when called via ref
        const isValid = await form.trigger()
        
        if (!isValid) {
          // Try full schema validation for more detailed errors
          try {
            const currentValues = form.getValues()
            // Ensure formacao_link is synced before validation
            if (currentValues.modalidade === 'LIVRE_FORMACAO_ONLINE' && currentValues.external_partner_url && !currentValues.formacao_link) {
              currentValues.formacao_link = currentValues.external_partner_url
            }
            fullFormSchema.parse(currentValues)
          } catch (error) {
            if (error instanceof z.ZodError) {
              const errorMessage = formatValidationErrors(error)
              toast.error('Campos obrigatórios não preenchidos', {
                description: errorMessage,
                duration: 5000,
              })
              return
            }
          }
          
          // Fallback to generic message if schema validation doesn't catch it
          toast.error('Campos obrigatórios não preenchidos', {
            description:
              'Por favor, preencha todos os campos obrigatórios destacados antes de publicar.',
            duration: 5000,
          })
          return
        }
        
        // Validate with full schema as well
        try {
          const currentValues = form.getValues()
          // Ensure formacao_link is synced before validation
          if (currentValues.modalidade === 'LIVRE_FORMACAO_ONLINE' && currentValues.external_partner_url && !currentValues.formacao_link) {
            currentValues.formacao_link = currentValues.external_partner_url
            form.setValue('formacao_link', currentValues.external_partner_url, { shouldValidate: true })
          }
          fullFormSchema.parse(currentValues)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = formatValidationErrors(error)
            toast.error('Campos obrigatórios não preenchidos', {
              description: errorMessage,
              duration: 5000,
            })
            return
          }
        }
        
        // If validation passes, proceed with publish
        handlePublish()
      },
      triggerSaveDraft: () => {
        handleSaveDraft()
      },
      resetForm: () => {
        const defaultValues = prepareDefaultValues(initialData)
        form.reset(defaultValues, {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        })
      },
    }))

    // Handle modalidade change to properly initialize fields
    const handleModalidadeChange = useCallback((value: 'PRESENCIAL' | 'ONLINE' | 'LIVRE_FORMACAO_ONLINE') => {
      if (value === 'ONLINE') {
        // Clear locations array and initialize remote class fields with array
        form.setValue('locations', [])
        form.setValue('remote_class', [
          {
            vacancies: 1,
            classStartDate: null,
            classEndDate: null,
            classTime: null,
            classDays: null,
          },
        ] as any)
        form.setValue('formacao_link', undefined)
      } else if (value === 'PRESENCIAL') {
        // Clear remote class and initialize locations if not already set
        form.setValue('remote_class', undefined)
        form.setValue('formacao_link', undefined)

        const currentLocations = form.getValues('locations')
        if (!currentLocations || currentLocations.length === 0) {
          form.setValue('locations', [
            {
              address: '',
              neighborhood: '',
              zona: '',
              schedules: [
                {
                  vacancies: 1,
                  classStartDate: new Date(),
                  classEndDate: new Date(),
                  classTime: '',
                  classDays: '',
                },
              ],
            },
          ])
        }
      } else if (value === 'LIVRE_FORMACAO_ONLINE') {
        // Clear locations and remote_class, initialize formacao_link
        form.setValue('locations', [])
        form.setValue('remote_class', undefined)
        // Auto-fill formacao_link with external_partner_url if available
        const externalPartnerUrl = form.getValues('external_partner_url')
        form.setValue('formacao_link', externalPartnerUrl || '', { shouldValidate: false })
      }
    }, [form])

    // Reset modalidade if LIVRE_FORMACAO_ONLINE is selected but course_management_type doesn't allow it
    // This handles both cases:
    // 1. When modalidade is changed to LIVRE_FORMACAO_ONLINE but course_management_type doesn't allow it
    // 2. When course_management_type changes from EXTERNAL_MANAGED_BY_PARTNER to another option while modalidade is LIVRE_FORMACAO_ONLINE
    useEffect(() => {
      // If modalidade is LIVRE_FORMACAO_ONLINE and course_management_type doesn't allow it, reset to PRESENCIAL
      if (
        modalidade === 'LIVRE_FORMACAO_ONLINE' &&
        courseManagementType &&
        (courseManagementType === 'OWN_ORG' || courseManagementType === 'EXTERNAL_MANAGED_BY_ORG')
      ) {
        // Reset to PRESENCIAL as default
        handleModalidadeChange('PRESENCIAL')
      }
    }, [courseManagementType, modalidade, handleModalidadeChange])

    const addLocation = () => {
      append({
        address: '',
        neighborhood: '',
        zona: '',
        schedules: [
          {
            vacancies: 1,
            classStartDate: new Date(),
            classEndDate: new Date(),
            classTime: '',
            classDays: '',
          },
        ],
      })
    }

    const removeLocation = (index: number) => {
      remove(index)
    }

    // Custom submit handler that validates before React Hook Form processes it
    const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      e.stopPropagation()

      // Always validate first
      const isValid = await form.trigger()

      if (!isValid) {
        // Try full schema validation for more detailed errors
        try {
          const currentValues = form.getValues()
          fullFormSchema.parse(currentValues)
        } catch (error) {
          if (error instanceof z.ZodError) {
            const errorMessage = formatValidationErrors(error)
            toast.error('Campos obrigatórios não preenchidos', {
              description: errorMessage,
              duration: 5000,
            })
            return
          }
        }

        // Fallback to generic message
        toast.error('Campos obrigatórios não preenchidos', {
          description:
            'Por favor, preencha todos os campos obrigatórios destacados antes de salvar.',
          duration: 5000,
        })
        return
      }

      // Validate with full schema as well
      try {
        const currentValues = form.getValues()
        fullFormSchema.parse(currentValues)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = formatValidationErrors(error)
          toast.error('Campos obrigatórios não preenchidos', {
            description: errorMessage,
            duration: 5000,
          })
          return
        }
      }

      // If validation passes, proceed with the actual submit handler
      const currentValues = form.getValues()
      handleSubmit(currentValues)
    }

    const handleSubmit = async (data: PartialFormData) => {
      // This is only called after validation has passed
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
          const errorMessage = formatValidationErrors(error)
          toast.error('Campos obrigatórios não preenchidos', {
            description: errorMessage,
            duration: 5000,
          })
          // Close dialog on validation error
          setConfirmDialog({ open: false, type: null })
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
              'Ocorreu um erro de formato nos dados. Verifique os campos preenchidos e tente novamente.',
            duration: 5000,
          })
          // Close dialog on validation error
          setConfirmDialog({ open: false, type: null })
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
          // Get validation errors to show specific missing fields
          const errors = form.formState.errors
          const missingFields = Object.keys(errors).filter(
            key => errors[key as keyof typeof errors]
          )
          
          toast.error('Campos obrigatórios não preenchidos', {
            description:
              'Por favor, preencha todos os campos obrigatórios destacados antes de publicar.',
            duration: 5000,
          })
          // Close dialog on validation error
          setConfirmDialog({ open: false, type: null })
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
          const errorMessage = formatValidationErrors(error)
          toast.error('Campos obrigatórios não preenchidos', {
            description: errorMessage,
            duration: 5000,
          })
          // Close dialog on validation error
          setConfirmDialog({ open: false, type: null })
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
        <form onSubmit={handleFormSubmit} className="">
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Descreva o curso de forma detalhada"
                        disabled={isReadOnly}
                        maxLength={600}
                        showCharCount={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categorias*</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={categoryOptions.map(cat => ({
                          value: cat.id.toString(),
                          label: cat.nome,
                        }))}
                        value={field.value?.map(id => id.toString()) || []}
                        onValueChange={values =>
                          field.onChange(values.map(v => Number(v)))
                        }
                        placeholder={
                          loadingCategories
                            ? 'Carregando categorias...'
                            : categoryOptions.length === 0
                              ? 'Nenhuma categoria encontrada'
                              : 'Selecione categorias'
                        }
                        searchPlaceholder="Buscar categorias..."
                        emptyMessage="Nenhuma categoria encontrada."
                        disabled={isReadOnly || loadingCategories}
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
                name="orgao_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão (Quem oferece o curso)*</FormLabel>
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

              {/* Course Management Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Gestão do curso (Quem gere o curso)*</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="course_management_type"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value)
                              // If changing from EXTERNAL_MANAGED_BY_PARTNER to another option
                              // and modalidade is LIVRE_FORMACAO_ONLINE, reset modalidade to PRESENCIAL
                              const currentModalidade = form.getValues('modalidade')
                              if (
                                currentModalidade === 'LIVRE_FORMACAO_ONLINE' &&
                                (value === 'OWN_ORG' || value === 'EXTERNAL_MANAGED_BY_ORG')
                              ) {
                                // Update modalidade field directly and call handler
                                form.setValue('modalidade', 'PRESENCIAL')
                                handleModalidadeChange('PRESENCIAL')
                              }
                            }}
                            value={field.value}
                            className="space-y-3"
                            disabled={isReadOnly}
                          >
                            {COURSE_MANAGEMENT_OPTIONS.map(option => (
                              <div
                                key={option.value}
                                className="flex items-start space-x-3 space-y-0"
                              >
                                <RadioGroupItem
                                  value={option.value}
                                  id={option.value}
                                  className="mt-0.5"
                                />
                                <label
                                  htmlFor={option.value}
                                  className="flex-1 cursor-pointer space-y-1 leading-none"
                                >
                                  <div className="font-medium">
                                    {option.label}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {option.description}
                                  </p>
                                </label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* External Partner Fields - Show conditionally based on course_management_type */}
                  {form.watch('course_management_type') !== 'OWN_ORG' && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Informações do Parceiro Externo
                      </h3>
                      <div className="space-y-4">
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Show URL field only for EXTERNAL_MANAGED_BY_PARTNER */}
                    {form.watch('course_management_type') ===
                      'EXTERNAL_MANAGED_BY_PARTNER' && (
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
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

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

                    {/* Show contact field only for EXTERNAL_MANAGED_BY_PARTNER */}
                    {form.watch('course_management_type') ===
                      'EXTERNAL_MANAGED_BY_PARTNER' && (
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
                    )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de formação*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isReadOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de formação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORMACAO_TYPES.map(tipo => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
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
                name="modalidade"
                render={({ field }) => {
                  // Disable LIVRE_FORMACAO_ONLINE if course is managed by org (OWN_ORG or EXTERNAL_MANAGED_BY_ORG)
                  const isLivreFormacaoDisabled = 
                    courseManagementType === 'OWN_ORG' || 
                    courseManagementType === 'EXTERNAL_MANAGED_BY_ORG'
                  
                  return (
                    <FormItem>
                      <FormLabel>Modalidade*</FormLabel>
                      <Select
                        onValueChange={value => {
                          const modalidadeValue = value as 'PRESENCIAL' | 'ONLINE' | 'LIVRE_FORMACAO_ONLINE'
                          field.onChange(modalidadeValue)
                          handleModalidadeChange(modalidadeValue)
                        }}
                        value={field.value}
                        disabled={isReadOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a modalidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                          <SelectItem value="ONLINE">Online</SelectItem>
                          <SelectItem 
                            value="LIVRE_FORMACAO_ONLINE"
                            disabled={isLivreFormacaoDisabled}
                          >
                            Livre formação (online)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {/* Conditional rendering based on modalidade */}
              {modalidade === 'LIVRE_FORMACAO_ONLINE' && (
                <div className="space-y-4 -mt-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Link para Formação (Livre formação - Online)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="formacao_link"
                        render={({ field }) => {
                          // Always use external_partner_url value when available, fallback to field value
                          const displayValue = externalPartnerUrl || field.value || ''
                          
                          return (
                            <FormItem>
                              <FormLabel>Link para formação</FormLabel>
                              <FormControl>
                                <Input
                                  type="url"
                                  placeholder="URL será preenchida automaticamente com a URL do parceiro externo"
                                  disabled={true}
                                  className="bg-muted cursor-not-allowed"
                                  readOnly
                                  value={displayValue}
                                  onChange={() => {}} // Prevent manual changes
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <p className="text-sm text-muted-foreground">
                                Este campo é preenchido automaticamente com a URL do parceiro externo.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {modalidade === 'ONLINE' && (
                <div className="space-y-4 -mt-2">
                  {(() => {
                    const remoteSchedulesRaw = form.watch('remote_class')
                    const remoteSchedules = Array.isArray(remoteSchedulesRaw)
                      ? remoteSchedulesRaw
                      : []

                    // Ensure at least one schedule exists
                    if (remoteSchedules.length === 0) {
                      form.setValue('remote_class', [
                        {
                          vacancies: 1,
                          classStartDate: null,
                          classEndDate: null,
                          classTime: null,
                          classDays: null,
                        },
                      ])
                      return null // Will re-render with the schedule
                    }

                    return remoteSchedules.map(
                      (remoteSchedule: any, index: number) => (
                        <Card key={index}>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>
                              {index === 0
                                ? 'Informações da Turma Online'
                                : `Informações da Turma Online ${index + 1}`}
                            </CardTitle>
                            {index > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeRemoteSchedule(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* UUID da Turma - Only show in read-only mode when ID exists */}
                            {isReadOnly && remoteSchedule.id && (
                              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 pointer-events-auto">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    UUID da Turma
                                  </p>
                                  <p className="font-mono text-sm text-foreground truncate">
                                    {remoteSchedule.id}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        remoteSchedule.id
                                      )
                                      toast.success('UUID copiado!')
                                    } catch (err) {
                                      console.error('Failed to copy:', err)
                                      toast.error('Erro ao copiar')
                                    }
                                  }}
                                  className="flex-shrink-0"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar ID
                                </Button>
                              </div>
                            )}

                            <FormField
                              control={form.control}
                              name={`remote_class.${index}.vacancies`}
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
                                name={`remote_class.${index}.classStartDate`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-col flex-1 min-w-[280px]">
                                    <FormLabel>Início das aulas</FormLabel>
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
                                name={`remote_class.${index}.classEndDate`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-col flex-1 min-w-[280px]">
                                    <FormLabel>Fim das aulas</FormLabel>
                                    <FormControl>
                                      <DateTimePicker
                                        value={field.value || undefined}
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
                              name={`remote_class.${index}.classTime`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Horário das aulas</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Digite o horário das aulas (ex: 19:00 - 22:00, Manhã, Tarde, Noite, etc.)"
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`remote_class.${index}.classDays`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dias de aula</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Digite os dias das aulas (ex: Segunda, Quarta e Sexta, Segunda a Sexta, etc.)"
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      )
                    )
                  })()}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRemoteSchedule}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar outra turma
                  </Button>
                </div>
              )}

              {modalidade === 'PRESENCIAL' && (
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
                                <Combobox
                                  options={neighborhoodOptions}
                                  value={field.value}
                                  onValueChange={value => {
                                    field.onChange(value)
                                    // Auto-fill zona when bairro is selected
                                    const selectedNeighborhood = neighborhoodZone.find(
                                      n => n.bairro === value
                                    )
                                    if (selectedNeighborhood) {
                                      form.setValue(
                                        `locations.${index}.zona`,
                                        selectedNeighborhood.zona
                                      )
                                    } else {
                                      form.setValue(`locations.${index}.zona`, '')
                                    }
                                  }}
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
                          name={`locations.${index}.zona`}
                          render={({ field }) => (
                            <FormItem className="cursor-not-allowed">
                              <FormLabel className="text-muted-foreground cursor-not-allowed">
                                Zona
                              </FormLabel>
                              <FormControl>
                                <div className="cursor-not-allowed">
                                  <Input
                                    {...field}
                                    disabled={true}
                                    className="bg-muted cursor-not-allowed"
                                    style={{ cursor: 'not-allowed' }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Schedules (Turmas) */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Turmas</h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSchedule(index)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Turma
                            </Button>
                          </div>

                          {(() => {
                            const location = form.watch(`locations.${index}`)
                            const schedules = location?.schedules || []
                            // Ensure at least one schedule is shown - if empty, form will initialize it
                            if (schedules.length === 0) {
                              // Initialize with one schedule if none exists
                              form.setValue(`locations.${index}.schedules`, [
                                {
                                  id: '00000000-0000-0000-0000-000000000000',
                                  vacancies: 1,
                                  classStartDate: new Date(),
                                  classEndDate: new Date(),
                                  classTime: '',
                                  classDays: '',
                                },
                              ])
                              return null // Will re-render with the schedule
                            }
                            return schedules.map(
                              (
                                locationSchedule: any,
                                scheduleIndex: number
                              ) => (
                                <Card
                                  key={scheduleIndex}
                                  className="bg-muted/30"
                                >
                                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <CardTitle className="text-base">
                                      Turma {scheduleIndex + 1}
                                    </CardTitle>
                                    {schedules && schedules.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeSchedule(index, scheduleIndex)
                                        }
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    {/* UUID da Turma - Only show in read-only mode when ID exists */}
                                    {isReadOnly && locationSchedule.id && (
                                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 pointer-events-auto">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-muted-foreground mb-1">
                                            UUID da Turma
                                          </p>
                                          <p className="font-mono text-sm text-foreground truncate">
                                            {locationSchedule.id}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(
                                                locationSchedule.id
                                              )
                                              toast.success('UUID copiado!')
                                            } catch (err) {
                                              console.error(
                                                'Failed to copy:',
                                                err
                                              )
                                              toast.error('Erro ao copiar')
                                            }
                                          }}
                                          className="flex-shrink-0"
                                        >
                                          <Copy className="h-4 w-4 mr-2" />
                                          Copiar ID
                                        </Button>
                                      </div>
                                    )}

                                    <FormField
                                      control={form.control}
                                      name={`locations.${index}.schedules.${scheduleIndex}.vacancies`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Número de vagas*
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min="1"
                                              value={field.value || ''}
                                              onChange={e =>
                                                field.onChange(
                                                  Number(e.target.value)
                                                )
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
                                        name={`locations.${index}.schedules.${scheduleIndex}.classStartDate`}
                                        render={({ field }) => (
                                          <FormItem className="flex flex-col flex-1 min-w-[280px]">
                                            <FormLabel>
                                              Início das aulas*
                                            </FormLabel>
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
                                        name={`locations.${index}.schedules.${scheduleIndex}.classEndDate`}
                                        render={({ field }) => (
                                          <FormItem className="flex flex-col flex-1 min-w-[280px]">
                                            <FormLabel>
                                              Fim das aulas*
                                            </FormLabel>
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
                                      name={`locations.${index}.schedules.${scheduleIndex}.classTime`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Horário das aulas*
                                          </FormLabel>
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
                                      name={`locations.${index}.schedules.${scheduleIndex}.classDays`}
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
                              )
                            )
                          })()}
                        </div>
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
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Ex: Servidores públicos, estudantes, profissionais da área de tecnologia..."
                        disabled={isReadOnly}
                        maxLength={600}
                        showCharCount={true}
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
                                  Pré-requisitos para o certificado"{' '}
                                </FormLabel>
                                <FormControl>
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Conhecimento básico em informática, ensino médio completo..."
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Desenvolver habilidades em gestão de projetos, capacitar para uso de ferramentas específicas..."
                                    disabled={isReadOnly}
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Ao final do curso, os participantes estarão aptos a..."
                                    disabled={isReadOnly}
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Módulo 1: Introdução, Módulo 2: Conceitos básicos..."
                                    disabled={isReadOnly}
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Aulas expositivas, exercícios práticos, estudos de caso..."
                                    disabled={isReadOnly}
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Computadores, projetor, software específico..."
                                    disabled={isReadOnly}
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Apostilas, slides, vídeos..."
                                    disabled={isReadOnly}
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
                                  <MarkdownEditor
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Ex: Livros, artigos, exercícios práticos..."
                                    disabled={isReadOnly}
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
