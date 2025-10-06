export type ProposalStatus = 'approved' | 'pending' | 'rejected'

export interface MEIProposal {
  id: string
  opportunityId: number
  companyName: string
  cnpj: string
  amount: number
  submittedAt: string
  email: string
  phone?: string
  address?: string
  status: ProposalStatus
}

export interface MEIProposalSummary {
  approvedCount: number
  pendingCount: number
  rejectedCount: number
}

// Simple in-memory mock store
// Propostas relacionadas às oportunidades MEI existentes
const mockProposals: MEIProposal[] = [
  // Propostas para "Curso de Gestão Financeira para MEI" (id: 1)
  {
    id: 'p1',
    opportunityId: 1,
    companyName: 'Alpha Serviços MEI',
    cnpj: '12.345.678/0001-90',
    amount: 8500,
    submittedAt: '2024-01-20T12:00:00Z',
    email: 'contato@alphaservicos.com',
    phone: '(21) 99999-0001',
    address: 'Rua A, 100 - Centro',
    status: 'pending',
  },
  {
    id: 'p2',
    opportunityId: 1,
    companyName: 'Beta Tech MEI',
    cnpj: '23.456.789/0001-01',
    amount: 9200,
    submittedAt: '2024-01-22T09:30:00Z',
    email: 'comercial@betatech.com',
    phone: '(21) 98888-2222',
    address: 'Av. B, 200 - Zona Sul',
    status: 'approved',
  },
  {
    id: 'p3',
    opportunityId: 1,
    companyName: 'Gamma Limpeza MEI',
    cnpj: '34.567.890/0001-12',
    amount: 7800,
    submittedAt: '2024-01-23T15:45:00Z',
    email: 'vendas@gammalimpeza.com',
    phone: '(21) 97777-3333',
    address: 'Rua C, 300 - Centro',
    status: 'rejected',
  },
  {
    id: 'p4',
    opportunityId: 1,
    companyName: 'Delta Consultoria MEI',
    cnpj: '45.678.901/0001-23',
    amount: 11000,
    submittedAt: '2024-01-25T10:15:00Z',
    email: 'contato@deltaconsultoria.com',
    phone: '(21) 96666-4444',
    address: 'Av. D, 400 - Zona Norte',
    status: 'pending',
  },
  // Propostas para "Workshop de Marketing Digital" (id: 2)
  {
    id: 'p5',
    opportunityId: 2,
    companyName: 'Echo Marketing MEI',
    cnpj: '56.789.012/0001-34',
    amount: 6500,
    submittedAt: '2024-01-12T11:10:00Z',
    email: 'contato@echomarketing.com',
    phone: '(21) 95555-5555',
    address: 'Rua E, 500 - Zona Sul',
    status: 'approved',
  },
  {
    id: 'p6',
    opportunityId: 2,
    companyName: 'Foxtrot Digital MEI',
    cnpj: '67.890.123/0001-45',
    amount: 7200,
    submittedAt: '2024-01-15T14:20:00Z',
    email: 'vendas@foxtrotdigital.com',
    phone: '(21) 94444-6666',
    address: 'Av. F, 600 - Centro',
    status: 'pending',
  },
  // Propostas para "Programa de Microcrédito" (id: 4)
  {
    id: 'p7',
    opportunityId: 4,
    companyName: 'Golf Finanças MEI',
    cnpj: '78.901.234/0001-56',
    amount: 15000,
    submittedAt: '2024-01-18T09:30:00Z',
    email: 'contato@golffinancas.com',
    phone: '(21) 93333-7777',
    address: 'Rua G, 700 - Zona Norte',
    status: 'approved',
  },
  {
    id: 'p8',
    opportunityId: 4,
    companyName: 'Hotel Investimentos MEI',
    cnpj: '89.012.345/0001-67',
    amount: 12000,
    submittedAt: '2024-01-19T16:45:00Z',
    email: 'investimentos@hotelmei.com',
    phone: '(21) 92222-8888',
    address: 'Av. H, 800 - Barra da Tijuca',
    status: 'pending',
  },
  {
    id: 'p9',
    opportunityId: 4,
    companyName: 'India Capital MEI',
    cnpj: '90.123.456/0001-78',
    amount: 18000,
    submittedAt: '2024-01-21T11:00:00Z',
    email: 'capital@indiammei.com',
    phone: '(21) 91111-9999',
    address: 'Rua I, 900 - Zona Sul',
    status: 'rejected',
  },
  // Propostas para "Feira de Negócios MEI" (id: 5) - expirada
  {
    id: 'p10',
    opportunityId: 5,
    companyName: 'Juliet Eventos MEI',
    cnpj: '01.234.567/0001-89',
    amount: 3000,
    submittedAt: '2023-12-15T08:00:00Z',
    email: 'eventos@julietmei.com',
    phone: '(21) 90000-0000',
    address: 'Av. J, 1000 - Centro',
    status: 'approved',
  },
]

export function getProposalsByOpportunityId(
  opportunityId: number,
  params?: {
    page?: number
    perPage?: number
    status?: ProposalStatus
    search?: string
  }
): { proposals: MEIProposal[]; total: number; summary: MEIProposalSummary } {
  const page = params?.page ?? 1
  const perPage = params?.perPage ?? 10
  const status = params?.status
  const search = params?.search?.toLowerCase() ?? ''

  let filtered = mockProposals.filter(p => p.opportunityId === opportunityId)
  if (status) {
    filtered = filtered.filter(p => p.status === status)
  }
  if (search) {
    filtered = filtered.filter(
      p =>
        p.companyName.toLowerCase().includes(search) ||
        p.cnpj.toLowerCase().includes(search)
    )
  }

  const summary: MEIProposalSummary = {
    approvedCount: filtered.filter(p => p.status === 'approved').length,
    pendingCount: filtered.filter(p => p.status === 'pending').length,
    rejectedCount: filtered.filter(p => p.status === 'rejected').length,
  }

  const total = filtered.length
  const start = (page - 1) * perPage
  const end = start + perPage
  const paged = filtered.slice(start, end)

  return { proposals: paged, total, summary }
}

export function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus
): MEIProposal | null {
  const idx = mockProposals.findIndex(p => p.id === proposalId)
  if (idx === -1) return null
  mockProposals[idx] = { ...mockProposals[idx], status }
  return mockProposals[idx]
}

export function updateMultipleProposalStatuses(
  proposalIds: string[],
  status: ProposalStatus
): boolean {
  let updated = 0
  proposalIds.forEach(id => {
    const idx = mockProposals.findIndex(p => p.id === id)
    if (idx !== -1) {
      mockProposals[idx] = { ...mockProposals[idx], status }
      updated++
    }
  })
  return updated > 0
}
