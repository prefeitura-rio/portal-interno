import { Badge } from '@/components/ui/badge'
import {
  getBloqueioEstado,
  getBloqueioTagLabel,
} from '@/lib/criterios-aceitacao'
import { cn } from '@/lib/utils'

interface BloqueioTagProps {
  /** Estado do switch do critério: ligado = bloqueio ativo. */
  ativo: boolean
  /**
   * DEV-444: ligado na tela mas ainda não gravado na vaga; a tag mostra este
   * texto em âmbar no lugar de "Bloqueio ativo".
   */
  naoGravado?: string
  className?: string
}

/**
 * Tag "Bloqueio ativo" (verde) / "Bloqueio desligado" (cinza) de um critério
 * de aceitação da vaga. Reaproveitável por qualquer critério (escolaridade,
 * idioma e os futuros PcD, idade e experiência).
 */
export function BloqueioTag({
  ativo,
  naoGravado,
  className,
}: BloqueioTagProps) {
  if (ativo && naoGravado) {
    return (
      <Badge
        variant="outline"
        data-estado="nao-gravado"
        className={cn(
          'font-normal border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-300',
          className
        )}
      >
        {naoGravado}
      </Badge>
    )
  }

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
