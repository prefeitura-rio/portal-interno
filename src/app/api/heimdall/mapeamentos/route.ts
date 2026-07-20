import {
  createMappingApiV1MappingsPost,
  listMappingsApiV1MappingsListGet,
} from '@/http-heimdall/mappings/mappings'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const actionFilter = searchParams.get('action_filter')

    const response = await listMappingsApiV1MappingsListGet(
      actionFilter ? { action_filter: actionFilter } : undefined
    )

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao listar mapeamentos', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar mapeamentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await createMappingApiV1MappingsPost(body)

    if (response.status === 201) {
      return NextResponse.json(response.data, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Erro ao criar mapeamento', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao criar mapeamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
