export interface MEIOpportunity {
  id: number
  title: string
  activity_type: string
  activity_specification: string
  description: string
  execution_location: string
  address: string
  number: string
  neighborhood: string
  opportunity_expiration_date: string
  service_execution_deadline: string
  gallery_images?: Array<{ id: string; url: string }>
  cover_image?: string
  status: 'active' | 'expired' | 'draft'
  created_at: string
  updated_at: string
  orgao: {
    id: number
    nome: string
  }
  orgao_id: number
}

// Mock data for MEI Opportunities - unified source
export const mockMEIOpportunities: MEIOpportunity[] = [
  {
    id: 1,
    title: 'Curso de Gestão Financeira para MEI',
    activity_type: 'Educação e Capacitação',
    activity_specification:
      'Curso completo de gestão financeira para microempreendedores individuais',
    description:
      'Oportunidade para MEI participar de curso completo de gestão financeira, incluindo planejamento, controle de fluxo de caixa e análise de resultados.',
    execution_location: 'Centro de Capacitação Municipal',
    address: 'Rua da Educação',
    number: '100',
    neighborhood: 'Centro',
    opportunity_expiration_date: '2024-03-15T23:59:59Z',
    service_execution_deadline: '2024-04-15T23:59:59Z',
    gallery_images: [
      {
        id: '1',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
      {
        id: '2',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
    ],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    orgao: {
      id: 1,
      nome: 'Secretaria de Desenvolvimento Econômico',
    },
    orgao_id: 1,
  },
  {
    id: 2,
    title: 'Workshop de Marketing Digital',
    activity_type: 'Marketing e Vendas',
    activity_specification:
      'Workshop prático de marketing digital para pequenos negócios',
    description:
      'Oportunidade para MEI participar de workshop prático de marketing digital, incluindo redes sociais, SEO e publicidade online.',
    execution_location: 'Centro de Tecnologia Municipal',
    address: 'Avenida da Tecnologia',
    number: '250',
    neighborhood: 'Zona Sul',
    opportunity_expiration_date: '2024-02-10T23:59:59Z',
    service_execution_deadline: '2024-03-10T23:59:59Z',
    gallery_images: [
      {
        id: '3',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
    ],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'expired',
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z',
    orgao: {
      id: 2,
      nome: 'Secretaria de Tecnologia',
    },
    orgao_id: 2,
  },
  {
    id: 3,
    title: 'Consultoria em Planejamento Tributário',
    activity_type: 'Consultoria',
    activity_specification:
      'Consultoria especializada em planejamento tributário para MEI',
    description:
      'Oportunidade para MEI receber consultoria especializada em planejamento tributário, incluindo análise de regime tributário e otimização de impostos.',
    execution_location: 'Secretaria da Fazenda',
    address: 'Praça da República',
    number: '456',
    neighborhood: 'Centro',
    opportunity_expiration_date: '2024-04-30T23:59:59Z',
    service_execution_deadline: '2024-05-30T23:59:59Z',
    gallery_images: [],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'draft',
    created_at: '2024-01-20T09:15:00Z',
    updated_at: '2024-01-20T09:15:00Z',
    orgao: {
      id: 3,
      nome: 'Secretaria da Fazenda',
    },
    orgao_id: 3,
  },
  {
    id: 4,
    title: 'Programa de Microcrédito',
    activity_type: 'Financiamento',
    activity_specification:
      'Programa de microcrédito com juros baixos para MEI',
    description:
      'Oportunidade para MEI acessar programa de microcrédito com juros baixos para investimento em equipamentos e capital de giro.',
    execution_location: 'Agência de Desenvolvimento',
    address: 'Rua do Comércio',
    number: '789',
    neighborhood: 'Centro',
    opportunity_expiration_date: '2024-06-05T23:59:59Z',
    service_execution_deadline: '2024-07-05T23:59:59Z',
    gallery_images: [
      {
        id: '4',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
      {
        id: '5',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
    ],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'active',
    created_at: '2024-01-05T08:00:00Z',
    updated_at: '2024-01-05T08:00:00Z',
    orgao: {
      id: 1,
      nome: 'Secretaria de Desenvolvimento Econômico',
    },
    orgao_id: 1,
  },
  {
    id: 5,
    title: 'Feira de Negócios MEI',
    activity_type: 'Eventos e Networking',
    activity_specification:
      'Feira de negócios para networking e exposição de produtos/serviços MEI',
    description:
      'Oportunidade para MEI participar de feira de negócios para networking, exposição de produtos e serviços, e captação de clientes.',
    execution_location: 'Centro de Convenções',
    address: 'Avenida das Américas',
    number: '1000',
    neighborhood: 'Barra da Tijuca',
    opportunity_expiration_date: '2023-12-31T23:59:59Z',
    service_execution_deadline: '2024-01-31T23:59:59Z',
    gallery_images: [
      {
        id: '6',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
    ],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'expired',
    created_at: '2023-12-01T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z',
    orgao: {
      id: 4,
      nome: 'Secretaria de Turismo',
    },
    orgao_id: 4,
  },
  {
    id: 6,
    title: 'Rascunho - Serviços de Limpeza',
    activity_type: 'Limpeza e Conservação',
    activity_specification:
      'Serviços de limpeza e conservação de prédios públicos',
    description:
      'Oportunidade para MEI prestar serviços de limpeza e conservação em prédios públicos da prefeitura, incluindo limpeza de salas, corredores e áreas externas.',
    execution_location: 'Prefeitura Municipal',
    address: 'Praça da República',
    number: '456',
    neighborhood: 'Centro',
    opportunity_expiration_date: '2024-12-31T23:59:59Z',
    service_execution_deadline: '2025-01-31T23:59:59Z',
    gallery_images: [
      {
        id: '7',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
    ],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'draft',
    created_at: '2024-01-25T16:45:00Z',
    updated_at: '2024-01-25T16:45:00Z',
    orgao: {
      id: 5,
      nome: 'Secretaria de Administração',
    },
    orgao_id: 5,
  },
  {
    id: 7,
    title: 'Rascunho - Manutenção de Equipamentos',
    activity_type: 'Manutenção',
    activity_specification:
      'Manutenção preventiva e corretiva de equipamentos de informática',
    description:
      'Oportunidade para MEI realizar manutenção de equipamentos de informática da prefeitura, incluindo computadores, impressoras e outros dispositivos.',
    execution_location: 'Centro Municipal de Tecnologia',
    address: 'Rua da Tecnologia',
    number: '123',
    neighborhood: 'Centro',
    opportunity_expiration_date: '2024-11-30T23:59:59Z',
    service_execution_deadline: '2024-12-31T23:59:59Z',
    gallery_images: [
      {
        id: '8',
        url: 'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
      },
      {
        id: '9',
        url: 'https://storage.googleapis.com/rj-escritorio-dev-public/superapp/avatar2.png',
      },
    ],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'draft',
    created_at: '2024-01-28T11:20:00Z',
    updated_at: '2024-01-28T11:20:00Z',
    orgao: {
      id: 2,
      nome: 'Secretaria de Tecnologia',
    },
    orgao_id: 2,
  },
  {
    id: 8,
    title: 'Oportunidade Expirada - Consultoria',
    activity_type: 'Consultoria',
    activity_specification: 'Consultoria em gestão empresarial para MEI',
    description:
      'Oportunidade para MEI receber consultoria em gestão empresarial, incluindo planejamento estratégico e organização de processos.',
    execution_location: 'Centro de Apoio ao Empreendedor',
    address: 'Rua do Empreendedor',
    number: '321',
    neighborhood: 'Zona Norte',
    opportunity_expiration_date: '2023-11-30T23:59:59Z',
    service_execution_deadline: '2023-12-30T23:59:59Z',
    gallery_images: [],
    cover_image:
      'http://storage.googleapis.com/rj-escritorio-dev-public/superapp/png/banner/iptu.png',
    status: 'expired',
    created_at: '2023-11-01T13:30:00Z',
    updated_at: '2023-11-01T13:30:00Z',
    orgao: {
      id: 3,
      nome: 'Secretaria da Fazenda',
    },
    orgao_id: 3,
  },
]

// Helper function to get opportunity by ID
export function getMEIOpportunityById(
  id: string | number
): MEIOpportunity | undefined {
  const opportunityId = typeof id === 'string' ? Number.parseInt(id, 10) : id
  return mockMEIOpportunities.find(
    opportunity => opportunity.id === opportunityId
  )
}

// Helper function to get opportunities by status
export function getMEIOpportunitiesByStatus(
  status: 'active' | 'expired' | 'draft'
): MEIOpportunity[] {
  return mockMEIOpportunities.filter(
    opportunity => opportunity.status === status
  )
}
