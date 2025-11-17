'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { type TombamentoRequest, useTombamentos } from '@/hooks/use-tombamentos'
import { toast } from 'sonner'

const tombamentoOrigins = ['1746_v2_llm', 'carioca-digital_v2_llm']

const tombamentoSchema = z.object({
  origem: z.string().refine(value => tombamentoOrigins.includes(value), {
    message: 'Origem deve ser uma das opções válidas',
  }),
  id_servico_antigo: z
    .string()
    .min(1, { message: 'ID do serviço antigo é obrigatório' }),
  observacoes: z.string().optional(),
})

type TombamentoFormData = z.infer<typeof tombamentoSchema>

interface TombamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string
  serviceTitle: string
  onSuccess?: () => void
}

export function TombamentoModal({
  open,
  onOpenChange,
  serviceId,
  serviceTitle,
  onSuccess,
}: TombamentoModalProps) {
  const { createTombamento, loading } = useTombamentos()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TombamentoFormData>({
    resolver: zodResolver(tombamentoSchema),
    defaultValues: {
      origem: undefined,
      id_servico_antigo: '',
      observacoes: '',
    },
  })

  const handleSubmit = async (data: TombamentoFormData) => {
    try {
      setIsSubmitting(true)

      const tombamentoData: TombamentoRequest = {
        origem: data.origem,
        id_servico_antigo: data.id_servico_antigo,
        id_servico_novo: serviceId,
        observacoes: data.observacoes,
      }

      const result = await createTombamento(tombamentoData)

      if (result) {
        toast.success('Tombamento criado com sucesso!')
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Erro ao criar tombamento. Tente novamente.')
      }
    } catch (error) {
      console.error('Error creating tombamento:', error)
      toast.error('Erro ao criar tombamento. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tombar Serviço</DialogTitle>
          <DialogDescription>
            Configure o tombamento para o serviço "{serviceTitle}". Isso irá
            mapear o serviço antigo para o novo serviço.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="origem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem do serviço antigo*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={tombamentoOrigins[0]}>1746</SelectItem>
                      <SelectItem value={tombamentoOrigins[1]}>
                        Carioca Digital
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id_servico_antigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do serviço antigo*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: servico-123"
                      {...field}
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o tombamento (opcional)"
                      className="min-h-[80px]"
                      {...field}
                      disabled={loading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading || isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Tombamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
