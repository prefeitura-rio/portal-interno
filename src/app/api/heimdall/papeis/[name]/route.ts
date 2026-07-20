import { deleteRoleApiV1RolesRoleNameDelete } from '@/http-heimdall/roles/roles'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    const response = await deleteRoleApiV1RolesRoleNameDelete(name)

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      { error: 'Erro ao excluir papel', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao excluir papel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
