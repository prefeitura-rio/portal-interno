/**
 * Normaliza valores de field_type para garantir compatibilidade com validação Zod.
 *
 * Resolve problema de dados legados com valores inválidos:
 * - "multi select" (com espaço) → "multiselect"
 * - Variações de case → lowercase padrão
 * - Valores desconhecidos → default "text"
 *
 * @see https://github.com/prefeitura-rio/portal-interno/commit/fb5a4c6 - Commit que introduziu inconsistência
 */

/**
 * Tipos válidos de campo customizado.
 * Deve corresponder ao enum em src/types/course.ts CustomFieldType
 */
export type ValidFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'multiselect'

/**
 * Mapa de normalização de field_type.
 * Mapeia valores legados/incorretos para valores válidos.
 */
const FIELD_TYPE_NORMALIZER: Record<string, ValidFieldType> = {
  // Normalizações de espaços/hífens (dados legados)
  'multi select': 'multiselect',
  'Multi Select': 'multiselect',
  'MULTI SELECT': 'multiselect',
  'multi-select': 'multiselect',
  'Multi-Select': 'multiselect',
  'MULTI-SELECT': 'multiselect',
  multi_select: 'multiselect',
  MULTI_SELECT: 'multiselect',

  // Normalizações de case
  TEXT: 'text',
  Text: 'text',
  NUMBER: 'number',
  Number: 'number',
  EMAIL: 'email',
  Email: 'email',
  DATE: 'date',
  Date: 'date',
  SELECT: 'select',
  Select: 'select',
  TEXTAREA: 'textarea',
  TextArea: 'textarea',
  Textarea: 'textarea',
  CHECKBOX: 'checkbox',
  CheckBox: 'checkbox',
  Checkbox: 'checkbox',
  RADIO: 'radio',
  Radio: 'radio',
  MULTISELECT: 'multiselect',
  MultiSelect: 'multiselect',
  Multiselect: 'multiselect',

  // Valores válidos (passthrough - identidade)
  text: 'text',
  number: 'number',
  email: 'email',
  date: 'date',
  select: 'select',
  textarea: 'textarea',
  checkbox: 'checkbox',
  radio: 'radio',
  multiselect: 'multiselect',
}

/**
 * Normaliza um valor de field_type para um valor válido.
 *
 * @param fieldType - Valor bruto de field_type (pode ser inválido)
 * @returns Valor normalizado que passa validação Zod
 *
 * @example
 * normalizeFieldType('multi select') // 'multiselect'
 * normalizeFieldType('NUMBER') // 'number'
 * normalizeFieldType('text') // 'text'
 * normalizeFieldType('invalid') // 'text' (default)
 * normalizeFieldType(undefined) // 'text' (default)
 */
export function normalizeFieldType(
  fieldType: string | undefined | null
): ValidFieldType {
  // Handle undefined/null/empty
  if (!fieldType || typeof fieldType !== 'string' || fieldType.trim() === '') {
    console.warn(
      '[normalizeFieldType] Missing or empty field_type, defaulting to "text"'
    )
    return 'text'
  }

  // Trim whitespace
  const trimmed = fieldType.trim()

  // Check normalizer map
  const normalized = FIELD_TYPE_NORMALIZER[trimmed]

  if (!normalized) {
    console.warn(
      `[normalizeFieldType] Unknown field_type "${trimmed}", defaulting to "text". This may indicate a data quality issue.`
    )
    return 'text'
  }

  // Log normalizations (except identity mappings)
  if (normalized !== trimmed) {
    console.info(
      `[normalizeFieldType] Normalized field_type: "${trimmed}" → "${normalized}"`
    )
  }

  return normalized
}

/**
 * Normaliza array de custom_fields, aplicando normalização em cada field_type.
 *
 * @param customFields - Array de custom fields (pode ser undefined/null)
 * @returns Array normalizado de custom fields
 *
 * @example
 * normalizeCustomFields([
 *   { id: '1', title: 'Test', field_type: 'multi select', required: true }
 * ])
 * // Returns: [{ id: '1', title: 'Test', field_type: 'multiselect', required: true }]
 */
export function normalizeCustomFields(
  customFields: any[] | undefined | null
): any[] {
  if (!customFields || !Array.isArray(customFields)) {
    return []
  }

  return customFields.map((field, index) => {
    if (!field || typeof field !== 'object') {
      console.warn(
        `[normalizeCustomFields] Invalid custom field at index ${index}, skipping normalization`
      )
      return field
    }

    return {
      ...field,
      field_type: normalizeFieldType(field.field_type),
    }
  })
}
