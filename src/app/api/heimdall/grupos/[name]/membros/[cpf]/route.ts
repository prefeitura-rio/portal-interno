import { removeMemberFromGroupApiV1GroupsGroupNameMembersSubjectDelete } from '@/http-heimdall/memberships/memberships'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string; cpf: string }> }
) {
  try {
    const { name, cpf } = await params

    const response =
      await removeMemberFromGroupApiV1GroupsGroupNameMembersSubjectDelete(
        name,
        cpf
      )

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      { error: 'Erro ao remover membro do grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao remover membro do grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
