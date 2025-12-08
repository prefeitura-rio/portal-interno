import type { ModelsPrefRioService } from '@/http-busca-search/models'

export interface ServiceListItem {
  id: string
  title: string
  managingOrgan: string
  published_at: Date | null
  last_update: Date
  status: ServiceStatus
}

export type ServiceStatus = 'published' | 'awaiting_approval' | 'in_edition'

export interface ServiceStatusConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}

export interface ServiceFilters {
  status?: ServiceStatus[]
  managingOrgan?: string[]
  search?: string
}

// Service Button model
export interface ServiceButton {
  titulo: string
  descricao: string
  url_service: string
  is_enabled: boolean
  ordem: number
}

// Service model that matches the form structure (Frontend model)
export interface Service {
  id: string
  managingOrgan: string // Will convert from orgao_gestor: string[]
  serviceCategory: string // Maps to tema_geral: string
  serviceSubcategory?: string // Maps to sub_categoria: string
  targetAudience: string // Will convert from publico_especifico: string[]
  title: string // Maps to nome_servico: string
  shortDescription: string // Maps to resumo: string
  buttons?: ServiceButton[] // Maps to buttons: ServiceButton[]
  whatServiceDoesNotCover?: string // Maps to servico_nao_cobre: string
  serviceTime?: string // Maps to tempo_atendimento: string
  serviceCost?: string // Maps to custo_servico: string
  isFree?: boolean // Maps to is_free: boolean
  requestResult?: string // Maps to resultado_solicitacao: string
  fullDescription?: string // Maps to descricao_completa: string
  requiredDocuments?: string // Will convert from documentos_necessarios: string[]
  instructionsForRequester?: string // Maps to instrucoes_solicitante: string
  digitalChannels?: string[] // Maps to canais_digitais: string[]
  physicalChannels?: string[] // Maps to canais_presenciais: string[]
  legislacaoRelacionada?: string[] // Maps to legislacao_relacionada: string[]
  status: ServiceStatus // Derived from status: number + awaiting_approval: boolean
  published_at?: Date | null // Convert from published_at: number
  last_update: Date // Convert from last_update: number
  created_at: Date // Convert from created_at: number
  author?: string // Maps to autor: string
  slug?: string // Maps to slug: string
}

// API Response model (exact match with ModelsPrefRioService)
export interface ApiService {
  id?: string
  autor: string
  awaiting_approval?: boolean
  canais_digitais?: string[]
  canais_presenciais?: string[]
  created_at?: number
  custo_servico: string
  descricao_completa: string
  documentos_necessarios?: string[]
  embedding?: number[]
  fixar_destaque?: boolean
  instrucoes_solicitante?: string
  last_update?: number
  published_at?: number
  is_free?: boolean
  legislacao_relacionada?: string[]
  nome_servico: string
  orgao_gestor: string[]
  publico_especifico?: string[]
  resultado_solicitacao: string
  resumo: string
  search_content?: string
  servico_nao_cobre?: string
  status?: number // 0=Draft, 1=Published
  sub_categoria?: string
  tema_geral: string
  tempo_atendimento: string
  buttons?: Array<{
    titulo: string
    descricao: string
    url_service: string
    is_enabled: boolean
    ordem: number
  }>
}

// Utility functions to convert between API and Frontend models
export const convertApiToFrontend = (apiService: ModelsPrefRioService): Service => {
  // Determine status based on API fields
  let status: ServiceStatus = 'in_edition' // default

  if (apiService.status === 1) {
    status = 'published'
  } else if (apiService.status === 0) {
    if (apiService.awaiting_approval === true) {
      status = 'awaiting_approval'
    } else {
      status = 'in_edition'
    }
  }

  return {
    id: apiService.id || '',
    managingOrgan: apiService.orgao_gestor?.[0] || '', // Take first organ
    serviceCategory: apiService.tema_geral,
    serviceSubcategory: apiService.sub_categoria,
    targetAudience: apiService.publico_especifico?.[0] || '', // Take first audience
    title: apiService.nome_servico,
    shortDescription: apiService.resumo,
    buttons: (apiService as any).buttons || undefined,
    whatServiceDoesNotCover: apiService.servico_nao_cobre,
    serviceTime: apiService.tempo_atendimento,
    serviceCost: apiService.custo_servico,
    isFree: apiService.is_free,
    requestResult: apiService.resultado_solicitacao,
    fullDescription: apiService.descricao_completa,
    requiredDocuments: apiService.documentos_necessarios?.join(', '), // Join array to string
    instructionsForRequester: apiService.instrucoes_solicitante,
    digitalChannels: apiService.canais_digitais,
    physicalChannels: apiService.canais_presenciais,
    legislacaoRelacionada: apiService.legislacao_relacionada,
    status,
    published_at: apiService.published_at
      ? new Date(apiService.published_at * 1000)
      : null,
    last_update: new Date((apiService.last_update || Date.now()) * 1000),
    created_at: new Date((apiService.created_at || Date.now()) * 1000),
    slug: apiService.slug,
  }
}

export const convertFrontendToApi = (
  frontendService: Service
): Partial<ModelsPrefRioService> => {
  // Determine API status and awaiting_approval from frontend status
  let apiStatus = 0
  let awaitingApproval = false

  switch (frontendService.status) {
    case 'published':
      apiStatus = 1
      awaitingApproval = false
      break
    case 'awaiting_approval':
      apiStatus = 0
      awaitingApproval = true
      break
    case 'in_edition':
      apiStatus = 0
      awaitingApproval = false
      break
  }

  return {
    id: frontendService.id,
    autor: '', // This should come from user context
    awaiting_approval: awaitingApproval,
    canais_digitais: frontendService.digitalChannels,
    canais_presenciais: frontendService.physicalChannels,
    legislacao_relacionada: frontendService.legislacaoRelacionada,
    created_at: Math.floor(frontendService.created_at.getTime() / 1000),
    custo_servico: frontendService.serviceCost || '',
    descricao_completa: frontendService.fullDescription || '',
    documentos_necessarios: frontendService.requiredDocuments
      ? frontendService.requiredDocuments.split(', ')
      : [],
    instrucoes_solicitante: frontendService.instructionsForRequester,
    last_update: Math.floor(frontendService.last_update.getTime() / 1000),
    buttons: frontendService.buttons,
    published_at: frontendService.published_at
      ? Math.floor(frontendService.published_at.getTime() / 1000)
      : undefined,
    is_free: frontendService.isFree,
    nome_servico: frontendService.title,
    orgao_gestor: [frontendService.managingOrgan], // Convert single to array
    publico_especifico: [frontendService.targetAudience], // Convert single to array
    resultado_solicitacao: frontendService.requestResult || '',
    resumo: frontendService.shortDescription,
    servico_nao_cobre: frontendService.whatServiceDoesNotCover,
    status: apiStatus,
    sub_categoria: frontendService.serviceSubcategory,
    tema_geral: frontendService.serviceCategory,
    tempo_atendimento: frontendService.serviceTime || '',
  } as Partial<ModelsPrefRioService>
}
