'use client'

import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MappingResponse } from '@/http-heimdall/models'
import { Loader2, SearchCheck } from 'lucide-react'
import * as React from 'react'
import { useResolveMapping } from '../../hooks/use-heimdall-mappings'
import { METHOD_BADGE_CLASS } from '../../lib/tones'
import { HTTP_METHODS } from './mapping-form-dialog'

interface ResolveMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResolveMappingDialog({
  open,
  onOpenChange,
}: ResolveMappingDialogProps) {
  const [path, setPath] = React.useState('')
  const [method, setMethod] = React.useState('GET')
  const [result, setResult] = React.useState<MappingResponse | null>(null)
  const [resolved, setResolved] = React.useState(false)

  const resolveMapping = useResolveMapping()

  React.useEffect(() => {
    if (!open) {
      setPath('')
      setMethod('GET')
      setResult(null)
      setResolved(false)
    }
  }, [open])

  const handleResolve = (event: React.FormEvent) => {
    event.preventDefault()
    setResolved(false)
    resolveMapping.mutate(
      { path, method },
      {
        onSuccess: data => {
          setResult(data)
          setResolved(true)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Testar resolução de endpoint</DialogTitle>
          <DialogDescription>
            Informe uma rota e um método HTTP para descobrir qual ação seria
            exigida pela autorização.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleResolve} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolve-path">Rota</Label>
            <Input
              id="resolve-path"
              placeholder="ex: /api/v1/users/123"
              className="font-mono"
              value={path}
              onChange={event => setPath(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Método HTTP</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map(httpMethod => (
                  <SelectItem key={httpMethod} value={httpMethod}>
                    {httpMethod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!path.trim() || resolveMapping.isPending}
          >
            {resolveMapping.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <SearchCheck className="mr-2 h-4 w-4" />
            )}
            Resolver
          </Button>
        </form>

        {resolved &&
          (result ? (
            <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-950/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Ação resolvida
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {result.action}
                </Badge>
                <Badge
                  variant={
                    result.method === 'DELETE' ? 'destructive' : 'outline'
                  }
                  className={METHOD_BADGE_CLASS[result.method]}
                >
                  {result.method}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {result.path_pattern}
              </p>
              {result.description && (
                <p className="text-sm text-muted-foreground">
                  {result.description}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-950/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Nenhum mapeamento encontrado para este endpoint.
              </p>
            </div>
          ))}
      </DialogContent>
    </Dialog>
  )
}
