'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
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
      enrollmentStartDate: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollmentEndDate: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      organization: z.string().min(1, {
        message: 'Órgão é obrigatório.',
      }),
      modalidade: z.literal('Remoto'),
      workload: z
        .string()
        .min(1, { message: 'Carga horária é obrigatória.' })
        .min(3, { message: 'Carga horária deve ter pelo menos 3 caracteres.' })
        .max(50, { message: 'Carga horária não pode exceder 50 caracteres.' }),
      targetAudience: z
        .string()
        .min(1, { message: 'Público-alvo é obrigatório.' })
        .min(10, { message: 'Público-alvo deve ter pelo menos 10 caracteres.' })
        .max(200, { message: 'Público-alvo não pode exceder 200 caracteres.' }),
      // Required image fields
      institutionalLogo: z.instanceof(File, {
        message: 'Logo institucional é obrigatório.',
      }),
      coverImage: z.instanceof(File, {
        message: 'Imagem de capa é obrigatória.',
      }),
      // Optional fields
      prerequisites: z.string().optional(),
      hasCertificate: z.boolean().optional(),
      facilitator: z.string().optional(),
      objectives: z.string().optional(),
      expectedResults: z.string().optional(),
      programContent: z.string().optional(),
      methodology: z.string().optional(),
      resourcesUsed: z.string().optional(),
      materialUsed: z.string().optional(),
      teachingMaterial: z.string().optional(),
      customFields: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            required: z.boolean(),
          })
        )
        .optional(),
      remoteClass: remoteClassSchema,
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
      enrollmentStartDate: z.date({
        required_error: 'Data de início é obrigatória.',
      }),
      enrollmentEndDate: z.date({
        required_error: 'Data de término é obrigatória.',
      }),
      organization: z.string().min(1, {
        message: 'Órgão é obrigatório.',
      }),
      modalidade: z.enum(['Presencial', 'Semipresencial']),
      workload: z
        .string()
        .min(1, { message: 'Carga horária é obrigatória.' })
        .min(3, { message: 'Carga horária deve ter pelo menos 3 caracteres.' })
        .max(50, { message: 'Carga horária não pode exceder 50 caracteres.' }),
      targetAudience: z
        .string()
        .min(1, { message: 'Público-alvo é obrigatório.' })
        .min(10, { message: 'Público-alvo deve ter pelo menos 10 caracteres.' })
        .max(200, { message: 'Público-alvo não pode exceder 200 caracteres.' }),
      // Required image fields
      institutionalLogo: z.instanceof(File, {
        message: 'Logo institucional é obrigatório.',
      }),
      coverImage: z.instanceof(File, {
        message: 'Imagem de capa é obrigatória.',
      }),
      // Optional fields
      prerequisites: z.string().optional(),
      hasCertificate: z.boolean().optional(),
      facilitator: z.string().optional(),
      objectives: z.string().optional(),
      expectedResults: z.string().optional(),
      programContent: z.string().optional(),
      methodology: z.string().optional(),
      resourcesUsed: z.string().optional(),
      materialUsed: z.string().optional(),
      teachingMaterial: z.string().optional(),
      customFields: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            required: z.boolean(),
          })
        )
        .optional(),
      locations: z.array(locationClassSchema).min(1, {
        message: 'Pelo menos uma unidade deve ser informada.',
      }),
    }),
  ])
  .refine(data => data.enrollmentEndDate >= data.enrollmentStartDate, {
    message: 'A data final deve ser igual ou posterior à data inicial.',
    path: ['enrollmentEndDate'],
  })
  .refine(
    data => {
      if (data.modalidade === 'Remoto') {
        return data.remoteClass.classEndDate >= data.remoteClass.classStartDate
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
  'modalidade' | 'locations' | 'remoteClass'
> & {
  modalidade?: 'Presencial' | 'Semipresencial' | 'Remoto'
  locations?: z.infer<typeof locationClassSchema>[]
  remoteClass?: z.infer<typeof remoteClassSchema>
  workload?: string
  targetAudience?: string
  prerequisites?: string
  hasCertificate?: boolean
  facilitator?: string
  objectives?: string
  expectedResults?: string
  programContent?: string
  methodology?: string
  resourcesUsed?: string
  materialUsed?: string
  teachingMaterial?: string
  institutionalLogo?: File | null
  coverImage?: File | null
  customFields?: CustomField[]
}

interface NewCourseFormProps {
  initialData?: PartialFormData
  isReadOnly?: boolean
  onSubmit?: (data: PartialFormData) => void
}

export function NewCourseForm({
  initialData,
  isReadOnly = false,
  onSubmit,
}: NewCourseFormProps) {
  const form = useForm<PartialFormData>({
    resolver: zodResolver(formSchema as any), // Type assertion needed due to discriminated union
    defaultValues: initialData || {
      title: '',
      description: '',
      enrollmentStartDate: new Date(),
      enrollmentEndDate: new Date(),
      organization: '',
      modalidade: undefined,
      locations: [],
      remoteClass: undefined,
      workload: '',
      targetAudience: '',
      prerequisites: '',
      hasCertificate: false,
      facilitator: '',
      objectives: '',
      expectedResults: '',
      programContent: '',
      methodology: '',
      resourcesUsed: '',
      materialUsed: '',
      teachingMaterial: '',
      institutionalLogo: undefined,
      coverImage: undefined,
      customFields: [],
    },
    mode: 'onChange', // Enable real-time validation
  })

  const modalidade = form.watch('modalidade')
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'locations',
  })

  // Handle modalidade change to properly initialize fields
  const handleModalidadeChange = (
    value: 'Presencial' | 'Semipresencial' | 'Remoto'
  ) => {
    if (value === 'Remoto') {
      // Clear locations array and initialize remote class fields
      form.setValue('locations', [])
      form.setValue('remoteClass', {
        vacancies: 1,
        classStartDate: new Date(),
        classEndDate: new Date(),
        classTime: '',
        classDays: '',
      })
    } else if (value === 'Presencial' || value === 'Semipresencial') {
      // Clear remote class and initialize locations if not already set
      form.setValue('remoteClass', undefined)

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

  async function handleSubmit(values: PartialFormData) {
    try {
      // Validate the complete form data
      const validatedData = formSchema.parse(values)

      console.log('Form submitted successfully!')
      console.log('Form values:', validatedData)

      if (onSubmit) {
        onSubmit(validatedData)
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
                name="enrollmentStartDate"
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
                name="enrollmentEndDate"
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
              name="organization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Órgão (Quem oferece o curso)*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isReadOnly}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um órgão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="org1">Organização A</SelectItem>
                      <SelectItem value="org2">Organização B</SelectItem>
                      <SelectItem value="org3">Organização C</SelectItem>
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
                        | 'Presencial'
                        | 'Semipresencial'
                        | 'Remoto'
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
                      <SelectItem value="Presencial">Presencial</SelectItem>
                      <SelectItem value="Semipresencial">
                        Semipresencial
                      </SelectItem>
                      <SelectItem value="Remoto">Remoto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional rendering based on modalidade */}
            {modalidade === 'Remoto' && (
              <Card className="-mt-2">
                <CardHeader>
                  <CardTitle>Informações das Aulas Remotas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="remoteClass.vacancies"
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
                      name="remoteClass.classStartDate"
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
                      name="remoteClass.classEndDate"
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
                    name="remoteClass.classTime"
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
                    name="remoteClass.classDays"
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

            {(modalidade === 'Presencial' ||
              modalidade === 'Semipresencial') && (
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
              name="targetAudience"
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
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="optional-fields">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  Informações Adicionais (Opcionais)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-4">
                    <FormField
                      control={form.control}
                      name="prerequisites"
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
                      name="hasCertificate"
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
                      name="expectedResults"
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
                      name="programContent"
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
                      name="resourcesUsed"
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
                      name="materialUsed"
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
                      name="teachingMaterial"
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
          </div>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="institutionalLogo"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      label="Logo institucional*"
                      maxSize={1000000} // 1MB
                      previewClassName="max-h-[200px] max-w-full rounded-lg object-contain"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      label="Imagem de capa*"
                      maxSize={1000000} // 1MB
                      previewClassName="max-h-[300px] max-w-full rounded-lg object-contain"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customFields"
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

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full lg:mt-10 py-6"
        >
          {form.formState.isSubmitting ? 'Enviando...' : 'Criar Curso'}
        </Button>
      </form>
    </Form>
  )
}
