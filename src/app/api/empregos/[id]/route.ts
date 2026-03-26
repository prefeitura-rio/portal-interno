import { getApiV1EmpregosId } from '@/http-gorio/empregos/empregos'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Empregabilidade ID is required' },
        { status: 400 }
      )
    }

    // Use the proper HTTP client function
    const response = await getApiV1EmpregosId(Number.parseInt(id, 10))

    if (response.status === 200) {
      const empregoData = response.data

      return NextResponse.json({
        emprego: empregoData,
        success: true,
      })
    }

    // Handle error responses
    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Empregabilidade not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch empregabilidade from external API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching empregabilidade:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch empregabilidade',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
