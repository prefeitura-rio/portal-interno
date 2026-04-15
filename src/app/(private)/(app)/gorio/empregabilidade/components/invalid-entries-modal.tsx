import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FieldValidationResult } from '@/lib/text-sanitization'

interface InvalidEntriesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  validationResults: FieldValidationResult[]
  onContinue: () => void
  onGoBack: () => void
}

/**
 * Modal that displays all detected invalid entries before form submission
 * Allows users to either go back and fix issues or continue anyway
 */
export function InvalidEntriesModal({
  open,
  onOpenChange,
  validationResults,
  onContinue,
  onGoBack,
}: InvalidEntriesModalProps) {
  const issuesCount = validationResults.filter(r => r.hasIssues).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Caracteres inválidos detectados
          </DialogTitle>
          <DialogDescription className="text-base">
            {issuesCount === 1
              ? 'Foi encontrado 1 campo com possíveis erros de digitação.'
              : `Foram encontrados ${issuesCount} campos com possíveis erros de digitação.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          {validationResults
            .filter(r => r.hasIssues)
            .map(result => (
              <InvalidFieldCard key={result.fieldName} result={result} />
            ))}
        </div>

        <DialogFooter className="flex-row gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={onGoBack}
            className="flex-1 sm:flex-1"
          >
            Voltar para edição
          </Button>
          <Button
            variant="default"
            onClick={onContinue}
            className="flex-1 sm:flex-1"
          >
            Continuar mesmo assim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Card component showing invalid characters for a single field
 */
function InvalidFieldCard({ result }: { result: FieldValidationResult }) {
  // Get unique characters only
  const uniqueChars = Array.from(
    new Set(result.invalidChars.map(ic => ic.char))
  ).join(', ')

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="text-sm text-gray-600 mb-0.5">{result.fieldLabel}</div>
      <div className="text-sm text-gray-600">
        Caracteres especiais:{' '}
        <span className="font-mono text-red-600">{uniqueChars}</span>
      </div>
    </div>
  )
}
