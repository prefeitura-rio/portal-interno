/**
 * Parâmetros dos filtros avançados de candidatos que os BFFs repassam para a
 * API (banco de currículos e candidatos da vaga). Os nomes são os da API.
 */
const PARAMETROS_FILTRO_CANDIDATOS = [
  'genero',
  'faixa_etaria',
  'tempo_experiencia',
  'experiencia_carteira',
  'escolaridade',
  'id_idioma',
  'id_nivel_idioma',
  'bairro',
  'pcd',
] as const

export function parametrosDoFiltroCandidatos(
  searchParams: URLSearchParams
): Record<string, string> {
  const params: Record<string, string> = {}
  for (const chave of PARAMETROS_FILTRO_CANDIDATOS) {
    const valor = searchParams.get(chave)?.trim()
    if (valor) params[chave] = valor
  }
  return params
}
