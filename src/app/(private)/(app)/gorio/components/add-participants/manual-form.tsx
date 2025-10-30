import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { ManualFormProps } from './types'

const manualSchema = z.object({
  name: z.string().min(3, 'Informe um nome válido').max(100, 'Nome muito longo'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos sem pontuação'),
  age: z.coerce.number().min(1, 'Idade inválida').max(150, 'Idade inválida'),
  phone: z.string().min(10, 'Telefone inválido').max(11, 'Telefone deve ter 10 ou 11 dígitos'),
  email: z.string().email('E-mail inválido').max(100, 'E-mail muito longo'),
  address: z.string().min(3, 'Endereço obrigatório').max(200, 'Endereço muito longo'),
  neighborhood: z.string().min(2, 'Bairro obrigatório').max(50, 'Bairro muito longo'),
})

type ManualFormData = z.infer<typeof manualSchema>

/**
 * Form for manually adding a single participant
 */
export function ManualForm({ courseId, onBack, onFinish }: ManualFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ManualFormData>({
    resolver: zodResolver(manualSchema),
  })

  const onSubmit = async (data: ManualFormData) => {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Preencha os campos abaixo com as informações do participante.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'name', label: 'Nome Completo', type: 'text', placeholder: 'Ex: João da Silva', maxLength: 100 },
          { name: 'cpf', label: 'CPF', type: 'text', placeholder: '1234567891011', maxLength: 11 },
          { name: 'age', label: 'Idade', type: 'number', placeholder: '18', max: 150 },
          { name: 'phone', label: 'Telefone', type: 'text', placeholder: '21999999999', maxLength: 11 },
          { name: 'email', label: 'E-mail', type: 'email', placeholder: 'exemplo@email.com', maxLength: 100 },
          { name: 'address', label: 'Endereço', type: 'text', placeholder: 'Rua, número, complemento', maxLength: 200 },
          { name: 'neighborhood', label: 'Bairro', type: 'text', placeholder: 'Ex: Centro', maxLength: 50 },
        ].map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80" htmlFor={field.name}>
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
                {errors[field.name as keyof ManualFormData]?.message?.toString()}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="ghost" type="button" onClick={onBack} className="gap-2">
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
