import type { GetApiV1AdminServicesIdVersionsCompareParams } from '@/http-busca-search/models/getApiV1AdminServicesIdVersionsCompareParams'
import { getApiV1AdminServicesIdVersionsCompare } from '@/http-busca-search/versions/versions'
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
    const fromVersion = searchParams.get('from_version')
    const toVersion = searchParams.get('to_version')

    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: 'from_version and to_version are required' },
        { status: 400 }
      )
    }

    // Build params object for the API
    const apiParams: GetApiV1AdminServicesIdVersionsCompareParams = {
      from_version: Number.parseInt(fromVersion, 10),
      to_version: Number.parseInt(toVersion, 10),
    }

    console.log(
      '🚀 Comparing service versions:',
      serviceId,
      'with params:',
      apiParams
    )

    // Call the external API
    const response = await getApiV1AdminServicesIdVersionsCompare(
      serviceId,
      apiParams
    )

    if (response.status === 200) {
      console.log('✅ Service versions compared successfully')

      return NextResponse.json({
        data: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to compare service versions from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error comparing service versions:', error)
    return NextResponse.json(
      {
        error: 'Failed to compare service versions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
