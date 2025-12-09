import { getApiV1CategoriesCategorySubcategories } from '@/http-busca-search/subcategories/subcategories'
import type { GetApiV1CategoriesCategorySubcategoriesSortBy } from '@/http-busca-search/models'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      )
    }

    const sortBy = (searchParams.get('sort_by') || 'popularity') as GetApiV1CategoriesCategorySubcategoriesSortBy
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
    const includeEmpty = searchParams.get('include_empty') === 'true'
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // Call the Busca Search API
    const response = await getApiV1CategoriesCategorySubcategories(
      category,
      {
        sort_by: sortBy,
        order: order,
        include_empty: includeEmpty,
        include_inactive: includeInactive,
      }
    )

    if (response.status === 200) {
      return NextResponse.json({
        data: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching subcategories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
