import {
  createRoleApiV1RolesPost,
  listRoleActionsApiV1RolesRoleNameActionsGet,
  listRolesApiV1RolesGet,
} from '@/http-heimdall/roles/roles'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const skip = Number(searchParams.get('skip') || '0')
    const limit = Number(searchParams.get('limit') || '20')
    const withActionCount = searchParams.get('with_action_count') === 'true'

    const response = await listRolesApiV1RolesGet({ skip, limit })

    if (response.status === 200) {
      if (!withActionCount) {
        return NextResponse.json(response.data)
      }

      // Agrega a contagem de ações no servidor para evitar N+1 no browser
      const itemsWithCount = await Promise.all(
        response.data.items.map(async role => {
          try {
            const actionsResponse =
              await listRoleActionsApiV1RolesRoleNameActionsGet(role.name)
            return {
              ...role,
              action_count:
                actionsResponse.status === 200
                  ? actionsResponse.data.length
                  : 0,
            }
          } catch {
            return { ...role, action_count: 0 }
          }
        })
      )
      return NextResponse.json({ ...response.data, items: itemsWithCount })
    }

    return NextResponse.json(
      { error: 'Erro ao listar papéis', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar papéis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await createRoleApiV1RolesPost(body)

    if (response.status === 201) {
      return NextResponse.json(response.data, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Erro ao criar papel', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao criar papel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
