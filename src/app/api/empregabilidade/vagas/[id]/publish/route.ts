import { putApiV1EmpregabilidadeVagasIdPublish } from '@/http-gorio/empregabilidade-vagas/empregabilidade-vagas'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/**
 * PUT - Publicar vaga (mudar status de em_edicao para publicado)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log('Publishing vaga:', id)

    const response = await putApiV1EmpregabilidadeVagasIdPublish(id)

    console.log('Publish response:', { status: response.status })

    if (response.status === 200) {
      revalidateTag('empregabilidade-vagas')

      return NextResponse.json({
        vaga: response.data,
        success: true,
        message: 'Vaga publicada com sucesso',
      })
    }

    // Handle specific error codes
    if (response.status === 400) {
      return NextResponse.json(
        {
          error:
            'Vaga não pode ser publicada. Verifique os campos obrigatórios.',
        },
        { status: 400 }
      )
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Vaga não encontrada.' },
        { status: 404 }
      )
    }

    if (response.status === 409) {
      return NextResponse.json(
        { error: 'Vaga já está publicada.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Falha ao publicar vaga' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error publishing vaga:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
