import {
  getApiV1OportunidadesMei,
  getApiV1OportunidadesMeiDrafts,
  postApiV1OportunidadesMei,
  postApiV1OportunidadesMeiDraft,
} from '@/http-gorio/oportunidades-mei/oportunidades-mei'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const pageSize = searchParams.get('page_size') || '10'
    const status = searchParams.get('status') || 'active'
    const orgaoId = searchParams.get('orgao_id')
    const titulo = searchParams.get('titulo')

    // Build query parameters for the API (in camelCase as expected by the backend)
    const apiParams: any = {
      page: Number(page),
      pageSize: Number(pageSize), // camelCase for backend
    }

    // Add optional filters
    if (orgaoId) {
      apiParams.orgaoId = Number(orgaoId) // camelCase for backend
    }

    if (titulo) {
      apiParams.titulo = titulo
    }

    // Log parameters being sent to backend API
    console.log('API Route - Sending to backend:', apiParams)

    // Call the appropriate endpoint based on status
    if (status === 'draft') {
      // For drafts, use the drafts endpoint
      const response = await getApiV1OportunidadesMeiDrafts(apiParams)

      if (response.status === 200) {
        return NextResponse.json(response.data)
      }
      return NextResponse.json(
        { error: 'Failed to fetch draft opportunities' },
        { status: response.status }
      )
    }

    // For active and expired, use the main endpoint
    // Add status filter
    apiParams.status = status

    const response = await getApiV1OportunidadesMei(apiParams)

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error in oportunidades-mei API route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const isDraft = searchParams.get('draft') === 'true'

    console.log(`Creating MEI opportunity (draft: ${isDraft}):`, body)

    // Call the appropriate endpoint based on whether it's a draft or not
    const response = isDraft
      ? await postApiV1OportunidadesMeiDraft(body)
      : await postApiV1OportunidadesMei(body)

    if (response.status === 201) {
      return NextResponse.json(response.data, { status: 201 })
    }

    // Handle error responses
    if (response.status === 400) {
      return NextResponse.json(
        { error: 'Validation error', details: response.data },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create opportunity' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating MEI opportunity:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
