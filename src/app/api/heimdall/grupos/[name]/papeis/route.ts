import {
  assignRoleToGroupApiV1RolesGroupsGroupNameRolesPost,
  listGroupRolesApiV1RolesGroupsGroupNameRolesGet,
} from '@/http-heimdall/roles/roles'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    const response = await listGroupRolesApiV1RolesGroupsGroupNameRolesGet(name)

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao listar papéis do grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar papéis do grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const body = await request.json()

    const response = await assignRoleToGroupApiV1RolesGroupsGroupNameRolesPost(
      name,
      body
    )

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao atribuir papel ao grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao atribuir papel ao grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
