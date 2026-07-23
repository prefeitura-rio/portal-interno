'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import type { HeimdallCompareConfig } from '../../hooks/use-heimdall-compare'

interface CompareFormProps {
  config?: HeimdallCompareConfig
  compareBaseUrl: string
  compareJwt: string
  isLoading: boolean
  onCompareBaseUrlChange: (value: string) => void
  onCompareJwtChange: (value: string) => void
  onSubmit: () => void
}

export function CompareForm({
  config,
  compareBaseUrl,
  compareJwt,
  isLoading,
  onCompareBaseUrlChange,
  onCompareJwtChange,
  onSubmit,
}: CompareFormProps) {
  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      onSubmit={event => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Ambiente atual (sessão)</Label>
          <Input
            value={
              config
                ? `${config.currentLabel} — ${config.currentBaseUrl}`
                : 'Carregando…'
            }
            disabled
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            Usa o cookie JWT desta sessão via HEIMDALL_BASE_API_URL.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="compare-base-url">URL do outro ambiente</Label>
          <Input
            id="compare-base-url"
            value={compareBaseUrl}
            onChange={e => onCompareBaseUrlChange(e.target.value)}
            placeholder="https://services.pref.rio/heimdall-admin"
            autoComplete="off"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Permitido: services.pref.rio ou services.staging.app.dados.rio
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="compare-jwt">JWT do outro ambiente</Label>
        <Input
          id="compare-jwt"
          type="password"
          value={compareJwt}
          onChange={e => onCompareJwtChange(e.target.value)}
          placeholder="Cole o access_token do outro ambiente"
          autoComplete="off"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !compareJwt.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Comparando…
            </>
          ) : (
            'Comparar'
          )}
        </Button>
      </div>
    </form>
  )
}
