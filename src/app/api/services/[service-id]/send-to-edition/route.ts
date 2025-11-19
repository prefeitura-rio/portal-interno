import {
  getApiV1AdminServices,
  putApiV1AdminServicesId,
} from '@/http-busca-search/admin/admin'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioServiceRequest } from '@/http-busca-search/models'
import { convertApiToFrontend } from '@/types/service'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ 'service-id': string }> }
) {
  try {
    const { 'service-id': serviceId } = await params

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    console.log('📤 Sending service to edition:', serviceId)

    // First, get the current service data
    const getResponse = await getApiV1AdminServices({
      field: 'id',
      value: serviceId,
      per_page: 1,
    })

    if (getResponse.status !== 200) {
      return NextResponse.json(
        { error: 'Failed to fetch service data' },
        { status: getResponse.status }
      )
    }

    const servicesData = getResponse.data
    const services = servicesData.services || []

    if (services.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const currentService = services[0]

    // Prepare the service data with status = 0 (draft) and awaiting_approval = false
    const serviceRequest = {
      nome_servico: currentService.nome_servico,
      resumo: currentService.resumo,
      descricao_completa: currentService.descricao_completa || '',
      orgao_gestor: currentService.orgao_gestor || [],
      tema_geral: currentService.tema_geral,
      publico_especifico: currentService.publico_especifico || [],
      custo_servico: currentService.custo_servico || '',
      tempo_atendimento: currentService.tempo_atendimento || '',
      resultado_solicitacao: currentService.resultado_solicitacao || '',
      servico_nao_cobre: currentService.servico_nao_cobre,
      instrucoes_solicitante: currentService.instrucoes_solicitante,
      documentos_necessarios: currentService.documentos_necessarios,
      canais_digitais: currentService.canais_digitais,
      canais_presenciais: currentService.canais_presenciais,
      legislacao_relacionada: currentService.legislacao_relacionada,
      buttons: (currentService as any).buttons || undefined, // Preserve buttons
      is_free: (currentService as any).is_free, // Preserve is_free
      awaiting_approval: false, // Clear awaiting approval flag
      fixar_destaque: currentService.fixar_destaque,
      status: 0, // Set to draft (in edition)
    } as GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioServiceRequest

    // Update the service with the new status
    const response = await putApiV1AdminServicesId(serviceId, serviceRequest)

    if (response.status === 200) {
      console.log('Service sent to edition successfully:', response.data)

      // Revalidate cache tags for services
      revalidateTag('services')
      revalidateTag(`service-${serviceId}`)

      // Convert API response to frontend format
      const service = convertApiToFrontend(response.data)

      return NextResponse.json({
        service,
        success: true,
        message: 'Service sent to edition successfully',
      })
    }

    return NextResponse.json(
      { error: 'Failed to send service to edition' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error sending service to edition:', error)
    return NextResponse.json(
      {
        error: 'Failed to send service to edition',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
