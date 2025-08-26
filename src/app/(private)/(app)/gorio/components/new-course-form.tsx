'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Plus, Trash2 } from 'lucide-react'
import { type CustomField, FieldsCreator } from './fields-creator'

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
  classTime: z
    .string()
    .min(1, { message: 'Horário das aulas é obrigatório.' })
    .refine(
      value => {
        if (!value || value.trim() === '') return false
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s*[-à]\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9])?$/.test(
          value
        )
      },
      {
        message: 'Formato de horário inválido. Use: HH:MM ou HH:MM - HH:MM',
      }
    ),
  classDays: z
    .string()
    .min(1, { message: 'Dias de aula é obrigatório.' })
    .refine(
      value => {
        if (!value || value.trim() === '') return false
        return /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(\s*,\s*(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo))*$/.test(
          value
        )
      },
      {
        message: 'Formato inválido. Use: Segunda, Quarta, Sexta',
      }
    ),
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
  classTime: z
    .string()
    .min(1, { message: 'Horário das aulas é obrigatório.' })
    .refine(
      value => {
        if (!value || value.trim() === '') return false
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s*[-à]\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9])?$/.test(
          value
        )
      },
      {
        message: 'Formato de horário inválido. Use: HH:MM ou HH:MM - HH:MM',
      }
    ),
  classDays: z
    .string()
    .min(1, { message: 'Dias de aula é obrigatório.' })
    .refine(
      value => {
        if (!value || value.trim() === '') return false
        return /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(\s*,\s*(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo))*$/.test(
          value
        )
      },
      {
        message: 'Formato inválido. Use: Segunda, Quarta, Sexta',
      }
    ),
})

// Create a discriminated union for better type safety
const formSchema = z
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
        .max(500, { message: 'Descrição não pode exceder 500 caracteres.' }),
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
      theme: z
        .string()
        .min(1, { message: 'Tema é obrigatório.' })
        .min(3, { message: 'Tema deve ter pelo menos 3 caracteres.' })
        .max(100, { message: 'Tema não pode exceder 100 caracteres.' }),
      workload: z
        .string()
        .min(1, { message: 'Carga horária é obrigatória.' })
        .min(3, { message: 'Carga horária deve ter pelo menos 3 caracteres.' })
        .max(50, { message: 'Carga horária não pode exceder 50 caracteres.' }),
      target_audience: z
        .string()
        .min(1, { message: 'Público-alvo é obrigatório.' })
        .min(10, { message: 'Público-alvo deve ter pelo menos 10 caracteres.' })
        .max(200, { message: 'Público-alvo não pode exceder 200 caracteres.' }),
      // Required image fields
      institutional_logo: z.string().url({
        message: 'Logo institucional deve ser uma URL válida.',
      }),
      cover_image: z.string().url({
        message: 'Imagem de capa deve ser uma URL válida.',
      }),
      // Optional fields
      pre_requisitos: z.string().optional(),
      has_certificate: z.boolean().optional(),
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
            field_type: z.string().optional(),
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
        .max(500, { message: 'Descrição não pode exceder 500 caracteres.' }),
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
      theme: z
        .string()
        .min(1, { message: 'Tema é obrigatório.' })
        .min(3, { message: 'Tema deve ter pelo menos 3 caracteres.' })
        .max(100, { message: 'Tema não pode exceder 100 caracteres.' }),
      workload: z
        .string()
        .min(1, { message: 'Carga horária é obrigatória.' })
        .min(3, { message: 'Carga horária deve ter pelo menos 3 caracteres.' })
        .max(50, { message: 'Carga horária não pode exceder 50 caracteres.' }),
      target_audience: z
        .string()
        .min(1, { message: 'Público-alvo é obrigatório.' })
        .min(10, { message: 'Público-alvo deve ter pelo menos 10 caracteres.' })
        .max(200, { message: 'Público-alvo não pode exceder 200 caracteres.' }),
      // Required image fields
      institutional_logo: z.string().url({
        message: 'Logo institucional deve ser uma URL válida.',
      }),
      cover_image: z.string().url({
        message: 'Imagem de capa deve ser uma URL válida.',
      }),
      // Optional fields
      pre_requisitos: z.string().optional(),
      has_certificate: z.boolean().optional(),
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
            field_type: z.string().optional(),
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

