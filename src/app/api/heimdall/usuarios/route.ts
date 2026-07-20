import { listUsersApiV1UsersGet } from '@/http-heimdall/users/users'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const skip = Number(searchParams.get('skip') || '0')
    const limit = Number(searchParams.get('limit') || '20')

    const response = await listUsersApiV1UsersGet({
      skip,
      limit,
      has_groups: true,
    })

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao listar usuários', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
