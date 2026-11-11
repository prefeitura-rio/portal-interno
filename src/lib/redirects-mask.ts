const CPF_MASKED = /^\*{3}\.\d{3}\.\d{3}-\*{2}$/
const CPF_KEYS = new Set(['created_by', 'updated_by', 'actor'])

export function maskCpf(value: string | null | undefined): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'
  if (CPF_MASKED.test(trimmed)) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
  }
  return trimmed
}

/**
 * Mascara, recursivamente, os campos `created_by`, `updated_by` e `actor`
 * (CPF do admin) antes de a resposta do BFF chegar ao navegador (LGPD).
 * Idempotente; null/undefined/vazio ficam intactos.
 */
export function maskRedirectsPayload<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map(maskRedirectsPayload) as T
  }
  if (payload !== null && typeof payload === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      out[key] =
        CPF_KEYS.has(key) && typeof value === 'string' && value.trim()
          ? maskCpf(value)
          : maskRedirectsPayload(value)
    }
    return out as T
  }
  return payload
}
