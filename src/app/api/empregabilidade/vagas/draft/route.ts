import { postApiV1EmpregabilidadeVagasDraft } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: EmpregabilidadeVagaBody = await request.json()

    // For drafts, only validate minimum required fields
    if (!body.titulo) {
      return NextResponse.json(
        { error: 'Título é obrigatório mesmo para rascunhos' },
        { status: 400 }
      )
    }

    console.log('Creating draft vaga with data:', JSON.stringify(body, null, 2))

    // Call the external API using the existing client function
    const response = await postApiV1EmpregabilidadeVagasDraft(body)

    console.log('Draft API Response:', {
      status: response.status,
      data: response.data,
    })

    if (response.status === 201) {
      // Revalidate vagas cache (especially drafts)
      revalidateTag('empregabilidade-vagas')
      revalidateTag('empregabilidade-vagas-drafts')

      return NextResponse.json({
        vaga: response.data,
        success: true,
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to create draft vaga',
        message: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating draft vaga:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
