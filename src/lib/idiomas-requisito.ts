/**
 * Idiomas exigidos pela vaga de empregabilidade, gravados num endpoint próprio
 * (`PUT /api/empregabilidade/vagas/{id}/idiomas-requisito`) depois que a vaga
 * já foi criada ou duplicada.
 *
 * DEV-405: a criação e a duplicação já enviam `criterios_bloqueio` com
 * "idioma" no corpo da vaga (DEV-400). Se este segundo passo falhar e o erro
 * for ignorado, a vaga fica com o bloqueio de idioma ativo e nenhum idioma que
 * o satisfaça. Por isso a falha (HTTP fora de 2xx ou erro de rede) vira
 * `IdiomasRequisitoError`, que o fluxo trata sem mostrar sucesso.
 */

export interface IdiomaRequisitoInput {
  id_idioma: string
  id_nivel_minimo: string
}

export const IDIOMAS_REQUISITO_ERRO_PADRAO =
  'Erro ao salvar requisitos de idioma'

export class IdiomasRequisitoError extends Error {
  readonly vagaId: string

  constructor(vagaId: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'IdiomasRequisitoError'
    this.vagaId = vagaId
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

function getErrorMessage(body: unknown): string | null {
  if (body && typeof body === 'object' && 'error' in body) {
    const { error } = body as { error: unknown }
    if (typeof error === 'string' && error.trim() !== '') return error
  }
  return null
}

export async function salvarIdiomasRequisito(
  vagaId: string,
  idiomas: readonly IdiomaRequisitoInput[],
  fetchImpl: FetchLike = fetch
): Promise<void> {
  let res: Response
  try {
    res = await fetchImpl(
      `/api/empregabilidade/vagas/${vagaId}/idiomas-requisito`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitos: idiomas.map(item => ({
            id_vaga: vagaId,
            id_idioma: item.id_idioma,
            id_nivel_minimo: item.id_nivel_minimo,
          })),
        }),
      }
    )
  } catch (error) {
    throw new IdiomasRequisitoError(vagaId, IDIOMAS_REQUISITO_ERRO_PADRAO, {
      cause: error,
    })
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    throw new IdiomasRequisitoError(
      vagaId,
      getErrorMessage(body) ?? IDIOMAS_REQUISITO_ERRO_PADRAO
    )
  }
}

export function isIdiomasRequisitoError(
  error: unknown
): error is IdiomasRequisitoError {
  return error instanceof IdiomasRequisitoError
}

/**
 * Texto do aviso quando a vaga foi gravada, mas os idiomas não: o bloqueio de
 * idioma ficou ativo sem idioma, e quem cadastrou precisa corrigir a vaga.
 */
export function getIdiomasRequisitoFalhaAviso(
  acao: 'criada' | 'duplicada',
  error: IdiomasRequisitoError
): { title: string; description: string } {
  return {
    title: `Vaga ${acao}, mas os idiomas exigidos não foram salvos`,
    description: `O bloqueio de idioma ficou ativo sem idioma gravado: revise os idiomas na edição da vaga e salve novamente. Detalhe: ${error.message}`,
  }
}

export function getVagaEdicaoHref(vagaId: string): string {
  return `/gorio/empregabilidade/${encodeURIComponent(vagaId)}?edit=true`
}
