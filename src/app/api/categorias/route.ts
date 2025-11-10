import { getApiV1Categorias } from '@/http-gorio/categorias/categorias'
import {
  type Categoria,
  filterValidCategorias,
} from '@/lib/categoria-utils'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = searchParams.get('page')
    const pageSize = searchParams.get('pageSize')

    // Build params object for the API
    const params: any = {}

    // Set defaults and convert parameters
    if (page) {
      params.page = Number.parseInt(page, 10)
    }

    if (pageSize) {
      params.limit = Number.parseInt(pageSize, 10) // Will be mapped to pageSize internally
    }

    // Call the external API using the Orval-generated client function
    const response = await getApiV1Categorias(params)

    // Check response status
    if (response.status === 200) {
      // The API returns an object with 'data' and 'meta' properties
      const responseData = response.data as any
      const categorias = Array.isArray(responseData?.data)
        ? (responseData.data as Categoria[])
        : []

      // Filter out duplicate and invalid categories
      const filteredCategorias = filterValidCategorias(categorias)

      return NextResponse.json(filteredCategorias, { status: 200 })
    }

    // Handle error responses
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
