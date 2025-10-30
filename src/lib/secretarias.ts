export interface Secretaria {
  value: string
  label: string
  sigla?: string
}

export const SECRETARIAS: Secretaria[] = [
  {
    value: 'smcc',
    label: 'Secretaria Municipal da Casa Civil',
    sigla: 'SMCC',
  },
  {
    value: 'smcg',
    label: 'Secretaria Municipal de Coordenação Governamental',
    sigla: 'SMCG',
  },
  {
    value: 'cgm',
    label: 'Controladoria Geral do Município',
    sigla: 'CGM',
  },
  {
    value: 'pgm',
    label: 'Procuradoria Geral do Município',
    sigla: 'PGM',
  },
  {
    value: 'smf',
    label: 'Secretaria Municipal de Fazenda',
    sigla: 'SMF',
  },
  {
    value: 'smit',
    label:
      'Secretaria Municipal de Integridade, Transparência e Proteção de Dados',
    sigla: 'SMIT',
  },
  {
    value: 'smdu',
    label: 'Secretaria Municipal de Desenvolvimento Urbano e Licenciamento',
    sigla: 'SMDU',
  },
  {
    value: 'smde',
    label: 'Secretaria Municipal de Desenvolvimento Econômico',
    sigla: 'SMDE',
  },
  {
    value: 'smi',
    label: 'Secretaria Municipal de Infraestrutura',
    sigla: 'SMI',
  },
  {
    value: 'seop',
    label: 'Secretaria Municipal de Ordem Pública',
    sigla: 'SEOP',
  },
  {
    value: 'seconserva',
    label: 'Secretaria Municipal de Conservação',
    sigla: 'SECONSERVA',
  },
  {
    value: 'sme',
    label: 'Secretaria Municipal de Educação',
    sigla: 'SME',
  },
  {
    value: 'smas',
    label: 'Secretaria Municipal de Assistência Social',
    sigla: 'SMAS',
  },
  {
    value: 'smtr',
    label: 'Secretaria Municipal de Transportes',
    sigla: 'SMTR',
  },
  {
    value: 'sms',
    label: 'Secretaria Municipal de Saúde',
    sigla: 'SMS',
  },
  {
    value: 'semesqv',
    label: 'Secretaria Mun. do Envelhecimento Saudável e Qualidade de Vida',
    sigla: 'SEMESQV',
  },
  {
    value: 'smel',
    label: 'Secretaria de Esportes',
    sigla: 'SMEL',
  },
  {
    value: 'juv-rio',
    label: 'Secretaria Especial da Juventude Carioca',
    sigla: 'JUV-RIO',
  },
  {
    value: 'seac-rio',
    label: 'Secretaria Especial de Ação Comunitária',
    sigla: 'SEAC-RIO',
  },
  {
    value: 'seim',
    label: 'Secretaria Especial de Integração Metropolitana',
    sigla: 'SEIM',
  },
  {
    value: 'spm-rio',
    label: 'Secretaria Especial de Políticas para Mulheres e Cuidados',
    sigla: 'SPM-RIO',
  },
  {
    value: 'smpd',
    label: 'Secretaria Municipal da Pessoa com Deficiência',
    sigla: 'SMPD',
  },
  {
    value: 'smct',
    label: 'Secretaria Municipal de Ciência, Tecnologia e Inovação',
    sigla: 'SMCT',
  },
  {
    value: 'smc',
    label: 'Secretaria Municipal de Cultura',
    sigla: 'SMC',
  },
  {
    value: 'smh',
    label: 'Secretaria Municipal de Habitação',
    sigla: 'SMH',
  },
  {
    value: 'smac',
    label: 'Secretaria Municipal do Ambiente e Clima',
    sigla: 'SMAC',
  },
  {
    value: 'smpda',
    label: 'Secretaria Municipal de Proteção e Defesa dos Animais',
    sigla: 'SMPDA',
  },
  {
    value: 'smte',
    label: 'Secretaria Municipal de Trabalho e Renda',
    sigla: 'SMTE',
  },
  {
    value: 'ses-rio',
    label: 'Secretaria Especial de Economia Solidária',
    sigla: 'SES-RIO',
  },
  {
    value: 'smtur-rio',
    label: 'Secretaria Municipal de Turismo',
    sigla: 'SMTUR-RIO',
  },
  {
    value: 'secid',
    label: 'Secretaria Especial de Cidadania e Família',
    sigla: 'SECID',
  },
  {
    value: 'rioeventos',
    label: 'Empresa de Eventos do Município do Rio de Janeiro',
    sigla: 'RIOEVENTOS',
  },
  {
    value: 'cet-rio',
    label: 'Companhia de Engenharia de Tráfego do RJ',
    sigla: 'CET-Rio',
  },
  {
    value: 'rioluz',
    label: 'Companhia Municipal de Energia e Iluminação',
    sigla: 'RIOLUZ',
  },
  {
    value: 'comlurb',
    label: 'Companhia Municipal de Limpeza Urbana',
    sigla: 'COMLURB',
  },
  {
    value: 'riotur',
    label: 'Empresa de Turismo do Município do Rio de Janeiro',
    sigla: 'RIOTUR',
  },
  {
    value: 'riofilme',
    label: 'Empresa Distribuidora de Filmes S.A.',
    sigla: 'RIOFILME',
  },
  {
    value: 'ic',
    label: 'Empresa Municipal de Artes Gráficas - Imprensa da Cidade',
    sigla: 'IC',
  },
  {
    value: 'iplanrio',
    label: 'Empresa Municipal de Informática',
    sigla: 'IPLANRIO',
  },
  {
    value: 'multirio',
    label: 'Empresa Municipal de Multimeios Ltda.',
    sigla: 'MULTIRIO',
  },
  {
    value: 'rio-urbe',
    label: 'Empresa Municipal de Urbanização',
    sigla: 'RIO-URBE',
  },
  {
    value: 'riosaude',
    label: 'Empresa Pública de Saúde do Rio de Janeiro',
    sigla: 'RioSaúde',
  },
  {
    value: 'gm-rio',
    label: 'Guarda Municipal do Rio de Janeiro',
    sigla: 'GM-Rio',
  },
  {
    value: 'previ-rio',
    label: 'Instituto de Previdência e Assistência',
    sigla: 'PREVI-RIO',
  },
  {
    value: 'ipp',
    label: 'Instituto Municipal de Urbanismo Pereira Passos',
    sigla: 'IPP',
  },
  {
    value: 'irph',
    label: 'Instituto Rio Patrimônio da Humanidade',
    sigla: 'IRPH',
  },
  {
    value: 'fundacao-cidade-artes',
    label: 'Fundação Cidade das Artes',
  },
  {
    value: 'rio-aguas',
    label: 'Fundação Instituto das Águas do Município do Rio de Janeiro',
    sigla: 'RIO-ÁGUAS',
  },
  {
    value: 'geo-rio',
    label: 'Fundação Instituto de Geotécnica do Município do Rio de Janeiro',
    sigla: 'GEO-RIO',
  },
  {
    value: 'fpj',
    label: 'Fundação Parques e Jardins',
    sigla: 'FPJ',
  },
  {
    value: 'planetario',
    label: 'Fundação Planetário da Cidade do Rio de Janeiro',
  },
]

