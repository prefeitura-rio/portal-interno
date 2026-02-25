'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { cleanCPF, formatCPF, validateCPF } from '@/lib/cpf-validator'
import { zodResolver } from '@hookform/resolvers/zod'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { InformacaoComplementar } from './informacoes-complementares-creator'

interface NewCandidateFormProps {
  vagaId: string
  informacoesComplementares: InformacaoComplementar[]
  onSuccess: () => void
  onCancel: () => void
  /** Chamado quando há erro de validação ou da API (para o dialog resetar o loading) */
  onError?: () => void
}

export interface NewCandidateFormRef {
  submit: () => void
}

// Create dynamic Zod schema based on complementary fields and validation rules
function createFormSchema(informacoesComplementares: InformacaoComplementar[]) {
  // Base schema with CPF, nome and email
  const baseSchema = {
    cpf: z
      .string()
      .min(1, 'CPF é obrigatório')
      .refine(validateCPF, 'CPF inválido. Verifique os dígitos.'),
    nome: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
  }

  const dynamicSchema: Record<string, z.ZodTypeAny> = {}

  informacoesComplementares.forEach(info => {
    const fieldKey = `resposta_${info.id}`

    switch (info.field_type) {
      case 'number': {
        const numSchema = (info.required
          ? z.string().min(1, 'Campo obrigatório')
          : z.string().optional().or(z.literal(''))
        ).refine(
          v => {
            if (v === undefined || v === '') return true
            const n = Number.parseFloat(String(v))
            if (Number.isNaN(n)) return false
            if (info.valor_min != null && n < info.valor_min) return false
            if (info.valor_max != null && n > info.valor_max) return false
            return true
          },
          v => {
            if (v === undefined || v === '') return { message: '' }
            const n = Number.parseFloat(String(v))
            if (Number.isNaN(n)) return { message: 'Informe um número válido' }
            if (info.valor_min != null && n < info.valor_min)
              return { message: `Valor mínimo: ${info.valor_min}` }
            if (info.valor_max != null && n > info.valor_max)
              return { message: `Valor máximo: ${info.valor_max}` }
            return { message: '' }
          }
        )
        dynamicSchema[fieldKey] = numSchema
        break
      }
      case 'select': {
        const optionValues = (info.options ?? []).map(o => o.value)
        const selectSchema =
          optionValues.length > 0
            ? (info.required
                ? z.string().min(1, 'Selecione uma opção')
                : z.string().optional()
              ).refine(
                v => !v || optionValues.includes(v),
                'Selecione uma opção válida'
              )
            : info.required
              ? z.string().min(1, 'Selecione uma opção')
              : z.string().optional()
        dynamicSchema[fieldKey] = selectSchema
        break
      }
      case 'multiselect': {
        let multiSchema: z.ZodTypeAny = z.string()
        if (info.required) {
          multiSchema = multiSchema.refine(
            (v: string) => typeof v === 'string' && v.trim().length > 0,
            'Selecione ao menos uma opção'
          )
        } else {
          multiSchema = multiSchema.optional()
        }
        dynamicSchema[fieldKey] = multiSchema
        break
      }
      default: {
        if (info.required) {
          dynamicSchema[fieldKey] = z.string().min(1, 'Campo obrigatório')
        } else {
          dynamicSchema[fieldKey] = z.string().optional()
        }
        break
      }
    }
  })

  return z.object({ ...baseSchema, ...dynamicSchema })
}

type FormData = z.infer<ReturnType<typeof createFormSchema>>

export const NewCandidateForm = forwardRef<
  NewCandidateFormRef,
  NewCandidateFormProps
