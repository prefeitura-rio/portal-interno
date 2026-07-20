import {
  deleteMappingApiV1MappingsMappingIdDelete,
  updateMappingApiV1MappingsMappingIdPut,
} from '@/http-heimdall/mappings/mappings'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const response = await updateMappingApiV1MappingsMappingIdPut(
      Number(id),
      body
    )

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar mapeamento', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao atualizar mapeamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const response = await deleteMappingApiV1MappingsMappingIdDelete(Number(id))

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      { error: 'Erro ao excluir mapeamento', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao excluir mapeamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
