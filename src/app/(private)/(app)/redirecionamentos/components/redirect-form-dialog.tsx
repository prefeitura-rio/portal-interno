'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import type { ModelsRedirectRule } from '@/http-redirecionamentos/models'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RedirectApiError } from '../hooks/redirects-api'
import { useCreateRedirect, useUpdateRedirect } from '../hooks/use-redirects'
import {
  type RedirectFormValues,
  createRedirectFormSchema,
  isRedirectFormField,
} from '../lib/redirects-utils'
import { RedirectFormFields } from './redirect-form-fields'

interface RedirectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: ModelsRedirectRule | null
  canonicalHosts: readonly string[]
}

export function RedirectFormDialog({
  open,
  onOpenChange,
  rule,
  canonicalHosts,
}: RedirectFormDialogProps) {
  const createRedirect = useCreateRedirect()
  const updateRedirect = useUpdateRedirect()
  const [pendingPermanentValues, setPendingPermanentValues] =
    useState<RedirectFormValues | null>(null)

  const isEditing = !!rule?.id
  const isPending = createRedirect.isPending || updateRedirect.isPending

  const schema = useMemo(
    () => createRedirectFormSchema(canonicalHosts),
    [canonicalHosts]
  )

  const form = useForm<RedirectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      host: canonicalHosts[0] ?? '',
      path: '',
      match_type: 'exact',
      destination: '',
      status_code: 302,
      enabled: true,
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        host: rule?.host ?? canonicalHosts[0] ?? '',
        path: rule?.path ?? '',
        match_type: rule?.match_type ?? 'exact',
        destination: rule?.destination ?? '',
        status_code: rule?.status_code === 301 ? 301 : 302,
        enabled: rule?.enabled ?? true,
        notes: rule?.notes ?? '',
      })
      setPendingPermanentValues(null)
    }
  }, [open, rule, canonicalHosts, form])

  const handleApiError = (error: Error) => {
    if (error instanceof RedirectApiError && isRedirectFormField(error.field)) {
      form.setError(error.field, {
        type: 'server',
        message: error.message,
      })
    }
  }

  const executeSubmit = (values: RedirectFormValues) => {
    const payload = {
      host: values.host.trim(),
      path: values.path.trim(),
      match_type: values.match_type,
      destination: values.destination.trim(),
      status_code: values.status_code,
      enabled: values.enabled,
      notes: values.notes?.trim() || undefined,
    }

    if (isEditing && rule?.id) {
      updateRedirect.mutate(
        { id: rule.id, body: payload },
        {
          onSuccess: () => onOpenChange(false),
          onError: handleApiError,
        }
      )
    } else {
      createRedirect.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: handleApiError,
      })
    }
  }

  const onSubmit = (values: RedirectFormValues) => {
    if (values.status_code === 301) {
      setPendingPermanentValues(values)
      return
    }
    executeSubmit(values)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar regra' : 'Nova regra'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Atualize os dados da regra de redirecionamento.'
                : 'Cadastre uma nova regra de redirecionamento para o pref.rio.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <RedirectFormFields form={form} canonicalHosts={canonicalHosts} />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'Salvar alterações' : 'Criar regra'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingPermanentValues !== null}
        onOpenChange={nextOpen => {
          if (!nextOpen) setPendingPermanentValues(null)
        }}
        title="Tornar permanente (301)?"
        description="O navegador de quem acessar guarda este redirecionamento. Se o destino estiver errado, não há como corrigir para essas pessoas. Confirme que o destino foi testado."
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (pendingPermanentValues) {
            executeSubmit(pendingPermanentValues)
            setPendingPermanentValues(null)
          }
        }}
      />
    </>
  )
}
