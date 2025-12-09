/**
 * API Service Adapter
 *
 * This file contains utilities to help transition from mock data to real API endpoints.
 * It provides a centralized place to manage the conversion between API models and frontend models.
 */

import type { ModelsPrefRioService } from '@/http-busca-search/models'
import type { Service, ServiceListItem } from '@/types/service'
import { convertApiToFrontend, convertFrontendToApi } from '@/types/service'

/**
 * Service API configuration
 * Change these when API endpoints are ready
 */
export const API_CONFIG = {
  USE_MOCK_DATA: true, // Set to false when real API is ready
  BASE_URL: '/api/services',
  ENDPOINTS: {
    LIST: '/api/services',
    GET: '/api/services/:id',
    CREATE: '/api/services',
    UPDATE: '/api/services/:id',
    DELETE: '/api/services/:id',
  },
}

/**
 * Fetch a single service by ID
 * This function will automatically switch between mock data and real API based on API_CONFIG
 */
export async function fetchServiceById(serviceId: string): Promise<Service> {
  if (API_CONFIG.USE_MOCK_DATA) {
    // Import mock data dynamically to avoid circular dependencies
    const { mockServices } = await import('@/lib/mock-services')
    const service = mockServices.find(s => s.id === serviceId)

    if (!service) {
      throw new Error('Service not found')
    }

    return service
  }

  // Real API call
  const response = await fetch(
    API_CONFIG.ENDPOINTS.GET.replace(':id', serviceId)
  )

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Service not found')
    }
    throw new Error('Failed to fetch service')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch service')
  }

  // Convert API model to frontend model
  return convertApiToFrontend(data.service as ModelsPrefRioService)
}

/**
 * Fetch all services with pagination and filters
 */
export async function fetchServices(params?: {
  page?: number
  limit?: number
  status?: string[]
  managingOrgan?: string[]
  search?: string
}): Promise<{
  services: ServiceListItem[]
  total: number
  page: number
  limit: number
}> {
  if (API_CONFIG.USE_MOCK_DATA) {
    const { mockServicesListItems } = await import('@/lib/mock-services')
    let filteredServices = [...mockServicesListItems]

    // Apply filters
    if (params?.status && params.status.length > 0) {
      filteredServices = filteredServices.filter(service =>
        params.status!.includes(service.status)
      )
    }

    if (params?.managingOrgan && params.managingOrgan.length > 0) {
      filteredServices = filteredServices.filter(service =>
        params.managingOrgan!.includes(service.managingOrgan)
      )
    }

    if (params?.search) {
      const searchTerm = params.search.toLowerCase()
      filteredServices = filteredServices.filter(service =>
        service.title.toLowerCase().includes(searchTerm)
      )
    }

    // Apply pagination
    const page = params?.page || 1
    const limit = params?.limit || 10
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedServices = filteredServices.slice(startIndex, endIndex)

    return {
      services: paginatedServices,
      total: filteredServices.length,
      page,
      limit,
    }
  }

  // Real API call
  const urlParams = new URLSearchParams()
  if (params?.page) urlParams.set('page', params.page.toString())
  if (params?.limit) urlParams.set('limit', params.limit.toString())
  if (params?.status) urlParams.set('status', params.status.join(','))
  if (params?.managingOrgan)
    urlParams.set('managingOrgan', params.managingOrgan.join(','))
  if (params?.search) urlParams.set('search', params.search)

  const response = await fetch(
    `${API_CONFIG.ENDPOINTS.LIST}?${urlParams.toString()}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch services')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch services')
  }

  // Convert API models to frontend models
  const services = data.services.map((apiService: ModelsPrefRioService) => {
      const converted = convertApiToFrontend(apiService)
      return {
        id: converted.id,
        title: converted.title,
        managingOrgan: converted.managingOrgan,
        published_at: converted.published_at,
        last_update: converted.last_update,
        status: converted.status,
      } as ServiceListItem
    }
  )

  return {
    services,
    total: data.total || services.length,
    page: data.page || 1,
    limit: data.limit || 10,
  }
}

/**
 * Create a new service
 */
export async function createService(
  service: Omit<Service, 'id' | 'created_at' | 'last_update'>
): Promise<Service> {
  if (API_CONFIG.USE_MOCK_DATA) {
    // In mock mode, just return the service with generated ID and timestamps
    const newService: Service = {
      ...service,
      id: `mock-${Date.now()}`,
      created_at: new Date(),
      last_update: new Date(),
    }
    return newService
  }

  // Convert frontend model to API model
  const apiService = convertFrontendToApi({
    ...service,
    id: '',
    created_at: new Date(),
    last_update: new Date(),
  })

  const response = await fetch(API_CONFIG.ENDPOINTS.CREATE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiService),
  })

  if (!response.ok) {
    throw new Error('Failed to create service')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to create service')
  }

  return convertApiToFrontend(data.service as ModelsPrefRioService)
}

/**
 * Update an existing service
 */
export async function updateService(
  serviceId: string,
  service: Partial<Service>
): Promise<Service> {
  if (API_CONFIG.USE_MOCK_DATA) {
    // In mock mode, just return the updated service
    const updatedService: Service = {
      ...service,
      id: serviceId,
      last_update: new Date(),
    } as Service
    return updatedService
  }

  // Convert frontend model to API model
  const apiService = convertFrontendToApi(service as Service)

  const response = await fetch(
    API_CONFIG.ENDPOINTS.UPDATE.replace(':id', serviceId),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiService),
    }
  )

  if (!response.ok) {
    throw new Error('Failed to update service')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to update service')
  }

  return convertApiToFrontend(data.service as ModelsPrefRioService)
}

/**
 * Delete a service
 */
export async function deleteService(serviceId: string): Promise<void> {
  if (API_CONFIG.USE_MOCK_DATA) {
    // In mock mode, just simulate success
    return
  }

  const response = await fetch(
    API_CONFIG.ENDPOINTS.DELETE.replace(':id', serviceId),
    {
      method: 'DELETE',
    }
  )

  if (!response.ok) {
    throw new Error('Failed to delete service')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete service')
  }
}
