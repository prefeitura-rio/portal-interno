import {
  getAdminCpfSecretariaCpf,
  postAdminCpfSecretariaCpf,
} from '@/http-rmi/admin/admin'
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf: rawCpf } = await params
    const cpf = normalizeCpf(rawCpf)

    if (cpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Informe 11 dígitos.' },
        { status: 400 }
      )
    }

    const response = await getAdminCpfSecretariaCpf(cpf)

    if (response.status === 200) {
      return NextResponse.json({
        data: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      {
        error: getErrorMessage(
          response.data,
          'Falha ao listar vínculos CPF-Secretaria'
        ),
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error listing CPF-Secretaria mappings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf: rawCpf } = await params
    const cpf = normalizeCpf(rawCpf)

    if (cpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Informe 11 dígitos.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const cd_ua =
      typeof body?.cd_ua === 'string' ? body.cd_ua.trim() : undefined

    if (!cd_ua) {
      return NextResponse.json(
        { error: 'cd_ua é obrigatório.' },
        { status: 400 }
      )
    }

    const response = await postAdminCpfSecretariaCpf(cpf, { cd_ua })

    if (response.status === 201) {
      return NextResponse.json(
        {
          data: response.data,
          success: true,
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      {
        error: getErrorMessage(
          response.data,
          'Falha ao adicionar vínculo CPF-Secretaria'
        ),
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error adding CPF-Secretaria mapping:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
