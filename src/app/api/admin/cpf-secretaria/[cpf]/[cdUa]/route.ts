import { deleteAdminCpfSecretariaCpfCdUa } from '@/http-rmi/admin/admin'
import { NextResponse } from 'next/server'

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error?: unknown }).error === 'string'
  ) {
    return (data as { error: string }).error
  }
  return fallback
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ cpf: string; cdUa: string }> }
) {
  try {
    const { cpf: rawCpf, cdUa } = await params
    const cpf = normalizeCpf(rawCpf)

    if (cpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Informe 11 dígitos.' },
        { status: 400 }
      )
    }

    if (!cdUa?.trim()) {
      return NextResponse.json(
        { error: 'cd_ua é obrigatório.' },
        { status: 400 }
      )
    }

    const response = await deleteAdminCpfSecretariaCpfCdUa(cpf, cdUa)

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(
      {
        error: getErrorMessage(
          response.data,
          'Falha ao remover vínculo CPF-Secretaria'
        ),
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error deleting CPF-Secretaria mapping:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