>(({ vagaId, informacoesComplementares, onSuccess, onCancel, onError }, ref) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create schema with dynamic fields
  const formSchema = createFormSchema(informacoesComplementares)

  // Initialize form with default values
  const defaultValues: Record<string, string> = {
    cpf: '',
    nome: '',
    email: '',
  }

  // Add default values for dynamic fields
  informacoesComplementares.forEach(info => {
    defaultValues[`resposta_${info.id}`] = ''
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues,
  })

  // Expose submit method via ref for parent control (onError = falha de validação)
  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit(handleSubmit, onError)(),
  }), [form.handleSubmit, onError])

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      // Map form data to API format
      const respostasInfoComplementares = informacoesComplementares.map(
        info => ({
          id_info: info.id,
          resposta: data[`resposta_${info.id}` as keyof FormData] || '',
        })
      )

      // Filter out empty optional responses
      const respostasFiltradas = respostasInfoComplementares.filter(
        resposta => {
          const info = informacoesComplementares.find(
            i => i.id === resposta.id_info
          )
          return info?.required || resposta.resposta.trim() !== ''
        }
      )

      console.log('Submitting candidatura:', {
        cpf: cleanCPF(data.cpf),
        nome: data.nome,
        email: data.email || undefined,
        id_vaga: vagaId,
        respostas_info_complementares: respostasFiltradas,
      })

      // Call API to create candidatura
      const response = await fetch('/api/empregabilidade/candidaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: cleanCPF(data.cpf),
          nome: data.nome,
          email: data.email || undefined,
          id_vaga: vagaId,
          respostas_info_complementares: respostasFiltradas,
        }),
      })

      if (!response.ok) {
        const error = await response.json()

        // Handle specific error cases with user-friendly messages
        if (response.status === 409) {
          toast.error('CPF já inscrito', {
            description: 'Este candidato já está inscrito nesta vaga.',
          })
        } else if (response.status === 400) {
          toast.error('Dados inválidos', {
            description:
              error.error || 'Verifique os campos e tente novamente.',
          })
        } else if (response.status === 404) {
          toast.error('Vaga não encontrada', {
            description: 'Esta vaga não foi encontrada no sistema.',
          })
        } else {
          toast.error('Erro ao criar candidatura', {
            description: error.error || 'Tente novamente em alguns instantes.',
          })
        }

        setIsSubmitting(false)
        return
      }

      const result = await response.json()
      console.log('Candidatura created successfully:', result)

      // Show success message
      toast.success('Candidato inscrito com sucesso!', {
        description: 'O candidato foi adicionado à vaga.',
      })

      // Reset form
      form.reset()

      // Call success callback
      console.log('Calling onSuccess to refetch candidates...')
      onSuccess()
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Erro de conexão', {
        description: 'Verifique sua conexão e tente novamente.',
      })
      setIsSubmitting(false)
      onError?.()
    }
  }

  const MULTISELECT_SEPARATOR = '\u200B' // Unicode character to avoid collision with option text

  // Render field based on tipo_campo
  const renderFieldByType = (
    info: InformacaoComplementar,
    field: any
  ): React.ReactNode => {
    const tipo = info.field_type?.toLowerCase() || 'text'
    const placeholder = info.title
      ? `Digite ${info.title.toLowerCase()}`
      : 'Digite aqui'
    const opcoes = info.options ?? []

    switch (tipo) {
      case 'text':
        return (
          <Input {...field} disabled={isSubmitting} placeholder={placeholder} />
        )

      case 'textarea':
        return (
          <Textarea
            {...field}
            disabled={isSubmitting}
            placeholder={placeholder}
            className="min-h-24"
          />
        )

      case 'number':
        return (
          <Input
            {...field}
            type="number"
            min={info.valor_min}
            max={info.valor_max}
            disabled={isSubmitting}
            placeholder={placeholder}
          />
        )

      case 'select': {
        return (
          <div className="rounded-md bg-muted/50 p-3">
            <RadioGroup
              value={field.value ?? ''}
              onValueChange={field.onChange}
              disabled={isSubmitting}
              className="flex flex-col gap-2"
            >
              {opcoes.map(option => (
                <div
                  key={option.id}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`${info.id}-${option.id}`}
                  />
                  <Label
                    htmlFor={`${info.id}-${option.id}`}
                    className="font-normal cursor-pointer"
                  >
                    {option.value}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )
      }

      case 'multiselect': {
        const selectedSet = new Set(
          (field.value ?? '')
            .split(MULTISELECT_SEPARATOR)
            .map((s: string) => s.trim())
            .filter(Boolean)
        )
        const handleToggle = (optionValue: string, checked: boolean) => {
          const next = new Set(selectedSet)
          if (checked) next.add(optionValue)
          else next.delete(optionValue)
          field.onChange(Array.from(next).join(MULTISELECT_SEPARATOR))
        }
        return (
          <div
            className="rounded-md bg-muted/50 p-3 flex flex-col gap-2"
            role="group"
          >
            {opcoes.map(option => (
              <div
                key={option.id}
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`${info.id}-${option.id}`}
                  checked={selectedSet.has(option.value)}
                  onCheckedChange={checked =>
                    handleToggle(option.value, checked === true)
                  }
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor={`${info.id}-${option.id}`}
                  className="font-normal cursor-pointer"
                >
                  {option.value}
                </Label>
              </div>
            ))}
          </div>
        )
      }

      default:
        return (
          <Input {...field} disabled={isSubmitting} placeholder={placeholder} />
        )
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4">
        {/* CPF Field */}
        <FormField
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="000.000.000-00"
                  onChange={e => {
                    const formatted = formatCPF(e.target.value)
                    field.onChange(formatted)
                  }}
                  maxLength={14}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nome Field */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Nome do candidato"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="email@exemplo.com"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic Complementary Fields */}
        {informacoesComplementares.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">
              Informações complementares
            </h4>
            <div className="space-y-4">
              {informacoesComplementares.map(info => (
                <FormField
                  key={info.id}
                  control={form.control}
                  name={`resposta_${info.id}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {info.title || 'Campo adicional'} {info.required && '*'}
                      </FormLabel>
                      <FormControl>
                        {renderFieldByType(info, field)}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </form>
    </Form>
  )
})

NewCandidateForm.displayName = 'NewCandidateForm'
