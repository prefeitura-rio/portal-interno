import { getApiV1EmpregabilidadeEmpresasConsultaCnpjCnpj } from '@/http-gorio/empregabilidade-empresas/empregabilidade-empresas'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj } = await params

    // Remove mask from CNPJ to get only numbers
    const cnpjNumbers = cnpj.replace(/\D/g, '')

    // Validate CNPJ has 14 digits
    if (cnpjNumbers.length !== 14) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido. Deve conter 14 dígitos.',
        },
        { status: 400 }
      )
    }

    console.log('Consulting CNPJ via RMI:', cnpjNumbers)

    // Call the external API using the existing client function
    // This endpoint queries the RMI (Registro Mercantil Integrado) for official company data
    const response = await getApiV1EmpregabilidadeEmpresasConsultaCnpjCnpj(
      cnpjNumbers
    )

    console.log('RMI API Response:', {
      status: response.status,
    })

    if (response.status === 200) {
      return NextResponse.json({
        empresa: response.data,
        success: true,
      })
    }

    // Handle specific error codes
    if (response.status === 404) {
      return NextResponse.json(
        {
          error:
            'CNPJ não encontrado na base de dados da Receita Federal. Verifique se o número está correto.',
        },
        { status: 404 }
      )
    }

    if (response.status === 400) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido ou formato incorreto.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to consult CNPJ',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error consulting CNPJ:', error)
    return NextResponse.json(
      {
        error: 'Erro ao consultar CNPJ na Receita Federal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
