import {
  addMemberToGroupApiV1GroupsGroupNameMembersPost,
  listGroupMembersApiV1GroupsGroupNameMembersGet,
} from '@/http-heimdall/memberships/memberships'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    const response = await listGroupMembersApiV1GroupsGroupNameMembersGet(name)

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao listar membros do grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar membros do grupo:', error)
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

    const response = await addMemberToGroupApiV1GroupsGroupNameMembersPost(
      name,
      body
    )

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      { error: 'Erro ao adicionar membro ao grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao adicionar membro ao grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
