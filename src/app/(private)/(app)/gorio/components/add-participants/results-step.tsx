import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { motion } from 'motion/react'
import type { ResultsStepProps } from './types'

/**
 * Step showing results of the import job
 */
export function ResultsStep({
  result,
  rmiDivergenceCount = 0,
  onClose,
  onViewRmiDivergences,
}: ResultsStepProps) {
  const isEmpty = result.success_count === 0 && result.error_count === 0
  const hasErrors = result.error_count > 0
  const hasSuccess = result.success_count > 0

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className="space-y-6 py-4"
    >
      {/* Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          {isEmpty ? (
            <AlertCircle className="h-12 w-12 text-yellow-600" />
          ) : hasErrors && !hasSuccess ? (
            <XCircle className="h-12 w-12 text-red-600" />
          ) : hasErrors && hasSuccess ? (
            <AlertCircle className="h-12 w-12 text-yellow-600" />
          ) : (
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          )}
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold">
            {isEmpty
              ? 'Nenhum participante foi encontrado no arquivo'
              : hasErrors && !hasSuccess
                ? 'Nenhum participante foi adicionado'
                : hasErrors && hasSuccess
                  ? 'Importação concluída com avisos'
                  : 'Participantes adicionados com sucesso!'}
          </h3>
          {isEmpty && (
            <p className="text-sm text-muted-foreground">
              Verifique se o arquivo contém linhas de dados além do cabeçalho e
              se as colunas obrigatórias (nome_completo, cpf) estão presentes.
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {result.success_count}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              Sucesso{result.success_count !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {result.error_count}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              Erro{result.error_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Error details */}
      {hasErrors && result.errors && result.errors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            Participantes com erro:
          </h4>

          <div className="max-h-[240px] overflow-y-auto space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            {result.errors.map((error, index) => (
              <div
                key={`${error.line}-${index}`}
                className="rounded-md bg-background border border-red-200 dark:border-red-900/50 p-3 space-y-1"
              >
                <p className="text-sm font-medium text-foreground">
                  {error.data}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Linha {error.line}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-red-600 dark:text-red-400">
                    {error.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RMI divergence warning */}
      {rmiDivergenceCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {rmiDivergenceCount === 1
              ? '1 participante possui dados divergentes do Registro Municipal Integrado.'
              : `${rmiDivergenceCount} participantes possuem dados divergentes do Registro Municipal Integrado.`}
          </p>
          {onViewRmiDivergences && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewRmiDivergences}
              className="w-full"
            >
              Ver divergências com o RMI
            </Button>
          )}
        </div>
      )}

      {/* Close button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>
          {rmiDivergenceCount > 0 ? 'Continuar' : 'Fechar'}
        </Button>
      </div>
    </motion.div>
  )
}
