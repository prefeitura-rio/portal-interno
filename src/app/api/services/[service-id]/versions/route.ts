import {
  getApiV1AdminServicesIdVersions,
} from '@/http-busca-search/versions/versions'
import type { GetApiV1AdminServicesIdVersionsParams } from '@/http-busca-search/models/getApiV1AdminServicesIdVersionsParams'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ 'service-id': string }> }
) {
  try {
    const { 'service-id': serviceId } = await params

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const perPage = searchParams.get('per_page')

    // Build params object for the API
    const apiParams: GetApiV1AdminServicesIdVersionsParams = {}

    if (page) {
      apiParams.page = Number.parseInt(page, 10)
    }

    if (perPage) {
      apiParams.per_page = Number.parseInt(perPage, 10)
    }

    console.log('🚀 Fetching service versions:', serviceId, 'with params:', apiParams)

    // Call the external API
    const response = await getApiV1AdminServicesIdVersions(serviceId, apiParams)

    if (response.status === 200) {
      console.log('✅ Service versions fetched successfully')

      return NextResponse.json({
        data: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch service versions from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching service versions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch service versions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


