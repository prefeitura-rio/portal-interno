'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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

import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Plus, Trash2 } from 'lucide-react'

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
  classStartDate: z
    .date({
      required_error: 'Data de início das aulas é obrigatória.',
    })
    .optional(),
  classEndDate: z
    .date({
      required_error: 'Data de fim das aulas é obrigatória.',
    })
    .optional(),
  classTime: z
    .string()
    .min(1, { message: 'Horário das aulas é obrigatório.' })
    .refine(
      value => {
        if (!value || value.trim() === '') return true
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
        if (!value || value.trim() === '') return true
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
  classStartDate: z
    .date({
      required_error: 'Data de início das aulas é obrigatória.',
    })
    .optional(),
  classEndDate: z
    .date({
      required_error: 'Data de fim das aulas é obrigatória.',
    })
    .optional(),
  classTime: z
    .string()
    .min(1, { message: 'Horário das aulas é obrigatório.' })
    .refine(
      value => {
        if (!value || value.trim() === '') return true
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
        if (!value || value.trim() === '') return true
        return /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo)(\s*,\s*(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo))*$/.test(
          value
        )
      },
      {
        message: 'Formato inválido. Use: Segunda, Quarta, Sexta',
      }
    ),
})

// Update the formSchema to include modalidade and conditional fields
const formSchema = z
  .object({
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
    modalidade: z.enum(['Presencial', 'Semipresencial', 'Remoto'], {
      required_error: 'Modalidade é obrigatória.',
    }),
    locations: z.array(locationClassSchema).optional(),
    remoteClass: remoteClassSchema.optional(),
  })
  .refine(data => data.enrollmentEndDate >= data.enrollmentStartDate, {
    message: 'A data final deve ser igual ou posterior à data inicial.',
    path: ['enrollmentEndDate'],
  })
  .refine(
    data => {
      if (data.modalidade === 'Remoto') {
        return (
          data.remoteClass !== undefined &&
          data.remoteClass.vacancies > 0 &&
          data.remoteClass.classTime.trim() !== '' &&
          data.remoteClass.classDays.trim() !== '' &&
          data.remoteClass.classStartDate !== undefined &&
          data.remoteClass.classEndDate !== undefined
        )
      }
      if (
        data.modalidade === 'Presencial' ||
        data.modalidade === 'Semipresencial'
      ) {
        return (
          data.locations &&
          data.locations.length > 0 &&
          data.locations.every(
            location =>
              location.address.trim() !== '' &&
              location.neighborhood.trim() !== '' &&
              location.vacancies > 0 &&
              location.classTime.trim() !== '' &&
              location.classDays.trim() !== '' &&
              location.classStartDate !== undefined &&
              location.classEndDate !== undefined
          )
        )
      }
      return true
    },
    {
      message: 'Informações de localização/aulas são obrigatórias.',
      path: ['modalidade'],
    }
  )
  .refine(
    data => {
      if (data.locations) {
        return data.locations.every(location => {
          if (!location.classStartDate || !location.classEndDate) return true
          return location.classEndDate >= location.classStartDate
        })
      }
      return true
    },
    {
      message:
        'A data final das aulas deve ser igual ou posterior à data inicial.',
      path: ['locations'],
    }
  )
  .refine(
    data => {
      if (data.remoteClass) {
        if (!data.remoteClass.classStartDate || !data.remoteClass.classEndDate)
          return true
        return data.remoteClass.classEndDate >= data.remoteClass.classStartDate
      }
      return true
    },
    {
      message:
        'A data final das aulas deve ser igual ou posterior à data inicial.',
      path: ['remoteClass'],
    }
  )

type FormData = z.infer<typeof formSchema>

export function NewCourseForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      enrollmentStartDate: new Date(),
      enrollmentEndDate: new Date(),
      organization: '',
      modalidade: undefined,
      locations: [],
      remoteClass: undefined,
    },
  })

  const modalidade = form.watch('modalidade')
  const locations = form.watch('locations') || []

  // Handle modalidade change to properly initialize fields
  const handleModalidadeChange = (value: string) => {
    if (value === 'Remoto') {
      // Clear locations array and initialize remote class fields
      form.setValue('locations', [])

      const currentRemoteClass = form.getValues('remoteClass')
      if (!currentRemoteClass) {
        form.setValue('remoteClass', {
          vacancies: 1,
          classStartDate: new Date(),
          classEndDate: new Date(),
          classTime: '',
          classDays: '',
        })
      }
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
    const currentLocations = form.getValues('locations') || []
    form.setValue('locations', [
      ...currentLocations,
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

  const removeLocation = (index: number) => {
    const currentLocations = form.getValues('locations') || []
    form.setValue(
      'locations',
      currentLocations.filter((_, i) => i !== index)
    )
  }

  function onSubmit(values: FormData) {
    console.log('Form submitted successfully!')
    console.log('Form values:', values)
    toast('Formulário enviado com sucesso!', {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-neutral-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, errors => {
          console.log('Form validation errors:', errors)
        })}
        className="space-y-6 max-w-2xl"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título*</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Textarea className="min-h-[120px]" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  field.onChange(value)
                  handleModalidadeChange(value)
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
                  <SelectItem value="Semipresencial">Semipresencial</SelectItem>
                  <SelectItem value="Remoto">Remoto</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional rendering based on modalidade */}
        {modalidade === 'Remoto' && (
          <Card>
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

        {(modalidade === 'Presencial' || modalidade === 'Semipresencial') && (
          <div className="space-y-4">
            {locations.map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    {index === 0
                      ? 'Informações da Unidade'
                      : `Unidade ${index + 1}`}
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
                          <Input placeholder="Ex: 19:00 - 22:00" {...field} />
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

        <Button type="submit">Criar Curso</Button>
      </form>
    </Form>
  )
}
