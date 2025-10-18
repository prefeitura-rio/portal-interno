import {
  getApiV1AdminServices,
  getGetApiV1AdminServicesUrl,
  postApiV1AdminServices,
} from '@/http-busca-search/admin/admin'
import type { ModelsPrefRioServiceRequest } from '@/http-busca-search/models'
import type { GetApiV1AdminServicesParams } from '@/http-busca-search/models/getApiV1AdminServicesParams'
import type { ServiceListItem, ServiceStatus } from '@/types/service'
import { convertApiToFrontend } from '@/types/service'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    console.log('🔗 Request URL:', request.url)

    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = searchParams.get('page')
    const perPage = searchParams.get('per_page')
    const search = searchParams.get('search')
    const status = searchParams.get('status') as ServiceStatus | null
    const managingOrgan = searchParams.get('managing_organ')

    console.log('📝 Extracted query parameters:', {
      page,
      perPage,
      search,
      status,
      managingOrgan,
    })

    // Build params object for the API
    const params: GetApiV1AdminServicesParams = {}

    // Set defaults and convert parameters
    params.page = page ? Number.parseInt(page, 10) : 1
    params.per_page = perPage ? Number.parseInt(perPage, 10) : 10

    // Handle status filtering
    if (status) {
      switch (status) {
        case 'published':
          params.status = 1
          params.awaiting_approval = false
          break
        case 'in_edition':
          params.status = 0
          params.awaiting_approval = false
          break
        case 'awaiting_approval':
          params.status = 0
          params.awaiting_approval = true
          break
      }
    }

    // Handle search parameter - we can use field/value for dynamic filtering
    if (search?.trim()) {
      params.field = 'nome_servico'
      params.value = search.trim()
    }

    // Handle managing organ filtering
    if (managingOrgan?.trim()) {
      params.field = 'orgao_gestor'
      params.value = managingOrgan.trim()
    }

    console.log('🚀 Services API call params:', params)

    // Log the URL that will be constructed for the external API
    const externalApiUrl = getGetApiV1AdminServicesUrl(params)
    console.log('🌐 External API URL (relative path):', externalApiUrl)

    // Show what the complete URL will be (baseUrl + path)
    const baseUrl = process.env.NEXT_PUBLIC_BUSCA_SEARCH_API_URL
    console.log('🔗 Base URL from env:', baseUrl)

    if (baseUrl) {
      const completeUrl = new URL(
        externalApiUrl.startsWith('/')
          ? externalApiUrl.slice(1)
          : externalApiUrl,
        baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
      )
      console.log('🌍 Complete Backend URL will be:', completeUrl.toString())
    }

    // Call the external API using the existing client function
    const response = await getApiV1AdminServices(params)

    if (response.status === 200) {
      console.log(
        'Services API Response:',
        JSON.stringify(response.data, null, 2)
      )

      // Extract services and pagination info from response
      const servicesData = response.data
      const services = servicesData.services || []

      // Convert API services to ServiceListItem format
      const serviceListItems: ServiceListItem[] = services.map(apiService => {
        const convertedService = convertApiToFrontend(apiService)
        return {
          id: convertedService.id,
          title: convertedService.title,
          managingOrgan: convertedService.managingOrgan,
          published_at: convertedService.published_at ?? null,
          last_update: convertedService.last_update,
          status: convertedService.status,
        }
      })

      // Build response with pagination metadata
      return NextResponse.json({
        data: serviceListItems,
        pagination: {
          page: servicesData.page || 1,
          per_page: params.per_page || 10,
          total: servicesData.found || 0,
          total_pages: Math.ceil(
            (servicesData.found || 0) / (params.per_page || 10)
          ),
        },
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch services from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch services',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('🚀 Creating service with data:', body)

    // Validate required fields
    if (!body.nome_servico || !body.resumo || !body.orgao_gestor) {
      return NextResponse.json(
        {
          error: 'Required fields missing: nome_servico, resumo, orgao_gestor',
        },
        { status: 400 }
      )
    }

    const serviceRequest: ModelsPrefRioServiceRequest = {
      ...body,
      status: body.status ?? 0, // Default to draft
    }

    // Call the external API to create the service
    const response = await postApiV1AdminServices(serviceRequest)

    if (response.status === 201) {
      console.log('Service created successfully:', response.data)

      // Revalidate cache tags for services
      revalidateTag('services')

      // Convert API response to frontend format
      const service = convertApiToFrontend(response.data)

      return NextResponse.json({
        service,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      {
        error: 'Failed to create service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
