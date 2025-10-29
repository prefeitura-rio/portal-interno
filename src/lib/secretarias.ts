export const SECRETARIAS: string[] = [
  'Secretaria Municipal da Casa Civil - SMCC',
  'Secretaria Municipal de Coordenação Governamental - SMCG',
  'Controladoria Geral do Município - CGM',
  'Procuradoria Geral do Município - PGM',
  'Secretaria Municipal de Fazenda - SMF',
  'Secretaria Municipal de Integridade, Transparência e Proteção de Dados - SMIT',
  'Secretaria Municipal de Desenvolvimento Urbano e Licenciamento - SMDU',
  'Secretaria Municipal de Desenvolvimento Econômico - SMDE',
  'Secretaria Municipal de Infraestrutura - SMI',
  'Secretaria Municipal de Ordem Pública - SEOP',
  'Secretaria Municipal de Conservação - SECONSERVA',
  'Secretaria Municipal de Educação - SME',
  'Secretaria Municipal de Assistência Social - SMAS',
  'Secretaria Municipal de Transportes - SMTR',
  'Secretaria Municipal de Saúde - SMS',
  'Secretaria Mun. do Envelhecimento Saudável e Qualidade de Vida - SEMESQV',
  'Secretaria de Esportes - SMEL',
  'Secretaria Especial da Juventude Carioca - JUV-RIO',
  'Secretaria Especial de Ação Comunitária - SEAC-RIO',
  'Secretaria Especial de Integração Metropolitana - SEIM',
  'Secretaria Especial de Políticas para Mulheres e Cuidados - SPM-RIO',
  'Secretaria Municipal da Pessoa com Deficiência - SMPD',
  'Secretaria Municipal de Ciência, Tecnologia e Inovação - SMCT',
  'Secretaria Municipal de Cultura - SMC',
  'Secretaria Municipal de Habitação - SMH',
  'Secretaria Municipal do Ambiente e Clima - SMAC',
  'Secretaria Municipal de Proteção e Defesa dos Animais - SMPDA',
  'Secretaria Municipal de Trabalho e Renda - SMTE',
  'Secretaria Especial de Economia Solidária - SES-RIO',
  'Secretaria Municipal de Turismo - SMTUR-RIO',
  'Secretaria Especial de Cidadania e Família - SECID',
  'Empresa de Eventos do Município do Rio de Janeiro - RIOEVENTOS',
  'Companhia de Engenharia de Tráfego do RJ - CET-Rio',
  'Companhia Municipal de Energia e Iluminação - RIOLUZ',
  'Companhia Municipal de Limpeza Urbana - COMLURB',
  'Empresa de Turismo do Município do Rio de Janeiro - RIOTUR',
  'Empresa Distribuidora de Filmes S.A. - RIOFILME',
  'Empresa Municipal de Artes Gráficas - Imprensa da Cidade - IC',
  'Empresa Municipal de Informática - IPLANRIO',
  'Empresa Municipal de Multimeios Ltda. - MULTIRIO',
  'Empresa Municipal de Urbanização - RIO-URBE',
  'Empresa Pública de Saúde do Rio de Janeiro - RioSaúde',
  'Guarda Municipal do Rio de Janeiro - GM-Rio',
  'Instituto de Previdência e Assistência - PREVI-RIO',
  'Instituto Municipal de Urbanismo Pereira Passos - IPP',
  'Instituto Rio Patrimônio da Humanidade - IRPH',
  'Fundação Cidade das Artes',
  'Fundação Instituto das Águas do Município do Rio de Janeiro - RIO-ÁGUAS',
  'Fundação Instituto de Geotécnica do Município do Rio de Janeiro - GEO-RIO',
  'Fundação Parques e Jardins - FPJ',
  'Fundação Planetário da Cidade do Rio de Janeiro',
]

/**
 * Retorna apenas as secretarias (sem empresas e fundações)
 */
export function getSecretariasOnly(): string[] {
  return SECRETARIAS.filter(
    secretaria =>
      !secretaria.includes('Empresa') &&
      !secretaria.includes('Companhia') &&
      !secretaria.includes('Fundação') &&
      !secretaria.includes('Instituto') &&
      !secretaria.includes('Guarda Municipal')
  )
}

/**
 * Retorna apenas as empresas
 */
export function getEmpresas(): string[] {
  return SECRETARIAS.filter(
    secretaria =>
      secretaria.includes('Empresa') ||
      secretaria.includes('Companhia') ||
      secretaria.includes('Guarda Municipal')
  )
}

/**
 * Retorna apenas as fundações
 */
export function getFundacoes(): string[] {
  return SECRETARIAS.filter(
    secretaria =>
      secretaria.includes('Fundação') ||
      (secretaria.includes('Instituto') &&
        !secretaria.includes('Guarda Municipal'))
  )
}
