/**
 * Subclasses CNAE permitidas ao MEI: ocupações do Anexo XI da Resolução CGSN
 * nº 140, de 22 de maio de 2018 (Tabelas A e B), agrupadas por subclasse.
 *
 * Fonte: https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/Anexo_XI.pdf
 * (versão baixada em 29/10/2026, 471 ocupações em 351 subclasses). Os textos
 * seguem o anexo; mudanças na lista oficial entram por PR neste arquivo.
 *
 * Sem imports: o módulo roda no navegador e nos testes em Node puro.
 */

export interface MeiCnae {
  /** Subclasse no formato do IBGE: `0000-0/00`. */
  subclasse: string
  /** Descrição da subclasse CNAE no Anexo XI. */
  denominacao: string
  /** Ocupações do Anexo XI enquadradas nesta subclasse. */
  ocupacoes: readonly string[]
}

export interface MeiCnaeSearchResult {
  cnae: MeiCnae
  /** Ocupações que casaram com a busca por nome (vazio na busca por código). */
  ocupacoesEncontradas: string[]
}

const CODE_QUERY_PATTERN = /^[\d\s./-]+$/

/**
 * Busca subclasses do Anexo XI por código (inteiro ou parcial, com ou sem
 * máscara: `4724-5/00`, `4724500`, `4724`) ou por nome da atividade ou da
 * ocupação, sem diferenciar maiúsculas, acentos ou ordem das palavras. Busca
 * vazia devolve a lista inteira.
 */
export function searchMeiCnaes(query: string): MeiCnaeSearchResult[] {
  const trimmed = query.trim()
  if (trimmed === '')
    return MEI_CNAES.map(cnae => ({ cnae, ocupacoesEncontradas: [] }))

  if (CODE_QUERY_PATTERN.test(trimmed)) {
    const digits = onlyDigits(trimmed)
    if (digits === '') return []
    return MEI_CNAES.filter(cnae =>
      onlyDigits(cnae.subclasse).startsWith(digits)
    ).map(cnae => ({ cnae, ocupacoesEncontradas: [] }))
  }

  const terms = normalizeSearchText(trimmed).split(' ')
  const matchesAll = (text: string) => {
    const normalized = normalizeSearchText(text)
    return terms.every(term => normalized.includes(term))
  }

  const byDenominacao: MeiCnaeSearchResult[] = []
  const byOcupacao: MeiCnaeSearchResult[] = []
  for (const cnae of MEI_CNAES) {
    const ocupacoesEncontradas = cnae.ocupacoes.filter(matchesAll)
    if (matchesAll(cnae.denominacao))
      byDenominacao.push({ cnae, ocupacoesEncontradas })
    else if (ocupacoesEncontradas.length > 0)
      byOcupacao.push({ cnae, ocupacoesEncontradas })
  }
  return [...byDenominacao, ...byOcupacao]
}

/** Subclasse do Anexo XI pelo código, com ou sem máscara. */
export function findMeiCnae(subclasse: string): MeiCnae | undefined {
  const digits = onlyDigits(subclasse)
  if (digits.length !== 7) return undefined
  return MEI_CNAES.find(cnae => onlyDigits(cnae.subclasse) === digits)
}

