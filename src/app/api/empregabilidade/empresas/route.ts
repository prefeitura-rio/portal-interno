import {
  getApiV1EmpregabilidadeEmpresas,
  postApiV1EmpregabilidadeEmpresas,
} from '@/http-gorio/empregabilidade-empresas/empregabilidade-empresas'
import type { EmpregabilidadeEmpresaBody } from '@/http-gorio/models/empregabilidadeEmpresaBody'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const params = {
      page: searchParams.get('page')
        ? Number(searchParams.get('page'))
        : undefined,
      page_size: searchParams.get('page_size')
        ? Number(searchParams.get('page_size'))
        : undefined,
      nome: searchParams.get('nome') || undefined,
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
    const body: EmpregabilidadeEmpresaBody = await request.json()

    // Validate required fields
    if (!body.cnpj || !body.razao_social) {
      return NextResponse.json(
        {
          error: 'Campos obrigatórios: cnpj, razao_social',
        },
        { status: 400 }
      )
    }

    // Validate CNPJ format (14 digits only - no mask)
    const cnpjNumbers = body.cnpj.replace(/\D/g, '')
    if (cnpjNumbers.length !== 14) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido. Deve conter 14 dígitos.',
        },
        { status: 400 }
      )
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
      revalidateTag('empregabilidade-empresas')
      // Also revalidate vagas cache as empresas are used in vagas
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        empresa: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to create empresa',
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
