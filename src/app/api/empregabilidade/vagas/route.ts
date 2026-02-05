import { getApiV1EmpregabilidadeVagas } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('page_size') || '10'
    const status = searchParams.get('status') || 'publicado_ativo'
    const companyId = searchParams.get('company_id')
    const titulo = searchParams.get('titulo')

    // Build query parameters for the API (matching Orval client interface)
    const apiParams: any = {
      page: Number(page),
      pageSize: Number(pageSize),
      status: status,
    }

    // Add optional filters (using correct param names from Orval)
    if (companyId?.trim()) {
      apiParams.contratante = companyId.trim()
    }

    // Note: titulo filter is not supported by backend yet
    // Backend swagger only has: page, pageSize, status, contratante
    if (titulo?.trim()) {
      // TODO: Backend needs to add titulo filter support
      console.warn('titulo filter is not yet supported by backend')
    }

    // Log parameters being sent to backend API
    console.log('🔵 [API Route] Empregabilidade Vagas - Params:', apiParams)

    const response = await getApiV1EmpregabilidadeVagas(apiParams)

    console.log('🔵 [API Route] Response status:', response.status)
    console.log('🔵 [API Route] Response data:', JSON.stringify(response.data, null, 2))
    console.log('🔵 [API Route] Response headers:', response.headers)

    if (response.status === 200) {
      // Return the data in the expected format for the hook
      const responseData = response.data as any
      console.log('✅ [API Route] Returning 200 with data:', {
        dataLength: responseData?.data?.length || 0,
        total: responseData?.meta?.total || 0,
      })
      return NextResponse.json({
        data: responseData?.data || [],
        meta: {
          total: responseData?.meta?.total || 0,
        },
        success: true,
      })
    }

    console.error('❌ [API Route] Non-200 status, returning error:', {
      status: response.status,
      data: response.data,
    })
    return NextResponse.json(
      {
        error: 'Failed to fetch vagas',
        status: response.status,
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('💥 [API Route] CATCH ERROR:', error)
    console.error('💥 [API Route] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('💥 [API Route] Error message:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
