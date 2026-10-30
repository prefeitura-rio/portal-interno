import type {
  GetApiV1AdminTombamentosParams,
  ModelsTombamento,
  ModelsTombamentoRequest,
} from '@/http-busca-search/models'
import {
  deleteApiV1AdminTombamentosId,
  getApiV1AdminTombamentos,
  postApiV1AdminTombamentos,
} from '@/http-busca-search/tombamentos/tombamentos'
import { getCurrentUserRoles } from '@/lib/heimdall-user'
import {
  SERVICE_CURATION_DENIAL_MESSAGES,
  getTombamentoCreateDenial,
} from '@/lib/service-curation-guard'
import {
  TOMBAMENTO_DUPLICATE_MESSAGE,
  TOMBAMENTO_UNCONFIRMED_MESSAGE,
  type TombamentosPage,
  createKeyedLock,
  findTombamentosByNewService,
  listAllTombamentos,
  pickSurvivingTombamento,
  waitForTombamentoVisible,
} from '@/lib/tombamento-duplicates'
import { NextResponse } from 'next/server'

const withNewServiceLock = createKeyedLock()

async function listServiceTombamentos(
  idServicoNovo: string
): Promise<ModelsTombamento[]> {
  return findTombamentosByNewService(
    await listAllTombamentos(fetchTombamentosPage),
    idServicoNovo
  )
}

/** Apaga o tombamento que este POST criou; 404 conta como já apagado. */
async function deleteOwnTombamento(id: string): Promise<boolean> {
  try {
    const response = await deleteApiV1AdminTombamentosId(id)
    return response.status === 204 || response.status === 404
  } catch (error) {
    console.error(
      `[TOMBAMENTOS] Could not delete tombamento ${id}:`,
      error instanceof Error ? error.message : error
    )
    return false
  }
}

async function fetchTombamentosPage(
  page: number,
  perPage: number
): Promise<TombamentosPage<ModelsTombamento>> {
  const response = await getApiV1AdminTombamentos({ page, per_page: perPage })
  if (response.status !== 200) {
    throw new Error(`Tombamentos API returned ${response.status}`)
  }
  return response.data
}

