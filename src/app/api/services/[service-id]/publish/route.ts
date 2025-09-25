import { patchApiV1AdminServicesIdPublish } from '@/http-busca-search/admin/admin'
import { convertApiToFrontend } from '@/types/service'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function PATCH(
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

    console.log('📤 Publishing service:', serviceId)

    // Call the external API to publish the service
    const response = await patchApiV1AdminServicesIdPublish(serviceId)

    if (response.status === 200) {
      console.log('Service published successfully:', response.data)

      // Revalidate cache tags for services
      revalidateTag('services')
      revalidateTag(`service-${serviceId}`)

      // Convert API response to frontend format
      const service = convertApiToFrontend(response.data)

      return NextResponse.json({
        service,
        success: true,
        message: 'Service published successfully',
      })
    }

    return NextResponse.json(
      { error: 'Failed to publish service' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error publishing service:', error)
    return NextResponse.json(
      {
        error: 'Failed to publish service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}