import { removeRoleFromGroupApiV1RolesGroupsGroupNameRolesRoleNameDelete } from '@/http-heimdall/roles/roles'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string; role: string }> }
) {
  try {
    const { name, role } = await params

    const response =
      await removeRoleFromGroupApiV1RolesGroupsGroupNameRolesRoleNameDelete(
        name,
        role
      )

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      { error: 'Erro ao remover papel do grupo', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao remover papel do grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
