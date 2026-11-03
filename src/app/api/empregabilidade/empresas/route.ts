import {
  getApiV1EmpregabilidadeEmpresas,
  getApiV1EmpregabilidadeEmpresasConsultaCnpjCnpj,
  postApiV1EmpregabilidadeEmpresas,
} from '@/http-gorio/empregabilidade-empresas/empregabilidade-empresas'
import type { EmpregabilidadeEmpresa } from '@/http-gorio/models/empregabilidadeEmpresa'
import { cleanCNPJ, getCNPJValidationError } from '@/lib/cnpj-validator'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

const CNPJ_NOT_FOUND_MESSAGE =
  'CNPJ não encontrado na base de dados da Receita Federal. Verifique se o número está correto.'
const RECEITA_UNAVAILABLE_MESSAGE =
  'Não foi possível consultar o CNPJ na Receita Federal agora. Tente novamente em alguns minutos.'

type ReceitaLookup =
  | { ok: true; razaoSocial: string }
  | { ok: false; status: number; error: string; code: string }

async function lookupReceitaFederal(cnpj: string): Promise<ReceitaLookup> {
  const unavailable: ReceitaLookup = {
    ok: false,
    status: 503,
    error: RECEITA_UNAVAILABLE_MESSAGE,
    code: 'RECEITA_UNAVAILABLE',
  }

  try {
    const response = await getApiV1EmpregabilidadeEmpresasConsultaCnpjCnpj(cnpj)

    if (response.status === 200) {
      const razaoSocial = response.data?.razao_social?.trim()
      return razaoSocial ? { ok: true, razaoSocial } : unavailable
    }

    if (response.status === 404) {
      return {
        ok: false,
        status: 422,
        error: CNPJ_NOT_FOUND_MESSAGE,
        code: 'CNPJ_NOT_FOUND',
      }
    }

    if (response.status === 400) {
      return {
        ok: false,
        status: 400,
        error: 'CNPJ inválido ou formato incorreto.',
        code: 'CNPJ_INVALID',
      }
    }

    const status: number = response.status
    if (status === 401 || status === 403) {
      return {
        ok: false,
        status,
        error:
          'Sem autorização para consultar o CNPJ na Receita Federal. Entre novamente e tente de novo.',
        code: 'RECEITA_UNAUTHORIZED',
      }
    }

    console.error('Receita Federal lookup failed:', { status })
    return unavailable
  } catch (error) {
    console.error(
      'Receita Federal lookup error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return unavailable
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')?.trim() || undefined
    const cnpj = searchParams.get('cnpj')?.trim() || undefined

    const params = {
      page: searchParams.get('page')
        ? Number(searchParams.get('page'))
        : undefined,
      pageSize: searchParams.get('page_size')
        ? Number(searchParams.get('page_size'))
        : undefined,
      search,
      cnpj,
    }

    console.log('Fetching empresas with params:', params)

    const response = await getApiV1EmpregabilidadeEmpresas(params)

    console.log('API Response:', { status: response.status })

    if (response.status === 200) {
      return NextResponse.json({
        empresas: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch empresas' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching empresas:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body: EmpregabilidadeEmpresa = await request.json()

    // Validate required fields
    if (!body.cnpj || !body.razao_social) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios: cnpj, razao_social',
        },
        { status: 400 }
      )
    }

    // Validate CNPJ: 14 characters, numeric or alphanumeric (DEV-182), and
    // check digits (DEV-180). The form also checks it, but a direct call to
    // this route must not bypass it.
    const cnpjError = getCNPJValidationError(body.cnpj)
    if (cnpjError) {
      return NextResponse.json({ error: cnpjError }, { status: 400 })
    }
    body.cnpj = cleanCNPJ(body.cnpj)

    // DEV-181: outside staging the company must exist at the Receita Federal
    // (RMI) and is created with the official razão social. Staging keeps the
    // form's shortcut to create test companies without the lookup.
    if (process.env.NEXT_PUBLIC_ENVIRONMENT !== 'staging') {
      const receita = await lookupReceitaFederal(body.cnpj)
      if (!receita.ok) {
        return NextResponse.json(
          { error: receita.error, code: receita.code },
          { status: receita.status }
        )
      }
      body.razao_social = receita.razaoSocial
    }

    console.log('Creating empresa with data:', JSON.stringify(body, null, 2))

    // Call the external API using the existing client function
    const response = await postApiV1EmpregabilidadeEmpresas(body)

    console.log('API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      // Revalidate empresas cache
      revalidateTag('empregabilidade-empresas', 'max')
      // Also revalidate vagas cache as empresas are used in vagas
      revalidateTag('empregabilidade-vagas', 'max')

      return NextResponse.json({
        empresa: response.data,
        success: true,
      })
    }

    // CNPJ already exists
    const errorMessage =
      typeof response.data === 'object' && response.data?.error
        ? response.data.error
        : ''
    if (
      errorMessage.includes('duplicate key') ||
      errorMessage.includes('23505')
    ) {
      return NextResponse.json(
        {
          error: 'Já existe uma empresa cadastrada com este CNPJ.',
          code: 'CNPJ_ALREADY_EXISTS',
        },
        { status: 409 } // Conflict
      )
    }

    return NextResponse.json(
      {
        error: 'Falha ao criar empresa',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating empresa:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
