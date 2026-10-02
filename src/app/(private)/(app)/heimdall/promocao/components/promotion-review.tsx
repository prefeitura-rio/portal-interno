'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'
import {
  type PromotionItem,
  parsePromotionItem,
  promotionItemId,
} from '@/lib/heimdall-promotion'
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useHeimdallPromotionApply,
  useHeimdallPromotionPlan,
} from '../../hooks/use-heimdall-promotion'
import { PromotionItemList, PromotionOperationList } from './promotion-items'

function parseItems(values: string[], exclude: Set<string> = new Set()) {
  const items = new Map<string, PromotionItem>()
  for (const value of values) {
    const item = parsePromotionItem(value)
    if (item && !exclude.has(promotionItemId(item))) {
      items.set(promotionItemId(item), item)
    }
  }
  return [...items.values()]
}

export function PromotionReview() {
  const searchParams = useSearchParams()
  const release = searchParams.get('release')
  const required = useMemo(
    () => parseItems(searchParams.getAll('obrigatorio')),
    [searchParams]
  )
  const suggested = useMemo(
    () =>
      parseItems(
        searchParams.getAll('sugerido'),
        new Set(required.map(promotionItemId))
      ),
    [searchParams, required]
  )
  const allIds = useMemo(
    () => [...required, ...suggested].map(promotionItemId),
    [required, suggested]
  )

  const [unchecked, setUnchecked] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const selectedIds = allIds.filter(id => !unchecked.has(id))

  // Status de todos os itens do link, e o plano só dos selecionados (o que
  // de fato será aplicado). Com tudo marcado, as duas consultas são a mesma.
  const statusQuery = useHeimdallPromotionPlan(allIds, release)
  const selectionQuery = useHeimdallPromotionPlan(selectedIds, release)
  const applyMutation = useHeimdallPromotionApply()

  const { user } = useHeimdallUserContext()
  const isSuperadmin = user?.roles?.includes('superadmin') ?? false

  if (allIds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Este link não tem itens. Abra a página pelo link gerado no pipeline de
        deploy do release.
      </div>
    )
  }

  const statuses = new Map(
    statusQuery.data?.plan.items.map(item => [
      promotionItemId(item),
      item.status,
    ])
  )
  const pendingRequired = required.filter(
    item => statuses.get(promotionItemId(item)) === 'missing'
  )
  const preview = selectionQuery.data
  const plan = preview?.plan
  const operations = selectedIds.length > 0 ? (plan?.operations ?? []) : []
  const isLoading = statusQuery.isLoading || selectionQuery.isFetching
  const canApply =
    isSuperadmin &&
    !!plan &&
    selectedIds.length > 0 &&
    operations.length > 0 &&
    plan.errors.length === 0 &&
    !isLoading &&
    !applyMutation.isPending

  function toggle(id: string, checked: boolean) {
    setUnchecked(current => {
      const next = new Set(current)
      if (checked) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleApply() {
    if (!plan) return
    try {
      const result = await applyMutation.mutateAsync({
        items: selectedIds,
        release,
        planHash: plan.plan_hash,
      })
      toast.success(
        `Aplicado em produção (audit #${result.audit_id}). O deploy do release segue na próxima verificação.`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao aplicar a promoção'
      )
    }
  }

  const loadError = statusQuery.error ?? selectionQuery.error

  return (
    <div className="space-y-6">
      <div className="space-y-1 rounded-lg border p-4 text-sm">
        <p>
          Release: <strong>{release ?? 'não informado'}</strong>
        </p>
        {preview ? (
          <>
            <p className="text-xs text-muted-foreground">
              Origem (staging): <code>{preview.sourceBaseUrl}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Destino: <code>{preview.targetBaseUrl}</code>
            </p>
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Nada é removido e membros de grupo não são alterados. Um grupo novo
          chega vazio: adicione os membros depois, na tela do grupo.
        </p>
      </div>

      {loadError ? (
        <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/30 dark:bg-red-950/20">
          <XCircle className="h-4 w-4 shrink-0 text-red-600" />
          <p>{loadError.message}</p>
        </div>
      ) : null}

      {statusQuery.data && pendingRequired.length === 0 ? (
        <div className="flex gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900/30 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <p>
            Produção já tem tudo o que o release exige. O deploy segue sozinho
            na próxima verificação do pipeline.
          </p>
        </div>
      ) : null}

      <PromotionItemList
        title="Obrigatórios para o deploy"
        description="Sem eles o pipeline de deploy em produção fica bloqueado."
        items={required}
        required
        isChecked={id => !unchecked.has(id)}
        statusOf={id => statuses.get(id)}
        onToggle={toggle}
      />
      <PromotionItemList
        title="Sugeridos"
        description="Não bloqueiam o deploy: papéis que ainda não existem em produção e os grupos que os têm em staging."
        items={suggested}
        required={false}
        isChecked={id => !unchecked.has(id)}
        statusOf={id => statuses.get(id)}
        onToggle={toggle}
      />

      {plan && plan.warnings.length > 0 ? (
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <ul className="list-disc space-y-1 pl-4">
            {plan.warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan && plan.errors.length > 0 ? (
        <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/30 dark:bg-red-950/20">
          <XCircle className="h-4 w-4 shrink-0 text-red-600" />
          <ul className="list-disc space-y-1 pl-4">
            {plan.errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          O que será feito em produção ({operations.length})
        </h2>
        {isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculando a prévia…
          </p>
        ) : operations.length > 0 ? (
          <PromotionOperationList operations={operations} />
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nada a aplicar para os itens selecionados.
          </p>
        )}
      </section>

      <div className="flex flex-col items-end gap-2">
        {isSuperadmin ? null : (
          <p className="text-xs text-muted-foreground">
            Somente superadmin do Heimdall de produção pode aprovar.
          </p>
        )}
        <Button onClick={() => setConfirmOpen(true)} disabled={!canApply}>
          {applyMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Aplicando…
            </>
          ) : (
            `Aprovar e aplicar em produção (${operations.length})`
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Aplicar ${operations.length} alterações em produção?`}
        description={`Exatamente como na prévia acima, para o release ${release ?? 'não informado'}. Nada será removido e membros de grupo não serão alterados. A aplicação fica registrada no audit log do Heimdall em seu nome.`}
        confirmText="Aprovar e aplicar"
        onConfirm={handleApply}
      >
        {plan && plan.warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-sm text-amber-700 dark:text-amber-400">
            {plan.warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
