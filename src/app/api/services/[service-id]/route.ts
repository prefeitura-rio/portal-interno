import { mockServices } from '@/lib/mock-services'
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

    // Find the service in mock data
    const service = mockServices.find(s => s.id === serviceId)

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({
      service,
      success: true,
    })
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
