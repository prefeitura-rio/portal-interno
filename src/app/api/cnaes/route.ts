import { getCnaes } from '@/http-rmi/cnaes/cnaes'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '1'
    const perPage =
      searchParams.get('per_page') || searchParams.get('page_size') || '100'
    const ocupacao = searchParams.get('ocupacao') || undefined
    const subclasse = searchParams.get('subclasse') || undefined
    const search = searchParams.get('search') || undefined

    // Call the RMI API
    const response = await getCnaes({
      page: Number.parseInt(page, 10),
      per_page: Number.parseInt(perPage, 10),
      ...(ocupacao && { ocupacao }),
      ...(subclasse && { subclasse }),
      ...(search && { search }),
    })

    if (response.status === 200) {
      return NextResponse.json({
        cnaes: response.data.cnaes || [],
        pagination: response.data.pagination,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch CNAEs' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching CNAEs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
