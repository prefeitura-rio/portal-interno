import { removeActionFromRoleApiV1RolesRoleNameActionsActionNameDelete } from '@/http-heimdall/roles/roles'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string; action: string }> }
) {
  try {
    const { name, action } = await params

    const response =
      await removeActionFromRoleApiV1RolesRoleNameActionsActionNameDelete(
        name,
        action
      )

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      { error: 'Erro ao remover ação do papel', details: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Heimdall] Erro ao remover ação do papel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
