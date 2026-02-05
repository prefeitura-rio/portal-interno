import { postApiV1EmpregabilidadeVagas } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: EmpregabilidadeVagaBody = await request.json()

    // Validate required fields
    if (
      !body.titulo ||
      !body.descricao ||
      !body.id_contratante ||
      !body.id_regime_contratacao ||
      !body.id_modelo_trabalho
    ) {
      return NextResponse.json(
        {
          error:
            'Campos obrigatórios: titulo, descricao, id_contratante, id_regime_contratacao, id_modelo_trabalho',
        },
        { status: 400 }
      )
    }

    console.log('Creating vaga with data:', JSON.stringify(body, null, 2))

    // Call the external API using the existing client function
    const response = await postApiV1EmpregabilidadeVagas(body)

    console.log('API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      // Revalidate vagas cache
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to create vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating vaga:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
