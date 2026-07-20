'use client'

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AppRoutersActionsActionResponse } from '@/http-heimdall/models'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  useCreateAction,
  useUpdateAction,
} from '../../hooks/use-heimdall-actions'

const actionFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Máximo de 100 caracteres')
    .regex(
      /^[a-z0-9_:]+$/,
      'Use apenas letras minúsculas, números, underscore e dois-pontos'
    ),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Máximo de 500 caracteres'),
})

type ActionFormValues = z.infer<typeof actionFormSchema>

interface ActionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Quando informado, o dialog opera em modo edição. */
  action?: AppRoutersActionsActionResponse | null
}

export function ActionFormDialog({
  open,
  onOpenChange,
  action,
}: ActionFormDialogProps) {
  const createAction = useCreateAction()
  const updateAction = useUpdateAction()

  const isEditing = !!action
  const isPending = createAction.isPending || updateAction.isPending

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: action?.name ?? '',
        description: action?.description ?? '',
      })
    }
  }, [open, action, form])

  const onSubmit = (values: ActionFormValues) => {
    if (isEditing && action) {
      updateAction.mutate(
        { id: action.id, body: values },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createAction.mutate(values, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar ação' : 'Nova ação'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize o nome ou a descrição da ação.'
              : 'Crie uma ação (permissão) que pode ser atribuída a papéis e mapeada a endpoints.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: cursos:criar" {...field} />
                  </FormControl>
                  <FormDescription>
                    Formato recomendado: recurso:operação (ex: cursos:criar).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="O que esta ação permite fazer"
                      rows={3}
                      {...field}
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
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar alterações' : 'Criar ação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
