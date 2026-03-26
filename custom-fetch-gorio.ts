import { cookies } from 'next/headers'

// NOTE: Supports cases where `content-type` is other than `json`
const getBody = <T>(c: Response | Request): Promise<T> => {
  const contentType = c.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    return c.json()
  }

  if (contentType?.includes('application/pdf')) {
    return c.blob() as Promise<T>
  }

  return c.text() as Promise<T>
}

// NOTE: Update just base url
const getUrl = (contextUrl: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_COURSES_BASE_API_URL

  if (!baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_COURSES_BASE_API_URL environment variable is not set.'
    )
  }

  // Ensure baseUrl ends with '/' and contextUrl doesn't start with '/'
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedContextUrl = contextUrl.startsWith('/')
    ? contextUrl.slice(1)
    : contextUrl

  // Construct the URL using contextUrl as the path relative to baseUrl.
  const requestUrl = new URL(normalizedContextUrl, normalizedBaseUrl)

  return requestUrl.toString()
}

const getHeaders = async (
  headers?: HeadersInit,
  body?: BodyInit
): Promise<HeadersInit> => {
  const cookieStore = await cookies()
  const access_token = cookieStore.get('access_token')?.value

  const headersObj: Record<string, string> = {}

  // Add Authorization header if token exists
  if (access_token) {
    headersObj.Authorization = `Bearer ${access_token}`
  }

  // Check if Content-Type is already set in headers
  const hasContentType =
    headers && typeof headers === 'object' && 'Content-Type' in headers

  // Determine if body is FormData
  const isFormData = body instanceof FormData

  // Only add Content-Type if:
  // 1. Not FormData (FormData requires browser to set Content-Type with boundary)
  // 2. Not already set in headers
  if (!isFormData && !hasContentType) {
    headersObj['Content-Type'] = 'application/json'
  } else if (hasContentType && headers && typeof headers === 'object') {
    // If Content-Type is explicitly set, use it (unless it's empty string which means omit it)
    if (headers instanceof Headers) {
      const contentType = headers.get('Content-Type')
      if (contentType) headersObj['Content-Type'] = contentType
    } else if (Array.isArray(headers)) {
      const contentTypeHeader = headers.find(([key]) => key === 'Content-Type')
      if (contentTypeHeader?.[1]) {
        headersObj['Content-Type'] = contentTypeHeader[1]
      }
    } else {
      const contentType = (headers as Record<string, string>)['Content-Type']
      if (contentType) headersObj['Content-Type'] = contentType
    }
  }

  return headersObj
}

export const customFetchGoRio = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  const requestUrl = getUrl(url)
  const requestHeaders = await getHeaders(
    options.headers,
    options.body ?? undefined
  )

  const requestInit: RequestInit = {
    ...options,
    headers: requestHeaders,
  }

  console.log('🟢 [customFetchGoRio] URL:', requestUrl)
  console.log('🟢 [customFetchGoRio] Method:', requestInit.method)
  console.log('🟢 [customFetchGoRio] Headers:', requestHeaders)

  const response = await fetch(requestUrl, requestInit)

  console.log('🟢 [customFetchGoRio] Response status:', response.status)
  console.log('🟢 [customFetchGoRio] Response ok:', response.ok)
  console.log(
    '🟢 [customFetchGoRio] Response headers:',
    Object.fromEntries(response.headers.entries())
  )

  const data = await getBody<T>(response)

  console.log(
    '🟢 [customFetchGoRio] Response data:',
    typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : data
  )

  return { status: response.status, data, headers: response.headers } as T
}
