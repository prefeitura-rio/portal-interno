import {
  createGroupApiV1GroupsPost,
  listGroupsApiV1GroupsGet,
} from '@/http-heimdall/groups/groups'
import { listGroupMembersApiV1GroupsGroupNameMembersGet } from '@/http-heimdall/memberships/memberships'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix')

    const response = await listGroupsApiV1GroupsGet(
      prefix ? { prefix } : undefined
    )

    if (response.status === 200) {
      // Agrega a contagem de membros no servidor para evitar N+1 no browser
      const groupsWithCount = await Promise.all(
        response.data.map(async group => {
          try {
            const membersResponse =
              await listGroupMembersApiV1GroupsGroupNameMembersGet(group.name)
            return {
              ...group,
              member_count:
                membersResponse.status === 200
                  ? membersResponse.data.length
                  : 0,
            }
          } catch {
            return { ...group, member_count: 0 }
          }
        })
      )
      return NextResponse.json(groupsWithCount)
    }

    return NextResponse.json(
      { error: 'Erro ao listar grupos', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao listar grupos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await createGroupApiV1GroupsPost(body)

    if (response.status === 201) {
      return NextResponse.json(response.data, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Erro ao criar grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao criar grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
