import type {
  ModelsPrefRioService,
  ModelsPrefRioServiceRequest,
} from '@/http-busca-search/models'
import type { Service, ServiceButton, ServiceListItem } from '@/types/service'

// ServiceFormData type from the form component
export interface ServiceFormData {
  managingOrgan: string
  serviceCategory: string
  serviceSubcategory: string
  targetAudience: string
  title: string
  shortDescription: string
  buttons?: ServiceButton[]
  whatServiceDoesNotCover?: string
  serviceTime?: string
  serviceCost?: string
  isFree?: boolean
  requestResult?: string
  fullDescription?: string
  requiredDocuments?: string
  instructionsForRequester?: string
  digitalChannels?: string[]
  physicalChannels?: string[]
  legislacaoRelacionada?: string[]
}

/**
 * Get current Unix timestamp for published_at field
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Transform frontend form data to API request format
 */
export function transformToApiRequest(
  formData: ServiceFormData
): ModelsPrefRioServiceRequest & {
  is_free?: boolean
  buttons?: ServiceButton[]
} {
  const apiRequest: any = {
    nome_servico: formData.title,
    resumo: formData.shortDescription,
    descricao_completa: formData.fullDescription || '',
    orgao_gestor: [formData.managingOrgan],
    tema_geral: formData.serviceCategory,
    sub_categoria: formData.serviceSubcategory,
    publico_especifico: [formData.targetAudience],
    custo_servico: formData.serviceCost || '',
    tempo_atendimento: formData.serviceTime || '',
    resultado_solicitacao: formData.requestResult || '',
    servico_nao_cobre: formData.whatServiceDoesNotCover,
    instrucoes_solicitante: formData.instructionsForRequester,
    documentos_necessarios: formData.requiredDocuments
      ? [formData.requiredDocuments]
      : undefined,
    canais_digitais: formData.digitalChannels?.filter(
      channel => channel.trim() !== ''
    ),
    canais_presenciais: formData.physicalChannels?.filter(
      channel => channel.trim() !== ''
    ),
    legislacao_relacionada: formData.legislacaoRelacionada?.filter(
      legislacao => legislacao.trim() !== ''
    ),
    is_free: formData.isFree,
    status: 0, // Default to draft status
  }

  // Add buttons if they exist and are not empty
  if (formData.buttons && formData.buttons.length > 0) {
    apiRequest.buttons = formData.buttons
  }

  return apiRequest
}

/**
 * Transform API response to frontend service format
 */
export function transformFromApiResponse(
  apiService: ModelsPrefRioService
): Service {
  return {
    id: apiService.id || '',
    title: apiService.nome_servico,
    shortDescription: apiService.resumo,
    fullDescription: apiService.descricao_completa,
    managingOrgan: apiService.orgao_gestor?.[0] || '',
    serviceCategory: apiService.tema_geral,
    serviceSubcategory: apiService.sub_categoria,
    targetAudience: apiService.publico_especifico?.[0] || '',
    buttons: (apiService as any).buttons || undefined,
    serviceCost: apiService.custo_servico,
    serviceTime: apiService.tempo_atendimento,
    requestResult: apiService.resultado_solicitacao,
    whatServiceDoesNotCover: apiService.servico_nao_cobre,
    instructionsForRequester: apiService.instrucoes_solicitante,
    requiredDocuments: apiService.documentos_necessarios?.join('\n'),
    digitalChannels: apiService.canais_digitais || [],
    physicalChannels: apiService.canais_presenciais || [],
    legislacaoRelacionada: apiService.legislacao_relacionada || [],
    status: getStatusFromNumber(apiService.status),
    isFree: apiService.is_free,
    created_at: apiService.created_at
      ? new Date(apiService.created_at * 1000)
      : new Date(),
    last_update: new Date(apiService.last_update || (Date.now() / 1000) * 1000),
    published_at: apiService.published_at
      ? new Date(apiService.published_at * 1000)
      : null,
    author: apiService.autor,
  }
}

/**
 * Transform API response to frontend service list item format
 */
export function transformToServiceListItem(
  apiService: ModelsPrefRioService
): ServiceListItem {
  return {
    id: apiService.id || '',
    title: apiService.nome_servico,
    managingOrgan: apiService.orgao_gestor?.[0] || '',
    status: getStatusFromNumber(apiService.status),
    last_update: new Date(apiService.last_update || (Date.now() / 1000) * 1000),
    published_at: apiService.published_at
      ? new Date(apiService.published_at * 1000)
      : null,
  }
}

/**
 * Transform frontend service to form data format
 */
export function transformToFormData(service: Service): ServiceFormData {
  return {
    managingOrgan: service.managingOrgan,
    serviceCategory: service.serviceCategory,
    serviceSubcategory: service.serviceSubcategory || '',
    targetAudience: service.targetAudience,
    title: service.title,
    shortDescription: service.shortDescription,
    buttons: service.buttons,
    whatServiceDoesNotCover: service.whatServiceDoesNotCover,
    serviceTime: service.serviceTime,
    serviceCost: service.serviceCost,
    isFree: service.isFree,
    requestResult: service.requestResult,
    fullDescription: service.fullDescription,
    requiredDocuments: service.requiredDocuments,
    instructionsForRequester: service.instructionsForRequester,
    digitalChannels: service.digitalChannels,
    physicalChannels: service.physicalChannels,
    legislacaoRelacionada: service.legislacaoRelacionada,
  }
}

/**
 * Convert numeric status to string status
 */
function getStatusFromNumber(
  status?: number
): 'published' | 'in_edition' | 'awaiting_approval' {
  switch (status) {
    case 1:
      return 'published'
    default:
      return 'in_edition'
  }
}

/**
 * Convert string status to numeric status
 */
export function getNumberFromStatus(
  status: 'published' | 'in_edition' | 'awaiting_approval'
): number {
  switch (status) {
    case 'published':
      return 1
    default:
      return 0
  }
}

/**
 * Get API query parameters for filtering
 */
export function getApiFilters(filters: {
  status?: 'published' | 'in_edition' | 'awaiting_approval'
  search?: string
  managingOrgan?: string
  page?: number
  perPage?: number
}) {
  const params: Record<string, string> = {}

  if (filters.status) {
    // For the API, we need to handle status differently
    // The API might expect different status values or handle awaiting_approval differently
    if (filters.status === 'published') {
      params.status = '1'
    } else if (filters.status === 'in_edition') {
      params.status = '0'
    } else if (filters.status === 'awaiting_approval') {
      // This might need special handling in the API or backend logic
      params.awaiting_approval = 'true'
    }
  }

  if (filters.search?.trim()) {
    params.q = filters.search.trim()
  }

  if (filters.managingOrgan?.trim()) {
    params.orgao_gestor = filters.managingOrgan.trim()
  }

  if (filters.page) {
    params.page = filters.page.toString()
  }

  if (filters.perPage) {
    params.per_page = filters.perPage.toString()
  }

  return params
}
