import { NextResponse } from 'next/server'
import { customFetchGoRio } from '../../../../../custom-fetch-gorio'

/**
 * GET /api/empregabilidade/modelos-trabalho
 *
 * Fetches all modelos de trabalho (work models: presencial, remoto, híbrido) from backend
 *
 * Used by: useModelosTrabalho hook
 * Orval Client: ❌ NOT Available (endpoint exists but lacks Swagger documentation)
 *
 * WORKAROUND: Uses customFetchGoRio directly instead of generated Orval client
 * TODO: Once backend adds Swagger annotations, replace with Orval client
 *
 * Response Format:
 * {
 *   modelos: Array<{ id: string, descricao: string, created_at: string, updated_at: string }>,
 *   meta: { page: number, page_size: number, total: number },
 *   success: true
 * }
 */

interface ModeloTrabalhoResponse {
  data: Array<{
    id: string
    descricao: string
    created_at: string
    updated_at: string
  }>
  meta: {
    page: number
    page_size: number
    total: number
  }
}

interface CustomFetchResponse<T> {
  status: number
  data: T
  headers: Headers
}

export async function GET() {
  try {
    console.log(
      '[GET /api/empregabilidade/modelos-trabalho] Fetching modelos...'
    )

    // Workaround: Direct call via customFetchGoRio (no Orval client available)
    const response = await customFetchGoRio<
      CustomFetchResponse<ModeloTrabalhoResponse>
    >('/api/v1/empregabilidade/modelos-trabalho?page=1&pageSize=100', {
      method: 'GET',
    })

    console.log('[GET /api/empregabilidade/modelos-trabalho] Response:', {
      status: response.status,
      dataCount: response.data?.data?.length || 0,
    })

    if (response.status === 200) {
      return NextResponse.json({
        modelos: response.data?.data || [],
        meta: response.data?.meta || { page: 1, page_size: 100, total: 0 },
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch modelos de trabalho' },
      { status: response.status }
    )
  } catch (error) {
    console.error('[GET /api/empregabilidade/modelos-trabalho] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
