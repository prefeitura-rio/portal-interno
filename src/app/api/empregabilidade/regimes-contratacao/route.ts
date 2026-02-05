import { getApiV1EmpregabilidadeRegimesContratacao } from '@/http-gorio/empregabilidade-regimes-contratacao/empregabilidade-regimes-contratacao'
import type { EmpregabilidadeRegimeContratacao } from '@/http-gorio/models'
import { NextResponse } from 'next/server'

/**
 * GET /api/empregabilidade/regimes-contratacao
 *
 * Fetches all regimes de contratação (employment types) from backend
 *
 * Used by: useRegimesContratacao hook
 * Orval Client: ✅ Available (Swagger documented)
 *
 * Response Format:
 * {
 *   regimes: Array<{ id: string, descricao: string, created_at: string, updated_at: string }>,
 *   meta: { page: number, page_size: number, total: number },
 *   success: true
 * }
 */

interface RegimesBackendResponse {
  data: EmpregabilidadeRegimeContratacao[]
  meta: {
    page: number
    page_size: number
    total: number
  }
}

export async function GET() {
  try {
    console.log(
      '[GET /api/empregabilidade/regimes-contratacao] Fetching regimes...'
    )

    // Call backend via Orval generated client
    const response = await getApiV1EmpregabilidadeRegimesContratacao({
      page: 1,
      pageSize: 100, // Get all regimes (lookup table is small)
    })

    console.log('[GET /api/empregabilidade/regimes-contratacao] Response:', {
      status: response.status,
    })

    if (response.status === 200) {
      const backendData = response.data as unknown as RegimesBackendResponse

      console.log('[GET /api/empregabilidade/regimes-contratacao] Data:', {
        dataCount: backendData.data?.length || 0,
      })

      return NextResponse.json({
        regimes: backendData.data || [],
        meta: backendData.meta || { page: 1, page_size: 100, total: 0 },
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch regimes de contratacao' },
      { status: response.status }
    )
  } catch (error) {
    console.error(
      '[GET /api/empregabilidade/regimes-contratacao] Error:',
      error
    )
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
