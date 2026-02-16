import { getLegalEntityCnpj } from '@/http-rmi/legal-entity/legal-entity'
import { NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    const resolvedParams = await params
    const cnpj = resolvedParams.cnpj

    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ is required' }, { status: 400 })
    }

    // Call RMI API
    const response = await getLegalEntityCnpj(cnpj)

    if (response.status !== 200) {
      console.error('Error fetching legal entity:', response)
      return NextResponse.json(
        { error: 'Failed to fetch legal entity', data: null },
        { status: response.status }
      )
    }

    // The response.data might be an array or a single object
    // Handle both cases based on the API response structure
    const data = response.data as any

    // If data is an array, take the first element
    const legalEntity = Array.isArray(data) ? data[0] : data

    const jsonResponse = NextResponse.json({
      data: legalEntity,
      success: true,
    })

    // Add no-cache headers to ensure fresh data
    jsonResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    )
    jsonResponse.headers.set('Pragma', 'no-cache')
    jsonResponse.headers.set('Expires', '0')

    return jsonResponse
  } catch (error) {
    console.error('Error in legal entity route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      },
      { status: 500 }
    )
  }
}
