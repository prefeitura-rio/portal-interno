import type { MEIProposal, ProposalStatus } from '@/hooks/use-mei-proposals'
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

    // Build API params with filters
    const apiParams: {
      page?: number
      pageSize?: number
      nomeEmpresa?: string
      cnpj?: string
    } = {
      page,
      pageSize: perPage,
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
      apiParams,
      statusFilter ? `status filter: ${statusFilter}` : 'no status filter'
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

    const backendData = response.data as any

    console.log(
      `API returned ${backendData.data?.length || 0} proposals from backend`,
      `Meta:`,
      backendData.meta
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

    const summaryData = summaryResponse.data as any
    const allProposals = (summaryData.data || [])
      .map((proposta: any) => {
        if (!proposta || !proposta.id) return null
        return {
          status: mapStatusToFrontend(proposta.status_cidadao),
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
    const proposals: MEIProposal[] = (backendData.data || [])
      .map((proposta: any) => {
        if (!proposta || !proposta.id) return null

        // Use status_cidadao as the actual proposal status
        const frontendStatus = mapStatusToFrontend(proposta.status_cidadao)

        // Apply status filter on frontend if provided
        if (statusFilter && frontendStatus !== statusFilter) {
          return null
        }

        const meiEmpresa = proposta.mei_empresa || {}

        // Build address from MEI empresa data
        const addressParts = [
          meiEmpresa.logradouro,
          meiEmpresa.numero,
          meiEmpresa.bairro,
          meiEmpresa.cidade,
          meiEmpresa.estado,
        ].filter(Boolean)
        const address =
          addressParts.length > 0 ? addressParts.join(', ') : undefined

        return {
          id: proposta.id.toString(),
          opportunityId: id,
          companyName:
            meiEmpresa.nome_fantasia || meiEmpresa.razao_social || '',
          cnpj: meiEmpresa.cnpj || '',
          amount: proposta.valor_proposta || 0,
          submittedAt: proposta.created_at || new Date().toISOString(),
          email: meiEmpresa.email || '',
          phone: meiEmpresa.whatsapp || undefined,
          address,
          status: frontendStatus,
        }
      })
      .filter((p: any) => p !== null)

    // Build pagination info based on filtered results
    // Note: total reflects filtered count (from search), not status filter
    const meta = backendData.meta || {}
    const filteredTotal = statusFilter
      ? proposals.length // If status filter applied, count actual filtered proposals
      : meta.total || proposals.length // Otherwise use API's total
    const filteredTotalPages = Math.ceil(filteredTotal / perPage)

    const pagination = {
      page,
      perPage,
      total: filteredTotal,
      totalPages: filteredTotalPages,
    }

    console.log(
      `Returning ${proposals.length} proposals (filtered total: ${filteredTotal}, page: ${page}/${filteredTotalPages})`
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
