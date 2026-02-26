import type { CandidatoStatus } from '@/hooks/use-candidatos'
import {
  getApiV1EmpregabilidadeCandidaturas,
  postApiV1EmpregabilidadeCandidaturas,
} from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
import { cleanCPF } from '@/lib/cpf-validator'
import {
  mapBackendStatusToFrontend,
  mapFrontendStatusToBackend,
} from '@/lib/status-config/empregabilidade'
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
    const etapaId = searchParams.get('etapa_id') || undefined

    const params: any = {
      page,
      pageSize: pageSize,
    }

    if (status) {
      params.status = mapFrontendStatusToBackend(status as CandidatoStatus)
    }

    if (idVaga) {
      params.vagaId = idVaga
    }

    if (search) {
      params.search = search
    }

    if (etapaId) {
      params.etapa_id = etapaId
    }

    // Call Orval client
    const response = await getApiV1EmpregabilidadeCandidaturas(params)

    if (response.status === 200) {
      const data = response.data as any

      // Backend returns { data: [...], meta: {...} } structure
      const candidaturas = data.data || data.candidaturas || []

      const mapCandidatura = (c: any) => {
        const vagaInfos =
          (c.vaga?.informacoes_complementares as any[] | undefined) || []

        return {
          id: c.id,
          candidateName:
            c.nome ||
            c.curriculo_snapshot?.nome ||
            c.curriculo_snapshot?.nome_completo ||
            'Nome não disponível',
          cpf: c.cpf,
          email: c.email || c.curriculo_snapshot?.email || '',
          phone:
            c.curriculo_snapshot?.telefone ||
            c.curriculo_snapshot?.celular ||
            '',
          enrollmentDate: c.created_at,
          status: mapBackendStatusToFrontend(c.status),
          /** Raw backend status for display (e.g. "Vaga congelada" vs "Vaga encerrada" when status is cancelled) */
          statusBackend: c.status,
          address: c.curriculo_snapshot?.endereco || '',
          neighborhood: c.curriculo_snapshot?.bairro || '',
          city: c.curriculo_snapshot?.cidade || '',
          state: c.curriculo_snapshot?.estado || '',
          currentEtapaId: c.id_etapa_atual ?? null,
          vaga: c.vaga
            ? {
                id: c.vaga.id,
                titulo: c.vaga.titulo,
                etapas: (c.vaga.etapas || [])
                  .slice()
                  .sort(
                    (a: { ordem: number }, b: { ordem: number }) =>
                      a.ordem - b.ordem
                  )
                  .map((e: any) => ({
                    id: e.id,
                    titulo: e.titulo,
                    descricao: e.descricao,
                    ordem: e.ordem,
                  })),
              }
            : undefined,
          customFields: (c.respostas_info_complementares || []).map(
            (r: any) => {
              const info =
                vagaInfos.find(inf => inf.id === r.id_info) || undefined

              return {
                id: r.id_info,
                title: info?.titulo || r.titulo || `Campo ${r.id_info}`,
                field_type: 'text',
                value: r.resposta,
              }
            }
          ),
          curriculo_snapshot: c.curriculo_snapshot ?? undefined,
        }
      }

      const candidatos = candidaturas.map(mapCandidatura)

      console.log(`Mapped ${candidatos.length} candidatos`)

      // Summary: use resumo from API when present (backend returns resumo with counts per status)
      let summary = {
        total: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        cancelledCount: 0,
      }
      const resumo = data.resumo as
        | {
            aprovada?: number
            candidatura_enviada?: number
            reprovada?: number
            vaga_congelada?: number
            vaga_descontinuada?: number
          }
        | undefined
      if (resumo) {
        const aprovada = resumo.aprovada ?? 0
        const candidaturaEnviada = resumo.candidatura_enviada ?? 0
        const reprovada = resumo.reprovada ?? 0
        const vagaCongelada = resumo.vaga_congelada ?? 0
        const vagaDescontinuada = resumo.vaga_descontinuada ?? 0
        summary = {
          total:
            aprovada +
            candidaturaEnviada +
            reprovada +
            vagaCongelada +
            vagaDescontinuada,
          pendingCount: candidaturaEnviada,
          approvedCount: aprovada,
          rejectedCount: reprovada,
          cancelledCount: vagaCongelada + vagaDescontinuada,
        }
      } else if (idVaga) {
        // Fallback: when API does not return resumo, fetch full list and compute (legacy)
        const summaryResponse = await getApiV1EmpregabilidadeCandidaturas({
          page: 1,
          pageSize: 10000,
          vagaId: idVaga,
        })
        if (summaryResponse.status === 200) {
          const summaryData = summaryResponse.data as any
          const allCandidaturas =
            summaryData.data || summaryData.candidaturas || []
          const allMapped = allCandidaturas.map(mapCandidatura)
          summary = {
            total: allMapped.length,
            pendingCount: allMapped.filter((c: any) => c.status === 'pending')
              .length,
            approvedCount: allMapped.filter((c: any) => c.status === 'approved')
              .length,
            rejectedCount: allMapped.filter((c: any) => c.status === 'rejected')
              .length,
            cancelledCount: allMapped.filter(
              (c: any) => c.status === 'cancelled'
            ).length,
          }
        }
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
