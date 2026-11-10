'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ModelsResolveResult } from '@/http-redirecionamentos/models'
import { ExternalLink, Loader2, SearchCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useResolveRedirect } from '../hooks/use-redirects'

interface TestUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TestUrlDialog({ open, onOpenChange }: TestUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ModelsResolveResult | null>(null)
  const resolveRedirect = useResolveRedirect()

  useEffect(() => {
    if (!open) {
      setUrl('')
      setResult(null)
    }
  }, [open])

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setResult(null)
    resolveRedirect.mutate(trimmed, {
      onSuccess: data => {
        setResult(data)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Testar URL</DialogTitle>
          <DialogDescription>
            Informe uma URL completa dos portais legados para simular o
            comportamento da porta pública.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-redirect-url">URL completa</Label>
            <Input
              id="test-redirect-url"
              placeholder="https://www.1746.rio/hc/pt-br/p/ouvidoria"
              className="font-mono"
              value={url}
              onChange={event => setUrl(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!url.trim() || resolveRedirect.isPending}
          >
            {resolveRedirect.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <SearchCheck className="mr-2 h-4 w-4" />
            )}
            Testar URL
          </Button>
        </form>

        {result && (
          <div className="space-y-2 rounded-md border bg-muted/40 p-4">
            {result.outcome === 'rule' && (
              <>
                <p className="text-sm font-medium text-foreground">
                  Regra encontrada: vai para{' '}
                  <a
                    href={result.location ?? result.rule?.destination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono underline"
                  >
                    {result.location ?? result.rule?.destination}
                    <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  com status {result.status ?? result.rule?.status_code ?? 302}
                </p>
                {result.rule && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {result.rule.host}
                    {result.rule.path} (
                    {result.rule.match_type === 'prefix' ? 'Prefixo' : 'Exato'})
                  </p>
                )}
              </>
            )}

            {(result.outcome === 'interstitial' ||
              result.outcome === 'fallback') && (
              <p className="text-sm font-medium text-foreground">
                Sem regra: mostra o aviso de portal desativado e vai para a home
                do pref.rio
              </p>
            )}

            {result.outcome === 'unknown_host' && (
              <p className="text-sm font-medium text-destructive">
                Host desconhecido: a URL informada não pertence aos portais
                legados configurados.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
