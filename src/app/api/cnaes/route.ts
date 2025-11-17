// import { getApiV1Cnaes } from '@/http-gorio/cnaes/cnaes'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('page_size') || '100'
    const ocupacao = searchParams.get('ocupacao') || undefined

    // const response = await getApiV1Cnaes({
    //   page: Number(page),
    //   pageSize: Number(pageSize),
    //   ...(ocupacao && { ocupacao }),
    // })

    // if (response.status === 200) {
    //   return NextResponse.json(response.data)
    // }

    return NextResponse.json(
      { error: 'Failed to fetch CNAEs' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Error fetching CNAEs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