/**
 * Busca uma secretaria pelo seu valor
 */
export function getSecretariaByValue(value: string): Secretaria | undefined {
  return SECRETARIAS.find(secretaria => secretaria.value === value)
}

/**
 * Busca uma secretaria pela sua sigla
 */
export function getSecretariaBySigla(sigla: string): Secretaria | undefined {
  return SECRETARIAS.find(secretaria => secretaria.sigla === sigla)
}

/**
 * Retorna apenas as secretarias (sem empresas e fundações)
 */
export function getSecretariasOnly(): Secretaria[] {
  return SECRETARIAS.filter(
    secretaria =>
      !secretaria.value.includes('rio') &&
      !secretaria.value.includes('comlurb') &&
      !secretaria.value.includes('cet') &&
      !secretaria.value.includes('ic') &&
      !secretaria.value.includes('iplan') &&
      !secretaria.value.includes('multirio') &&
      !secretaria.value.includes('urbe') &&
      !secretaria.value.includes('gm-rio') &&
      !secretaria.value.includes('previ') &&
      !secretaria.value.includes('ipp') &&
      !secretaria.value.includes('irph') &&
      !secretaria.value.includes('fundacao') &&
      !secretaria.value.includes('aguas') &&
      !secretaria.value.includes('geo') &&
      !secretaria.value.includes('fpj') &&
      !secretaria.value.includes('planetario')
  )
}

/**
 * Retorna apenas as empresas
 */
export function getEmpresas(): Secretaria[] {
  return SECRETARIAS.filter(
    secretaria =>
      secretaria.value.includes('rio') ||
      secretaria.value.includes('comlurb') ||
      secretaria.value.includes('cet') ||
      secretaria.value.includes('ic') ||
      secretaria.value.includes('iplan') ||
      secretaria.value.includes('multirio') ||
      secretaria.value.includes('urbe') ||
      secretaria.value.includes('gm-rio')
  )
}

/**
 * Retorna apenas as fundações
 */
export function getFundacoes(): Secretaria[] {
  return SECRETARIAS.filter(
    secretaria =>
      secretaria.value.includes('previ') ||
      secretaria.value.includes('ipp') ||
      secretaria.value.includes('irph') ||
      secretaria.value.includes('fundacao') ||
      secretaria.value.includes('aguas') ||
      secretaria.value.includes('geo') ||
      secretaria.value.includes('fpj') ||
      secretaria.value.includes('planetario')
  )
}
