import { getDepartmentsCdUa } from '@/http-rmi/departments/departments'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cd_ua: string }> }
) {
  try {
    const { cd_ua } = await params

    if (!cd_ua) {
      return NextResponse.json(
        { error: 'Department ID (cd_ua) is required' },
        { status: 400 }
      )
    }

    // Call the RMI API
    const response = await getDepartmentsCdUa(cd_ua)

    if (response.status === 200) {
      return NextResponse.json({
        data: response.data,
        success: true,
      })
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch department' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching department:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
