import { getDepartments } from '@/http-rmi/departments/departments'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '100'
    const search = searchParams.get('search') || undefined
    const nivel = searchParams.get('nivel') || undefined
    const cd_ua_pai = searchParams.get('cd_ua_pai') || undefined

    // Call the RMI API
    const response = await getDepartments({
      page: Number.parseInt(page),
      per_page: Number.parseInt(limit),
      search,
      exact_level: nivel ? Number.parseInt(nivel) : undefined,
      parent_id: cd_ua_pai,
    })

    if (response.status === 200) {
      const data = response.data

      return NextResponse.json({
        data: data.departments || [],
        pagination: data.pagination,
        total_count: data.total_count,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
