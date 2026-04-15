import type { InvalidChar } from '@/lib/text-sanitization'
import { AlertCircle } from 'lucide-react'

interface FieldWarningIndicatorProps {
  invalidChars: InvalidChar[]
}

/**
 * Visual warning indicator for form fields with invalid characters
 * Shows a subtle orange warning with the detected characters
 */
export function FieldWarningIndicator({
  invalidChars,
}: FieldWarningIndicatorProps) {
  if (invalidChars.length === 0) return null

  // Get unique characters only
  const uniqueChars = Array.from(new Set(invalidChars.map(ic => ic.char))).join(
    ', '
  )

  return (
    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
      <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
      <span>Possível typo: {uniqueChars}</span>
    </div>
  )
}
