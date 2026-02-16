import {
  deleteApiV1EmpregabilidadeEmpresasCnpj,
  getApiV1EmpregabilidadeEmpresasCnpj,
  putApiV1EmpregabilidadeEmpresasCnpj,
} from '@/http-gorio/empregabilidade-empresas/empregabilidade-empresas'
import type { EmpregabilidadeEmpresaBody } from '@/http-gorio/models/empregabilidadeEmpresaBody'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * ============================================================================
 * GET /api/empregabilidade/empresas/[cnpj]
 * ============================================================================
 * Retrieves a single empresa by CNPJ
 *
 * VALIDATION MATRIX:
 * ┌─────────────────┬──────────────────────────────────────────────┐
 * │ Input           │ Validation                                    │
 * ├─────────────────┼──────────────────────────────────────────────┤
 * │ cnpj (param)    │ - Required (checked)                         │
 * │                 │ - After stripping mask: exactly 14 digits     │
 * │                 │ - Only numeric characters                     │
 * └─────────────────┴──────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * 1. Extract cnpj from URL params
 * 2. Strip all non-numeric characters (remove mask if present)
 * 3. Validate: exactly 14 digits
 * 4. Call Orval client: getApiV1EmpregabilidadeEmpresasCnpj(cnpj)
 * 5. Handle responses: 200 (success), 404 (not found), 500 (error)
 *
 * ERROR SCENARIOS:
 * - 400: Missing CNPJ, invalid format (not 14 digits)
 * - 404: CNPJ not found in database
 * - 500: Backend error, network error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    // Step 1: Extract CNPJ from params
    const { cnpj } = await params

    // Step 2: Validate CNPJ presence
    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ é obrigatório' }, { status: 400 })
    }

    // Step 3: Strip mask and extract only digits
    // Input: "12.345.678/0001-90" or "12345678000190"
    // Output: "12345678000190"
    const cnpjNumbers = cnpj.replace(/\D/g, '')

    // Step 4: Validate CNPJ format (exactly 14 digits)
    if (cnpjNumbers.length !== 14) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido. Deve conter exatamente 14 dígitos.',
          received: cnpjNumbers,
          length: cnpjNumbers.length,
        },
        { status: 400 }
      )
    }

    console.log('[GET /api/empregabilidade/empresas/[cnpj]]', {
      cnpj: cnpjNumbers,
    })

    // Step 5: Call Orval client to fetch empresa from backend
    const response = await getApiV1EmpregabilidadeEmpresasCnpj(cnpjNumbers)

    console.log('[GET /api/empregabilidade/empresas/[cnpj]] Response:', {
      status: response.status,
    })

    // Step 6: Handle success response (200)
    if (response.status === 200) {
      return NextResponse.json({
        empresa: response.data, // EmpregabilidadeEmpresa
        success: true,
      })
    }

    // Step 7: Handle not found (404)
    if (response.status === 404) {
      return NextResponse.json(
        {
          error: 'Empresa não encontrada',
          cnpj: cnpjNumbers,
        },
        { status: 404 }
      )
    }

    // Step 8: Handle other error responses
    return NextResponse.json(
      {
        error: 'Falha ao buscar empresa',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[GET /api/empregabilidade/empresas/[cnpj]] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

/**
 * ============================================================================
 * PUT /api/empregabilidade/empresas/[cnpj]
 * ============================================================================
 * Updates an existing empresa by CNPJ
 *
 * VALIDATION MATRIX:
 * ┌─────────────────┬──────────────────────────────────────────────┐
 * │ Input           │ Validation                                    │
 * ├─────────────────┼──────────────────────────────────────────────┤
 * │ cnpj (param)    │ - Required                                   │
 * │                 │ - After stripping: exactly 14 digits          │
 * ├─────────────────┼──────────────────────────────────────────────┤
 * │ body.cnpj       │ - Optional (backend may require consistency)  │
 * │                 │ - If present: must match param CNPJ           │
 * ├─────────────────┼──────────────────────────────────────────────┤
 * │ razao_social    │ - Required                                   │
 * │                 │ - Non-empty string                            │
 * └─────────────────┴──────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * 1. Extract cnpj from URL params
 * 2. Parse and validate request body
 * 3. Validate CNPJ format (14 digits)
 * 4. Validate required fields (razao_social)
 * 5. If body.cnpj present, ensure it matches param cnpj
 * 6. Call Orval client: putApiV1EmpregabilidadeEmpresasCnpj(cnpj, body)
 * 7. Revalidate cache tags
 * 8. Return updated empresa
 *
 * ERROR SCENARIOS:
 * - 400: Invalid CNPJ format, missing required fields, CNPJ mismatch
 * - 404: Empresa not found (cannot update non-existent)
 * - 409: Conflict (if backend detects issues)
 * - 500: Backend error, network error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    // Step 1: Extract CNPJ from params
    const { cnpj } = await params

    // Step 2: Validate CNPJ presence
    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ é obrigatório' }, { status: 400 })
    }

    // Step 3: Strip mask from param CNPJ
    const cnpjNumbers = cnpj.replace(/\D/g, '')

    // Step 4: Validate param CNPJ format
    if (cnpjNumbers.length !== 14) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido. Deve conter exatamente 14 dígitos.',
          received: cnpjNumbers,
          length: cnpjNumbers.length,
        },
        { status: 400 }
      )
    }

    // Step 5: Parse request body
    const body: EmpregabilidadeEmpresaBody = await request.json()

    // Step 6: Validate required fields
    if (!body.razao_social || body.razao_social.trim() === '') {
      return NextResponse.json(
        {
          error: 'Campo obrigatório: razao_social',
        },
        { status: 400 }
      )
    }

    // Step 7: If body contains cnpj, validate it matches param cnpj
    // This prevents accidentally updating wrong empresa
    if (body.cnpj) {
      const bodyCnpjNumbers = body.cnpj.replace(/\D/g, '')
      if (bodyCnpjNumbers !== cnpjNumbers) {
        return NextResponse.json(
          {
            error: 'CNPJ no corpo da requisição não corresponde ao CNPJ da URL',
            urlCnpj: cnpjNumbers,
            bodyCnpj: bodyCnpjNumbers,
          },
          { status: 400 }
        )
      }
    }

    // Step 8: Ensure body.cnpj is set to param cnpj (stripped)
    // This ensures consistency with the URL parameter
    const updateBody: EmpregabilidadeEmpresaBody = {
      ...body,
      cnpj: cnpjNumbers, // Use param CNPJ as source of truth
    }

    console.log('[PUT /api/empregabilidade/empresas/[cnpj]]', {
      cnpj: cnpjNumbers,
      body: JSON.stringify(updateBody, null, 2),
    })

    // Step 9: Call Orval client to update empresa
    const response = await putApiV1EmpregabilidadeEmpresasCnpj(
      cnpjNumbers,
      updateBody
    )

    console.log('[PUT /api/empregabilidade/empresas/[cnpj]] Response:', {
      status: response.status,
    })

    // Step 10: Handle success response (200)
    if (response.status === 200) {
      // Revalidate cache tags
      revalidateTag('empregabilidade-empresas')
      revalidateTag('empregabilidade-vagas') // Vagas depend on empresas

      return NextResponse.json({
        empresa: response.data, // Updated EmpregabilidadeEmpresa
        success: true,
      })
    }

    // Step 11: Handle bad request (400)
    // Backend returns 400 for validation errors including not found
    if (response.status === 400) {
      return NextResponse.json(
        {
          error: 'Dados inválidos para atualização',
          details: response.data,
        },
        { status: 400 }
      )
    }

    // Step 12: Handle other error responses (500, etc)
    return NextResponse.json(
      {
        error: 'Falha ao atualizar empresa',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[PUT /api/empregabilidade/empresas/[cnpj]] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

/**
 * ============================================================================
 * DELETE /api/empregabilidade/empresas/[cnpj]
 * ============================================================================
 * Permanently deletes an empresa by CNPJ
 *
 * ⚠️ CRITICAL: This is a HARD DELETE (no soft delete)
 *
 * VALIDATION MATRIX:
 * ┌─────────────────┬──────────────────────────────────────────────┐
 * │ Input           │ Validation                                    │
 * ├─────────────────┼──────────────────────────────────────────────┤
 * │ cnpj (param)    │ - Required                                   │
 * │                 │ - After stripping: exactly 14 digits          │
 * └─────────────────┴──────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * 1. Extract cnpj from URL params
 * 2. Validate CNPJ format (14 digits)
 * 3. Call Orval client: deleteApiV1EmpregabilidadeEmpresasCnpj(cnpj)
 * 4. Revalidate cache tags
 * 5. Return success message
 *
 * ERROR SCENARIOS:
 * - 400: Invalid CNPJ format
 * - 404: Empresa not found (cannot delete non-existent)
 * - 409: Conflict (empresa has related vagas - backend constraint)
 * - 500: Backend error, network error
 *
 * IMPORTANT CONSIDERATIONS:
 * - Check if empresa has active vagas before deletion
 * - Backend may return 409 if foreign key constraints prevent deletion
 * - Deletion is PERMANENT (no undo)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    // Step 1: Extract CNPJ from params
    const { cnpj } = await params

    // Step 2: Validate CNPJ presence
    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ é obrigatório' }, { status: 400 })
    }

    // Step 3: Strip mask from CNPJ
    const cnpjNumbers = cnpj.replace(/\D/g, '')

    // Step 4: Validate CNPJ format
    if (cnpjNumbers.length !== 14) {
      return NextResponse.json(
        {
          error: 'CNPJ inválido. Deve conter exatamente 14 dígitos.',
          received: cnpjNumbers,
          length: cnpjNumbers.length,
        },
        { status: 400 }
      )
    }

    console.log('[DELETE /api/empregabilidade/empresas/[cnpj]]', {
      cnpj: cnpjNumbers,
    })

    // Step 5: Call Orval client to delete empresa
    const response = await deleteApiV1EmpregabilidadeEmpresasCnpj(cnpjNumbers)

    console.log('[DELETE /api/empregabilidade/empresas/[cnpj]] Response:', {
      status: response.status,
    })

    // Step 6: Handle success response (200)
    if (response.status === 200) {
      // Revalidate cache tags
      revalidateTag('empregabilidade-empresas')
      revalidateTag('empregabilidade-vagas') // Vagas may be affected

      return NextResponse.json({
        message: 'Empresa excluída com sucesso',
        data: response.data,
        success: true,
      })
    }

    // Step 7: Handle server error (500)
    // Backend may return 500 for not found, dependencies, or other errors
    return NextResponse.json(
      {
        error: 'Falha ao excluir empresa',
        details: response.data,
      },
      { status: response.status }
    )
  } catch (error) {
    console.error('[DELETE /api/empregabilidade/empresas/[cnpj]] Error:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
