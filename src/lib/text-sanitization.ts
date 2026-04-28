/**
 * Text Sanitization and Validation Utilities
 *
 * Provides functions to detect invalid or suspicious characters in text inputs
 * for the empregabilidade forms.
 */

// Character patterns that are considered suspicious/invalid
// These are unusual characters that typically indicate copy-paste errors or typos
const SUSPICIOUS_PATTERNS = [
  /[~\[\]{}\\]/g, // Bracket-like chars and tilde
  /[`|<>]/g, // Code-like or HTML-like characters
  /[´`^¨]/g, // Standalone accent marks (grave, acute, circumflex, diaeresis)
  /[\/;]/g, // Forward slash and semicolon (unusual in regular text)
  // biome-ignore lint/suspicious/noControlCharactersInRegex: We explicitly want to detect control characters
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, // Control characters (excluding tab, newline, carriage return)
]

export interface InvalidChar {
  char: string
  position: number
  context: string // Surrounding text for context
}

export interface FieldValidationResult {
  fieldName: string
  fieldLabel: string
  invalidChars: InvalidChar[]
  hasIssues: boolean
}

/**
 * Extracts context around a character position
 * Returns up to 20 characters (10 before, 10 after)
 */
function getContext(text: string, position: number): string {
  const contextRadius = 10
  const start = Math.max(0, position - contextRadius)
  const end = Math.min(text.length, position + contextRadius + 1)

  let context = text.slice(start, end)

  // Add ellipsis if truncated
  if (start > 0) context = `...${context}`
  if (end < text.length) context = `${context}...`

  return context
}

/**
 * Detects invalid characters in a text string
 * Returns array of invalid characters with their positions and context
 */
export function detectInvalidCharacters(text: string): InvalidChar[] {
  if (!text || typeof text !== 'string') {
    return []
  }

  const invalidChars: InvalidChar[] = []
  const seen = new Set<string>() // Avoid duplicate chars in result

  // Check each suspicious pattern
  for (const pattern of SUSPICIOUS_PATTERNS) {
    let match: RegExpExecArray | null

    // Reset regex lastIndex
    pattern.lastIndex = 0

    // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
    while ((match = pattern.exec(text)) !== null) {
      const char = match[0]
      const position = match.index

      // Only add if we haven't seen this character yet
      if (!seen.has(char)) {
        seen.add(char)
        invalidChars.push({
          char,
          position,
          context: getContext(text, position),
        })
      }
    }
  }

  return invalidChars
}

/**
 * Checks if text has any invalid characters
 */
export function hasInvalidCharacters(text: string): boolean {
  return detectInvalidCharacters(text).length > 0
}

/**
 * Maps field names to user-friendly labels in Portuguese
 */
export function getFieldLabel(fieldName: string): string {
  const labelMap: Record<string, string> = {
    titulo: 'Título',
    descricao: 'Descrição',
    requisitos: 'Requisitos',
    diferenciais: 'Diferenciais',
    responsabilidades: 'Responsabilidades',
    beneficios: 'Benefícios',
    bairro: 'Bairro',
    // Nested fields
    'etapas.titulo': 'Etapa - Título',
    'etapas.descricao': 'Etapa - Descrição',
    'informacoes_complementares.title': 'Informação Complementar - Título',
    'informacoes_complementares.option': 'Informação Complementar - Opção',
  }

  return labelMap[fieldName] || fieldName
}

/**
 * Validates all text fields in the empregabilidade form
 * Returns validation results for each field with issues
 */
export function validateAllTextFields(
  formValues: Record<string, any>
): FieldValidationResult[] {
  const results: FieldValidationResult[] = []

  // Main text fields to validate
  const textFields = [
    'titulo',
    'descricao',
    'requisitos',
    'diferenciais',
    'responsabilidades',
    'beneficios',
  ]

  for (const fieldName of textFields) {
    const value = formValues[fieldName]

    if (value && typeof value === 'string') {
      const invalidChars = detectInvalidCharacters(value)

      if (invalidChars.length > 0) {
        results.push({
          fieldName,
          fieldLabel: getFieldLabel(fieldName),
          invalidChars,
          hasIssues: true,
        })
      }
    }
  }

  // Validate etapas (nested array)
  if (Array.isArray(formValues.etapas)) {
    formValues.etapas.forEach((etapa: any, index: number) => {
      // Validate etapa titulo
      if (etapa.titulo && typeof etapa.titulo === 'string') {
        const invalidChars = detectInvalidCharacters(etapa.titulo)
        if (invalidChars.length > 0) {
          results.push({
            fieldName: `etapas[${index}].titulo`,
            fieldLabel: `Etapa ${index + 1} - Título`,
            invalidChars,
            hasIssues: true,
          })
        }
      }

      // Validate etapa descricao
      if (etapa.descricao && typeof etapa.descricao === 'string') {
        const invalidChars = detectInvalidCharacters(etapa.descricao)
        if (invalidChars.length > 0) {
          results.push({
            fieldName: `etapas[${index}].descricao`,
            fieldLabel: `Etapa ${index + 1} - Descrição`,
            invalidChars,
            hasIssues: true,
          })
        }
      }
    })
  }

  // Validate informacoes_complementares (nested array)
  if (Array.isArray(formValues.informacoes_complementares)) {
    formValues.informacoes_complementares.forEach(
      (info: any, index: number) => {
        // Validate field title
        if (info.title && typeof info.title === 'string') {
          const invalidChars = detectInvalidCharacters(info.title)
          if (invalidChars.length > 0) {
            results.push({
              fieldName: `informacoes_complementares[${index}].title`,
              fieldLabel: `Campo Personalizado ${index + 1} - Título`,
              invalidChars,
              hasIssues: true,
            })
          }
        }

        // Validate options (for select/radio/multiselect types)
        if (Array.isArray(info.options)) {
          info.options.forEach((option: any, optIndex: number) => {
            if (option.label && typeof option.label === 'string') {
              const invalidChars = detectInvalidCharacters(option.label)
              if (invalidChars.length > 0) {
                results.push({
                  fieldName: `informacoes_complementares[${index}].options[${optIndex}]`,
                  fieldLabel: `Campo Personalizado ${index + 1} - Opção ${optIndex + 1}`,
                  invalidChars,
                  hasIssues: true,
                })
              }
            }
          })
        }
      }
    )
  }

  return results
}
