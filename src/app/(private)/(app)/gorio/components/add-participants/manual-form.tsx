import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { ManualFormProps } from './types'
import {
  getModalidadeLabel,
  getScheduleOptions,
  hasMultipleSchedules,
} from './utils/schedule-helpers'

// Create base schema
const baseManualSchema = z.object({
  name: z
    .string()
    .min(3, 'Informe um nome válido')
    .max(100, 'Nome muito longo'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos sem pontuação'),
  age: z.coerce.number().min(1, 'Idade inválida').max(150, 'Idade inválida'),
  phone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(11, 'Telefone deve ter 10 ou 11 dígitos'),
  email: z.string().email('E-mail inválido').max(100, 'E-mail muito longo'),
  address: z
    .string()
    .min(3, 'Endereço obrigatório')
    .max(200, 'Endereço muito longo'),
  neighborhood: z
    .string()
    .min(2, 'Bairro obrigatório')
    .max(50, 'Bairro muito longo'),
  schedule_id: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
})

type BaseManualFormData = z.infer<typeof baseManualSchema>

// Type that will be used in the form
type ManualFormData = BaseManualFormData

/**
 * Form for manually adding a single participant
 */
export function ManualForm({
  courseId,
  onBack,
  onFinish,
  courseData,
}: ManualFormProps) {
  // Check if course has multiple schedules
  const requiresScheduleSelection = useMemo(
    () => hasMultipleSchedules(courseData),
    [courseData]
  )

  // Get schedule options for dropdown
  const scheduleOptions = useMemo(
    () => getScheduleOptions(courseData),
    [courseData]
  )

  // Get modalidade label
  const modalidadeLabel = useMemo(
    () => getModalidadeLabel(courseData?.modalidade),
    [courseData?.modalidade]
  )

  // Create dynamic schema based on whether schedule selection is required and custom fields
  const manualSchema = useMemo(() => {
    const extensions: Record<string, z.ZodTypeAny> = {}

    // Add schedule_id validation if required
    if (requiresScheduleSelection) {
      extensions.schedule_id = z
        .string()
        .min(1, 'Você precisa selecionar uma turma.')
    }

    // Add custom fields validation
    if (courseData?.custom_fields && courseData.custom_fields.length > 0) {
      const customFieldsShape: Record<string, z.ZodTypeAny> = {}

      courseData.custom_fields.forEach(field => {
        const fieldId = field.id
        const fieldType = field.field_type || field.type || 'text'

        if (field.required) {
          // Required validation based on field type
          if (fieldType === 'multiselect') {
            customFieldsShape[fieldId] = z
              .array(z.string())
              .min(1, `${field.title || field.name} é obrigatório`)
          } else {
            customFieldsShape[fieldId] = z
              .string()
              .min(1, `${field.title || field.name} é obrigatório`)
          }
        } else {
          // Optional fields
          if (fieldType === 'multiselect') {
            customFieldsShape[fieldId] = z.array(z.string()).optional()
          } else {
            customFieldsShape[fieldId] = z.string().optional()
          }
        }
      })

      extensions.custom_fields = z.object(customFieldsShape)
    }

    return baseManualSchema.extend(extensions)
  }, [requiresScheduleSelection, courseData?.custom_fields])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(manualSchema) as any,
  })

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/enrollments/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Participante adicionado com sucesso!')
        onFinish(true)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao adicionar participante')
      }
    } catch (error) {
      console.error('Erro ao adicionar participante:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao adicionar participante. Tente novamente.'
      )
      onFinish(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Preencha os campos abaixo com as informações do participante.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Modalidade field (read-only) */}
        <div className="flex flex-col gap-1 col-span-2">
          <label
            htmlFor="modalidade"
            className="text-sm font-medium text-foreground/80"
          >
            Modalidade
          </label>
          <Input
            id="modalidade"
            value={modalidadeLabel}
            disabled
            className="bg-muted cursor-not-allowed"
          />
        </div>

        {/* Schedule selection (only if multiple schedules) */}
        {requiresScheduleSelection && (
          <div className="flex flex-col gap-1 col-span-2">
            <label
              htmlFor="schedule_id"
              className="text-sm font-medium text-foreground/80"
            >
              Turma *
            </label>
            <Controller
              name="schedule_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="schedule_id">
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map(option => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.schedule_id && (
              <p className="text-xs text-red-500">
                {errors.schedule_id.message?.toString()}
              </p>
            )}
          </div>
        )}

        {[
          {
            name: 'name',
            label: 'Nome Completo',
            type: 'text',
            placeholder: 'Ex: João da Silva',
            maxLength: 100,
          },
          {
            name: 'cpf',
            label: 'CPF',
            type: 'text',
            placeholder: '1234567891011',
            maxLength: 11,
          },
          {
            name: 'age',
            label: 'Idade',
            type: 'number',
            placeholder: '18',
            max: 150,
          },
          {
            name: 'phone',
            label: 'Telefone',
            type: 'text',
            placeholder: '21999999999',
            maxLength: 11,
          },
          {
            name: 'email',
            label: 'E-mail',
            type: 'email',
            placeholder: 'exemplo@email.com',
            maxLength: 100,
          },
          {
            name: 'address',
            label: 'Endereço',
            type: 'text',
            placeholder: 'Rua, número, complemento',
            maxLength: 200,
          },
          {
            name: 'neighborhood',
            label: 'Bairro',
            type: 'text',
            placeholder: 'Ex: Centro',
            maxLength: 50,
          },
        ].map(field => (
          <div key={field.name} className="flex flex-col gap-1">
            <label
              className="text-sm font-medium text-foreground/80"
              htmlFor={field.name}
            >
              {field.label}
            </label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              max={field.max}
              {...register(field.name as keyof ManualFormData)}
            />
            {errors[field.name as keyof ManualFormData] && (
              <p className="text-xs text-red-500">
                {errors[
                  field.name as keyof ManualFormData
                ]?.message?.toString()}
              </p>
            )}
          </div>
        ))}

        {/* Custom Fields */}
        {courseData?.custom_fields &&
          courseData.custom_fields.length > 0 &&
          courseData.custom_fields.map(customField => {
            const fieldId = customField.id
            const fieldType =
              customField.field_type || customField.type || 'text'
            const fieldTitle =
              customField.title || customField.name || 'Campo personalizado'
            const isRequired = customField.required

            return (
              <div key={fieldId} className="flex flex-col gap-1 col-span-2">
                <label
                  htmlFor={`custom_fields.${fieldId}`}
                  className="text-sm font-medium text-foreground/80"
                >
                  {fieldTitle} {isRequired && '*'}
                </label>

                {/* Text field */}
                {fieldType === 'text' && (
                  <Input
                    id={`custom_fields.${fieldId}`}
                    type="text"
                    {...register(`custom_fields.${fieldId}` as any)}
                  />
                )}

                {/* Textarea field */}
                {fieldType === 'textarea' && (
                  <textarea
                    id={`custom_fields.${fieldId}`}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register(`custom_fields.${fieldId}` as any)}
                  />
                )}

                {/* Select/Radio field */}
                {(fieldType === 'radio' || fieldType === 'select') && (
                  <Controller
                    name={`custom_fields.${fieldId}` as any}
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id={`custom_fields.${fieldId}`}>
                          <SelectValue placeholder="Selecione uma opção" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(customField.options)
                            ? customField.options
                            : []
                          ).map(option => {
                            const optionValue =
                              typeof option === 'string'
                                ? option
                                : option.value || option.id
                            const optionLabel =
                              typeof option === 'string'
                                ? option
                                : option.value || option.id

                            return (
                              <SelectItem key={optionValue} value={optionValue}>
                                {optionLabel}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}

                {/* Multiselect field */}
                {fieldType === 'multiselect' && (
                  <Controller
                    name={`custom_fields.${fieldId}` as any}
                    control={control}
                    defaultValue={[]}
                    render={({ field }) => (
                      <div className="space-y-2 border rounded-md p-3">
                        {(Array.isArray(customField.options)
                          ? customField.options
                          : []
                        ).map(option => {
                          const optionValue =
                            typeof option === 'string'
                              ? option
                              : option.value || option.id
                          const optionLabel =
                            typeof option === 'string'
                              ? option
                              : option.value || option.id

                          const isChecked = Array.isArray(field.value)
                            ? field.value.includes(optionValue)
                            : false

                          return (
                            <div
                              key={optionValue}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                id={`${fieldId}-${optionValue}`}
                                checked={isChecked}
                                onChange={e => {
                                  const currentValue = Array.isArray(
                                    field.value
                                  )
                                    ? field.value
                                    : []
                                  if (e.target.checked) {
                                    field.onChange([
                                      ...currentValue,
                                      optionValue,
                                    ])
                                  } else {
                                    field.onChange(
                                      currentValue.filter(
                                        (v: string) => v !== optionValue
                                      )
                                    )
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <label
                                htmlFor={`${fieldId}-${optionValue}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {optionLabel}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  />
                )}

                {/* Error message */}
                {errors.custom_fields &&
                  (errors.custom_fields as any)?.[fieldId] && (
                    <p className="text-xs text-red-500">
                      {(errors.custom_fields as any)?.[
                        fieldId
                      ]?.message?.toString()}
                    </p>
                  )}
              </div>
            )
          })}
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="ghost"
          type="button"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <Button type="submit" disabled={isSubmitting} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isSubmitting ? 'Adicionando...' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}
