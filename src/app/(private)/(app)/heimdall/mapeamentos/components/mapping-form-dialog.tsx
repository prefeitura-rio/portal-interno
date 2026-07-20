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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { MappingDetailResponse } from '@/http-heimdall/models'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAllHeimdallActions } from '../../hooks/use-heimdall-actions'
import {
  useCreateMapping,
  useUpdateMapping,
} from '../../hooks/use-heimdall-mappings'

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const

const mappingFormSchema = z.object({
  path_pattern: z
    .string()
    .min(1, 'Padrão de rota é obrigatório')
    .max(255, 'Máximo de 255 caracteres'),
  method: z.enum(HTTP_METHODS, { message: 'Selecione um método HTTP' }),
  action_id: z.string().min(1, 'Selecione uma ação'),
  description: z.string().max(500, 'Máximo de 500 caracteres').optional(),
})

type MappingFormValues = z.infer<typeof mappingFormSchema>

interface MappingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Quando informado, o dialog opera em modo edição. */
  mapping?: MappingDetailResponse | null
}

export function MappingFormDialog({
  open,
  onOpenChange,
  mapping,
}: MappingFormDialogProps) {
  const { data: allActions, isLoading: loadingActions } =
    useAllHeimdallActions(open)
  const createMapping = useCreateMapping()
  const updateMapping = useUpdateMapping()

  const isEditing = !!mapping
  const isPending = createMapping.isPending || updateMapping.isPending

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: {
      path_pattern: '',
      method: 'GET',
      action_id: '',
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      const actionId = mapping
        ? allActions?.find(action => action.name === mapping.action)?.id
        : undefined
      form.reset({
        path_pattern: mapping?.path_pattern ?? '',
        method: (mapping?.method as (typeof HTTP_METHODS)[number]) ?? 'GET',
        action_id: actionId ? String(actionId) : '',
        description: mapping?.description ?? '',
      })
    }
  }, [open, mapping, allActions, form])

  const onSubmit = (values: MappingFormValues) => {
    const body = {
      path_pattern: values.path_pattern,
      method: values.method,
      action_id: Number(values.action_id),
      description: values.description || undefined,
    }

    if (isEditing && mapping) {
      updateMapping.mutate(
        { id: mapping.id, body },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createMapping.mutate(body, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar mapeamento' : 'Novo mapeamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize o mapeamento de endpoint para ação.'
              : 'Mapeie um endpoint (rota + método HTTP) para uma ação de autorização.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="path_pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Padrão de rota</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: /api/v1/users/{user_id}"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Suporta parâmetros de rota com chaves, ex:{' '}
                    {'/api/v1/groups/{group_name}/members'}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método HTTP</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {HTTP_METHODS.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="action_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ação</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingActions}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            loadingActions
                              ? 'Carregando ações...'
                              : 'Selecione a ação'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allActions?.map(action => (
                        <SelectItem key={action.id} value={String(action.id)}>
                          {action.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Finalidade deste mapeamento"
                      rows={2}
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
                {isEditing ? 'Salvar alterações' : 'Criar mapeamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
