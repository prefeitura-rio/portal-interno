import {
  createActionApiV1ActionsPost,
  listActionsApiV1ActionsGet,
} from '@/http-heimdall/actions/actions'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const skip = Number(searchParams.get('skip') || '0')
    const limit = Number(searchParams.get('limit') || '20')

    const response = await listActionsApiV1ActionsGet({ skip, limit })

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao listar ações', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar ações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await createActionApiV1ActionsPost(body)

    if (response.status === 201) {
      return NextResponse.json(response.data, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Erro ao criar ação', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao criar ação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
