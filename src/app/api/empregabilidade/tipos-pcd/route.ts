import { getApiV1EmpregabilidadeTiposPcd } from '@/http-gorio/empregabilidade-tipos-pcd/empregabilidade-tipos-pcd'
import type { EmpregabilidadeTipoPCD } from '@/http-gorio/models'
import { NextResponse } from 'next/server'

/**
 * GET /api/empregabilidade/tipos-pcd
 *
 * Fetches all tipos de PCD from backend for use in vaga forms
 *
 * Used by: useTiposPcd hook
 */

interface TiposPcdBackendResponse {
  data: EmpregabilidadeTipoPCD[]
  meta: {
    page: number
    page_size: number
    total: number
  }
}

export async function GET() {
  try {
    const response = await getApiV1EmpregabilidadeTiposPcd({
      page: 1,
      pageSize: 100,
    })

    if (response.status === 200) {
      const backendData = response.data as unknown as TiposPcdBackendResponse
      return NextResponse.json({
        data: backendData.data || [],
        meta: backendData.meta || { page: 1, page_size: 100, total: 0 },
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch tipos PCD' },
      { status: response.status }
    )
  } catch (error) {
    console.error('[GET /api/empregabilidade/tipos-pcd] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
