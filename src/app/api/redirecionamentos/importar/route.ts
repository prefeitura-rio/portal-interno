import { postApiV1RulesImport } from '@/http-redirecionamentos/regras/regras'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const formData = await request.formData()
    const fileEntry = formData.get('file')
    const file = fileEntry instanceof File ? fileEntry : null

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    const validTypes = ['text/csv', 'application/vnd.ms-excel']

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Tipo de arquivo inválido. Apenas arquivos CSV são aceitos.',
        },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. O tamanho máximo é 5MB.' },
        { status: 400 }
      )
    }

    const dryRunParam =
      searchParams.get('dry_run') ??
      (typeof formData.get('dry_run') === 'string'
        ? String(formData.get('dry_run'))
        : null)
    const dryRun =
      dryRunParam === 'true'
        ? true
        : dryRunParam === 'false'
          ? false
          : undefined

    const response = await postApiV1RulesImport(
      { file },
      dryRun !== undefined ? { dry_run: dryRun } : undefined
    )

    if (response.status === 200) {
      return NextResponse.json(response.data)
    }

    return NextResponse.json(
      {
        error: 'Erro ao importar regras de redirecionamento',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[API Redirecionamentos] Erro ao importar CSV:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
