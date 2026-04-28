import type { GetApiV1AdminTombamentosParams } from '@/http-busca-search/models'
import {
  getApiV1AdminTombamentos,
  postApiV1AdminTombamentos,
} from '@/http-busca-search/tombamentos/tombamentos'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    console.log('🔗 Tombamentos Request URL:', request.url)

    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = searchParams.get('page')
    const perPage = searchParams.get('per_page')
    const origem = searchParams.get('origem')
    const criadoPor = searchParams.get('criado_por')

    console.log('📝 Extracted tombamentos query parameters:', {
      page,
      perPage,
      origem,
      criadoPor,
    })

    // Build params object for the API
    const params: GetApiV1AdminTombamentosParams = {}

    // Set defaults and convert parameters
    params.page = page ? Number.parseInt(page, 10) : 1
    params.per_page = perPage ? Number.parseInt(perPage, 10) : 10

    // Handle optional filters
    if (origem?.trim()) {
      params.origem = origem.trim()
    }

    if (criadoPor?.trim()) {
      params.criado_por = criadoPor.trim()
    }

    console.log('🚀 Tombamentos API call params:', params)

    // Call the external API using the existing client function
    const response = await getApiV1AdminTombamentos(params)

    if (response.status === 200) {
      console.log(
        'Tombamentos API Response:',
        JSON.stringify(response.data, null, 2)
      )

      // Extract tombamentos and pagination info from response
      const tombamentosData = response.data

      // Build response with pagination metadata
      return NextResponse.json({
        data: tombamentosData,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch tombamentos from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching tombamentos:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch tombamentos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('🚀 Creating tombamento with data:', body)

    // Validate required fields
    if (!body.origem || !body.id_servico_antigo || !body.id_servico_novo) {
      return NextResponse.json(
        {
          error:
            'Required fields missing: origem, id_servico_antigo, id_servico_novo',
        },
        { status: 400 }
      )
    }

    // Validate origem values
    const validOrigens = ['1746_v2_llm', 'carioca-digital_v2_llm']
    if (!validOrigens.includes(body.origem)) {
      return NextResponse.json(
        {
          error: `Invalid origem. Must be one of: ${validOrigens.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const tombamentoRequest = {
      origem: body.origem,
      id_servico_antigo: body.id_servico_antigo,
      id_servico_novo: body.id_servico_novo,
      observacoes: body.observacoes || '',
    }

    // Call the external API to create the tombamento
    const response = await postApiV1AdminTombamentos(tombamentoRequest)

    if (response.status === 201) {
      console.log('Tombamento created successfully:', response.data)

      return NextResponse.json({
        tombamento: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to create tombamento' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating tombamento:', error)
    return NextResponse.json(
      {
        error: 'Failed to create tombamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

