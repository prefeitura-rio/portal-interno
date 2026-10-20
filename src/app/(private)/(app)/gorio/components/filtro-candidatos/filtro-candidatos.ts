/**
 * Filtros avançados de candidatos, os mesmos no banco de currículos e na lista
 * de candidatos de uma vaga. Os nomes dos parâmetros são os da API.
 */
export interface FiltroCandidatos {
  generos: string[]
  idadeMin?: number
  idadeMax?: number
  tempoExperiencia?: string
  carteira?: string
  escolaridade?: string
  idIdioma?: string
  idNivelIdioma?: string
  bairro?: string
  pcd?: 'sim' | 'nao'
}

export const FILTRO_VAZIO: FiltroCandidatos = { generos: [] }

/** As opções de gênero que o cidadão marca no cadastro do app. */
export const GENEROS = [
  'Mulher cisgênero',
  'Mulher transgênero',
  'Homem cisgênero',
  'Homem transgênero',
  'Não binário',
  'Outro',
  'Prefiro não informar',
]

/** As opções de escolaridade do cadastro do app. O filtro compara exatamente. */
export const ESCOLARIDADES = [
  'Fundamental incompleto',
  'Fundamental completo',
  'Médio incompleto',
  'Médio completo',
  'Superior incompleto',
  'Superior completo',
  'Pós Graduação',
  'Mestrado',
  'Doutorado',
]

/** Soma de todas as experiências do currículo. */
export const FAIXAS_EXPERIENCIA = [
  { valor: 'sem_experiencia', rotulo: 'Sem experiência prévia' },
  { valor: 'ate_2_anos', rotulo: 'Até 2 anos' },
  { valor: '2_a_4_anos', rotulo: '2 a 4 anos' },
  { valor: '4_a_6_anos', rotulo: '4 a 6 anos' },
  { valor: '6_a_8_anos', rotulo: '6 a 8 anos' },
  { valor: '8_a_10_anos', rotulo: '8 a 10 anos' },
  { valor: 'mais_de_10_anos', rotulo: 'Mais de 10 anos' },
]

export const EXIGENCIAS_CARTEIRA = [
  { valor: 'sim', rotulo: 'Sim, precisa' },
  {
    valor: '6_meses',
    rotulo: 'Sim, pelo menos 6 meses de registro em carteira',
  },
]

const PARAMETROS = [
  'genero',
  'idade_min',
  'idade_max',
  'tempo_experiencia',
  'experiencia_carteira',
  'escolaridade',
  'id_idioma',
  'id_nivel_idioma',
  'bairro',
  'pcd',
] as const

export function filtroVazio(filtro: FiltroCandidatos): boolean {
  return Object.keys(filtroParaParametros(filtro)).length === 0
}

/** Parâmetros de query da API; filtros vazios ficam de fora. */
export function filtroParaParametros(
  filtro: FiltroCandidatos
): Record<string, string> {
  const params: Record<string, string> = {}
  if (filtro.generos.length > 0) params.genero = filtro.generos.join(',')
  if (filtro.idadeMin != null) params.idade_min = String(filtro.idadeMin)
  if (filtro.idadeMax != null) params.idade_max = String(filtro.idadeMax)
  if (filtro.tempoExperiencia)
    params.tempo_experiencia = filtro.tempoExperiencia
  if (filtro.carteira) params.experiencia_carteira = filtro.carteira
  if (filtro.escolaridade) params.escolaridade = filtro.escolaridade
  if (filtro.idIdioma) {
    params.id_idioma = filtro.idIdioma
    if (filtro.idNivelIdioma) params.id_nivel_idioma = filtro.idNivelIdioma
  }
  if (filtro.bairro) params.bairro = filtro.bairro
  if (filtro.pcd) params.pcd = filtro.pcd
  return params
}

