import { postApiV1EmpregabilidadeVagas } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVagaBody } from '@/http-gorio/models/empregabilidadeVagaBody'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: EmpregabilidadeVagaBody = await request.json()

    // Validate required fields for draft
    if (
      !body.titulo ||
      !body.descricao ||
      !body.id_contratante ||
      !body.id_regime_contratacao ||
      !body.id_modelo_trabalho
    ) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes para criação de rascunho' },
        { status: 400 }
      )
    }

    // Force status as draft
    const draftData: EmpregabilidadeVagaBody = {
      ...body,
      status: 'em_edicao',
    }

    // Call the external API using the existing client function
    const response = await postApiV1EmpregabilidadeVagas(draftData)

    console.log('Draft Vaga API Response:', {
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
      { error: 'Failed to create draft vaga', message: response.data },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error creating draft vaga:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