type FormData = z.infer<typeof formSchema>

// Helper type for form state before modalidade is selected
type PartialFormData = Omit<
  FormData,
  'modalidade' | 'locations' | 'remote_class'
> & {
  modalidade?: 'PRESENCIAL' | 'HIBRIDO' | 'ONLINE'
  locations?: z.infer<typeof locationClassSchema>[]
  remote_class?: z.infer<typeof remoteClassSchema>
  theme?: string
  workload?: string
  target_audience?: string
  pre_requisitos?: string
  has_certificate?: boolean
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
  custom_fields?: CustomField[]
  status?: 'canceled' | 'draft' | 'opened' | 'closed'
}

interface NewCourseFormProps {
  initialData?: PartialFormData
  isReadOnly?: boolean
  onSubmit?: (data: PartialFormData) => void
  onSaveDraft?: (data: PartialFormData) => void
  onPublish?: (data: PartialFormData) => void
  isDraft?: boolean
  courseStatus?: string
}

export interface NewCourseFormRef {
  triggerSubmit: () => void
  triggerPublish: () => void
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
    // State for organizations
    const [orgaos, setOrgaos] = useState<Array<{ id: number; nome: string }>>(
      []
    )
    const [loadingOrgaos, setLoadingOrgaos] = useState(false)

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
      defaultValues: initialData || {
        title: '',
        description: '',
        enrollment_start_date: new Date(),
        enrollment_end_date: new Date(),
        orgao: undefined,
        modalidade: undefined,
        theme: '',
        locations: [],
        remote_class: undefined,
        workload: '',
        target_audience: '',
        pre_requisitos: '',
        has_certificate: false,
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

    // Transform form data to snake_case for backend
    const transformFormDataToSnakeCase = (data: PartialFormData) => {
      return {
        title: data.title,
        description: data.description,
        enrollment_start_date: data.enrollment_start_date,
        enrollment_end_date: data.enrollment_end_date,
        orgao: data.orgao,
        modalidade: data.modalidade,
        theme: data.theme,
        workload: data.workload,
        target_audience: data.target_audience,
        institutional_logo: data.institutional_logo,
        cover_image: data.cover_image,
        pre_requisitos: data.pre_requisitos,
        has_certificate: data.has_certificate,
        facilitator: data.facilitator,
        objectives: data.objectives,
        expected_results: data.expected_results,
        program_content: data.program_content,
        methodology: data.methodology,
        resources_used: data.resources_used,
        material_used: data.material_used,
        teaching_material: data.teaching_material,
        custom_fields: data.custom_fields,
        locations: data.locations,
        remote_class: data.remote_class,
        // Add the new fields that should always be sent
        turno: "LIVRE",
        formato_aula: data.modalidade === 'ONLINE' ? 'GRAVADO' : 'PRESENCIAL'
      }
    }

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      triggerSubmit: () => {
        form.handleSubmit(handleSubmit)()
      },
      triggerPublish: () => {
        handlePublish()
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
        const validatedData = formSchema.parse(values)

        // Transform to snake_case for backend
        const transformedData = transformFormDataToSnakeCase(validatedData)

        // Adiciona o status para curso criado
        const courseData = {
          ...transformedData,
          status: 'opened' as const,
        }

        console.log('Form submitted successfully!')
        console.log('Form values:', courseData)

        if (onSubmit) {
          onSubmit(courseData)
        } else {
          toast.success('Formulário enviado com sucesso!')
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

    const confirmSaveDraft = async () => {
      try {
        const currentValues = form.getValues()

        // Transform to snake_case for backend
        const transformedData = transformFormDataToSnakeCase(currentValues)

        // Adiciona o status para rascunho
        const draftData = {
          ...transformedData,
          status: 'draft' as const,
        }

        console.log('Saving draft...')
        console.log('Draft values:', draftData)

        // Aqui você pode implementar a lógica para salvar o rascunho
        // Por exemplo, enviar para uma API específica de rascunhos
        // ou salvar no localStorage

        if (onSaveDraft) {
          onSaveDraft(draftData)
        } else if (onSubmit) {
          onSubmit(draftData)
        } else {
          toast.success('Rascunho salvo com sucesso!')
        }
      } catch (error) {
        console.error('Error saving draft:', error)
        toast.error('Erro ao salvar rascunho', {
          description: 'Ocorreu um erro ao salvar o rascunho.',
        })
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
        const validatedData = formSchema.parse(currentValues)

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

              <div className="flex items-center justify-between gap-4">
                <FormField
                  control={form.control}
                  name="enrollment_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1">
                      <FormLabel>Período de inscrições*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>DD/MM/AAAA</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex mt-4 items-center justify-center">à</div>
                <FormField
                  control={form.control}
                  name="enrollment_end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-1">
                      <FormLabel className="opacity-0 pointer-events-none select-none">
                        Data de término*
                      </FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>DD/MM/AAAA</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                          />
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

              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tema*</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Tecnologia, Gestão, Saúde, Educação..."
                        {...field}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional rendering based on modalidade */}
              {modalidade === 'ONLINE' && (
                <Card className="-mt-2">
                  <CardHeader>
                    <CardTitle>Informações das Aulas Remotas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="remote_class.vacancies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de vagas*</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-4">
                      <FormField
                        control={form.control}
                        name="remote_class.classStartDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col flex-1">
                            <FormLabel>Período das aulas*</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                                    ) : (
                                      <span>DD/MM/AAAA</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <span className="mt-4">à</span>
                      <FormField
                        control={form.control}
                        name="remote_class.classEndDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col flex-1">
                            <FormLabel className="opacity-0 pointer-events-none select-none">
                              Data de fim*
                            </FormLabel>
                            <FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={'outline'}
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                                    ) : (
                                      <span>DD/MM/AAAA</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
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
                            <Input placeholder="Ex: 19:00 - 22:00" {...field} />
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
                              placeholder="Ex: Segunda, Quarta e Sexta"
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
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end gap-4">
                          <FormField
                            control={form.control}
                            name={`locations.${index}.classStartDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col flex-1">
                                <FormLabel>Período das aulas*</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          'w-full pl-3 text-left font-normal',
                                          !field.value &&
                                            'text-muted-foreground'
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, 'dd/MM/yyyy')
                                        ) : (
                                          <span>DD/MM/AAAA</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                  >
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <span className="pb-2">à</span>
                          <FormField
                            control={form.control}
                            name={`locations.${index}.classEndDate`}
                            render={({ field }) => (
                              <FormItem className="flex flex-col flex-1">
                                <FormLabel className="opacity-0 pointer-events-none select-none">
                                  Data de fim*
                                </FormLabel>
                                <FormControl>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant={'outline'}
                                        className={cn(
                                          'w-full pl-3 text-left font-normal',
                                          !field.value &&
                                            'text-muted-foreground'
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, 'dd/MM/yyyy')
                                        ) : (
                                          <span>DD/MM/AAAA</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
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
                                  placeholder="Ex: 19:00 - 22:00"
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
                                  placeholder="Ex: Segunda, Quarta e Sexta"
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
                      <Input placeholder="Ex: 40 horas" {...field} />
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
              <Card className="w-full">
                <CardHeader>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem
                      value="optional-fields"
                      className="border-none"
                    >
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        Informações Adicionais do Curso (Opcionais)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6 pt-4">
                          <FormField
                            control={form.control}
                            name="pre_requisitos"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Pré-requisitos para a capacitação
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Ex: Conhecimento básico em informática, ensino médio completo..."
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
                            name="has_certificate"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Terá certificado</FormLabel>
                                </div>
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
              courseStatus !== 'finished' && (
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
                : confirmDialog.type === 'publish_course'
                  ? 'Publicar Curso'
                  : 'Salvar Alterações'
          }
          description={
            confirmDialog.type === 'create_course'
              ? 'Tem certeza que deseja criar este curso? Esta ação tornará o curso visível para inscrições.'
              : confirmDialog.type === 'save_draft'
                ? 'Tem certeza que deseja salvar este rascunho? O curso não será publicado ainda.'
                : confirmDialog.type === 'publish_course'
                  ? 'Tem certeza que deseja publicar este curso? Esta ação tornará o curso visível para inscrições.'
                  : 'Tem certeza que deseja salvar as alterações neste curso?'
          }
          confirmText={
            confirmDialog.type === 'create_course'
              ? 'Criar Curso'
              : confirmDialog.type === 'save_draft'
                ? 'Salvar Rascunho'
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
              confirmSaveDraft()
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
