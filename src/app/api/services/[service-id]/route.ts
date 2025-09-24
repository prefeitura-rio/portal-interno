import { getApiV1AdminServices } from '@/http-busca-search/admin/admin'
import { convertApiToFrontend } from '@/types/service'
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

    // Use the search API to find the service by ID using field/value filtering
    const response = await getApiV1AdminServices({
      field: 'id',
      value: serviceId,
      per_page: 1,
    })

    if (response.status === 200) {
      const servicesData = response.data
      const services = servicesData.services || []

      if (services.length === 0) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }

      // Convert the first (and should be only) service from API format to frontend format
      const apiService = services[0]
      const service = convertApiToFrontend(apiService)

      return NextResponse.json({
        service,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch service from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
