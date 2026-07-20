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
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCreateRole } from '../../hooks/use-heimdall-roles'

const roleFormSchema = z.object({
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

type RoleFormValues = z.infer<typeof roleFormSchema>

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoleFormDialog({ open, onOpenChange }: RoleFormDialogProps) {
  const createRole = useCreateRole()

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (!open) form.reset()
  }, [open, form])

  const onSubmit = (values: RoleFormValues) => {
    createRole.mutate(values, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo papel</DialogTitle>
          <DialogDescription>
            Crie um papel para agrupar permissões (ações) e atribuí-lo a grupos.
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
                    <Input placeholder="ex: go:cursos:editor" {...field} />
                  </FormControl>
                  <FormDescription>
                    Letras minúsculas, números, underscore e dois-pontos.
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
                      placeholder="Finalidade e permissões do papel"
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
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Criar papel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