export async function GET(request: Request) {
  try {
    console.log('🔗 Tombamentos Request URL:', request.url)

    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = searchParams.get('page')
    const perPage = searchParams.get('per_page')
    const origem = searchParams.get('origem')
    const criadoPor = searchParams.get('criado_por')

    console.log('📝 Extracted tombamentos query parameters:', {
      page,
      perPage,
      origem,
      criadoPor,
    })

    // Build params object for the API
    const params: GetApiV1AdminTombamentosParams = {}

    // Set defaults and convert parameters
    params.page = page ? Number.parseInt(page, 10) : 1
    params.per_page = perPage ? Number.parseInt(perPage, 10) : 10

    // Handle optional filters
    if (origem?.trim()) {
      params.origem = origem.trim()
    }

    if (criadoPor?.trim()) {
      params.criado_por = criadoPor.trim()
    }

    console.log('🚀 Tombamentos API call params:', params)

    // Call the external API using the existing client function
    const response = await getApiV1AdminTombamentos(params)

    if (response.status === 200) {
      console.log(
        'Tombamentos API Response:',
        JSON.stringify(response.data, null, 2)
      )

      // Extract tombamentos and pagination info from response
      const tombamentosData = response.data

      // Build response with pagination metadata
      return NextResponse.json({
        data: tombamentosData,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch tombamentos from API' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching tombamentos:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch tombamentos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const denial = getTombamentoCreateDenial(await getCurrentUserRoles())
    if (denial) {
      console.warn(
        `[TOMBAMENTOS] Create denied (${denial}): missing busca:services:admin role`
      )
      return NextResponse.json(
        { error: SERVICE_CURATION_DENIAL_MESSAGES[denial] },
        { status: 403 }
      )
    }

    const body = await request.json()

    console.log('🚀 Creating tombamento with data:', body)

    // Validate required fields
    if (!body.origem || !body.id_servico_antigo || !body.id_servico_novo) {
      return NextResponse.json(
        {
          error:
            'Required fields missing: origem, id_servico_antigo, id_servico_novo',
        },
        { status: 400 }
      )
    }

    // Validate origem values
    const validOrigens = ['1746_v2_llm', 'carioca-digital_v2_llm']
    if (!validOrigens.includes(body.origem)) {
      return NextResponse.json(
        {
          error: `Invalid origem. Must be one of: ${validOrigens.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (
      typeof body.id_servico_antigo !== 'string' ||
      typeof body.id_servico_novo !== 'string'
    ) {
      return NextResponse.json(
        { error: 'id_servico_antigo and id_servico_novo must be strings' },
        { status: 400 }
      )
    }

    const tombamentoRequest: ModelsTombamentoRequest = {
      origem: body.origem,
      id_servico_antigo: body.id_servico_antigo,
      id_servico_novo: body.id_servico_novo,
      observacoes: body.observacoes || '',
    }

    return await withNewServiceLock(body.id_servico_novo, () =>
      createUniqueTombamento(tombamentoRequest)
    )
  } catch (error) {
    console.error('Error creating tombamento:', error)
    return NextResponse.json(
      {
        error: 'Failed to create tombamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DEV-147: um serviço novo só pode ter um tombamento, e a API de busca não
 * aplica essa regra. A lista dela (Typesense) leva por volta de 1 s para
 * mostrar um registro novo, então conferir a lista antes de criar não basta
 * para dois "Tombar" seguidos. Por isso:
 * 1. no mesmo processo, POSTs do mesmo serviço novo rodam um de cada vez
 *    (`withNewServiceLock`);
 * 2. a lista é conferida antes de criar (falha fechada se não puder ser lida);
 * 3. depois de criar, o POST só responde quando o registro já aparece na
 *    lista, e então o próximo POST o enxerga;
 * 4. se nessa leitura houver outro tombamento do serviço, fica o mais antigo:
 *    este POST apaga só o registro que ele criou e responde 409. Isso também
 *    cobre POSTs simultâneos em réplicas diferentes do BFF.
 * Registro que não aparece na lista no prazo é apagado (503), para nunca
 * deixar um tombamento que a checagem não enxerga.
 */
async function createUniqueTombamento(
  tombamentoRequest: ModelsTombamentoRequest
): Promise<NextResponse> {
  const idServicoNovo = tombamentoRequest.id_servico_novo

  let existing: ModelsTombamento[]
  try {
    existing = await listServiceTombamentos(idServicoNovo)
  } catch (error) {
    console.error(
      '[TOMBAMENTOS] Could not check existing tombamentos before create:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      {
        error:
          'Não foi possível verificar os tombamentos existentes. Tente novamente.',
      },
      { status: 502 }
    )
  }

  if (existing.length > 0) {
    console.warn(
      `[TOMBAMENTOS] Create refused: service ${idServicoNovo} already has ${existing.length} tombamento(s)`
    )
    return NextResponse.json(
      {
        error: TOMBAMENTO_DUPLICATE_MESSAGE,
        tombamentos_existentes: existing.map(tombamento => tombamento.id),
      },
      { status: 409 }
    )
  }

  const response = await postApiV1AdminTombamentos(tombamentoRequest)

  if (response.status === 409) {
    const apiMessage = Object.values(response.data ?? {}).find(
      value => typeof value === 'string' && value.trim() !== ''
    )
    return NextResponse.json(
      { error: apiMessage ?? TOMBAMENTO_DUPLICATE_MESSAGE },
      { status: 409 }
    )
  }

  if (response.status !== 201) {
    return NextResponse.json(
      { error: 'Failed to create tombamento' },
      { status: response.status }
    )
  }

  const created = response.data
  const createdId = created.id
  if (!createdId) {
    console.warn(
      `[TOMBAMENTOS] Created tombamento for service ${idServicoNovo} without id; duplicate check after create skipped`
    )
    return NextResponse.json({ tombamento: created, success: true })
  }

  const current = await waitForTombamentoVisible(
    () => listServiceTombamentos(idServicoNovo),
    createdId
  )

  if (!current) {
    console.error(
      `[TOMBAMENTOS] Tombamento ${createdId} for service ${idServicoNovo} did not show up in the list; deleting it`
    )
    const deleted = await deleteOwnTombamento(createdId)
    if (!deleted) {
      return NextResponse.json(
        {
          error:
            'O tombamento foi criado, mas não foi possível confirmá-lo nem desfazê-lo. Recarregue a página e confira o serviço antes de tentar de novo.',
          tombamento: created,
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { error: TOMBAMENTO_UNCONFIRMED_MESSAGE },
      { status: 503 }
    )
  }

  const survivor = pickSurvivingTombamento(current)
  if (survivor && survivor.id !== createdId) {
    console.warn(
      `[TOMBAMENTOS] Concurrent tombamento for service ${idServicoNovo}: keeping ${survivor.id}, deleting ${createdId}`
    )
    const others = current
      .filter(tombamento => tombamento.id !== createdId)
      .map(tombamento => tombamento.id)
    const deleted = await deleteOwnTombamento(createdId)
    if (!deleted) {
      return NextResponse.json(
        {
          error:
            'Este serviço ficou com mais de um tombamento e não foi possível desfazer o novo. Recarregue a página e use "Destombar".',
          tombamentos_existentes: others,
        },
        { status: 502 }
      )
    }
    return NextResponse.json(
      {
        error: TOMBAMENTO_DUPLICATE_MESSAGE,
        tombamentos_existentes: others,
      },
      { status: 409 }
    )
  }

  console.log('Tombamento created successfully:', created)
  return NextResponse.json({ tombamento: created, success: true })
}
