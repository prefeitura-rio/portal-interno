import type { MEIProposal, ProposalStatus } from '@/hooks/use-mei-proposals'
import type {
  GetApiV1OportunidadesMeiIdPropostas200,
  GetApiV1OportunidadesMeiIdPropostasParams,
  ModelsPropostaMEI,
} from '@/http-gorio/models'
import { getApiV1OportunidadesMeiIdPropostas } from '@/http-gorio/propostas-mei/propostas-mei'
import { NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = Number.parseInt(resolvedParams.id)

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid opportunity ID' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') || '1')
    const perPage = Number.parseInt(searchParams.get('per_page') || '10')
    const statusFilter = searchParams.get('status') as ProposalStatus | null
    const searchQuery = searchParams.get('search')

    // Map frontend status to backend status for API filter
    const mapStatusToBackend = (status: ProposalStatus): string => {
      switch (status) {
        case 'approved':
          return 'approved'
        case 'rejected':
          return 'rejected'
        case 'pending':
          return 'submitted'
        default:
          return 'submitted'
      }
    }

    // Build API params with filters using the orval-generated type
    const apiParams: GetApiV1OportunidadesMeiIdPropostasParams = {
      page,
      pageSize: perPage,
    }

    // Add status filter if provided
    if (statusFilter) {
      apiParams.status = mapStatusToBackend(statusFilter)
    }

    // If search query is provided, determine if it's a CNPJ or company name
    // Send only the appropriate parameter to the API
    if (searchQuery) {
      // Remove non-numeric characters to check if it's a CNPJ
      const numericOnly = searchQuery.replace(/[^\d]/g, '')

      // If it's mostly numbers and has at least 11 digits, treat as CNPJ
      // Otherwise, treat as company name
      if (numericOnly.length >= 11) {
        apiParams.cnpj = searchQuery
      } else {
        apiParams.nomeEmpresa = searchQuery
      }
    }

    console.log(
      `Fetching proposals for opportunity ${id} with params:`,
      apiParams
    )

    // Call backend API with filters
    const response = await getApiV1OportunidadesMeiIdPropostas(id, apiParams)

    if (response.status !== 200) {
      console.error('Error fetching proposals:', response)
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: response.status }
      )
    }

    const backendData = response.data as GetApiV1OportunidadesMeiIdPropostas200

    console.log(
      `API returned ${(backendData as any).data?.length || 0} proposals from backend`,
      `Meta:`,
      (backendData as any).meta
    )

    // Map backend status_cidadao to frontend status
    const mapStatusToFrontend = (backendStatus: string): ProposalStatus => {
      switch (backendStatus) {
        case 'approved':
          return 'approved'
        case 'rejected':
          return 'rejected'
        case 'submitted':
          return 'pending'
        default:
          return 'pending'
      }
    }

    // Fetch summary data WITHOUT filters (to show total counts)
    const summaryResponse = await getApiV1OportunidadesMeiIdPropostas(id, {
      page: 1,
      pageSize: 1000, // Get all proposals to calculate accurate summary
    })

    const summaryData =
      summaryResponse.data as GetApiV1OportunidadesMeiIdPropostas200
    const allProposals = ((summaryData as any).data || [])
      .map((proposta: ModelsPropostaMEI) => {
        if (!proposta || !proposta.id) return null
        return {
          status: mapStatusToFrontend(proposta.status_cidadao || 'submitted'),
        }
      })
      .filter((p: any) => p !== null)

    // Calculate summary from ALL proposals (regardless of filters)
    const summary = {
      approvedCount: allProposals.filter((p: any) => p.status === 'approved')
        .length,
      pendingCount: allProposals.filter((p: any) => p.status === 'pending')
        .length,
      rejectedCount: allProposals.filter((p: any) => p.status === 'rejected')
        .length,
    }

    // Transform backend data to frontend format
    const proposals: MEIProposal[] = ((backendData as any).data || [])
      .map((proposta: ModelsPropostaMEI & { mei_empresa?: any }) => {
        if (!proposta || !proposta.id) return null

        // Use status_cidadao as the actual proposal status
        const frontendStatus = mapStatusToFrontend(
          proposta.status_cidadao || 'submitted'
        )

        const meiEmpresa = proposta.mei_empresa || {}

        // Build address from MEI empresa data (without city and state to avoid duplication)
        const addressParts = [
          meiEmpresa.logradouro,
          meiEmpresa.numero,
          meiEmpresa.bairro,
        ].filter(Boolean)
        const address =
          addressParts.length > 0 ? addressParts.join(', ') : undefined

        return {
          id: proposta.id.toString(),
          opportunityId: id,
          companyName:
            meiEmpresa.nome_fantasia || meiEmpresa.razao_social || '',
          cnpj: meiEmpresa.cnpj || '',
          mei_empresa_id: proposta.mei_empresa_id || undefined,
          amount: proposta.valor_proposta || 0,
          submittedAt: proposta.created_at || new Date().toISOString(),
          email: meiEmpresa.email || '',
          phone: meiEmpresa.whatsapp || undefined,
          address,
          status: frontendStatus,
          aceita_custos_integrais: proposta.aceita_custos_integrais,
          prazo_execucao: proposta.prazo_execucao,
          celular_pessoa_fisica: proposta.celular_pessoa_fisica,
          email_pessoa_fisica: proposta.email_pessoa_fisica,
        }
      })
      .filter((p: any) => p !== null)

    // Build pagination info from backend response
    // Backend now handles all filtering (status, search), so meta.total is accurate
    const meta = (backendData as any).meta || {}
    const total = meta.total || proposals.length
    const totalPages = meta.total_pages || Math.ceil(total / perPage)

    const pagination = {
      page,
      perPage,
      total,
      totalPages,
    }

    console.log(
      `Returning ${proposals.length} proposals (total: ${total}, page: ${page}/${totalPages})`
    )

    const jsonResponse = NextResponse.json({
      proposals,
      summary,
      pagination,
      success: true,
    })

    // Add no-cache headers to ensure fresh data
    jsonResponse.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    )
    jsonResponse.headers.set('Pragma', 'no-cache')
    jsonResponse.headers.set('Expires', '0')

    return jsonResponse
  } catch (error) {
    console.error('Error in proposals route:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
