import { postApiV1EmpregabilidadeVagas } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import type { EmpregabilidadeVaga } from '@/http-gorio/models/empregabilidadeVaga'
import { getErroValidacaoApi } from '@/lib/vaga-habilidades-erros-api'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: EmpregabilidadeVaga = await request.json()

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
    const draftData: EmpregabilidadeVaga = {
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
      revalidateTag('empregabilidade-vagas', 'max')
      revalidateTag('empregabilidade-vagas-drafts', 'max')

      return NextResponse.json({
        vaga: response.data,
        success: true,
      })
    }

    // DEV-685: o 400 da Go API traz o erro de cada campo (habilidades: área
    // repetida, conhecimento de outra área...) para o formulário
    if (response.status === 400) {
      const goError = getErroValidacaoApi(response.data)
      return NextResponse.json(
        {
          ...goError,
          error: goError.error || 'Failed to create draft vaga',
          message: response.data,
        },
        { status: 400 }
      )
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