/** Lê o filtro de parâmetros de URL (os mesmos nomes da API). */
export function filtroDeParametros(params: URLSearchParams): FiltroCandidatos {
  const numero = (valor: string | null) => {
    if (!valor) return undefined
    const n = Number(valor)
    return Number.isInteger(n) && n >= 0 ? n : undefined
  }
  const pcd = params.get('pcd')
  return {
    generos: (params.get('genero') ?? '')
      .split(',')
      .map(g => g.trim())
      .filter(Boolean),
    idadeMin: numero(params.get('idade_min')),
    idadeMax: numero(params.get('idade_max')),
    tempoExperiencia: params.get('tempo_experiencia') || undefined,
    carteira: params.get('experiencia_carteira') || undefined,
    escolaridade: params.get('escolaridade') || undefined,
    idIdioma: params.get('id_idioma') || undefined,
    idNivelIdioma: params.get('id_nivel_idioma') || undefined,
    bairro: params.get('bairro') || undefined,
    pcd: pcd === 'sim' || pcd === 'nao' ? pcd : undefined,
  }
}

/** Copia os parâmetros de filtro de uma URL para outra (os demais ficam). */
export function aplicarFiltroNaUrl(
  params: URLSearchParams,
  filtro: FiltroCandidatos
): URLSearchParams {
  const proximos = new URLSearchParams(params)
  for (const chave of PARAMETROS) proximos.delete(chave)
  for (const [chave, valor] of Object.entries(filtroParaParametros(filtro))) {
    proximos.set(chave, valor)
  }
  return proximos
}

export interface EtiquetaFiltro {
  chave: string
  rotulo: string
  remover: (filtro: FiltroCandidatos) => FiltroCandidatos
}

/** Etiquetas do filtro aplicado, cada uma removível. */
export function etiquetasDoFiltro(
  filtro: FiltroCandidatos,
  nomes: { idioma?: string; nivelIdioma?: string }
): EtiquetaFiltro[] {
  const etiquetas: EtiquetaFiltro[] = []

  for (const genero of filtro.generos) {
    etiquetas.push({
      chave: `genero-${genero}`,
      rotulo: `Gênero: ${genero}`,
      remover: f => ({ ...f, generos: f.generos.filter(g => g !== genero) }),
    })
  }
  if (filtro.idadeMin != null || filtro.idadeMax != null) {
    const rotulo =
      filtro.idadeMin != null && filtro.idadeMax != null
        ? `Idade: ${filtro.idadeMin} a ${filtro.idadeMax}`
        : filtro.idadeMin != null
          ? `Idade: a partir de ${filtro.idadeMin}`
          : `Idade: até ${filtro.idadeMax}`
    etiquetas.push({
      chave: 'idade',
      rotulo,
      remover: f => ({ ...f, idadeMin: undefined, idadeMax: undefined }),
    })
  }
  if (filtro.tempoExperiencia) {
    const faixa = FAIXAS_EXPERIENCIA.find(
      f => f.valor === filtro.tempoExperiencia
    )
    etiquetas.push({
      chave: 'tempo',
      rotulo: `Experiência: ${faixa?.rotulo ?? filtro.tempoExperiencia}`,
      remover: f => ({ ...f, tempoExperiencia: undefined }),
    })
  }
  if (filtro.carteira) {
    etiquetas.push({
      chave: 'carteira',
      rotulo:
        filtro.carteira === '6_meses'
          ? 'Em carteira: pelo menos 6 meses'
          : 'Em carteira: sim',
      remover: f => ({ ...f, carteira: undefined }),
    })
  }
  if (filtro.escolaridade) {
    etiquetas.push({
      chave: 'escolaridade',
      rotulo: `Escolaridade: ${filtro.escolaridade}`,
      remover: f => ({ ...f, escolaridade: undefined }),
    })
  }
  if (filtro.idIdioma) {
    const nivel = filtro.idNivelIdioma
      ? ` (${nomes.nivelIdioma ?? 'nível'} ou acima)`
      : ''
    etiquetas.push({
      chave: 'idioma',
      rotulo: `Idioma: ${nomes.idioma ?? 'selecionado'}${nivel}`,
      remover: f => ({ ...f, idIdioma: undefined, idNivelIdioma: undefined }),
    })
  }
  if (filtro.bairro) {
    etiquetas.push({
      chave: 'bairro',
      rotulo: `Bairro: ${filtro.bairro}`,
      remover: f => ({ ...f, bairro: undefined }),
    })
  }
  if (filtro.pcd) {
    etiquetas.push({
      chave: 'pcd',
      rotulo: `PcD: ${filtro.pcd === 'sim' ? 'Sim' : 'Não'}`,
      remover: f => ({ ...f, pcd: undefined }),
    })
  }

  return etiquetas
}
