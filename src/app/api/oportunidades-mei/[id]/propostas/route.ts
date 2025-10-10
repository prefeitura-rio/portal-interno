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

    // Build API params
    const apiParams: {
      page?: number
      pageSize?: number
      nomeEmpresa?: string
      cnpj?: string
    } = {
      page,
      pageSize: perPage,
    }

    // If search query is provided, try to determine if it's a CNPJ or company name
    if (searchQuery) {
      // Simple heuristic: if it's mostly numbers, treat as CNPJ, otherwise as company name
      const isNumeric = /^\d+$/.test(searchQuery.replace(/[^\d]/g, ''))
      if (isNumeric && searchQuery.replace(/[^\d]/g, '').length >= 8) {
        apiParams.cnpj = searchQuery
      } else {
        apiParams.nomeEmpresa = searchQuery
      }
    }

    console.log(
      `Fetching proposals for opportunity ${id} with params:`,
      apiParams
    )

    // Call backend API
    const response = await getApiV1OportunidadesMeiIdPropostas(id, apiParams)

    if (response.status !== 200) {
      console.error('Error fetching proposals:', response)
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: response.status }
      )
    }

    const backendData = response.data as any

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

    // Transform backend data to frontend format
    const proposals: MEIProposal[] = (backendData.data || [])
      .map((proposta: any) => {
        if (!proposta || !proposta.id) return null

        // Use status_cidadao as the actual proposal status
        // status_admin seems to be for soft-delete purposes only (active/inactive)
        const frontendStatus = mapStatusToFrontend(proposta.status_cidadao)

        // Debug log to see what status we're getting from the API
        console.log(
          `Proposal ${proposta.id}: status_cidadao="${proposta.status_cidadao}" -> frontend="${frontendStatus}"`
        )

        // Skip proposals that don't match the status filter
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

    // Calculate summary
    const summary = {
      approvedCount: proposals.filter(p => p.status === 'approved').length,
      pendingCount: proposals.filter(p => p.status === 'pending').length,
      rejectedCount: proposals.filter(p => p.status === 'rejected').length,
    }

    // Build pagination info
    const meta = backendData.meta || {}
    const total = meta.total || proposals.length
    const totalPages = Math.ceil(total / perPage)

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
