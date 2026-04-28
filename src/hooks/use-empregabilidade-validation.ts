import {
  type FieldValidationResult,
  validateAllTextFields,
} from '@/lib/text-sanitization'
import { useEffect, useMemo, useState } from 'react'

/**
 * Custom hook for validating empregabilidade form fields
 * Provides real-time validation with debouncing to avoid performance issues
 */
export function useEmpregabilidadeValidation(formValues: Record<string, any>) {
  const [validationResults, setValidationResults] = useState<
    FieldValidationResult[]
  >([])

  useEffect(() => {
    // Debounce validation to avoid excessive re-renders during typing
    const timeoutId = setTimeout(() => {
      const results = validateAllTextFields(formValues)
      setValidationResults(results)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [formValues])

  // Memoize computed values
  const hasAnyIssues = useMemo(
    () => validationResults.some(r => r.hasIssues),
    [validationResults]
  )

  // Helper function to get issues for a specific field
  const getFieldIssues = useMemo(
    () => (fieldName: string) => {
      return validationResults.find(r => r.fieldName === fieldName)
    },
    [validationResults]
  )

  return {
    validationResults,
    hasAnyIssues,
    getFieldIssues,
  }
}
