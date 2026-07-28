import { getAdminCpfSecretariaCpf } from '@/http-rmi/admin/admin'
import { getCpfSecretariaCpf } from '@/http-rmi/cpf-secretaria/cpf-secretaria'
import { getCurrentUserFromCacheOrHeimdall } from '@/lib/heimdall-user'
import { shouldBypassSecretariaFilter } from '@/types/heimdall-roles'
import { NextResponse } from 'next/server'

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

async function fetchSecretariaCdUas(cpf: string): Promise<string[]> {
  const response = await getCpfSecretariaCpf(cpf)

  if (response.status === 200) {
    return response.data.cd_uas ?? []
  }

  // Fallback when the public query endpoint rejects user JWT
  if (response.status === 401) {
    const adminResponse = await getAdminCpfSecretariaCpf(cpf)
    if (adminResponse.status === 200) {
      return (adminResponse.data.mappings ?? [])
        .map(mapping => mapping.cd_ua)
        .filter((cdUa): cdUa is string => Boolean(cdUa))
    }
  }

  console.error(
    'Failed to fetch CPF-secretaria vínculos from RMI:',
    response.status
  )
  return []
}

export async function GET() {
  try {
    const user = await getCurrentUserFromCacheOrHeimdall()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    if (shouldBypassSecretariaFilter(user.roles)) {
      return NextResponse.json({
        data: { cd_uas: null, bypass: true },
        success: true,
      })
    }

    const cpf = normalizeCpf(user.cpf)
    if (cpf.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const cd_uas = await fetchSecretariaCdUas(cpf)

    return NextResponse.json({
      data: { cd_uas, bypass: false },
      success: true,
    })
  } catch (error) {
    console.error('Error fetching user secretarias:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
