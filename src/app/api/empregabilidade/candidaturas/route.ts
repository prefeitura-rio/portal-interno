import { getApiV1EmpregabilidadeCandidaturas } from '@/http-gorio/empregabilidade-candidaturas/empregabilidade-candidaturas'
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
    const idVaga = searchParams.get('id_vaga') || searchParams.get('empregabilidadeId') || undefined
    const search = searchParams.get('search') || undefined

    const params: any = {
      page,
      page_size: pageSize,
    }

    if (status) {
      params.status = status
    }

    if (idVaga) {
      params.id_vaga = idVaga
    }

    if (search) {
      params.cpf = search
    }

    console.log('Fetching candidaturas with params:', params)

    // Call Orval client
    const response = await getApiV1EmpregabilidadeCandidaturas(params)

    console.log('API Response status:', response.status)

    if (response.status === 200) {
      const data = response.data as any

      // Map backend candidaturas to frontend format
      const candidatos = (data.candidaturas || []).map((c: any) => ({
        id: c.id,
        candidateName: c.curriculo_snapshot?.nome || c.curriculo_snapshot?.nome_completo || 'Nome não disponível',
        cpf: c.cpf,
        email: c.curriculo_snapshot?.email || '',
        phone: c.curriculo_snapshot?.telefone || c.curriculo_snapshot?.celular || '',
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
        pendingCount: candidatos.filter((c: any) => c.status === 'pending').length,
        approvedCount: candidatos.filter((c: any) => c.status === 'approved').length,
        rejectedCount: candidatos.filter((c: any) => c.status === 'rejected').length,
        cancelledCount: candidatos.filter((c: any) => c.status === 'cancelled').length,
      }

      return NextResponse.json({
        candidatos,
        summary,
        pagination: {
          page,
          perPage: pageSize,
          total: data.total || candidatos.length,
          totalPages: data.total_pages || Math.ceil(candidatos.length / pageSize),
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