/** Minúsculas, sem acentos e com espaços simples. */
export function normalizeSearchText(text: string): string {
  return (
    text
      .normalize('NFD')
      // biome-ignore lint/suspicious/noMisleadingCharacterClass: faixa Unicode das marcas diacríticas combinantes
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function onlyDigits(text: string): string {
  return text.replace(/\D/g, '')
}

export const MEI_CNAES: readonly MeiCnae[] = [
  {
    subclasse: '0121-1/01',
    denominacao: 'HORTICULTURA, EXCETO MORANGO',
    ocupacoes: ['VIVEIRISTA INDEPENDENTE'],
  },
  {
    subclasse: '0159-8/01',
    denominacao: 'APICULTURA',
    ocupacoes: ['APICULTOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '0159-8/02',
    denominacao: 'CRIAÇÃO DE ANIMAIS DE ESTIMAÇÃO',
    ocupacoes: ['CRIADOR(A) DE ANIMAIS DOMÉSTICOS INDEPENDENTE'],
  },
  {
    subclasse: '0161-0/02',
    denominacao: 'SERVIÇO DE PODA DE ARVORES PARA LAVOURA',
    ocupacoes: [
      'PRESTADOR(A) DE SERVIÇOS DE PODA SOB CONTRATO DE EMPREITADA INDEPENDENTE',
    ],
  },
  {
    subclasse: '0161-0/03',
    denominacao: 'SERVIÇO DE PREPARAÇÃO DE TERRENO, CULTIVO E COLHEITA',
    ocupacoes: [
      'PRESTADOR(A) DE SERVIÇOS DE COLHEITA SOB CONTRATO DE EMPREITADA INDEPENDENTE',
      'PRESTADOR(A) DE SERVIÇOS DE PREPARAÇÃO DE TERRENOS SOB CONTRATO DE EMPREITADA INDEPENDENTE',
      'PRESTADOR(A) DE SERVIÇOS DE ROÇAGEM, DESTOCAMENTO, LAVRAÇÃO, GRADAGEM E SULCAMENTO SOB CONTRATO DE EMPREITADA INDEPENDENTE',
      'PRESTADOR(A) DE SERVIÇOS DE SEMEADURA SOB CONTRATO DE EMPREITADA INDEPENDENTE',
    ],
  },
  {
    subclasse: '0162-8/02',
    denominacao: 'SERVIÇO DE TOSQUIAMENTO DE OVINOS',
    ocupacoes: ['TOSQUIADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '0321-3/04',
    denominacao: 'CRIAÇÃO DE PEIXES ORNAMENTAIS EM ÁGUA SALGADA E SALOBRA',
    ocupacoes: [
      'CRIADOR(A) DE PEIXES ORNAMENTAIS EM ÁGUA SALGADA INDEPENDENTE',
    ],
  },
  {
    subclasse: '0322-1/04',
    denominacao: 'CRIAÇÃO DE PEIXES ORNAMENTAIS EM ÁGUA DOCE',
    ocupacoes: ['CRIADOR(A) DE PEIXES ORNAMENTAIS EM ÁGUA DOCE INDEPENDENTE'],
  },
  {
    subclasse: '0892-4/01',
    denominacao: 'EXTRAÇÃO DE SAL MARINHO',
    ocupacoes: ['SALINEIRO/EXTRATOR DE SAL MARINHO INDEPENDENTE'],
  },
  {
    subclasse: '1013-9/01',
    denominacao: 'FABRICAÇÃO DE PRODUTOS DE CARNE',
    ocupacoes: [
      'FABRICANTE DE PRODUTOS DERIVADOS DE CARNE INDEPENDENTE',
      'SALSICHEIRO(A)/LINGUICEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '1031-7/00',
    denominacao: 'FABRICAÇÃO DE CONSERVAS DE FRUTAS',
    ocupacoes: [
      'BENEFICIADOR(A) DE CASTANHA INDEPENDENTE',
      'COMPOTEIRO(A) INDEPENDENTE',
      'FABRICANTE DE AMENDOIM E CASTANHA DE CAJU TORRADOS E SALGADOS INDEPENDENTE',
      'FABRICANTE DE CONSERVAS DE FRUTAS INDEPENDENTE',
      'FABRICANTE DE POLPAS DE FRUTAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1032-5/99',
    denominacao:
      'FABRICAÇÃO DE CONSERVAS DE LEGUMES E OUTROS VEGETAIS, EXCETO PALMITO',
    ocupacoes: [
      'FABRICANTE DE CONSERVAS DE LEGUMES E OUTROS VEGETAIS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1033-3/01',
    denominacao:
      'FABRICAÇÃO DE SUCOS CONCENTRADOS DE FRUTAS, HORTALIÇAS E LEGUMES',
    ocupacoes: [
      'FABRICANTE DE SUCOS CONCENTRADOS DE FRUTAS, HORTALIÇAS E LEGUMES INDEPENDENTE',
    ],
  },
  {
    subclasse: '1033-3/02',
    denominacao:
      'FABRICAÇÃO DE SUCOS DE FRUTAS, HORTALIÇAS E LEGUMES, EXCETO CONCENTRADOS',
    ocupacoes: [
      'FABRICANTE DE SUCOS DE FRUTAS, HORTALIÇAS E LEGUMES INDEPENDENTE',
    ],
  },
  {
    subclasse: '1052-0/00',
    denominacao: 'FABRICAÇÃO DE LATICÍNIOS',
    ocupacoes: [
      'FABRICANTE DE LATICÍNIOS INDEPENDENTE',
      'QUEIJEIRO(A)/MANTEIGUEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '1061-9/02',
    denominacao: 'FABRICAÇÃO DE PRODUTOS DO ARROZ',
    ocupacoes: ['FABRICANTE DE PRODUTOS DERIVADOS DO ARROZ INDEPENDENTE'],
  },
  {
    subclasse: '1063-5/00',
    denominacao: 'FABRICAÇÃO DE FARINHA DE MANDIOCA E DERIVADOS',
    ocupacoes: ['FARINHEIRO DE MANDIOCA INDEPENDENTE'],
  },
  {
    subclasse: '1064-3/00',
    denominacao:
      'FABRICAÇÃO DE FARINHA DE MILHO E DERIVADOS, EXCETO ÓLEOS DE MILHO',
    ocupacoes: ['FARINHEIRO DE MILHO INDEPENDENTE'],
  },
  {
    subclasse: '1065-1/01',
    denominacao: 'FABRICAÇÃO DE AMIDOS E FÉCULAS DE VEGETAIS',
    ocupacoes: ['FABRICANTE DE AMIDO E FÉCULAS DE VEGETAIS INDEPENDENTE'],
  },
  {
    subclasse: '1069-4/00',
    denominacao:
      'MOAGEM E FABRICAÇÃO DE PRODUTOS DE ORIGEM VEGETAL NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['MOENDEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1071-6/00',
    denominacao: 'FABRICAÇÃO DE AÇÚCAR EM BRUTO',
    ocupacoes: [
      'FABRICANTE DE AÇÚCAR MASCAVO INDEPENDENTE',
      'FABRICANTE DE RAPADURA E MELAÇO INDEPENDENTE',
    ],
  },
  {
    subclasse: '1091-1/01',
    denominacao: 'FABRICAÇÃO DE PRODUTOS DE PANIFICAÇÃO INDUSTRIAL',
    ocupacoes: [
      'FABRICANTE DE PÃO DE QUEIJO CONGELADO INDEPENDENTE',
      'PADEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '1091-1/02',
    denominacao:
      'FABRICAÇÃO DE PRODUTOS DE PADARIA E CONFEITARIA COM PREDOMINÂNCIA DE PRODUÇÃO PRÓPRIA.',
    ocupacoes: ['CONFEITEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1092-9/00',
    denominacao: 'FABRICAÇÃO DE BISCOITOS E BOLACHAS',
    ocupacoes: ['BOLACHEIRO(A)/BISCOITEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1093-7/01',
    denominacao: 'FABRICAÇÃO DE PRODUTOS DERIVADOS DO CACAU E DE CHOCOLATES',
    ocupacoes: ['CHOCOLATEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1093-7/02',
    denominacao: 'FABRICAÇÃO DE FRUTAS CRISTALIZADAS, BALAS E SEMELHANTES',
    ocupacoes: [
      'FABRICANTE DE BALAS, CONFEITOS E FRUTAS CRISTALIZADAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1094-5/00',
    denominacao: 'FABRICAÇÃO DE MASSAS ALIMENTÍCIAS',
    ocupacoes: ['FABRICANTE DE MASSAS ALIMENTÍCIAS INDEPENDENTE'],
  },
  {
    subclasse: '1095-3/00',
    denominacao: 'FABRICAÇÃO DE ESPECIARIAS, MOLHOS, TEMPEROS E CONDIMENTOS',
    ocupacoes: ['FABRICANTE DE ESPECIARIAS INDEPENDENTE'],
  },
  {
    subclasse: '1096-1/00',
    denominacao: 'FABRICAÇÃO DE ALIMENTOS E PRATOS PRONTOS',
    ocupacoes: ['FABRICANTE DE ALIMENTOS PRONTOS CONGELADOS INDEPENDENTE'],
  },
  {
    subclasse: '1099-6/01',
    denominacao: 'FABRICAÇÃO DE VINAGRES',
    ocupacoes: ['VINAGREIRO INDEPENDENTE'],
  },
  {
    subclasse: '1099-6/04',
    denominacao: 'FABRICAÇÃO DE GELO COMUM',
    ocupacoes: ['FABRICANTE DE GELO COMUM INDEPENDENTE'],
  },
  {
    subclasse: '1099-6/05',
    denominacao: 'FABRICAÇÃO DE PRODUTOS PARA INFUSÃO (CHÁ, MATE ETC.)',
    ocupacoes: ['FABRICANTE DE CHÁ INDEPENDENTE'],
  },
  {
    subclasse: '1099-6/99',
    denominacao:
      'FABRICAÇÃO DE OUTROS PRODUTOS ALIMENTÍCIOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'FABRICANTE DE GELÉIA DE MOCOTÓ INDEPENDENTE',
      'FABRICANTE DE PRODUTOS DE SOJA INDEPENDENTE',
    ],
  },
  {
    subclasse: '1122-4/03',
    denominacao:
      'FABRICAÇÃO DE REFRESCOS, XAROPES E PÓS PARA REFRESCOS, EXCETO REFRESCOS DE FRUTAS',
    ocupacoes: [
      'FABRICANTE DE REFRESCOS, XAROPES E PÓS PARA REFRESCOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1220-4/99',
    denominacao:
      'FABRICAÇÃO DE OUTROS PRODUTOS DO FUMO, EXCETO CIGARROS, CIGARRILHAS E CHARUTOS',
    ocupacoes: ['FABRICANTE DE FUMO E DERIVADOS DO FUMO INDEPENDENTE'],
  },
  {
    subclasse: '1311-1/00',
    denominacao: 'PREPARAÇÃO E FIAÇÃO DE FIBRAS DE ALGODÃO',
    ocupacoes: ['FABRICANTE DE FIOS DE ALGODÃO INDEPENDENTE'],
  },
  {
    subclasse: '1312-0/00',
    denominacao:
      'PREPARAÇÃO E FIAÇÃO DE FIBRAS TÊXTEIS NATURAIS, EXCETO ALGODÃO',
    ocupacoes: [
      'FABRICANTE DE FIOS DE LINHO, RAMI, JUTA, SEDA E LÃ INDEPENDENTE',
    ],
  },
  {
    subclasse: '1321-9/00',
    denominacao: 'TECELAGEM DE FIOS DE ALGODÃO',
    ocupacoes: ['TECELÃO(Ã) DE ALGODÃO INDEPENDENTE'],
  },
  {
    subclasse: '1322-7/00',
    denominacao: 'TECELAGEM DE FIOS DE FIBRAS TÊXTEIS NATURAIS, EXCETO ALGODÃO',
    ocupacoes: ['TECELÃO(Ã) INDEPENDENTE'],
  },
  {
    subclasse: '1340-5/01',
    denominacao:
      'ESTAMPARIA E TEXTURIZAÇÃO EM FIOS, TECIDOS, ARTEFATOS TÊXTEIS E PEÇAS DO VESTUÁRIO',
    ocupacoes: ['ESTAMPADOR(A) DE PEÇAS DO VESTUÁRIO INDEPENDENTE'],
  },
  {
    subclasse: '1340-5/99',
    denominacao:
      'OUTROS SERVIÇOS DE ACABAMENTO EM FIOS, TECIDOS, ARTEFATOS TÊXTEIS E PEÇAS DO VESTUÁRIO',
    ocupacoes: [
      'BORDADEIRO(A) INDEPENDENTE',
      'CUSTOMIZADOR(A) DE ROUPAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1351-1/00',
    denominacao: 'FABRICAÇÃO DE ARTEFATOS TÊXTEIS PARA USO DOMÉSTICO',
    ocupacoes: [
      'FABRICANTE DE ARTEFATOS TÊXTEIS PARA USO DOMÉSTICO INDEPENDENTE',
    ],
  },
  {
    subclasse: '1352-9/00',
    denominacao: 'FABRICAÇÃO DE ARTEFATOS DE TAPEÇARIA',
    ocupacoes: ['TAPECEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1353-7/00',
    denominacao: 'FABRICAÇÃO DE ARTEFATOS DE CORDOARIA',
    ocupacoes: ['REDEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1359-6/00',
    denominacao:
      'FABRICAÇÃO DE OUTROS PRODUTOS TÊXTEIS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO TÊXTIL', 'RENDEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1411-8/01',
    denominacao: 'CONFECÇÃO DE ROUPAS ÍNTIMAS',
    ocupacoes: ['FABRICANTE DE ROUPAS ÍNTIMAS INDEPENDENTE'],
  },
  {
    subclasse: '1411-8/02',
    denominacao: 'FACÇÃO DE ROUPAS ÍNTIMAS',
    ocupacoes: ['FABRICANTE DE PARTES DE ROUPAS ÍNTIMAS - FACÇÃO INDEPENDENTE'],
  },
  {
    subclasse: '1412-6/01',
    denominacao:
      'CONFECÇÃO DE PEÇAS DE VESTUÁRIO, EXCETO ROUPAS ÍNTIMAS E AS CONFECCIONADAS SOB MEDIDA',
    ocupacoes: ['COSTUREIRO(A) DE ROUPAS, EXCETO SOB MEDIDA, INDEPENDENTE'],
  },
  {
    subclasse: '1412-6/02',
    denominacao:
      'CONFECÇÃO SOB MEDIDA DE PEÇAS DO VESTUÁRIO, EXCETO ROUPAS ÍNTIMAS',
    ocupacoes: [
      'ALFAIATE INDEPENDENTE',
      'COSTUREIRO(A) DE ROUPAS SOB MEDIDA INDEPENDENTE',
    ],
  },
  {
    subclasse: '1412-6/03',
    denominacao: 'FACÇÃO DE PEÇAS DO VESTUÁRIO, EXCETO ROUPAS ÍNTIMAS',
    ocupacoes: [
      'FABRICANTE DE PARTES DE PEÇAS DO VESTUÁRIO - FACÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '1413-4/03',
    denominacao: 'FACÇÃO DE ROUPAS PROFISSIONAIS',
    ocupacoes: [
      'FABRICANTE DE PARTES DE ROUPAS PROFISSIONAIS - FACÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '1414-2/00',
    denominacao:
      'FABRICAÇÃO DE ACESSÓRIOS DO VESTUÁRIO, EXCETO PARA SEGURANÇA E PROTEÇÃO',
    ocupacoes: [
      'BONELEIRO(A) (FABRICANTE DE BONÉS) INDEPENDENTE',
      'CHAPELEIRO(A) INDEPENDENTE',
      'FABRICANTE DE CINTOS/CINTEIRO INDEPENDENTE',
    ],
  },
  {
    subclasse: '1421-5/00',
    denominacao: 'FABRICAÇÃO DE MEIAS',
    ocupacoes: ['FABRICANTE DE MEIAS INDEPENDENTE'],
  },
  {
    subclasse: '1422-3/00',
    denominacao:
      'FABRICAÇÃO DE ARTIGOS DO VESTUÁRIO, PRODUZIDOS EM MALHARIAS E TRICOTAGENS, EXCETO MEIAS',
    ocupacoes: ['CROCHETEIRO(A) INDEPENDENTE', 'TRICOTEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1510-6/00',
    denominacao: 'CURTIMENTO E OUTRAS PREPARAÇÕES DE COURO',
    ocupacoes: ['CURTIDOR DE COURO INDEPENDENTE'],
  },
  {
    subclasse: '1521-1/00',
    denominacao:
      'FABRICAÇÃO DE ARTIGOS PARA VIAGEM, BOLSAS E SEMELHANTES DE QUALQUER MATERIAL',
    ocupacoes: [
      'FABRICANTE DE BOLSAS/BOLSEIRO INDEPENDENTE',
      'FABRICANTE DE MALAS INDEPENDENTE',
      'FABRICANTE DE MOCHILAS E CARTEIRAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1529-7/00',
    denominacao:
      'FABRICAÇÃO DE ARTEFATOS DE COURO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM COURO INDEPENDENTE', 'SELEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1531-9/01',
    denominacao: 'FABRICAÇÃO DE CALÇADOS DE COURO',
    ocupacoes: ['FABRICANTE DE CALÇADOS DE COURO INDEPENDENTE'],
  },
  {
    subclasse: '1531-9/02',
    denominacao: 'ACABAMENTO DE CALÇADOS DE COURO SOB CONTRATO',
    ocupacoes: ['ACABADOR(A) DE CALÇADOS INDEPENDENTE'],
  },
  {
    subclasse: '1539-4/00',
    denominacao:
      'FABRICAÇÃO DE CALÇADOS DE MATERIAIS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'FABRICANTE DE CALÇADOS DE BORRACHA, MADEIRA E TECIDOS E FIBRAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '1540-8/00',
    denominacao: 'FABRICAÇÃO DE PARTES PARA CALÇADOS, DE QUALQUER MATERIAL',
    ocupacoes: ['FABRICANTE DE PARTES PARA CALÇADOS INDEPENDENTE'],
  },
  {
    subclasse: '1622-6/99',
    denominacao: 'FABRICAÇÃO DE OUTROS ARTIGOS DE CARPINTARIA PARA CONSTRUÇÃO',
    ocupacoes: ['CARPINTEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '1623-4/00',
    denominacao:
      'FABRICAÇÃO DE ARTEFATOS DE TANOARIA E DE EMBALAGENS DE MADEIRA',
    ocupacoes: [
      'FABRICANTE DE EMBALAGENS DE MADEIRA INDEPENDENTE',
      'TANOEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '1629-3/01',
    denominacao: 'FABRICAÇÃO DE ARTEFATOS DIVERSOS DE MADEIRA, EXCETO MÓVEIS',
    ocupacoes: ['ARTESÃO(Ã) EM MADEIRA INDEPENDENTE'],
  },
  {
    subclasse: '1629-3/02',
    denominacao:
      'FABRICAÇÃO DE ARTEFATOS DIVERSOS DE CORTIÇA, BAMBU, PALHA, VIME E OUTROS MATERIAIS TRANÇADOS, EXCETO MÓVEIS',
    ocupacoes: ['ARTESÃO(Ã) EM CORTIÇA, BAMBU E AFINS INDEPENDENTE'],
  },
  {
    subclasse: '1721-4/00',
    denominacao: 'FABRICAÇÃO DE PAPEL',
    ocupacoes: ['FABRICANTE DE PAPEL INDEPENDENTE'],
  },
  {
    subclasse: '1731-1/00',
    denominacao: 'FABRICAÇÃO DE EMBALAGENS DE PAPEL',
    ocupacoes: ['FABRICANTE DE EMBALAGENS DE PAPEL INDEPENDENTE'],
  },
  {
    subclasse: '1732-0/00',
    denominacao: 'FABRICAÇÃO DE EMBALAGENS DE CARTOLINA E PAPEL-CARTÃO',
    ocupacoes: [
      'FABRICANTE DE EMBALAGENS DE CARTOLINA E PAPEL-CARTÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '1742-7/99',
    denominacao:
      'FABRICAÇÃO DE PRODUTOS DE PAPEL PARA USO DOMÉSTICO E HIGIÊNICO-SANITÁRIO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['FABRICANTE DE GUARDANAPOS E COPOS DE PAPEL INDEPENDENTE'],
  },
  {
    subclasse: '1749-4/00',
    denominacao:
      'FABRICAÇÃO DE PRODUTOS DE PASTAS CELULÓSICAS, PAPEL, CARTOLINA, PAPEL-CARTÃO E PAPELÃO ONDULADO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM PAPEL INDEPENDENTE'],
  },
  {
    subclasse: '1813-0/01',
    denominacao: 'IMPRESSÃO DE MATERIAL PARA USO PUBLICITÁRIO',
    ocupacoes: ['SERIGRAFISTA PUBLICITÁRIO INDEPENDENTE'],
  },
  {
    subclasse: '1813-0/99',
    denominacao: 'IMPRESSÃO DE MATERIAL PARA OUTROS USOS',
    ocupacoes: ['SERIGRAFISTA INDEPENDENTE'],
  },
  {
    subclasse: '1821-1/00',
    denominacao: 'SERVIÇOS DE PRÉ-IMPRESSÃO',
    ocupacoes: ['CLICHERISTA INDEPENDENTE'],
  },
  {
    subclasse: '1822-9/01',
    denominacao: 'SERVIÇOS DE ENCADERNAÇÃO E PLASTIFICAÇÃO',
    ocupacoes: ['ENCADERNADOR(A)/PLASTIFICADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '2219-6/00',
    denominacao:
      'FABRICAÇÃO DE ARTEFATOS DE BORRACHA NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM BORRACHA INDEPENDENTE'],
  },
  {
    subclasse: '2229-3/99',
    denominacao:
      'FABRICAÇÃO DE ARTEFATOS DE MATERIAL PLÁSTICO PARA OUTROS USOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM PLÁSTICO INDEPENDENTE'],
  },
  {
    subclasse: '2319-2/00',
    denominacao: 'FABRICAÇÃO DE ARTIGOS DE VIDRO',
    ocupacoes: ['ARTESÃO(Ã) EM VIDRO INDEPENDENTE'],
  },
  {
    subclasse: '2330-3/99',
    denominacao:
      'FABRICAÇÃO DE OUTROS ARTEFATOS E PRODUTOS DE CONCRETO, CIMENTO, FIBROCIMENTO, GESSO E MATERIAIS SEMELHANTES',
    ocupacoes: [
      'ARTESÃO(Ã) EM CIMENTO INDEPENDENTE',
      'ARTESÃO(Ã) EM GESSO INDEPENDENTE',
    ],
  },
  {
    subclasse: '2342-7/02',
    denominacao:
      'FABRICAÇÃO DE ARTEFATOS DE CERÂMICA E BARRO COZIDO PARA USO NA CONSTRUÇÃO, EXCETO AZULEJOS E PISOS',
    ocupacoes: ['OLEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '2349-4/99',
    denominacao:
      'FABRICAÇÃO DE PRODUTOS CERÂMICOS NÃO REFRATÁRIOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM CERÂMICA INDEPENDENTE'],
  },
  {
    subclasse: '2391-5/01',
    denominacao: 'BRITAMENTO DE PEDRAS, EXCETO ASSOCIADO À EXTRAÇÃO',
    ocupacoes: ['BRITADOR INDEPENDENTE'],
  },
  {
    subclasse: '2391-5/03',
    denominacao:
      'APARELHAMENTO DE PLACAS E EXECUÇÃO DE TRABALHOS EM MÁRMORE, GRANITO, ARDÓSIA E OUTRAS PEDRAS',
    ocupacoes: [
      'ARTESÃO(Ã) EM MÁRMORE, GRANITO, ARDÓSIA E OUTRAS PEDRAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '2399-1/01',
    denominacao:
      'DECORAÇÃO, LAPIDAÇÃO, GRAVAÇÃO, VITRIFICAÇÃO E OUTROS TRABALHOS EM CERÂMICA, LOUÇA, VIDRO E CRISTAL',
    ocupacoes: ['ARTESÃO(Ã) EM LOUÇAS, VIDRO E CRISTAL INDEPENDENTE'],
  },
  {
    subclasse: '2512-8/00',
    denominacao: 'FABRICAÇÃO DE ESQUADRIAS DE METAL',
    ocupacoes: [
      'FABRICANTE DE ESQUADRIAS METÁLICAS, SOB ENCOMENDA OU NÃO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '2532-2/01',
    denominacao: 'PRODUÇÃO DE ARTEFATOS ESTAMPADOS DE METAL',
    ocupacoes: [
      'FABRICANTE DE ARTEFATOS DE FUNILARIA INDEPENDENTE',
      'FABRICANTE DE ARTEFATOS ESTAMPADOS DE METAL, SOB ENCOMENDA OU NÃO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '2539-0/01',
    denominacao: 'SERVIÇOS DE USINAGEM, TORNEARIA E SOLDA',
    ocupacoes: [
      'SOLDADOR(A)/BRASADOR(A) INDEPENDENTE',
      'TORNEIRO(A) MECÂNICO INDEPENDENTE',
    ],
  },
  {
    subclasse: '2539-0/02',
    denominacao: 'SERVIÇOS DE TRATAMENTO E REVESTIMENTO EM METAIS',
    ocupacoes: ['GALVANIZADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '2541-1/00',
    denominacao: 'FABRICAÇÃO DE ARTIGOS DE CUTELARIA',
    ocupacoes: ['FABRICANTE DE ARTIGOS DE CUTELARIA INDEPENDENTE'],
  },
  {
    subclasse: '2542-0/00',
    denominacao: 'FABRICAÇÃO DE ARTIGOS DE SERRALHERIA, EXCETO ESQUADRIAS',
    ocupacoes: [
      'SERRALHEIRO(A), EXCETO PARA ESQUADRIAS, SOB ENCOMENDA OU NÃO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '2543-8/00',
    denominacao: 'FABRICAÇÃO DE FERRAMENTAS',
    ocupacoes: [
      'FERRAMENTEIRO(A) INDEPENDENTE',
      'FERREIRO/FORJADOR INDEPENDENTE',
    ],
  },
  {
    subclasse: '2599-3/01',
    denominacao:
      'SERVIÇOS DE CONFECÇÃO DE ARMAÇÕES METÁLICAS PARA A CONSTRUÇÃO',
    ocupacoes: ['ARMADOR(A) DE FERRAGENS NA CONSTRUÇÃO CIVIL INDEPENDENTE'],
  },
  {
    subclasse: '2599-3/99',
    denominacao:
      'FABRICAÇÃO DE OUTROS PRODUTOS DE METAL NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM METAIS INDEPENDENTE'],
  },
  {
    subclasse: '2740-6/02',
    denominacao: 'FABRICAÇÃO DE LUMINÁRIAS E OUTROS EQUIPAMENTOS DE ILUMINAÇÃO',
    ocupacoes: [
      'FABRICANTE DE LUMINÁRIAS E OUTROS EQUIPAMENTOS DE ILUMINAÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '2950-6/00',
    denominacao:
      'RECONDICIONAMENTO E RECUPERAÇÃO DE MOTORES PARA VEÍCULOS AUTOMOTORES',
    ocupacoes: [
      'RETIFICADOR(A) DE MOTORES PARA VEÍCULOS AUTOMOTORES INDEPENDENTE',
    ],
  },
  {
    subclasse: '3101-2/00',
    denominacao: 'FABRICAÇÃO DE MÓVEIS COM PREDOMINÂNCIA DE MADEIRA',
    ocupacoes: ['MARCENEIRO(A) SOB ENCOMENDA OU NÃO, INDEPENDENTE'],
  },
  {
    subclasse: '3102-1/00',
    denominacao: 'FABRICAÇÃO DE MÓVEIS COM PREDOMINÂNCIA DE METAL',
    ocupacoes: ['MOVELEIRO(A) DE MÓVEIS METÁLICOS INDEPENDENTE'],
  },
  {
    subclasse: '3103-9/00',
    denominacao:
      'FABRICAÇÃO DE MÓVEIS DE OUTROS MATERIAIS, EXCETO MADEIRA E METAL',
    ocupacoes: ['MOVELEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '3104-7/00',
    denominacao: 'FABRICAÇÃO DE COLCHÕES',
    ocupacoes: ['COLCHOEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '3211-6/01',
    denominacao: 'LAPIDAÇÃO DE GEMAS',
    ocupacoes: ['LAPIDADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '3211-6/02',
    denominacao: 'FABRICAÇÃO DE ARTEFATOS DE JOALHERIA E OURIVESARIA',
    ocupacoes: ['ARTESÃO(Ã) EM METAIS PRECIOSOS INDEPENDENTE'],
  },
  {
    subclasse: '3211-6/03',
    denominacao: 'CUNHAGEM DE MOEDAS E MEDALHAS',
    ocupacoes: ['CUNHADOR(A) DE MOEDAS E MEDALHAS INDEPENDENTE'],
  },
  {
    subclasse: '3212-4/00',
    denominacao: 'FABRICAÇÃO DE BIJUTERIAS E ARTEFATOS SEMELHANTES',
    ocupacoes: ['ARTESÃO(Ã) DE BIJUTERIAS INDEPENDENTE'],
  },
  {
    subclasse: '3220-5/00',
    denominacao: 'FABRICAÇÃO DE INSTRUMENTOS MUSICAIS, PEÇAS E ACESSÓRIOS',
    ocupacoes: ['FABRICANTE DE INSTRUMENTOS MUSICAIS INDEPENDENTE'],
  },
  {
    subclasse: '3230-2/00',
    denominacao: 'FABRICAÇÃO DE ARTEFATOS PARA PESCA E ESPORTE',
    ocupacoes: ['FABRICANTE DE ARTEFATOS PARA PESCA E ESPORTE INDEPENDENTE'],
  },
  {
    subclasse: '3240-0/99',
    denominacao:
      'FABRICAÇÃO DE OUTROS BRINQUEDOS E JOGOS RECREATIVOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'FABRICANTE DE BRINQUEDOS NÃO ELETRÔNICOS INDEPENDENTE',
      'FABRICANTE DE JOGOS RECREATIVOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '3291-4/00',
    denominacao: 'FABRICAÇÃO DE ESCOVAS, PINCÉIS E VASSOURAS',
    ocupacoes: ['VASSOUREIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '3292-2/02',
    denominacao:
      'FABRICAÇÃO DE EQUIPAMENTOS E ACESSÓRIOS PARA SEGURANÇA PESSOAL E PROFISSIONAL',
    ocupacoes: [
      'FABRICANTE DE PRODUTOS DE TECIDO NÃO TECIDO PARA USO ODONTO-MÉDICO-HOSPITALAR INDEPENDENTE',
    ],
  },
  {
    subclasse: '3299-0/01',
    denominacao: 'FABRICAÇÃO DE GUARDA-CHUVAS E SIMILARES',
    ocupacoes: ['FABRICANTE DE GUARDA-CHUVAS E SIMILARES INDEPENDENTE'],
  },
  {
    subclasse: '3299-0/02',
    denominacao:
      'FABRICAÇÃO DE CANETAS, LÁPIS E OUTROS ARTIGOS PARA ESCRITÓRIO',
    ocupacoes: ['CONFECCIONADOR(A) DE CARIMBOS INDEPENDENTE'],
  },
  {
    subclasse: '3299-0/03',
    denominacao:
      'FABRICAÇÃO DE LETRAS, LETREIROS E PLACAS DE QUALQUER MATERIAL, EXCETO LUMINOSOS',
    ocupacoes: [
      'FABRICANTE DE LETREIROS, PLACAS E PAINÉIS NÃO LUMINOSOS, SOB ENCOMENDA OU NÃO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '3299-0/04',
    denominacao: 'FABRICAÇÃO DE PAINÉIS E LETREIROS LUMINOSOS',
    ocupacoes: ['FABRICANTE DE PAINÉIS E LETREIROS LUMINOSOS INDEPENDENTE'],
  },
  {
    subclasse: '3299-0/05',
    denominacao: 'FABRICAÇÃO DE AVIAMENTOS PARA COSTURA',
    ocupacoes: ['FABRICANTE DE AVIAMENTOS PARA COSTURA INDEPENDENTE'],
  },
  {
    subclasse: '3299-0/06',
    denominacao: 'FABRICAÇÃO DE VELAS, INCLUSIVE DECORATIVAS',
    ocupacoes: ['FABRICANTE DE VELAS, INCLUSIVE DECORATIVAS INDEPENDENTE'],
  },
  {
    subclasse: '3299-0/99',
    denominacao:
      'FABRICAÇÃO DE PRODUTOS DIVERSOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['ARTESÃO(Ã) EM OUTROS MATERIAIS INDEPENDENTE'],
  },
  {
    subclasse: '3311-2/00',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE TANQUES, RESERVATÓRIOS METÁLICOS E CALDEIRAS, EXCETO PARA VEÍCULOS',
    ocupacoes: [
      'REPARADOR(A) DE TANQUES, RESERVATÓRIOS METÁLICOS E CALDEIRAS, EXCETO PARA VEÍCULOS, INDEPENDENTE',
    ],
  },
  {
    subclasse: '3313-9/01',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE GERADORES, TRANSFORMADORES E MOTORES ELÉTRICOS',
    ocupacoes: [
      'REPARADOR(A) DE GERADORES, TRANSFORMADORES E MOTORES ELÉTRICOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '3313-9/02',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE BATERIAS E ACUMULADORES ELÉTRICOS, EXCETO PARA VEÍCULOS',
    ocupacoes: [
      'REPARADOR(A) DE BATERIAS E ACUMULADORES ELÉTRICOS, EXCETO PARA VEÍCULOS, INDEPENDENTE',
    ],
  },
  {
    subclasse: '3313-9/99',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS, APARELHOS E MATERIAIS ELÉTRICOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'REPARADOR(A) DE APARELHOS E EQUIPAMENTOS PARA DISTRIBUIÇÃO E CONTROLE DE ENERGIA ELÉTRICA INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/01',
    denominacao: 'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS MOTRIZES NÃO ELÉTRICAS',
    ocupacoes: ['REPARADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '3314-7/02',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE EQUIPAMENTOS HIDRÁULICOS E PNEUMÁTICOS, EXCETO VÁLVULAS',
    ocupacoes: [
      'REPARADOR(A) DE EQUIPAMENTOS HIDRÁULICOS E PNEUMÁTICOS, EXCETO VÁLVULAS, INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/06',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS, E EQUIPAMENTOS PARA INSTALAÇÕES TÉRMICAS',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS, APARELHOS E EQUIPAMENTOS PARA INSTALAÇÕES TÉRMICAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/07',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS E APARELHOS DE REFRIGERAÇÃO E VENTILAÇÃO PARA USO INDUSTRIAL E COMERCIAL',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS E APARELHOS DE REFRIGERAÇÃO E VENTILAÇÃO PARA USO INDUSTRIAL E COMERCIAL INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/09',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS DE ESCREVER, CALCULAR E DE OUTROS EQUIPAMENTOS NÃO ELETRÔNICOS PARA ESCRITÓRIO',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS DE ESCREVER, CALCULAR E DE OUTROS EQUIPAMENTOS NÃO ELETRÔNICOS PARA ESCRITÓRIO INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/10',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS E EQUIPAMENTOS PARA USO GERAL NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'REPARADOR(A) DE BALANÇAS INDUSTRIAIS E COMERCIAIS INDEPENDENTE',
      'REPARADOR(A) DE EXTINTOR DE INCÊNDIO INDEPENDENTE',
      'REPARADOR(A) DE FILTROS INDUSTRIAIS INDEPENDENTE',
      'REPARADOR(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/11',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS E EQUIPAMENTOS PARA AGRICULTURA E PECUÁRIA',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS E EQUIPAMENTOS PARA AGRICULTURA E PECUÁRIA INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/12',
    denominacao: 'MANUTENÇÃO E REPARAÇÃO DE TRATORES AGRÍCOLAS',
    ocupacoes: ['REPARADOR(A) DE TRATORES AGRÍCOLAS INDEPENDENTE'],
  },
  {
    subclasse: '3314-7/19',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS E EQUIPAMENTOS PARA AS INDÚSTRIAS DE ALIMENTOS, BEBIDAS E FUMO',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS E EQUIPAMENTOS PARA AS INDÚSTRIAS DE ALIMENTOS, BEBIDAS E FUMO INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/20',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE MÁQUINAS E EQUIPAMENTOS PARA A INDÚSTRIA TÊXTIL, DO VESTUÁRIO, DO COURO E CALÇADOS',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS E EQUIPAMENTOS PARA A INDÚSTRIA TÊXTIL, DO VESTUÁRIO, DO COURO E CALÇADOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '3314-7/99',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE OUTRAS MÁQUINAS E EQUIPAMENTOS PARA USOS INDUSTRIAIS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'REPARADOR(A) DE MÁQUINAS E EQUIPAMENTOS PARA A INDÚSTRIA DA MADEIRA INDEPENDENTE',
      'REPARADOR(A) DE MÁQUINAS GRÁFICA INDEPENDENTE',
      'REPARADOR(A) DE MÁQUINAS PARA ENCADERNAÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '3317-1/02',
    denominacao: 'MANUTENÇÃO E REPARAÇÃO DE EMBARCAÇÕES PARA ESPORTE E LAZER',
    ocupacoes: [
      'REPARADOR(A) DE EMBARCAÇÕES PARA ESPORTE E LAZER INDEPENDENTE',
    ],
  },
  {
    subclasse: '3319-8/00',
    denominacao:
      'MANUTENÇÃO E REPARAÇÃO DE EQUIPAMENTOS E PRODUTOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'REPARADOR(A) DE CORDAS, VELAMES E LONAS INDEPENDENTE',
      'REPARADOR(A) DE EQUIPAMENTOS MÉDICO-HOSPITALARES NÃO ELETRÔNICOS INDEPENDENTE',
      'REPARADOR(A) DE TONÉIS, BARRIS E PALETES DE MADEIRA INDEPENDENTE',
      'REPARADOR(A) DE VEÍCULOS DE TRAÇÃO ANIMAL INDEPENDENTE',
      'RESTAURADOR(A) DE INSTRUMENTOS MUSICAIS HISTÓRICOS INDEPENDENTE',
      'RESTAURADOR(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '3321-0/00',
    denominacao: 'INSTALAÇÃO DE MÁQUINAS E EQUIPAMENTOS INDUSTRIAIS',
    ocupacoes: [
      'INSTALADOR(A) DE MÁQUINAS E EQUIPAMENTOS INDUSTRIAIS INDEPENDENTE',
    ],
  },
  {
    subclasse: '3329-5/01',
    denominacao: 'SERVIÇOS DE MONTAGEM DE MÓVEIS DE QUALQUER MATERIAL',
    ocupacoes: ['MONTADOR(A) DE MÓVEIS INDEPENDENTE'],
  },
  {
    subclasse: '3600-6/02',
    denominacao: 'DISTRIBUIÇÃO DE ÁGUA POR CAMINHÕES',
    ocupacoes: [
      'DISTRIBUIDOR(A) DE ÁGUA POTÁVEL EM CAMINHÃO PIPA INDEPENDENTE',
    ],
  },
  {
    subclasse: '3702-9/00',
    denominacao: 'ATIVIDADES RELACIONADAS A ESGOTO, EXCETO A GESTÃO DE REDES',
    ocupacoes: ['FOSSEIRO (LIMPADOR DE FOSSA) INDEPENDENTE'],
  },
  {
    subclasse: '3811-4/00',
    denominacao: 'COLETA DE RESÍDUOS NÃO PERIGOSOS',
    ocupacoes: [
      'CARROCEIRO - COLETA DE ENTULHOS E RESÍDUOS INDEPENDENTE',
      'COLETOR DE RESÍDUOS NÃO-PERIGOSOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '3831-9/01',
    denominacao: 'RECUPERAÇÃO DE SUCATAS DE ALUMÍNIO',
    ocupacoes: ['RECICLADOR (A) DE SUCATAS DE ALUMÍNIO INDEPENDENTE'],
  },
  {
    subclasse: '3831-9/99',
    denominacao: 'RECUPERAÇÃO DE MATERIAIS METÁLICOS, EXCETO ALUMÍNIO',
    ocupacoes: [
      'RECICLADOR (A) DE MATERIAIS METÁLICOS, EXCETO ALUMÍNIO INDEPENDENTE',
    ],
  },
  {
    subclasse: '3832-7/00',
    denominacao: 'RECUPERAÇÃO DE MATERIAIS PLÁSTICOS',
    ocupacoes: ['RECICLADOR (A) DE MATERIAIS PLÁSTICOS INDEPENDENTE'],
  },
  {
    subclasse: '3839-4/99',
    denominacao: 'RECUPERAÇÃO DE MATERIAIS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'RECICLADOR(A) DE BORRACHA, MADEIRA, PAPEL E VIDRO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4321-5/00',
    denominacao: 'INSTALAÇÃO E MANUTENÇÃO ELÉTRICA',
    ocupacoes: [
      'ELETRICISTA EM RESIDÊNCIAS E ESTABELECIMENTOS COMERCIAIS INDEPENDENTE',
      'INSTALADOR(A) DE ANTENAS DE TV INDEPENDENTE',
      'INSTALADOR(A) DE EQUIPAMENTOS DE SEGURANÇA DOMICILIAR E EMPRESARIAL, SEM PRESTAÇÃO DE SERVIÇOS DE VIGILÂNCIA E SEGURANÇA INDEPENDENTE',
    ],
  },
  {
    subclasse: '4322-3/01',
    denominacao: 'INSTALAÇÕES HIDRÁULICAS, SANITÁRIAS E DE GÁS',
    ocupacoes: [
      'BOMBEIRO(A) HIDRÁULICO INDEPENDENTE',
      'ENCANADOR INDEPENDENTE',
    ],
  },
  {
    subclasse: '4322-3/02',
    denominacao:
      'INSTALAÇÃO E MANUTENÇÃO DE SISTEMAS CENTRAIS DE AR CONDICIONADO, DE VENTILAÇÃO E REFRIGERAÇÃO',
    ocupacoes: [
      'INSTALADOR(A) E REPARADOR(A) DE SISTEMAS CENTRAIS DE AR CONDICIONADO, DE VENTILAÇÃO E REFRIGERAÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4322-3/03',
    denominacao: 'INSTALAÇÕES DE SISTEMA DE PREVENÇÃO CONTRA INCÊNDIO',
    ocupacoes: [
      'INSTALADOR(A) DE SISTEMA DE PREVENÇÃO CONTRA INCÊNDIO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4329-1/01',
    denominacao: 'INSTALAÇÃO DE PAINÉIS PUBLICITÁRIOS',
    ocupacoes: ['INSTALADOR(A) DE PAINÉIS PUBLICITÁRIOS INDEPENDENTE'],
  },
  {
    subclasse: '4329-1/02',
    denominacao:
      'INSTALAÇÃO DE EQUIPAMENTOS PARA ORIENTAÇÃO À NAVEGAÇÃO MARÍTIMA, FLUVIAL E LACUSTRE',
    ocupacoes: [
      'INSTALADOR(A) DE EQUIPAMENTOS PARA ORIENTAÇÃO À NAVEGAÇÃO MARÍTIMA, FLUVIAL E LACUSTRE INDEPENDENTE',
    ],
  },
  {
    subclasse: '4329-1/03',
    denominacao:
      'INSTALAÇÃO, MANUTENÇÃO E REPARAÇÃO DE ELEVADORES, ESCADAS E ESTEIRAS ROLANTES',
    ocupacoes: [
      'INSTALADOR(A) E REPARADOR(A) DE ELEVADORES, ESCADAS E ESTEIRAS ROLANTES INDEPENDENTE',
    ],
  },
  {
    subclasse: '4329-1/04',
    denominacao:
      'MONTAGEM E INSTALAÇÃO DE SISTEMAS E EQUIPAMENTOS DE ILUMINAÇÃO E SINALIZAÇÃO EM VIAS PÚBLICAS, PORTOS E AEROPORTOS',
    ocupacoes: [
      'MONTADOR(A) E INSTALADOR DE SISTEMAS E EQUIPAMENTOS DE ILUMINAÇÃO E SINALIZAÇÃO EM VIAS PÚBLICAS, PORTOS E AEROPORTOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4329-1/05',
    denominacao: 'TRATAMENTOS TÉRMICOS, ACÚSTICOS OU DE VIBRAÇÃO',
    ocupacoes: [
      'INSTALADOR(A) DE ISOLANTES ACÚSTICOS E DE VIBRAÇÃO INDEPENDENTE',
      'INSTALADOR(A) DE ISOLANTES TÉRMICOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4330-4/02',
    denominacao:
      'INSTALAÇÃO DE PORTAS, JANELAS, TETOS, DIVISÓRIAS E ARMÁRIOS EMBUTIDOS DE QUALQUER MATERIAL',
    ocupacoes: ['CARPINTEIRO(A) INSTALADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '4330-4/03',
    denominacao: 'OBRAS DE ACABAMENTO EM GESSO E ESTUQUE',
    ocupacoes: ['GESSEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4330-4/04',
    denominacao: 'SERVIÇOS DE PINTURA DE EDIFÍCIOS EM GERAL',
    ocupacoes: ['PINTOR(A) DE PAREDE INDEPENDENTE'],
  },
  {
    subclasse: '4330-4/05',
    denominacao:
      'APLICAÇÃO DE REVESTIMENTOS E DE RESINAS EM INTERIORES E EXTERIORES',
    ocupacoes: [
      'AZULEJISTA INDEPENDENTE',
      'CALAFETADOR(A) INDEPENDENTE',
      'COLOCADOR(A) DE REVESTIMENTOS INDEPENDENTE',
      'PASTILHEIRO(A) INDEPENDENTE',
      'SINTEQUEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '4330-4/99',
    denominacao: 'OUTRAS OBRAS DE ACABAMENTO DA CONSTRUÇÃO',
    ocupacoes: ['VIDRACEIRO DE EDIFICAÇÕES INDEPENDENTE'],
  },
  {
    subclasse: '4399-1/03',
    denominacao: 'OBRAS DE ALVENARIA',
    ocupacoes: ['PEDREIRO INDEPENDENTE'],
  },
  {
    subclasse: '4399-1/05',
    denominacao: 'PERFURAÇÃO E CONSTRUÇÃO DE POÇOS DE ÁGUA',
    ocupacoes: ['POCEIRO/CISTERNEIRO/CACIMBEIRO INDEPENDENTE'],
  },
  {
    subclasse: '4399-1/99',
    denominacao:
      'SERVIÇOS ESPECIALIZADOS PARA CONSTRUÇÃO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'CALHEIRO (A) INDEPENDENTE',
      'CERQUEIRO(A) INDEPENDENTE',
      'TELHADOR(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '4520-0/01',
    denominacao:
      'SERVIÇOS DE MANUTENÇÃO E REPARAÇÃO MECÂNICA DE VEÍCULOS AUTOMOTORES',
    ocupacoes: [
      'MECÂNICO(A) DE VEÍCULOS INDEPENDENTE',
      'VIDRACEIRO DE AUTOMÓVEIS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4520-0/02',
    denominacao:
      'SERVIÇOS DE LANTERNAGEM OU FUNILARIA E PINTURA DE VEÍCULOS AUTOMOTORES',
    ocupacoes: [
      'FUNILEIRO/LANTERNEIRO INDEPENDENTE',
      'PINTOR(A) DE AUTOMÓVEIS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4520-0/03',
    denominacao:
      'SERVIÇOS DE MANUTENÇÃO E REPARAÇÃO ELÉTRICA DE VEÍCULOS AUTOMOTORES',
    ocupacoes: ['ELETRICISTA DE AUTOMÓVEIS INDEPENDENTE'],
  },
  {
    subclasse: '4520-0/05',
    denominacao:
      'SERVIÇOS DE LAVAGEM, LUBRIFICAÇÃO E POLIMENTO DE VEÍCULOS AUTOMOTORES',
    ocupacoes: ['LAVADOR(A) E POLIDOR DE CARRO INDEPENDENTE'],
  },
  {
    subclasse: '4520-0/06',
    denominacao: 'SERVIÇOS DE BORRACHARIA PARA VEÍCULOS AUTOMOTORES',
    ocupacoes: ['BORRACHEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4520-0/07',
    denominacao:
      'SERVIÇOS DE INSTALAÇÃO, MANUTENÇÃO E REPARAÇÃO DE ACESSÓRIOS PARA VEÍCULOS AUTOMOTORES',
    ocupacoes: [
      'INSTALADOR(A) E REPARADOR (A) DE ACESSÓRIOS AUTOMOTIVOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4520-0/08',
    denominacao: 'SERVIÇOS DE CAPOTARIA',
    ocupacoes: ['CAPOTEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4530-7/03',
    denominacao:
      'COMÉRCIO A VAREJO DE PEÇAS E ACESSÓRIOS NOVOS PARA VEÍCULOS AUTOMOTORES',
    ocupacoes: [
      'COMERCIANTE DE PEÇAS E ACESSÓRIOS NOVOS PARA VEÍCULOS AUTOMOTORES INDEPENDENTE',
    ],
  },
  {
    subclasse: '4530-7/04',
    denominacao:
      'COMÉRCIO A VAREJO DE PEÇAS E ACESSÓRIOS USADOS PARA VEÍCULOS AUTOMOTORES',
    ocupacoes: [
      'COMERCIANTE DE PEÇAS E ACESSÓRIOS USADOS PARA VEÍCULOS AUTOMOTORES INDEPENDENTE',
    ],
  },
  {
    subclasse: '4530-7/05',
    denominacao: 'COMÉRCIO A VAREJO DE PNEUMÁTICOS E CÂMARASDE-AR',
    ocupacoes: ['COMERCIANTE DE PNEUMÁTICOS E CÂMARAS-DE-AR INDEPENDENTE'],
  },
  {
    subclasse: '4541-2/06',
    denominacao:
      'COMÉRCIO A VAREJO DE PEÇAS E ACESSÓRIOS NOVOS PARA MOTOCICLETAS E MOTONETAS',
    ocupacoes: [
      'COMERCIANTE DE PEÇAS E ACESSÓRIOS NOVOS PARA MOTOCICLETAS E MOTONONETAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4541-2/07',
    denominacao:
      'COMÉRCIO A VAREJO DE PEÇAS E ACESSÓRIOS USADOS PARA MOTOCICLETAS E MOTONETAS',
    ocupacoes: [
      'COMERCIANTE DE PEÇAS E ACESSÓRIOS USADOS PARA MOTOCICLETAS E MOTONONETAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4543-9/00',
    denominacao: 'MANUTENÇÃO E REPARAÇÃO DE MOTOCICLETAS E MOTONETAS',
    ocupacoes: ['MECÂNICO(A) DE MOTOCICLETAS E MOTONETAS INDEPENDENTE'],
  },
  {
    subclasse: '4712-1/00',
    denominacao:
      'COMÉRCIO VAREJISTA DE MERCADORIAS EM GERAL, COM PREDOMINÂNCIA DE PRODUTOS ALIMENTÍCIOS - MINIMERCADOS, MERCEARIAS E ARMAZÉNS',
    ocupacoes: [
      'BARRAQUEIRO(A) INDEPENDENTE',
      'MERCEEIRO(A)/VENDEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '4713-0/02',
    denominacao:
      'LOJAS DE VARIEDADES, EXCETO LOJAS DE DEPARTAMENTOS OU MAGAZINES',
    ocupacoes: ['COMERCIANTE DE MIUDEZAS E QUINQUILHARIAS INDEPENDENTE'],
  },
  {
    subclasse: '4721-1/02',
    denominacao: 'PADARIA E CONFEITARIA COM PREDOMINÂNCIA DE REVENDA',
    ocupacoes: ['COMERCIANTE DE PRODUTOS DE PANIFICAÇÃO INDEPENDENTE'],
  },
  {
    subclasse: '4721-1/03',
    denominacao: 'COMÉRCIO VAREJISTA DE LATICÍNIOS E FRIOS',
    ocupacoes: ['COMERCIANTE DE LATICÍNIOS INDEPENDENTE'],
  },
  {
    subclasse: '4721-1/04',
    denominacao: 'COMÉRCIO VAREJISTA DE DOCES, BALAS, BOMBONS E SEMELHANTES',
    ocupacoes: ['BALEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4722-9/01',
    denominacao: 'COMÉRCIO VAREJISTA DE CARNES - AÇOUGUES',
    ocupacoes: ['AÇOUGUEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4722-9/02',
    denominacao: 'PEIXARIA',
    ocupacoes: ['PEIXEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4723-7/00',
    denominacao: 'COMÉRCIO VAREJISTA DE BEBIDAS',
    ocupacoes: ['COMERCIANTE DE BEBIDAS INDEPENDENTE'],
  },
  {
    subclasse: '4724-5/00',
    denominacao: 'COMÉRCIO VAREJISTA DE HORTIFRUTIGRANJEIROS',
    ocupacoes: [
      'ABATEDOR(A) DE AVES COM COMERCIALIZAÇÃO DO PRODUTO INDEPENDENTE',
      'QUITANDEIRO(A) INDEPENDENTE',
      'VENDEDOR(A) DE AVES VIVAS, COELHOS E OUTROS PEQUENOS ANIMAIS PARA ALIMENTAÇÃO INDEPENDENTE',
      'VERDUREIRO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4729-6/01',
    denominacao: 'TABACARIA',
    ocupacoes: ['COMERCIANTE DE PRODUTOS DE TABACARIA INDEPENDENTE'],
  },
  {
    subclasse: '4729-6/99',
    denominacao:
      'COMÉRCIO VAREJISTA DE PRODUTOS ALIMENTÍCIOS EM GERAL OU ESPECIALIZADO EM PRODUTOS ALIMENTÍCIOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'COMERCIANTE DE CESTAS DE CAFÉ DA MANHÃ INDEPENDENTE',
      'COMERCIANTE DE PRODUTOS NATURAIS INDEPENDENTE',
      'SORVETEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '4732-6/00',
    denominacao: 'COMÉRCIO VAREJISTA DE LUBRIFICANTES',
    ocupacoes: ['COMERCIANTE DE LUBRIFICANTES INDEPENDENTE'],
  },
  {
    subclasse: '4741-5/00',
    denominacao: 'COMÉRCIO VAREJISTA DE TINTAS E MATERIAIS PARA PINTURA',
    ocupacoes: ['COMERCIANTE DE TINTAS E MATERIAIS PARA PINTURA INDEPENDENTE'],
  },
  {
    subclasse: '4742-3/00',
    denominacao: 'COMÉRCIO VAREJISTA DE MATERIAL ELÉTRICO',
    ocupacoes: ['COMERCIANTE DE MATERIAL ELÉTRICO INDEPENDENTE'],
  },
  {
    subclasse: '4743-1/00',
    denominacao: 'COMÉRCIO VAREJISTA DE VIDROS',
    ocupacoes: ['COMERCIANTE DE VIDROS INDEPENDENTE'],
  },
  {
    subclasse: '4744-0/01',
    denominacao: 'COMÉRCIO VAREJISTA DE FERRAGENS E FERRAMENTAS',
    ocupacoes: ['COMERCIANTE DE FERRAGENS E FERRAMENTAS INDEPENDENTE'],
  },
  {
    subclasse: '4744-0/02',
    denominacao: 'COMÉRCIO VAREJISTA DE MADEIRA E ARTEFATOS',
    ocupacoes: ['COMERCIANTE DE MADEIRA E ARTEFATOS INDEPENDENTE'],
  },
  {
    subclasse: '4744-0/03',
    denominacao: 'COMÉRCIO VAREJISTA DE MATERIAIS HIDRÁULICOS',
    ocupacoes: ['COMERCIANTE DE MATERIAIS HIDRÁULICOS INDEPENDENTE'],
  },
  {
    subclasse: '4744-0/04',
    denominacao:
      'COMÉRCIO VAREJISTA DE CAL, AREIA, PEDRA BRITADA, TIJOLOS E TELHAS',
    ocupacoes: [
      'COMERCIANTE DE CAL, AREIA, PEDRA BRITADA, TIJOLOS E TELHAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4744-0/99',
    denominacao: 'COMÉRCIO VAREJISTA DE MATERIAIS DE CONSTRUÇÃO EM GERAL',
    ocupacoes: ['COMERCIANTE DE MATERIAIS DE CONSTRUÇÃO EM GERAL INDEPENDENTE'],
  },
  {
    subclasse: '4751-2/01',
    denominacao:
      'COMÉRCIO VAREJISTA ESPECIALIZADO DE EQUIPAMENTOS E SUPRIMENTOS DE INFORMÁTICA',
    ocupacoes: [
      'COMERCIANTE DE EQUIPAMENTOS E SUPRIMENTOS DE INFORMÁTICA INDEPENDENTE',
    ],
  },
  {
    subclasse: '4751-2/02',
    denominacao: 'RECARGA DE CARTUCHOS PARA EQUIPAMENTOS DE INFORMÁTICA',
    ocupacoes: [
      'RECARREGADOR(A) DE CARTUCHOS PARA EQUIPAMENTOS DE INFORMÁTICA INDEPENDENTE',
    ],
  },
  {
    subclasse: '4752-1/00',
    denominacao:
      'COMÉRCIO VAREJISTA ESPECIALIZADO DE EQUIPAMENTOS DE TELEFONIA E COMUNICAÇÃO',
    ocupacoes: [
      'COMERCIANTE DE EQUIPAMENTOS DE TELEFONIA E COMUNICAÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4753-9/00',
    denominacao:
      'COMÉRCIO VAREJISTA ESPECIALIZADO DE ELETRODOMÉSTICOS E EQUIPAMENTOS DE ÁUDIO E VÍDEO',
    ocupacoes: [
      'COMERCIANTE DE ELETRODOMÉSTICOS E EQUIPAMENTOS DE ÁUDIO E VÍDEO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4754-7/01',
    denominacao: 'COMÉRCIO VAREJISTA DE MÓVEIS',
    ocupacoes: ['COMERCIANTE DE MÓVEIS INDEPENDENTE'],
  },
  {
    subclasse: '4754-7/02',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE COLCHOARIA',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE COLCHOARIA INDEPENDENTE'],
  },
  {
    subclasse: '4754-7/03',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE ILUMINAÇÃO',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE ILUMINAÇÃO INDEPENDENTE'],
  },
  {
    subclasse: '4755-5/01',
    denominacao: 'COMÉRCIO VAREJISTA DE TECIDOS',
    ocupacoes: ['COMERCIANTE DE TECIDOS INDEPENDENTE'],
  },
  {
    subclasse: '4755-5/02',
    denominacao: 'COMERCIO VAREJISTA DE ARTIGOS DE ARMARINHO',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE ARMARINHO INDEPENDENTE'],
  },
  {
    subclasse: '4755-5/03',
    denominacao: 'COMERCIO VAREJISTA DE ARTIGOS DE CAMA, MESA E BANHO',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE CAMA, MESA E BANHO INDEPENDENTE'],
  },
  {
    subclasse: '4756-3/00',
    denominacao:
      'COMÉRCIO VAREJISTA ESPECIALIZADO DE INSTRUMENTOS MUSICAIS E ACESSÓRIOS',
    ocupacoes: [
      'COMERCIANTE DE INSTRUMENTOS MUSICAIS E ACESSÓRIOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4757-1/00',
    denominacao:
      'COMÉRCIO VAREJISTA ESPECIALIZADO DE PEÇAS E ACESSÓRIOS PARA APARELHOS ELETROELETRÔNICOS PARA USO DOMÉSTICO, EXCETO INFORMÁTICA E COMUNICAÇÃO',
    ocupacoes: [
      'COMERCIANTE DE PEÇAS E ACESSÓRIOS PARA APARELHOS ELETROELETRÔNICOS PARA USO DOMÉSTICO INDEPENDENTE',
    ],
  },
  {
    subclasse: '4759-8/01',
    denominacao:
      'COMÉRCIO VAREJISTA DE ARTIGOS DE TAPEÇARIA, CORTINAS E PERSIANAS',
    ocupacoes: [
      'COMERCIANTE DE ARTIGOS DE TAPEÇARIA, CORTINAS E PERSIANAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4759-8/99',
    denominacao:
      'COMÉRCIO VAREJISTA DE OUTROS ARTIGOS DE USO PESSOAL E DOMÉSTICO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'COMERCIANTE DE ARTIGOS DE CUTELARIA INDEPENDENTE',
      'COMERCIANTE DE ARTIGOS PARA HABITAÇÃO INDEPENDENTE',
      'COMERCIANTE DE SISTEMA DE SEGURANÇA RESIDENCIAL INDEPENDENTE',
      'COMERCIANTE DE TOLDOS E PAPEL DE PAREDE INDEPENDENTE',
    ],
  },
  {
    subclasse: '4761-0/01',
    denominacao: 'COMÉRCIO VAREJISTA DE LIVROS',
    ocupacoes: ['LIVREIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4761-0/02',
    denominacao: 'COMÉRCIO VAREJISTA DE JORNAIS E REVISTAS',
    ocupacoes: ['JORNALEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4761-0/03',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE PAPELARIA',
    ocupacoes: ['PAPELEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4762-8/00',
    denominacao: 'COMÉRCIO VAREJISTA DE DISCOS, CDS, DVDS E FITAS',
    ocupacoes: ['COMERCIANTE DE DISCOS, CDS, DVDS E FITAS INDEPENDENTE'],
  },
  {
    subclasse: '4763-6/01',
    denominacao: 'COMÉRCIO VAREJISTA DE BRINQUEDOS E ARTIGOS RECREATIVOS',
    ocupacoes: ['COMERCIANTE DE BRINQUEDOS E ARTIGOS RECREATIVOS INDEPENDENTE'],
  },
  {
    subclasse: '4763-6/02',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS ESPORTIVOS',
    ocupacoes: ['COMERCIANTE DE ARTIGOS ESPORTIVOS INDEPENDENTE'],
  },
  {
    subclasse: '4763-6/03',
    denominacao:
      'COMÉRCIO VAREJISTA DE BICICLETAS E TRICICLOS; PEÇAS E ACESSÓRIOS',
    ocupacoes: [
      'COMERCIANTE DE BICICLETAS E TRICICLOS; PEÇAS E ACESSÓRIOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4763-6/04',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE CAÇA, PESCA E CAMPING',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE CAÇA, PESCA E CAMPING INDEPENDENTE'],
  },
  {
    subclasse: '4772-5/00',
    denominacao:
      'COMÉRCIO VAREJISTA DE COSMÉTICOS, PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL',
    ocupacoes: [
      'COMERCIANTE DE COSMÉTICOS E ARTIGOS DE PERFUMARIA INDEPENDENTE',
      'COMERCIANTE DE PRODUTOS DE HIGIENE PESSOAL INDEPENDENTE',
    ],
  },
  {
    subclasse: '4773-3/00',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS MÉDICOS E ORTOPÉDICOS',
    ocupacoes: ['COMERCIANTE DE ARTIGOS MÉDICOS E ORTOPÉDICOS INDEPENDENTE'],
  },
  {
    subclasse: '4774-1/00',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE ÓPTICA',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE ÓPTICA INDEPENDENTE'],
  },
  {
    subclasse: '4781-4/00',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DO VESTUÁRIO E ACESSÓRIOS',
    ocupacoes: [
      'COMERCIANTE DE ARTIGOS DO VESTUÁRIO E ACESSÓRIOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4782-2/01',
    denominacao: 'COMÉRCIO VAREJISTA DE CALÇADOS',
    ocupacoes: ['COMERCIANTE DE CALÇADOS INDEPENDENTE'],
  },
  {
    subclasse: '4782-2/02',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE VIAGEM',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE VIAGEM INDEPENDENTE'],
  },
  {
    subclasse: '4783-1/01',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE JOALHERIA',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE JOALHERIA INDEPENDENTE'],
  },
  {
    subclasse: '4783-1/02',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS DE RELOJOARIA',
    ocupacoes: ['COMERCIANTE DE ARTIGOS DE RELOJOARIA INDEPENDENTE'],
  },
  {
    subclasse: '4785-7/01',
    denominacao: 'COMÉRCIO VAREJISTA DE ANTIGUIDADES',
    ocupacoes: ['ANTIQUÁRIO(A) INDEPENDENTE'],
  },
  {
    subclasse: '4785-7/99',
    denominacao: 'COMÉRCIO VAREJISTA DE OUTROS ARTIGOS USADOS',
    ocupacoes: ['COMERCIANTE DE ARTIGOS USADOS INDEPENDENTE'],
  },
  {
    subclasse: '4789-0/01',
    denominacao: 'COMÉRCIO VAREJISTA DE SUVENIRES, BIJUTERIAS E ARTESANATOS',
    ocupacoes: [
      'COMERCIANTE DE SUVENIRES, BIJUTERIAS E ARTESANATOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4789-0/02',
    denominacao: 'COMÉRCIO VAREJISTA DE PLANTAS E FLORES NATURAIS',
    ocupacoes: [
      'COMERCIANTE DE PLANTAS, FLORES NATURAIS, VASOS E ADUBOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4789-0/03',
    denominacao: 'COMÉRCIO VAREJISTA DE OBJETOS DE ARTE',
    ocupacoes: ['COMERCIANTE DE OBJETOS DE ARTE INDEPENDENTE'],
  },
  {
    subclasse: '4789-0/04',
    denominacao:
      'COMÉRCIO VAREJISTA DE ANIMAIS VIVOS E DE ARTIGOS E ALIMENTOS PARA ANIMAIS DE ESTIMAÇÃO',
    ocupacoes: [
      'COMERCIANTE DE ARTIGOS E ALIMENTOS PARA ANIMAIS DE ESTIMAÇÃO (PET SHOP) INDEPENDENTE (NÃO INCLUI A VENDA DE MEDICAMENTOS)',
    ],
  },
  {
    subclasse: '4789-0/05',
    denominacao: 'COMÉRCIO VAREJISTA DE PRODUTOS SANEANTES DOMISSANITÁRIOS',
    ocupacoes: [
      'COMERCIANTE DE INSETICIDAS E RATICIDAS INDEPENDENTE',
      'COMERCIANTE DE PRODUTOS DE LIMPEZA INDEPENDENTE',
      'COMERCIANTE DE PRODUTOS PARA PISCINAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '4789-0/07',
    denominacao: 'COMÉRCIO VAREJISTA DE EQUIPAMENTOS PARA ESCRITÓRIO',
    ocupacoes: ['COMERCIANTE DE EQUIPAMENTOS PARA ESCRITÓRIO INDEPENDENTE'],
  },
  {
    subclasse: '4789-0/08',
    denominacao: 'COMÉRCIO VAREJISTA DE ARTIGOS FOTOGRÁFICOS E PARA FILMAGEM',
    ocupacoes: [
      'COMERCIANTE DE ARTIGOS FOTOGRÁFICOS E PARA FILMAGEM INDEPENDENTE',
    ],
  },
  {
    subclasse: '4789-0/99',
    denominacao:
      'COMÉRCIO VAREJISTA DE OUTROS PRODUTOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'COMERCIANTE DE ARTIGOS DE BEBÊ INDEPENDENTE',
      'COMERCIANTE DE ARTIGOS ERÓTICOS INDEPENDENTE',
      'COMERCIANTE DE ARTIGOS FUNERÁRIOS INDEPENDENTE',
      'COMERCIANTE DE CARVÃO E LENHA INDEPENDENTE',
      'COMERCIANTE DE EMBALAGENS INDEPENDENTE',
      'COMERCIANTE DE FLORES, PLANTAS E FRUTAS ARTIFICIAIS INDEPENDENTE',
      'COMERCIANTE DE MOLDURAS E QUADROS INDEPENDENTE',
      'COMERCIANTE DE PERUCAS INDEPENDENTE',
      'COMERCIANTE DE PRODUTOS PARA FESTAS E NATAL INDEPENDENTE',
      'COMERCIANTE DE PRODUTOS RELIGIOSOS INDEPENDENTE',
      'COMERCIANTE DE REDES PARA DORMIR INDEPENDENTE',
    ],
  },
  {
    subclasse: '4923-0/01',
    denominacao: 'SERVIÇO DE TÁXI',
    ocupacoes: ['MOTOTAXISTA INDEPENDENTE', 'TAXISTA INDEPENDENTE'],
  },
  {
    subclasse: '4923-0/02',
    denominacao:
      'SERVIÇO DE TRANSPORTE DE PASSAGEIROS – LOCAÇÃO DE AUTOMÓVEIS COM MOTORISTA',
    ocupacoes: ['MOTORISTA (POR APLICATIVO OU NÃO) INDEPENDENTE'],
  },
  {
    subclasse: '4924-8/00',
    denominacao: 'TRANSPORTE ESCOLAR',
    ocupacoes: ['TRANSPORTADOR(A) ESCOLAR INDEPENDENTE'],
  },
  {
    subclasse: '4929-9/01',
    denominacao:
      'TRANSPORTE RODOVIÁRIO COLETIVO DE PASSAGEIROS SOB REGIME DE FRETAMENTO, MUNICIPAL',
    ocupacoes: [
      'TRANSPORTADOR(A) MUNICIPAL COLETIVO DE PASSAGEIROS SOB FRETE INDEPENDENTE',
    ],
  },
  {
    subclasse: '4929-9/02',
    denominacao:
      'TRANSPORTE RODOVIÁRIO COLETIVO DE PASSAGEIROS, SOB REGIME DE FRETAMENTO, INTERMUNICIPAL, INTERESTADUAL E INTERNACIONAL',
    ocupacoes: [
      'TRANSPORTADOR(A) INTERMUNICIPAL COLETIVO DE PASSAGEIROS SOB FRETE EM REGIÃO METROPOLITANA INDEPENDENTE',
    ],
  },
  {
    subclasse: '4929-9/03',
    denominacao:
      'ORGANIZAÇÃO DE EXCURSÕES EM VEÍCULOS RODOVIÁRIOS PRÓPRIOS, MUNICIPAL',
    ocupacoes: [
      'ORGANIZADOR(A) DE EXCURSÕES EM VEÍCULO PRÓPRIO, MUNICIPAL INDEPENDENTE',
    ],
  },
  {
    subclasse: '4930-2/01',
    denominacao:
      'TRANSPORTE RODOVIÁRIO DE CARGA, EXCETO PRODUTOS PERIGOSOS E MUDANÇAS, MUNICIPAL',
    ocupacoes: [
      'CARROCEIRO - TRANSPORTE DE CARGA INDEPENDENTE',
      'TRANSPORTADOR AUTÔNOMO DE CARGA - MUNICIPAL',
      'TRANSPORTADOR(A) MUNICIPAL DE CARGAS NÃO PERIGOSAS (CARRETO) INDEPENDENTE',
    ],
  },
  {
    subclasse: '4930-2/02',
    denominacao:
      'TRANSPORTE RODOVIÁRIO DE CARGA, EXCETO PRODUTOS PERIGOSOS E MUDANÇAS, INTERMUNICIPAL, INTERESTADUAL E INTERNACIONAL',
    ocupacoes: [
      'CAMINHONEIRO (A) DE CARGAS NÃO PERIGOSAS, INTERMUNICIPAL E INTERESTADUAL INDEPENDENTE',
      'TRANSPORTADOR AUTÔNOMO DE CARGA INTERMUNICIPAL, INTERESTADUAL E INTERNACIONAL',
    ],
  },
  {
    subclasse: '4930-2/03',
    denominacao: 'TRANSPORTE RODOVIÁRIO DE PRODUTOS PERIGOSOS',
    ocupacoes: ['TRANSPORTADOR AUTÔNOMO DE CARGA - PRODUTOS PERIGOSOS'],
  },
  {
    subclasse: '4930-2/04',
    denominacao: 'TRANSPORTE RODOVIÁRIO DE MUDANÇAS',
    ocupacoes: [
      'CARROCEIRO - TRANSPORTE DE MUDANÇA INDEPENDENTE',
      'TRANSPORTADOR AUTÔNOMO DE CARGA - MUDANÇAS',
      'TRANSPORTADOR(A) DE MUDANÇAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '5011-4/01',
    denominacao: 'TRANSPORTE MARÍTIMO DE CABOTAGEM - CARGA',
    ocupacoes: ['TRANSPORTADOR(A) MARÍTIMO DE CARGA INDEPENDENTE'],
  },
  {
    subclasse: '5021-1/01',
    denominacao:
      'TRANSPORTE POR NAVEGAÇÃO INTERIOR DE CARGA, MUNICIPAL, EXCETO TRAVESSIA',
    ocupacoes: [
      'TRANSPORTADOR(A) MUNICIPAL HIDROVIÁRIO DE CARGAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '5091-2/01',
    denominacao: 'TRANSPORTE POR NAVEGAÇÃO DE TRAVESSIA, MUNICIPAL',
    ocupacoes: [
      'TRANSPORTADOR(A) MUNICIPAL DE TRAVESSIA POR NAVEGAÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '5091-2/02',
    denominacao:
      'TRANSPORTE POR NAVEGAÇÃO DE TRAVESSIA, INTERMUNICIPAL, INTERESTADUAL E INTERNACIONAL',
    ocupacoes: [
      'TRANSPORTADOR(A) INTERMUNICIPAL E INTERESTADUAL DE TRAVESSIA POR NAVEGAÇÃO FLUVIAL INDEPENDENTE',
    ],
  },
  {
    subclasse: '5099-8/01',
    denominacao: 'TRANSPORTE AQUAVIÁRIO PARA PASSEIOS TURÍSTICOS',
    ocupacoes: [
      'TRANSPORTADOR(A) AQUAVIÁRIO PARA PASSEIOS TURÍSTICOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '5099-8/99',
    denominacao:
      'OUTROS TRANSPORTES AQUAVIÁRIOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['BARQUEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '5211-7/02',
    denominacao: 'GUARDA-MÓVEIS',
    ocupacoes: ['GUARDADOR(A) DE MÓVEIS INDEPENDENTE'],
  },
  {
    subclasse: '5212-5/00',
    denominacao: 'CARGA E DESCARGA',
    ocupacoes: ['CARREGADOR (VEÍCULOS INDEPENDENTE'],
  },
  {
    subclasse: '5223-1/00',
    denominacao: 'ESTACIONAMENTO DE VEÍCULOS',
    ocupacoes: ['PROPRIETÁRIO(A) DE ESTACIONAMENTO DE VEÍCULOS INDEPENDENTE'],
  },
  {
    subclasse: '5229-0/02',
    denominacao: 'SERVIÇOS DE REBOQUE DE VEÍCULOS',
    ocupacoes: ['GUINCHEIRO INDEPENDENTE (REBOQUE DE VEÍCULOS)'],
  },
  {
    subclasse: '5310-5/02',
    denominacao: 'ATIVIDADES DE FRANQUEADAS DO CORREIO NACIONAL',
    ocupacoes: ['AGENTE DE CORREIO FRANQUEADO E PERMISSIONÁRIO INDEPENDENTE'],
  },
  {
    subclasse: '5320-2/01',
    denominacao: 'SERVIÇOS DE MALOTE NÃO REALIZADOS PELO CORREIO NACIONAL',
    ocupacoes: ['ENTREGADOR DE MALOTES INDEPENDENTE'],
  },
  {
    subclasse: '5320-2/02',
    denominacao: 'SERVIÇOS DE ENTREGA RÁPIDA',
    ocupacoes: [
      'BIKEBOY (CICLISTA MENSAGEIRO) INDEPENDENTE',
      'MOTOBOY INDEPENDENTE',
    ],
  },
  {
    subclasse: '5590-6/01',
    denominacao: 'ALBERGUES, EXCETO ASSISTENCIAIS',
    ocupacoes: ['PROPRIETÁRIO(A) DE ALBERGUE NÃO ASSISTENCIAL INDEPENDENTE'],
  },
  {
    subclasse: '5590-6/02',
    denominacao: 'CAMPINGS',
    ocupacoes: ['PROPRIETÁRIO(A) DE CAMPING INDEPENDENTE'],
  },
  {
    subclasse: '5590-6/03',
    denominacao: 'PENSÕES (ALOJAMENTO)',
    ocupacoes: ['PROPRIETÁRIO(A) DE PENSÃO INDEPENDENTE'],
  },
  {
    subclasse: '5590-6/99',
    denominacao: 'OUTROS ALOJAMENTOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['PROPRIETÁRIO(A) DE HOSPEDARIA INDEPENDENTE'],
  },
  {
    subclasse: '5611-2/01',
    denominacao: 'RESTAURANTES E SIMILARES',
    ocupacoes: ['PROPRIETÁRIO(A) DE RESTAURANTE INDEPENDENTE'],
  },
  {
    subclasse: '5611-2/03',
    denominacao: 'LANCHONETES, CASAS DE CHÁ, DE SUCOS E SIMILARES',
    ocupacoes: [
      'PROPRIETÁRIO(A) DE CASA DE CHÁ INDEPENDENTE',
      'PROPRIETÁRIO(A) DE CASA DE SUCOS INDEPENDENTE',
      'PROPRIETÁRIO(A) DE LANCHONETE INDEPENDENTE',
    ],
  },
  {
    subclasse: '5611-2/04',
    denominacao:
      'BARES E OUTROS ESTABELECIMENTOS ESPECIALIZADOS EM SERVIR BEBIDAS, SEM ENTRETENIMENTO',
    ocupacoes: [
      'PROPRIETÁRIO(A) DE BAR E CONGÊNERES, SEM ENTRETENIMENTO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '5611-2/05',
    denominacao:
      'BARES E OUTROS ESTABELECIMENTOS ESPECIALIZADOS EM SERVIR BEBIDAS, COM ENTRETENIMENTO',
    ocupacoes: [
      'PROPRIETÁRIO(A) DE BAR E CONGÊNERES, COM ENTRETENIMENTO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '5612-1/00',
    denominacao: 'SERVIÇOS AMBULANTES DE ALIMENTAÇÃO',
    ocupacoes: [
      'CHURRASQUEIRO(A) AMBULANTE INDEPENDENTE',
      'PIPOQUEIRO(A) INDEPENDENTE',
      'QUITANDEIRO(A) AMBULANTE INDEPENDENTE',
      'SORVETEIRO(A) AMBULANTE INDEPENDENTE',
      'VENDEDOR(A) AMBULANTE DE PRODUTOS ALIMENTÍCIOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '5620-1/01',
    denominacao:
      'FORNECIMENTO DE ALIMENTOS PREPARADOS PREPONDERANTEMENTE PARA EMPRESAS',
    ocupacoes: [
      'FORNECEDOR(A) DE ALIMENTOS PREPARADOS PARA EMPRESAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '5620-1/02',
    denominacao: 'SERVIÇOS DE ALIMENTAÇÃO PARA EVENTOS E RECEPÇÕES - BUFÊ',
    ocupacoes: [
      'CHURRASQUEIRO(A) EM DOMICÍLIO INDEPENDENTE',
      'PIZZAIOLO(A) EM DOMICÍLIO INDEPENDENTE',
    ],
  },
  {
    subclasse: '5620-1/03',
    denominacao: 'CANTINAS - SERVIÇOS DE ALIMENTAÇÃO PRIVATIVOS',
    ocupacoes: ['PROPRIETÁRIO(A) DE CANTINAS INDEPENDENTE'],
  },
  {
    subclasse: '5620-1/04',
    denominacao:
      'FORNECIMENTO DE ALIMENTOS PREPARADOS PREPONDERANTEMENTE PARA CONSUMO DOMICILIAR',
    ocupacoes: [
      'COZINHEIRO(A) QUE FORNECE REFEIÇÕES PRONTAS E EMBALADAS PARA CONSUMO INDEPENDENTE',
      'DOCEIRO(A) INDEPENDENTE',
      'MARMITEIRO(A) INDEPENDENTE',
      'SALGADEIRO(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '5811-5/00',
    denominacao: 'EDIÇÃO DE LIVROS',
    ocupacoes: ['EDITOR(A) DE LIVROS INDEPENDENTE'],
  },
  {
    subclasse: '5812-3/01',
    denominacao: 'EDITOR DE JORNAIS DIÁRIOS',
    ocupacoes: ['EDITOR(A) DE JORNAIS DIÁRIOS INDEPENDENTE'],
  },
  {
    subclasse: '5812-3/02',
    denominacao: 'EDITOR DE JORNAIS NÃO DIÁRIOS',
    ocupacoes: ['EDITOR(A) DE JORNAIS NÃO DIÁRIOS INDEPENDENTE'],
  },
  {
    subclasse: '5813-1/00',
    denominacao: 'EDIÇÃO DE REVISTAS',
    ocupacoes: ['EDITOR(A) DE REVISTAS INDEPENDENTE'],
  },
  {
    subclasse: '5819-1/00',
    denominacao: 'EDIÇÃO DE CADASTROS, LISTAS E DE OUTROS PRODUTOS GRÁFICOS',
    ocupacoes: [
      'EDITOR(A) DE LISTA DE DADOS E DE OUTRAS INFORMAÇÕES INDEPENDENTE',
    ],
  },
  {
    subclasse: '5912-0/01',
    denominacao: 'SERVIÇOS DE DUBLAGEM',
    ocupacoes: ['DUBLADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '5912-0/99',
    denominacao:
      'ATIVIDADES DE PÓS-PRODUÇÃO CINEMATOGRÁFICA, DE VÍDEOS E DE PROGRAMAS DE TELEVISÃO NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: ['EDITOR(A) DE VÍDEO INDEPENDENTE'],
  },
  {
    subclasse: '6190-6/99',
    denominacao:
      'OUTRAS ATIVIDADES DE TELECOMUNICAÇÕES NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: ['INSTALADOR(A) DE REDE DE COMPUTADORES INDEPENDENTE'],
  },
  {
    subclasse: '6399-2/00',
    denominacao:
      'OUTRAS ATIVIDADES DE PRESTAÇÃO DE SERVIÇOS DE INFORMAÇÃO NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: [
      'APURADOR(A), COLETOR(A) E FORNECEDOR(A) DE RECORTES DE MATÉRIAS PUBLICADAS EM JORNAIS E REVISTAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '7319-0/02',
    denominacao: 'PROMOÇÃO DE VENDAS',
    ocupacoes: [
      'PANFLETEIRO(A) INDEPENDENTE',
      'PROMOTOR(A) DE VENDAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '7319-0/99',
    denominacao:
      'OUTRAS ATIVIDADES DE PUBLICIDADE NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: [
      'BIKE PROPAGANDISTA INDEPENDENTE',
      'PROPRIETÁRIO(A) DE CARRO DE SOM PARA FINS PUBLICITÁRIOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '7420-0/01',
    denominacao:
      'ATIVIDADES DE PRODUÇÃO DE FOTOGRAFIAS, EXCETO AÉREA E SUBMARINA',
    ocupacoes: ['FOTÓGRAFO(A) INDEPENDENTE'],
  },
  {
    subclasse: '7420-0/02',
    denominacao: 'ATIVIDADES DE PRODUÇÃO DE FOTOGRAFIAS AÉREAS E SUBMARINAS',
    ocupacoes: [
      'FOTÓGRAFO(A) AÉREO INDEPENDENTE',
      'FOTÓGRAFO(A) SUBMARINO INDEPENDENTE',
    ],
  },
  {
    subclasse: '7420-0/03',
    denominacao: 'LABORATÓRIOS FOTOGRÁFICOS',
    ocupacoes: ['REVELADOR(A) FOTOGRÁFICO INDEPENDENTE'],
  },
  {
    subclasse: '7420-0/04',
    denominacao: 'FILMAGEM DE FESTAS E EVENTOS',
    ocupacoes: ['FILMADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '7490-1/02',
    denominacao: 'ESCAFANDRIA E MERGULHO',
    ocupacoes: ['MERGULHADOR(A) (ESCAFANDRISTA) INDEPENDENTE'],
  },
  {
    subclasse: '7719-5/99',
    denominacao:
      'LOCAÇÃO DE OUTROS MEIOS DE TRANSPORTE NÃO ESPECIFICADOS ANTERIORMENTE, SEM CONDUTOR',
    ocupacoes: ['LOCADOR(A) DE MOTOCICLETA, SEM CONDUTOR, INDEPENDENTE'],
  },
  {
    subclasse: '7721-7/00',
    denominacao: 'ALUGUEL DE EQUIPAMENTOS RECREATIVOS E ESPORTIVOS',
    ocupacoes: [
      'LOCADOR(A) DE BICICLETAS, INDEPENDENTE',
      'LOCADOR(A) DE EQUIPAMENTOS RECREATIVOS E ESPORTIVOS INDEPENDENTE',
      'LOCADOR(A) DE MATERIAL E EQUIPAMENTO ESPORTIVO, INDEPENDENTE',
    ],
  },
  {
    subclasse: '7722-5/00',
    denominacao: 'ALUGUEL DE FITAS DE VÍDEO, DVDS E SIMILARES',
    ocupacoes: [
      'LOCADOR(A) DE FITAS DE VÍDEO, DVDS E SIMILARES INDEPENDENTE',
      'LOCADOR(A) DE VÍDEO GAMES, INDEPENDENTE',
    ],
  },
  {
    subclasse: '7723-3/00',
    denominacao: 'ALUGUEL DE OBJETOS DO VESTUÁRIO, JÓIAS E ACESSÓRIOS',
    ocupacoes: [
      'LOCADOR(A) DE OBJETOS DO VESTUÁRIO, JÓIAS E ACESSÓRIOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '7729-2/01',
    denominacao: 'ALUGUEL DE APARELHOS DE JOGOS ELETRÔNICOS',
    ocupacoes: ['LOCADOR(A) DE APARELHOS DE JOGOS ELETRÔNICOS INDEPENDENTE'],
  },
  {
    subclasse: '7729-2/02',
    denominacao:
      'ALUGUEL DE MÓVEIS, UTENSÍLIOS E APARELHOS DE USO DOMÉSTICO E PESSOAL; INSTRUMENTOS MUSICAIS',
    ocupacoes: [
      'LOCADOR(A) DE INSTRUMENTOS MUSICAIS INDEPENDENTE',
      'LOCADOR(A) DE MÓVEIS E UTENSÍLIOS, INCLUSIVE PARA FESTAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '7729-2/03',
    denominacao: 'ALUGUEL DE MATERIAL MÉDICO',
    ocupacoes: ['LOCADOR(A) DE MATERIAL MÉDICO INDEPENDENTE'],
  },
  {
    subclasse: '7729-2/99',
    denominacao:
      'ALUGUEL DE OUTROS OBJETOS PESSOAIS E DOMÉSTICOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'LOCADOR(A) DE LIVROS, REVISTAS, PLANTAS E FLORES INDEPENDENTE',
    ],
  },
  {
    subclasse: '7731-4/00',
    denominacao: 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS AGRÍCOLAS SEM OPERADOR',
    ocupacoes: [
      'LOCADOR(A) DE MÁQUINAS E EQUIPAMENTOS AGRÍCOLAS SEM OPERADOR INDEPENDENTE',
    ],
  },
  {
    subclasse: '7732-2/01',
    denominacao:
      'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS PARA CONSTRUÇÃO SEM OPERADOR, EXCETO ANDAIMES',
    ocupacoes: [
      'LOCADOR(A) DE MÁQUINAS E EQUIPAMENTOS PARA CONSTRUÇÃO SEM OPERADOR, EXCETO ANDAIMES INDEPENDENTE',
    ],
  },
  {
    subclasse: '7732-2/02',
    denominacao: 'ALUGUEL DE ANDAIMES',
    ocupacoes: ['LOCADOR DE ANDAIMES INDEPENDENTE'],
  },
  {
    subclasse: '7733-1/00',
    denominacao: 'ALUGUEL DE MÁQUINAS E EQUIPAMENTOS PARA ESCRITÓRIO',
    ocupacoes: [
      'LOCADOR(A) DE MÁQUINAS E EQUIPAMENTOS PARA ESCRITÓRIO INDEPENDENTE',
    ],
  },
  {
    subclasse: '7739-0/02',
    denominacao:
      'ALUGUEL DE EQUIPAMENTOS CIENTÍFICOS, MÉDICOS E HOSPITALARES, SEM OPERADOR',
    ocupacoes: [
      'LOCADOR(A) DE EQUIPAMENTOS CIENTÍFICOS, MÉDICOS E HOSPITALARES, SEM OPERADOR INDEPENDENTE',
    ],
  },
  {
    subclasse: '7739-0/03',
    denominacao:
      'ALUGUEL DE PALCOS, COBERTURAS E OUTRAS ESTRUTURAS DE USO TEMPORÁRIO, EXCETO ANDAIMES',
    ocupacoes: [
      'LOCADOR(A) DE PALCOS, COBERTURAS E OUTRAS ESTRUTURAS DE USO TEMPORÁRIO, EXCETO ANDAIMES INDEPENDENTE',
    ],
  },
  {
    subclasse: '7739-0/99',
    denominacao:
      'ALUGUEL DE OUTRAS MÁQUINAS E EQUIPAMENTOS COMERCIAIS E INDUSTRIAIS NÃO ESPECIFICADOS ANTERIORMENTE, SEM OPERADOR',
    ocupacoes: [
      'LOCADOR(A) DE OUTRAS MÁQUINAS E EQUIPAMENTOS COMERCIAIS E INDUSTRIAIS NÃO ESPECIFICADOS ANTERIORMENTE, SEM OPERADOR INDEPENDENTE',
    ],
  },
  {
    subclasse: '7911-2/00',
    denominacao: 'AGÊNCIAS DE VIAGENS',
    ocupacoes: ['AGENTE DE VIAGENS INDEPENDENTE'],
  },
  {
    subclasse: '7912-1/00',
    denominacao: 'OPERADORES TURÍSTICOS',
    ocupacoes: ['GUIA DE TURISMO INDEPENDENTE'],
  },
  {
    subclasse: '7990-2/00',
    denominacao:
      'SERVIÇOS DE RESERVAS E OUTROS SERVIÇOS DE TURISMO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['PROMOTOR(A) DE TURISMO LOCAL INDEPENDENTE'],
  },
  {
    subclasse: '8011-1/02',
    denominacao: 'SERVIÇOS DE ADESTRAMENTO DE CÃES DE GUARDA',
    ocupacoes: ['ADESTRADOR(A) DE CÃES DE GUARDA INDEPENDENTE'],
  },
  {
    subclasse: '8020-0/02',
    denominacao: 'OUTRAS ATIVIDADES DE SERVIÇOS DE SEGURANÇA',
    ocupacoes: [
      'INSTALADOR(A) E REPARADOR DE COFRES, TRANCAS E TRAVAS DE SEGURANÇA INDEPENDENTE',
    ],
  },
  {
    subclasse: '8129-0/00',
    denominacao: 'ATIVIDADES DE LIMPEZA NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: ['PISCINEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '8130-3/00',
    denominacao: 'ATIVIDADES PAISAGÍSTICAS',
    ocupacoes: ['JARDINEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '8219-9/01',
    denominacao: 'FOTOCÓPIAS',
    ocupacoes: ['FOTOCOPIADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '8219-9/99',
    denominacao:
      'PREPARAÇÃO DE DOCUMENTOS E SERVIÇOS ESPECIALIZADOS DE APOIO ADMINISTRATIVO NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: ['DIGITADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '8230-0/01',
    denominacao:
      'SERVIÇOS DE ORGANIZAÇÃO DE FEIRAS, CONGRESSOS, EXPOSIÇÕES E FESTAS',
    ocupacoes: ['PROMOTOR(A) DE EVENTOS INDEPENDENTE'],
  },
  {
    subclasse: '8230-0/02',
    denominacao: 'CASAS DE FESTAS E EVENTOS',
    ocupacoes: ['PROPRIETÁRIO(A) DE CASAS DE FESTAS E EVENTOS INDEPENDENTE'],
  },
  {
    subclasse: '8291-1/00',
    denominacao: 'ATIVIDADES DE COBRANÇAS E INFORMAÇÕES CADASTRAIS',
    ocupacoes: ['COBRADOR(A) DE DÍVIDAS INDEPENDENTE'],
  },
  {
    subclasse: '8292-0/00',
    denominacao: 'ENVASAMENTO E EMPACOTAMENTO SOB CONTRATO',
    ocupacoes: ['ENVASADOR(A) E EMPACOTADOR(A) INDEPENDENTE'],
  },
  {
    subclasse: '8299-7/03',
    denominacao: 'SERVIÇOS DE GRAVAÇÃO DE CARIMBOS, EXCETO CONFECÇÃO',
    ocupacoes: ['GRAVADOR(A) DE CARIMBOS INDEPENDENTE'],
  },
  {
    subclasse: '8299-7/07',
    denominacao: 'SALAS DE ACESSO À INTERNET',
    ocupacoes: ['PROPRIETÁRIO(A) DE SALA DE ACESSO À INTERNET INDEPENDENTE'],
  },
  {
    subclasse: '8299-7/99',
    denominacao:
      'OUTRAS ATIVIDADES DE SERVIÇOS PRESTADOS PRINCIPALMENTE ÀS EMPRESAS NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: ['CARTAZISTA, PINTOR DE INDEPENDENTE'],
  },
  {
    subclasse: '8592-9/02',
    denominacao: 'ENSINO DE ARTES CÊNICAS, EXCETO DANÇA',
    ocupacoes: ['INSTRUTOR(A) DE ARTES CÊNICAS INDEPENDENTE'],
  },
  {
    subclasse: '8592-9/03',
    denominacao: 'ENSINO DE MÚSICA',
    ocupacoes: ['INSTRUTOR(A) DE MÚSICA INDEPENDENTE'],
  },
  {
    subclasse: '8592-9/99',
    denominacao: 'ENSINO DE ARTE E CULTURA NÃO ESPECIFICADO ANTERIORMENTE',
    ocupacoes: ['INSTRUTOR(A) DE ARTE E CULTURA EM GERAL INDEPENDENTE'],
  },
  {
    subclasse: '8593-7/00',
    denominacao: 'ENSINO DE IDIOMAS',
    ocupacoes: ['INSTRUTOR(A) DE IDIOMAS INDEPENDENTE'],
  },
  {
    subclasse: '8599-6/03',
    denominacao: 'TREINAMENTO EM INFORMÁTICA',
    ocupacoes: ['INSTRUTOR(A) DE INFORMÁTICA INDEPENDENTE'],
  },
  {
    subclasse: '8599-6/04',
    denominacao: 'TREINAMENTO EM DESENVOLVIMENTO PROFISSIONAL E GERENCIAL',
    ocupacoes: ['INSTRUTOR(A) DE CURSOS GERENCIAIS INDEPENDENTE'],
  },
  {
    subclasse: '8599-6/05',
    denominacao: 'CURSOS PREPARATÓRIOS PARA CONCURSOS',
    ocupacoes: ['INSTRUTOR(A) DE CURSOS PREPARATÓRIOS INDEPENDENTE'],
  },
  {
    subclasse: '8599-6/99',
    denominacao: 'OUTRAS ATIVIDADES DE ENSINO NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: ['PROFESSOR(A) PARTICULAR INDEPENDENTE'],
  },
  {
    subclasse: '8712-3/00',
    denominacao:
      'ATIVIDADES DE FORNECIMENTO DE INFRA- ESTRUTURA DE APOIO E ASSISTÊNCIA A PACIENTE NO DOMICÍLIO',
    ocupacoes: ['CUIDADOR(A) DE IDOSOS E ENFERMOS INDEPENDENTE'],
  },
  {
    subclasse: '9001-9/01',
    denominacao: 'PRODUÇÃO TEATRAL',
    ocupacoes: ['HUMORISTA E CONTADOR DE HISTÓRIAS INDEPENDENTE'],
  },
  {
    subclasse: '9001-9/02',
    denominacao: 'PRODUÇÃO MUSICAL',
    ocupacoes: ['CANTOR(A)/MÚSICO(A) INDEPENDENTE'],
  },
  {
    subclasse: '9001-9/06',
    denominacao: 'ATIVIDADES DE SONORIZAÇÃO E DE ILUMINAÇÃO',
    ocupacoes: [
      'DISC JOCKEY (DJ) OU VIDEO JOCKEY (VJ) INDEPENDENTE',
      'TÉCNICO(A) DE SONORIZAÇÃO E DE ILUMINAÇÃO INDEPENDENTE',
    ],
  },
  {
    subclasse: '9002-7/02',
    denominacao: 'RESTAURAÇÃO DE OBRAS DE ARTE',
    ocupacoes: ['RESTAURADOR(A) DE OBRAS DE ARTE INDEPENDENTE'],
  },
  {
    subclasse: '9329-8/03',
    denominacao: 'EXPLORAÇÃO DE JOGOS DE SINUCA, BILHAR E SIMILARES',
    ocupacoes: [
      'PROPRIETÁRIO(A) DE SALÃO DE JOGOS DE SINUCA E BILHAR INDEPENDENTE',
    ],
  },
  {
    subclasse: '9329-8/04',
    denominacao: 'EXPLORAÇÃO DE JOGOS ELETRÔNICOS RECREATIVOS',
    ocupacoes: ['PROPRIETÁRIO(A) DE FLIPERAMA INDEPENDENTE'],
  },
  {
    subclasse: '9329-8/99',
    denominacao:
      'OUTRAS ATIVIDADES DE RECREAÇÃO E LAZER NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: ['ANIMADOR(A) DE FESTAS INDEPENDENTE', 'MÁGICO(A) INDEPENDENTE'],
  },
  {
    subclasse: '9511-8/00',
    denominacao:
      'REPARAÇÃO E MANUTENÇÃO DE COMPUTADORES E DE EQUIPAMENTOS PERIFÉRICOS',
    ocupacoes: ['TÉCNICO(A) DE MANUTENÇÃO DE COMPUTADOR INDEPENDENTE'],
  },
  {
    subclasse: '9512-6/00',
    denominacao: 'REPARAÇÃO E MANUTENÇÃO DE EQUIPAMENTOS DE COMUNICAÇÃO',
    ocupacoes: ['TÉCNICO(A) DE MANUTENÇÃO DE TELEFONIA INDEPENDENTE'],
  },
  {
    subclasse: '9521-5/00',
    denominacao:
      'REPARAÇÃO E MANUTENÇÃO DE EQUIPAMENTOS ELETROELETRÔNICOS DE USO PESSOAL E DOMÉSTICO',
    ocupacoes: ['TÉCNICO(A) DE MANUTENÇÃO DE ELETRODOMÉSTICOS INDEPENDENTE'],
  },
  {
    subclasse: '9529-1/01',
    denominacao: 'REPARAÇÃO DE CALÇADOS, DE BOLSAS E ARTIGOS DE VIAGEM',
    ocupacoes: ['SAPATEIRO(A)'],
  },
  {
    subclasse: '9529-1/02',
    denominacao: 'CHAVEIROS',
    ocupacoes: ['CHAVEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '9529-1/03',
    denominacao: 'REPARAÇÃO DE RELÓGIOS',
    ocupacoes: ['RELOJOEIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '9529-1/04',
    denominacao:
      'REPARAÇÃO DE BICICLETAS, TRICICLOS E OUTROS VEÍCULOS NÃO MOTORIZADOS',
    ocupacoes: ['REPARADOR(A) DE BICICLETA INDEPENDENTE'],
  },
  {
    subclasse: '9529-1/05',
    denominacao: 'REPARAÇÃO DE ARTIGOS DO MOBILIÁRIO',
    ocupacoes: [
      'ESTOFADOR(A) INDEPENDENTE',
      'REPARADOR (A) DE ARTIGOS DE TAPEÇARIA INDEPENDENTE',
      'REPARADOR(A) DE MÓVEIS INDEPENDENTE',
      'REPARADOR(A) DE TOLDOS E PERSIANAS INDEPENDENTE',
    ],
  },
  {
    subclasse: '9529-1/06',
    denominacao: 'REPARAÇÃO DE JÓIAS',
    ocupacoes: ['OURIVES INDEPENDENTE'],
  },
  {
    subclasse: '9529-1/99',
    denominacao:
      'REPARAÇÃO E MANUTENÇÃO DE OUTROS OBJETOS E EQUIPAMENTOS PESSOAIS E DOMÉSTICOS NÃO ESPECIFICADOS ANTERIORMENTE',
    ocupacoes: [
      'AMOLADOR(A) DE ARTIGOS DE CUTELARIA INDEPENDENTE',
      'REPARADOR(A) DE ARTIGOS E ACESSÓRIOS DO VESTUÁRIO INDEPENDENTE',
      'REPARADOR(A) DE BRINQUEDOS INDEPENDENTE',
      'REPARADOR(A) DE EQUIPAMENTOS ESPORTIVOS INDEPENDENTE',
      'REPARADOR(A) DE GUARDA CHUVA E SOMBRINHAS INDEPENDENTE',
      'REPARADOR(A) DE INSTRUMENTOS MUSICAIS INDEPENDENTE',
      'REPARADOR(A) DE PANELAS (PANELEIRO) INDEPENDENTE',
      'RESTAURADOR(A) DE LIVROS INDEPENDENTE',
    ],
  },
  {
    subclasse: '9601-7/01',
    denominacao: 'LAVANDERIAS',
    ocupacoes: ['LAVADEIRO(A) DE ROUPAS INDEPENDENTE'],
  },
  {
    subclasse: '9601-7/02',
    denominacao: 'TINTURARIAS',
    ocupacoes: ['TINTUREIRO(A) INDEPENDENTE'],
  },
  {
    subclasse: '9601-7/03',
    denominacao: 'TOALHEIROS',
    ocupacoes: ['LAVADEIRO(A) DE ROUPAS PROFISSIONAIS INDEPENDENTE'],
  },
  {
    subclasse: '9602-5/01',
    denominacao: 'CABELEIREIROS, MANICURE E PEDICURE',
    ocupacoes: [
      'BARBEIRO INDEPENDENTE',
      'CABELEIREIRO(A) INDEPENDENTE',
      'MANICURE/PEDICURE INDEPENDENTE',
    ],
  },
  {
    subclasse: '9602-5/02',
    denominacao:
      'ATIVIDADES DE ESTÉTICA E OUTROS SERVIÇOS DE CUIDADOS COM A BELEZA',
    ocupacoes: [
      'DEPILADOR(A) INDEPENDENTE',
      'ESTETICISTA INDEPENDENTE',
      'MAQUIADOR(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '9603-3/04',
    denominacao: 'SERVIÇOS DE FUNERÁRIAS',
    ocupacoes: ['AGENTE FUNERÁRIO INDEPENDENTE'],
  },
  {
    subclasse: '9609-2/02',
    denominacao: 'AGÊNCIAS MATRIMONIAIS',
    ocupacoes: ['AGENTE MATRIMONIAL INDEPENDENTE'],
  },
  {
    subclasse: '9609-2/06',
    denominacao: 'SERVIÇOS DE TATUAGEM E COLOCAÇÃO DE PIERCING',
    ocupacoes: [
      'COLOCADOR(A) DE PIERCING INDEPENDENTE',
      'TATUADOR(A) INDEPENDENTE',
    ],
  },
  {
    subclasse: '9609-2/07',
    denominacao: 'ALOJAMENTO DE ANIMAIS DOMÉSTICOS',
    ocupacoes: ['ADESTRADOR(A) DE ANIMAIS INDEPENDENTE'],
  },
  {
    subclasse: '9609-2/08',
    denominacao: 'HIGIENE E EMBELEZAMENTO DE ANIMAIS DOMÉSTICOS',
    ocupacoes: [
      'BANHISTA DE ANIMAIS DOMÉSTICOS INDEPENDENTE',
      'CUIDADOR(A) DE ANIMAIS (PET SITTER) INDEPENDENTE',
      'ESTETICISTA DE ANIMAIS DOMÉSTICOS INDEPENDENTE',
      'TOSADOR(A) DE ANIMAIS DOMÉSTICOS INDEPENDENTE',
    ],
  },
  {
    subclasse: '9609-2/99',
    denominacao:
      'OUTRAS ATIVIDADES DE SERVIÇOS PESSOAIS NÃO ESPECIFICADAS ANTERIORMENTE',
    ocupacoes: [
      'ASTRÓLOGO(A) INDEPENDENTE',
      'CARREGADOR DE MALAS INDEPENDENTE',
      'ENGRAXATE INDEPENDENTE',
      'LAVADOR(A) DE ESTOFADO E SOFÁ INDEPENDENTE',
      'LOCUTOR(A) DE MENSAGENS FONADAS E AO VIVO INDEPENDENTE',
    ],
  },
  {
    subclasse: '9700-5/00',
    denominacao: 'SERVIÇOS DOMÉSTICOS',
    ocupacoes: ['DIARISTA INDEPENDENTE'],
  },
]
