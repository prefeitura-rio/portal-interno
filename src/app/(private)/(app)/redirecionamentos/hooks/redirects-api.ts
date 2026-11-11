export interface RedirectsListParams {
  page?: number
  pageSize?: number
  host?: string
  q?: string
  enabled?: boolean
  status_code?: number
}

export const redirectsKeys = {
  all: ['redirecionamentos'] as const,
  lists: () => [...redirectsKeys.all, 'list'] as const,
  list: (params: RedirectsListParams) =>
    [...redirectsKeys.lists(), params] as const,
  hosts: () => [...redirectsKeys.all, 'hosts'] as const,
  history: (id: number, page = 1, pageSize = 50) =>
    [...redirectsKeys.all, 'history', id, { page, pageSize }] as const,
}

export class RedirectApiError extends Error {
  readonly status: number
  readonly field?: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    field?: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'RedirectApiError'
    this.status = status
    this.field = field
    this.details = details
  }
}

export async function fetchRedirectsApi<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init)

  if (!response.ok) {
    let message = `Erro ${response.status}`
    let field: string | undefined
    let details: unknown

    try {
      const body = await response.json()
      details = body?.details ?? body
      if (typeof body?.details?.error === 'string') {
        message = body.details.error
      } else if (typeof body?.error === 'string') {
        message = body.error
      }
      if (typeof body?.details?.field === 'string') {
        field = body.details.field
      } else if (typeof body?.field === 'string') {
        field = body.field
      }
    } catch (_err) {
      message = `Erro ${response.status}`
    }

    throw new RedirectApiError(message, response.status, field, details)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
