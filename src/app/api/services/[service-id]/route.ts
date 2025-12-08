import {
  deleteApiV1AdminServicesId,
  getApiV1AdminServices,
  putApiV1AdminServicesId,
} from '@/http-busca-search/admin/admin'
import type { ModelsPrefRioServiceRequest } from '@/http-busca-search/models'
import { convertApiToFrontend } from '@/types/service'
import { revalidateTag } from 'next/cache'
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ 'service-id': string }> }
) {
  try {
    const { 'service-id': serviceId } = await params
    const body = await request.json()

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    console.log('🚀 Updating service:', serviceId, 'with data:', body)

    // Validate required fields
    if (!body.nome_servico || !body.resumo || !body.orgao_gestor) {
      return NextResponse.json(
        {
          error: 'Required fields missing: nome_servico, resumo, orgao_gestor',
        },
        { status: 400 }
      )
    }

    const serviceRequest: ModelsPrefRioServiceRequest = body

    // Call the external API to update the service
    const response = await putApiV1AdminServicesId(serviceId, serviceRequest)

    if (response.status === 200) {
      console.log('Service updated successfully:', response.data)

      // Revalidate cache tags for services
      revalidateTag('services')
      revalidateTag(`service-${serviceId}`)

      // Convert API response to frontend format
      const service = convertApiToFrontend(response.data)

      return NextResponse.json({
        service,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      {
        error: 'Failed to update service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    console.log('🗑️ Deleting service:', serviceId)

    // Call the external API to delete the service
    const response = await deleteApiV1AdminServicesId(serviceId)

    if (response.status === 204) {
      console.log('Service deleted successfully')

      // Revalidate cache tags for services
      revalidateTag('services')
      revalidateTag(`service-${serviceId}`)

      return NextResponse.json({
        success: true,
        message: 'Service deleted successfully',
      })
    }

    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
