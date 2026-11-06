import { Badge } from '@/components/ui/badge'
import {
  getBloqueioEstado,
  getBloqueioTagLabel,
} from '@/lib/criterios-aceitacao'
import { cn } from '@/lib/utils'

interface BloqueioTagProps {
  /** Estado do switch do critério: ligado = bloqueio ativo. */
  ativo: boolean
  className?: string
}

/**
 * Tag "Bloqueio ativo" (verde) / "Bloqueio desligado" (cinza) de um critério
 * de aceitação da vaga. Reaproveitável por qualquer critério (escolaridade,
 * idioma e os futuros PcD, idade e experiência).
 */
export function BloqueioTag({ ativo, className }: BloqueioTagProps) {
  const estado = getBloqueioEstado(ativo)

  return (
    <Badge
      variant="outline"
      data-estado={estado}
      className={cn(
        'font-normal',
        ativo
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/30 dark:text-green-300'
          : 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {getBloqueioTagLabel(ativo)}
    </Badge>
  )
}
