import type { GetApiV1AdminTombamentosByOldServiceParams } from '@/http-busca-search/models'
import { getApiV1AdminTombamentosByOldService } from '@/http-busca-search/tombamentos/tombamentos'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    console.log('🔗 Tombamento by old service Request URL:', request.url)

    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const origem = searchParams.get('origem')
    const idServicoAntigo = searchParams.get('id_servico_antigo')

    console.log('📝 Extracted tombamento by old service query parameters:', {
      origem,
      idServicoAntigo,
    })

    // Validate required parameters
    if (!origem || !idServicoAntigo) {
      return NextResponse.json(
        {
          error: 'Required parameters missing: origem, id_servico_antigo',
        },
        { status: 400 }
      )
    }

    // Validate origem values
    const validOrigens = ['1746_v2_llm', 'carioca-digital_v2_llm']
    if (!validOrigens.includes(origem)) {
      return NextResponse.json(
        {
          error: `Invalid origem. Must be one of: ${validOrigens.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Build params object for the API
    const params: GetApiV1AdminTombamentosByOldServiceParams = {
      origem,
      id_servico_antigo: idServicoAntigo,
    }

    console.log('🚀 Tombamento by old service API call params:', params)

    // Call the external API using the existing client function
    const response = await getApiV1AdminTombamentosByOldService(params)

    if (response.status === 200) {
      console.log(
        'Tombamento by old service API Response:',
        JSON.stringify(response.data, null, 2)
      )

      return NextResponse.json({
        tombamento: response.data,
        success: true,
      })
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Tombamento not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch tombamento from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching tombamento by old service:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch tombamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

