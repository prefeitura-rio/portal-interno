import {
  getApiV1AdminServices,
  putApiV1AdminServicesId,
} from '@/http-busca-search/admin/admin'
import type { ModelsPrefRioServiceRequest } from '@/http-busca-search/models'
import { getCurrentTimestamp } from '@/lib/service-data-transformer'
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

    console.log('📤 Publishing service:', serviceId)

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

    // Get current Unix timestamp for published_at
    const currentTimestamp = getCurrentTimestamp()

    // Prepare the service data with status = 1 (published) and published_at timestamp
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
      awaiting_approval: false, // Clear any awaiting approval flag
      fixar_destaque: currentService.fixar_destaque,
      status: 1, // Set to published
      published_at: currentTimestamp, // Set published timestamp
    } as ModelsPrefRioServiceRequest & {
      published_at: number
    }

    // Update the service with the new status and published_at
    const response = await putApiV1AdminServicesId(serviceId, serviceRequest)

    if (response.status === 200) {
      console.log('Service published successfully:', response.data)

      // Revalidate cache tags for services
      revalidateTag('services')
      revalidateTag(`service-${serviceId}`)

      // Convert API response to frontend format
      const service = convertApiToFrontend(response.data)

      return NextResponse.json({
        service,
        success: true,
        message: 'Service published successfully',
      })
    }

    return NextResponse.json(
      { error: 'Failed to publish service' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error publishing service:', error)
    return NextResponse.json(
      {
        error: 'Failed to publish service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
