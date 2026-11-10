import type { ModelsRedirectRuleEvent } from '@/http-redirecionamentos/models'
import { z } from 'zod'

export const CSV_TEMPLATE_HEADER =
  'host,path,match_type,destination,status_code,enabled,notes'

export const CSV_TEMPLATE_EXAMPLE_ROW =
  'www.1746.rio,/hc/pt-br/p/ouvidoria,exact,https://pref.rio/ouvidoria,302,true,Ouvidoria'

export function generateCsvTemplate(): string {
  return `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE_ROW}\n`
}

export function maskCpf(value: string | null | undefined): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'
  if (/^\*{3}\.\d{3}\.\d{3}-\*{2}$/.test(trimmed)) {
    return trimmed
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
  }
  return trimmed
}

export function isValidPrefRioDestination(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === 'https://pref.rio') return true
  if (!trimmed.startsWith('https://pref.rio/')) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' && parsed.hostname === 'pref.rio'
  } catch {
    return false
  }
}

export const PREFIX_ROOT_ERROR_MESSAGE =
  'Prefixo / pegaria o portal inteiro. Use exato para a home.'

export function createRedirectFormSchema(canonicalHosts?: readonly string[]) {
  return z
    .object({
      host: z
        .string()
        .trim()
        .min(1, 'Host é obrigatório.')
        .refine(
          val =>
            !canonicalHosts ||
            canonicalHosts.length === 0 ||
            canonicalHosts.includes(val),
          {
            message: 'Selecione um host canônico válido.',
          }
        ),
      path: z
        .string()
        .trim()
        .min(1, 'Caminho é obrigatório.')
        .refine(val => val.startsWith('/'), {
          message: 'O caminho deve começar com /.',
        }),
      match_type: z.enum(['exact', 'prefix']),
      destination: z
        .string()
        .trim()
        .min(1, 'Destino é obrigatório.')
        .refine(isValidPrefRioDestination, {
          message:
            'O destino deve começar com https://pref.rio/ ou ser igual a https://pref.rio.',
        }),
      status_code: z.union([z.literal(301), z.literal(302)]),
      enabled: z.boolean(),
      notes: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const normalizedPath = data.path.trim().replace(/\/+$/, '')
      if (data.match_type === 'prefix' && normalizedPath === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['path'],
          message: PREFIX_ROOT_ERROR_MESSAGE,
        })
      }
    })
}

export const redirectFormSchema = createRedirectFormSchema()

export type RedirectFormValues = z.infer<typeof redirectFormSchema>

export const REDIRECT_FORM_FIELDS: readonly (keyof RedirectFormValues)[] = [
  'host',
  'path',
  'match_type',
  'destination',
  'status_code',
  'enabled',
  'notes',
] as const

export function isRedirectFormField(
  field: string | undefined
): field is keyof RedirectFormValues {
  return (
    typeof field === 'string' &&
    (REDIRECT_FORM_FIELDS as readonly string[]).includes(field)
  )
}

const EVENT_ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Edição',
  delete: 'Exclusão',
  import: 'Importação CSV',
  status_change: 'Mudança de status',
}

export function formatEventAction(action: string | undefined): string {
  if (!action) return 'Evento'
  return EVENT_ACTION_LABELS[action] ?? action
}

const FIELD_LABELS: Record<string, string> = {
  host: 'Host',
  path: 'Caminho',
  match_type: 'Tipo',
  destination: 'Destino',
  status_code: 'Status',
  enabled: 'Ativa',
  notes: 'Notas',
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'match_type') {
    return value === 'prefix'
      ? 'Prefixo'
      : value === 'exact'
        ? 'Exato'
        : String(value)
  }
  if (key === 'enabled') {
    return value ? 'Sim' : 'Não'
  }
  if (key === 'status_code') {
    return value === 301
      ? '301 · Permanente'
      : value === 302
        ? '302 · Temporário'
        : String(value)
  }
  return String(value)
}

export function describeEventChanges(event: ModelsRedirectRuleEvent): string[] {
  const before = (event.before ?? {}) as Record<string, unknown>
  const after = (event.after ?? {}) as Record<string, unknown>
  const keys = Object.keys(FIELD_LABELS)

  if (event.action === 'create') {
    return keys
      .filter(key => after[key] !== undefined && after[key] !== '')
      .map(key => `${FIELD_LABELS[key]}: ${formatFieldValue(key, after[key])}`)
  }

  if (event.action === 'delete') {
    return keys
      .filter(key => before[key] !== undefined && before[key] !== '')
      .map(key => `${FIELD_LABELS[key]}: ${formatFieldValue(key, before[key])}`)
  }

  const changes: string[] = []
  for (const key of keys) {
    const prevVal = before[key]
    const nextVal = after[key]
    if (prevVal !== undefined || nextVal !== undefined) {
      if (prevVal !== nextVal) {
        if (prevVal === undefined) {
          changes.push(
            `${FIELD_LABELS[key]}: ${formatFieldValue(key, nextVal)}`
          )
        } else {
          changes.push(
            `${FIELD_LABELS[key]}: ${formatFieldValue(key, prevVal)} → ${formatFieldValue(key, nextVal)}`
          )
        }
      }
    }
  }

  if (changes.length === 0 && Object.keys(after).length > 0) {
    return keys
      .filter(key => after[key] !== undefined && after[key] !== '')
      .map(key => `${FIELD_LABELS[key]}: ${formatFieldValue(key, after[key])}`)
  }

  return changes
}
