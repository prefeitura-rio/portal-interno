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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
}

export interface NewCandidateFormRef {
  submit: () => void
}

// Create dynamic Zod schema based on complementary fields
function createFormSchema(informacoesComplementares: InformacaoComplementar[]) {
  // Base schema with CPF
  const baseSchema = {
    cpf: z
      .string()
      .min(1, 'CPF é obrigatório')
      .refine(validateCPF, 'CPF inválido. Verifique os dígitos.'),
  }

  // Add dynamic fields
  const dynamicSchema: Record<string, any> = {}

  informacoesComplementares.forEach(info => {
    const fieldKey = `resposta_${info.id}`

    if (info.required) {
      dynamicSchema[fieldKey] = z.string().min(1, 'Campo obrigatório')
    } else {
      dynamicSchema[fieldKey] = z.string().optional()
    }
  })

  return z.object({ ...baseSchema, ...dynamicSchema })
}

type FormData = z.infer<ReturnType<typeof createFormSchema>>

export const NewCandidateForm = forwardRef<
  NewCandidateFormRef,
  NewCandidateFormProps
>(({ vagaId, informacoesComplementares, onSuccess, onCancel }, ref) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create schema with dynamic fields
  const formSchema = createFormSchema(informacoesComplementares)

  // Initialize form with default values
  const defaultValues: Record<string, string> = {
    cpf: '',
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

  // Expose submit method via ref for parent control
  useImperativeHandle(ref, () => ({
    submit: () => form.handleSubmit(handleSubmit)(),
  }))

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
    }
  }

  // Render field based on tipo_campo
  const renderFieldByType = (
    info: InformacaoComplementar,
    field: any
  ): React.ReactNode => {
    const tipo = info.field_type?.toLowerCase() || 'text'
    const placeholder = info.title
      ? `Digite ${info.title.toLowerCase()}`
      : 'Digite aqui'

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
            disabled={isSubmitting}
            placeholder={placeholder}
          />
        )

      case 'select':
      case 'multiselect': {
        const selectPlaceholder = info.title
          ? `Selecione ${info.title.toLowerCase()}`
          : 'Selecione uma opção'
        return (
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {info.options?.map(option => (
                <SelectItem key={option.id} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      default:
        // Default to text input
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

        {/* Dynamic Complementary Fields */}
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
                <FormControl>{renderFieldByType(info, field)}</FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </form>
    </Form>
  )
})

NewCandidateForm.displayName = 'NewCandidateForm'
