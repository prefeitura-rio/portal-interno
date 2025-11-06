import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService'
import type { GithubComPrefeituraRioAppBuscaSearchInternalModelsRollbackRequest } from '@/http-busca-search/models/githubComPrefeituraRioAppBuscaSearchInternalModelsRollbackRequest'
import { postApiV1AdminServicesIdRollback } from '@/http-busca-search/versions/versions'
import { convertApiToFrontend } from '@/types/service'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'service-id': string }> }
) {
  try {
    const { 'service-id': serviceId } = await params
    const body = await request.json()

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    if (!body.to_version || typeof body.to_version !== 'number') {
      return NextResponse.json(
        { error: 'to_version is required and must be a number' },
        { status: 400 }
      )
    }

    console.log(
      '🔄 Rolling back service:',
      serviceId,
      'to version:',
      body.to_version
    )

    const rollbackRequest: GithubComPrefeituraRioAppBuscaSearchInternalModelsRollbackRequest =
      {
        to_version: body.to_version,
        change_reason: body.change_reason || undefined,
      }

    // Call the external API to rollback the service
    const response = await postApiV1AdminServicesIdRollback(
      serviceId,
      rollbackRequest
    )

    if (response.status === 200) {
      const responseBody = response.data
      console.log('✅ Service rolled back successfully:', responseBody)

      // Revalidate cache tags for services
      revalidateTag('services')
      revalidateTag(`service-${serviceId}`)

      // Convert API response to frontend format
      const serviceData =
        (
          responseBody as {
            data?: GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService
          }
        ).data ?? responseBody

      const service = convertApiToFrontend(
        serviceData as GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService
      )

      return NextResponse.json({
        service,
        success: true,
      })
    }

    const errorBody = response.data as { error?: string; message?: string }

    return NextResponse.json(
      {
        error:
          errorBody?.error ||
          errorBody?.message ||
          'Failed to rollback service',
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error rolling back service:', error)
    return NextResponse.json(
      {
        error: 'Failed to rollback service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
