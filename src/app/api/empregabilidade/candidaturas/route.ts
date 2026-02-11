import {
  getApiV1EmpregabilidadeCandidaturas,
  postApiV1EmpregabilidadeCandidaturas,
} from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import { cleanCPF } from '@/lib/cpf-validator'
import { mapBackendStatusToFrontend } from '@/lib/status-config/empregabilidade'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query params
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
    const perPage = searchParams.get('perPage') || searchParams.get('page_size')
    const pageSize = perPage ? Number(perPage) : 10
    const status = searchParams.get('status') || undefined
    const idVaga =
      searchParams.get('id_vaga') ||
      searchParams.get('empregabilidadeId') ||
      undefined
    const search = searchParams.get('search') || undefined

    const params: any = {
      page,
      pageSize: pageSize,
    }

    if (status) {
      params.status = status
    }

    if (idVaga) {
      params.vagaId = idVaga
    }

    if (search) {
      params.cpf = search
    }

    // Call Orval client
    const response = await getApiV1EmpregabilidadeCandidaturas(params)

    if (response.status === 200) {
      const data = response.data as any

      // Backend returns { data: [...], meta: {...} } structure
      const candidaturas = data.data || data.candidaturas || []

      // Map backend candidaturas to frontend format
      const candidatos = candidaturas.map((c: any) => ({
        id: c.id,
        candidateName:
          c.nome ||
          c.curriculo_snapshot?.nome ||
          c.curriculo_snapshot?.nome_completo ||
          'Nome não disponível',
        cpf: c.cpf,
        email: c.email || c.curriculo_snapshot?.email || '',
        phone:
          c.curriculo_snapshot?.telefone || c.curriculo_snapshot?.celular || '',
        enrollmentDate: c.created_at,
        status: mapBackendStatusToFrontend(c.status),
        address: c.curriculo_snapshot?.endereco || '',
        neighborhood: c.curriculo_snapshot?.bairro || '',
        city: c.curriculo_snapshot?.cidade || '',
        state: c.curriculo_snapshot?.estado || '',
        customFields: (c.respostas_info_complementares || []).map((r: any) => ({
          id: r.id_info,
          title: r.titulo || `Campo ${r.id_info}`,
          field_type: 'text',
          value: r.resposta,
        })),
      }))

      console.log(`Mapped ${candidatos.length} candidatos`)

      // Calculate summary
      const summary = {
        total: candidatos.length,
        pendingCount: candidatos.filter((c: any) => c.status === 'pending')
          .length,
        approvedCount: candidatos.filter((c: any) => c.status === 'approved')
          .length,
        rejectedCount: candidatos.filter((c: any) => c.status === 'rejected')
          .length,
        cancelledCount: candidatos.filter((c: any) => c.status === 'cancelled')
          .length,
      }

      return NextResponse.json({
        candidatos,
        summary,
        pagination: {
          page: data.meta?.page || page,
          perPage: data.meta?.page_size || pageSize,
          total: data.meta?.total || candidatos.length,
          totalPages:
            data.meta?.total_pages ||
            Math.ceil(
              (data.meta?.total || candidatos.length) /
                (data.meta?.page_size || pageSize)
            ),
        },
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch candidaturas' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching candidaturas:', error)
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
    const body = await request.json()

    console.log('Creating candidatura with body:', body)

    // Validate required fields
    if (!body.cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 })
    }

    if (!body.id_vaga) {
      return NextResponse.json(
        { error: 'ID da vaga é obrigatório' },
        { status: 400 }
      )
    }

    // Clean CPF (remove formatting)
    const cpfLimpo = cleanCPF(body.cpf)

    // Validate CPF length after cleaning
    if (cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve ter 11 dígitos' },
        { status: 400 }
      )
    }

    console.log('Calling Orval client with cleaned CPF:', cpfLimpo)

    // Call Orval client to create candidatura
    const response = await postApiV1EmpregabilidadeCandidaturas({
      cpf: cpfLimpo,
      nome: body.nome,
      email: body.email,
      id_vaga: body.id_vaga,
      respostas_info_complementares: body.respostas_info_complementares || [],
      // Status will default to "candidatura_enviada" in backend
    })

    console.log('API Response status:', response.status)
    console.log('POST Response:', JSON.stringify(response.data, null, 2))
    console.log('Candidatura created with id:', response.data?.id)
    console.log(
      'curriculo_snapshot populated?',
      !!response.data?.curriculo_snapshot
    )

    if (response.status === 201) {
      console.log('Candidatura created successfully:', response.data)
      return NextResponse.json(
        {
          success: true,
          candidatura: response.data,
        },
        { status: 201 }
      )
    }

    // Handle non-201 responses
    console.error('Unexpected response status:', response.status)
    return NextResponse.json(
      { error: 'Erro ao criar candidatura' },
      { status: response.status }
    )
  } catch (error: any) {
    console.error('Error creating candidatura:', error)

    // Try to extract error message from response
    const errorMessage = error?.message || 'Unknown error'
    const errorResponse = error?.response

    // Map specific backend errors to user-friendly messages
    if (
      errorMessage.includes('já existe') ||
      errorMessage.includes('já se candidatou')
    ) {
      return NextResponse.json(
        { error: 'Este CPF já está inscrito nesta vaga' },
        { status: 409 }
      )
    }

    if (
      errorMessage.includes('não encontrada') ||
      errorMessage.includes('not found')
    ) {
      return NextResponse.json(
        { error: 'Vaga não encontrada' },
        { status: 404 }
      )
    }

    if (
      errorMessage.includes('expirada') ||
      errorMessage.includes('não está ativa') ||
      errorMessage.includes('expired')
    ) {
      return NextResponse.json(
        { error: 'Esta vaga não está mais ativa' },
        { status: 400 }
      )
    }

    // Check if it's a validation error (400)
    if (errorResponse?.status === 400) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          message: errorMessage,
        },
        { status: 400 }
      )
    }

    // Check if it's a conflict error (409)
    if (errorResponse?.status === 409) {
      return NextResponse.json(
        { error: 'Este CPF já está inscrito nesta vaga' },
        { status: 409 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Erro interno ao criar candidatura',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
