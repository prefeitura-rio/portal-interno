import type { ModelsButton } from '@/http-busca-search/models/modelsButton'
import type { ModelsPrefRioService } from '@/http-busca-search/models/modelsPrefRioService'
import type { ServiceButton } from '@/types/service'

interface ServiceFormData {
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
 * Maps form data to the ModelsPrefRioService format expected by preview components
 */
export function mapFormDataToPreview(
  formData: ServiceFormData
): ModelsPrefRioService {
  // Map ServiceButton[] to ModelsButton[]
  const mappedButtons: ModelsButton[] | undefined = formData.buttons?.map(
    button => ({
      titulo: button.titulo,
      descricao: button.descricao,
      url_service: button.url_service,
      is_enabled: button.is_enabled,
      ordem: button.ordem,
    })
  )

  return {
    nome_servico: formData.title,
    resumo: formData.shortDescription,
    autor: '', // Not used in preview
    custo_servico: formData.serviceCost || '',
    descricao_completa: formData.fullDescription || '',
    resultado_solicitacao: formData.requestResult || '',
    tema_geral: formData.serviceCategory,
    tempo_atendimento: formData.serviceTime || '',
    orgao_gestor: [formData.managingOrgan],
    buttons: mappedButtons,
    canais_digitais: formData.digitalChannels?.filter(c => c.trim() !== ''),
    canais_presenciais: formData.physicalChannels?.filter(c => c.trim() !== ''),
    documentos_necessarios: formData.requiredDocuments
      ? [formData.requiredDocuments]
      : undefined,
    instrucoes_solicitante: formData.instructionsForRequester,
    servico_nao_cobre: formData.whatServiceDoesNotCover,
    legislacao_relacionada: formData.legislacaoRelacionada?.filter(
      l => l.trim() !== ''
    ),
    sub_categoria: formData.serviceSubcategory,
    is_free: formData.isFree,
    last_update: Math.floor(Date.now() / 1000), // Current timestamp in seconds
  }
}
