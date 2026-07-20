import { resolveMappingApiV1MappingsGet } from '@/http-heimdall/mappings/mappings'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const method = searchParams.get('method')

    if (!path || !method) {
      return NextResponse.json(
        { error: 'Parâmetros path e method são obrigatórios' },
        { status: 400 }
      )
    }

    const response = await resolveMappingApiV1MappingsGet({ path, method })

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao resolver mapeamento', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao resolver mapeamento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
