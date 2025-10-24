import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const manualSchema = z.object({
  nome: z.string().min(3, 'Informe um nome válido'),
  cpf: z.string().min(11, 'CPF inválido').max(14, 'CPF inválido'),
  idade: z.coerce.number().min(1, 'Idade inválida'),
  telefone: z.string().min(8, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  endereco: z.string().min(3, 'Endereço obrigatório'),
  bairro: z.string().min(2, 'Bairro obrigatório'),
})

type ManualFormData = z.infer<typeof manualSchema>

interface ManualFormProps {
  courseId: string
  onBack: () => void
  onFinish: (success: boolean) => void
}

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
          { name: 'nome', label: 'Nome Completo', type: 'text' },
          { name: 'cpf', label: 'CPF', type: 'text' },
          { name: 'idade', label: 'Idade', type: 'number' },
          { name: 'telefone', label: 'Telefone', type: 'text' },
          { name: 'email', label: 'E-mail', type: 'email' },
          { name: 'endereco', label: 'Endereço', type: 'text' },
          { name: 'bairro', label: 'Bairro', type: 'text' },
        ].map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80" htmlFor={field.name}>
              {field.label}
            </label>
            <Input id={field.name} type={field.type} {...register(field.name as keyof ManualFormData)} />
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
