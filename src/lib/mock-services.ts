import type { ModelsPrefRioService } from '@/http-busca-search/models'
import type { Service, ServiceListItem } from '@/types/service'
import { convertApiToFrontend } from '@/types/service'

// Mock API data that matches the real API structure
export const mockApiServices: ModelsPrefRioService[] = [
  {
    id: '1',
    autor: 'João Silva',
    orgao_gestor: ['smcc'],
    tema_geral: 'licencas',
    publico_especifico: ['empresarios'],
    nome_servico: 'Solicitação de Alvará de Funcionamento',
    resumo:
      'Solicite o alvará de funcionamento para estabelecimentos comerciais e industriais no município.',
    servico_nao_cobre: 'Não atende casos de emergência ou urgência',
    tempo_atendimento: '15 dias úteis',
    custo_servico: 'R$ 150,00',
    is_free: false,
    resultado_solicitacao:
      'Alvará de funcionamento emitido e disponível para download',
    descricao_completa:
      'O alvará de funcionamento é um documento obrigatório para o funcionamento de estabelecimentos comerciais, industriais e de prestação de serviços. Este serviço permite que empresários e empreendedores solicitem a autorização necessária para iniciar suas atividades no município.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Comprovante de endereço',
      'Contrato de locação ou escritura',
      'Projeto arquitetônico aprovado',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de serviços\n2. Preencha o formulário online\n3. Anexe os documentos necessários\n4. Aguarde a análise do pedido\n5. Receba o alvará por email',
    canais_digitais: [
      'https://www.rio.rj.gov.br/alvara',
      'https://app.rio.rj.gov.br/servicos',
    ],
    canais_presenciais: [
      'Rua da Alfândega, 123 - Centro - RJ',
      'Av. Rio Branco, 456 - Centro - RJ',
    ],
    status: 1, // Published
    awaiting_approval: false,
    published_at: Math.floor(new Date('2024-01-15').getTime() / 1000),
    last_update: Math.floor(new Date('2024-01-20').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-10').getTime() / 1000),
  },
  {
    id: '2',
    autor: 'Maria Santos',
    orgao_gestor: ['smcg'],
    tema_geral: 'cidadania',
    publico_especifico: ['geral'],
    nome_servico: 'Cadastro de Microempreendedor Individual',
    resumo:
      'Cadastre-se como Microempreendedor Individual (MEI) e regularize sua situação fiscal.',
    servico_nao_cobre: 'Não inclui consultoria contábil ou jurídica',
    tempo_atendimento: 'Imediato',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao: 'Certificado de MEI emitido e CNPJ ativo',
    descricao_completa:
      'O cadastro de MEI permite que trabalhadores autônomos se regularizem como empresários individuais, obtendo CNPJ e acesso a benefícios como previdência social e crédito.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Comprovante de endereço',
      'Comprovante de renda',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal do MEI\n2. Preencha o formulário de cadastro\n3. Anexe os documentos\n4. Pague a taxa (se aplicável)\n5. Receba o certificado',
    canais_digitais: ['https://www.rio.rj.gov.br/mei'],
    canais_presenciais: ['Praça da Cidadania, 789 - Centro - RJ'],
    status: 0, // Draft
    awaiting_approval: true, // Awaiting approval
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-18').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-15').getTime() / 1000),
  },
  {
    id: '3',
    autor: 'Carlos Oliveira',
    orgao_gestor: ['cgm'],
    tema_geral: 'licencas',
    publico_especifico: ['geral'],
    nome_servico: 'Licença para Eventos Públicos',
    resumo:
      'Solicite a licença necessária para realizar eventos públicos no município.',
    servico_nao_cobre: 'Não cobre eventos privados em locais fechados',
    tempo_atendimento: '10 dias úteis',
    custo_servico: 'R$ 200,00',
    is_free: false,
    resultado_solicitacao: 'Licença para evento público emitida',
    descricao_completa:
      'Licença obrigatória para realização de eventos públicos como feiras, festivais, shows e manifestações culturais em vias públicas ou espaços municipais.',
    documentos_necessarios: [
      'Projeto do evento',
      'Plano de segurança',
      'Comprovante de seguro',
      'Documentos do responsável',
    ],
    instrucoes_solicitante:
      '1. Preencha o formulário de solicitação\n2. Anexe os documentos necessários\n3. Aguarde a análise\n4. Pague a taxa\n5. Receba a licença',
    canais_digitais: ['https://www.rio.rj.gov.br/eventos'],
    canais_presenciais: ['Av. Presidente Vargas, 321 - Centro - RJ'],
    status: 1, // Published
    awaiting_approval: false,
    published_at: Math.floor(new Date('2024-01-10').getTime() / 1000),
    last_update: Math.floor(new Date('2024-01-22').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-05').getTime() / 1000),
  },
  {
    id: '4',
    autor: 'Ana Costa',
    orgao_gestor: ['smdu'],
    tema_geral: 'cidadania',
    publico_especifico: ['geral'],
    nome_servico: 'Certidão de Tempo de Contribuição',
    resumo:
      'Solicite a certidão de tempo de contribuição para fins previdenciários.',
    servico_nao_cobre: 'Não inclui análise de documentos específicos',
    tempo_atendimento: '5 dias úteis',
    custo_servico: 'R$ 25,00',
    is_free: false,
    resultado_solicitacao: 'Certidão emitida e disponível para download',
    descricao_completa:
      'A certidão de tempo de contribuição é um documento que comprova o tempo de contribuição do segurado para fins de aposentadoria e outros benefícios previdenciários.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Carteira de trabalho',
      'Comprovantes de contribuição',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Pague a taxa\n5. Receba a certidão',
    canais_digitais: ['https://www.rio.rj.gov.br/certidoes'],
    canais_presenciais: ['Rua Buenos Aires, 654 - Centro - RJ'],
    status: 0, // Draft
    awaiting_approval: false, // In edition
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-19').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-12').getTime() / 1000),
  },
  {
    id: '5',
    autor: 'Pedro Lima',
    orgao_gestor: ['smit'],
    tema_geral: 'cidadania',
    publico_especifico: ['idosos'],
    nome_servico: 'Isenção de IPTU para Idosos',
    resumo:
      'Solicite a isenção do Imposto Predial e Territorial Urbano (IPTU) para idosos.',
    servico_nao_cobre: 'Não se aplica a imóveis comerciais',
    tempo_atendimento: '30 dias úteis',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao: 'Isenção aprovada e aplicada automaticamente',
    descricao_completa:
      'A isenção de IPTU para idosos é um benefício fiscal que isenta o pagamento do imposto para pessoas com 65 anos ou mais, desde que atendam aos critérios estabelecidos.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Comprovante de residência',
      'Comprovante de renda',
      'Documento do imóvel',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba a confirmação',
    canais_digitais: ['https://www.rio.rj.gov.br/iptu'],
    canais_presenciais: ['Rua da Assembleia, 987 - Centro - RJ'],
    status: 1, // Published
    awaiting_approval: false,
    published_at: Math.floor(new Date('2024-01-12').getTime() / 1000),
    last_update: Math.floor(new Date('2024-01-21').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-08').getTime() / 1000),
  },
  {
    id: '6',
    autor: 'Lucia Ferreira',
    orgao_gestor: ['seop'],
    tema_geral: 'cidadania',
    publico_especifico: ['vulnerabilidade'],
    nome_servico: 'Cadastro de Beneficiário de Programa Social',
    resumo: 'Cadastre-se para participar de programas sociais municipais.',
    servico_nao_cobre: 'Não garante aprovação automática',
    tempo_atendimento: '15 dias úteis',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao: 'Cadastro realizado e análise em andamento',
    descricao_completa:
      'O cadastro permite que famílias em situação de vulnerabilidade social participem de programas de assistência social oferecidos pela prefeitura.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Comprovante de residência',
      'Comprovante de renda familiar',
      'Número do NIS',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba o resultado',
    canais_digitais: ['https://www.rio.rj.gov.br/assistencia'],
    canais_presenciais: ['Av. Erasmo Braga, 147 - Centro - RJ'],
    status: 0, // Draft
    awaiting_approval: true, // Awaiting approval
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-17').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-10').getTime() / 1000),
  },
  {
    id: '7',
    autor: 'Roberto Silva',
    orgao_gestor: ['seop'],
    tema_geral: 'licencas',
    publico_especifico: ['empresarios'],
    nome_servico: 'Autorização para Obra em Via Pública',
    resumo:
      'Solicite autorização para realizar obras que afetem vias públicas.',
    servico_nao_cobre: 'Não inclui obras de grande porte',
    tempo_atendimento: '20 dias úteis',
    custo_servico: 'R$ 300,00',
    is_free: false,
    resultado_solicitacao: 'Autorização emitida com condições específicas',
    descricao_completa:
      'Autorização necessária para obras que interfiram no trânsito ou na estrutura de vias públicas, incluindo escavações, instalações e reformas.',
    documentos_necessarios: [
      'Projeto da obra',
      'Plano de trânsito',
      'Seguro de responsabilidade civil',
      'Documentos do responsável técnico',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Pague a taxa\n5. Aguarde a análise\n6. Receba a autorização',
    canais_digitais: ['https://www.rio.rj.gov.br/obras'],
    canais_presenciais: ['Rua Mexico, 258 - Centro - RJ'],
    status: 0, // Draft
    awaiting_approval: false, // In edition
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-16').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-08').getTime() / 1000),
  },
  {
    id: '8',
    autor: 'Fernanda Alves',
    orgao_gestor: ['seop'],
    tema_geral: 'cidadania',
    publico_especifico: ['pcd'],
    nome_servico: 'Cartão de Estacionamento para PcD',
    resumo: 'Solicite o cartão de estacionamento para pessoas com deficiência.',
    servico_nao_cobre: 'Não inclui vagas em shoppings privados',
    tempo_atendimento: '10 dias úteis',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao: 'Cartão emitido e enviado por correio',
    descricao_completa:
      'O cartão de estacionamento para PcD permite o uso de vagas especiais em vias públicas e estacionamentos municipais.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Laudo médico comprobatório',
      'Comprovante de residência',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba o cartão',
    canais_digitais: ['https://www.rio.rj.gov.br/pcd'],
    canais_presenciais: ['Av. Churchill, 369 - Centro - RJ'],
    status: 1, // Published
    awaiting_approval: false,
    published_at: Math.floor(new Date('2024-01-08').getTime() / 1000),
    last_update: Math.floor(new Date('2024-01-23').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-05').getTime() / 1000),
  },
  {
    id: '9',
    autor: 'Marcos Pereira',
    orgao_gestor: ['sme'],
    tema_geral: 'educacao',
    publico_especifico: ['estudantes'],
    nome_servico: 'Solicitação de Bolsa de Estudos Municipal',
    resumo:
      'Solicite bolsa de estudos para cursos técnicos e superiores em instituições conveniadas.',
    servico_nao_cobre: 'Não inclui cursos de pós-graduação',
    tempo_atendimento: '30 dias úteis',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao:
      'Bolsa aprovada e matrícula realizada automaticamente',
    descricao_completa:
      'Programa de bolsas de estudos para estudantes de baixa renda cursarem ensino técnico e superior em instituições conveniadas com a prefeitura.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Comprovante de renda familiar',
      'Histórico escolar',
      'Comprovante de residência',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de bolsas\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba o resultado',
    canais_digitais: ['https://www.rio.rj.gov.br/bolsas'],
    canais_presenciais: ['Rua Afonso Cavalcanti, 741 - Cidade Nova - RJ'],
    status: 0, // Draft
    awaiting_approval: true, // Awaiting approval
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-14').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-10').getTime() / 1000),
  },
  {
    id: '10',
    autor: 'Beatriz Rodrigues',
    orgao_gestor: ['sms'],
    tema_geral: 'saude',
    publico_especifico: ['geral'],
    nome_servico: 'Agendamento de Consulta Médica',
    resumo: 'Agende consultas médicas em unidades de saúde municipais.',
    servico_nao_cobre: 'Não inclui consultas de emergência',
    tempo_atendimento: 'Imediato',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao: 'Consulta agendada com confirmação por SMS',
    descricao_completa:
      'Sistema de agendamento online para consultas médicas em unidades de saúde da rede municipal, com opções de especialidades e horários disponíveis.',
    documentos_necessarios: [
      'RG',
      'CPF',
      'Cartão SUS',
      'Comprovante de residência',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de saúde\n2. Selecione a especialidade\n3. Escolha data e horário\n4. Confirme o agendamento\n5. Receba a confirmação',
    canais_digitais: ['https://www.rio.rj.gov.br/saude'],
    canais_presenciais: [
      'Av. Brigadeiro Trompowsky, 852 - Ilha do Governador - RJ',
    ],
    status: 0, // Draft
    awaiting_approval: true, // Awaiting approval
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-13').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-09').getTime() / 1000),
  },
  {
    id: '11',
    autor: 'Ricardo Mendes',
    orgao_gestor: ['smtr'],
    tema_geral: 'transporte',
    publico_especifico: ['geral'],
    nome_servico: 'Solicitação de Ponto de Ônibus',
    resumo: 'Solicite a instalação de novo ponto de ônibus em sua região.',
    servico_nao_cobre: 'Não garante aprovação automática',
    tempo_atendimento: '60 dias úteis',
    custo_servico: 'Gratuito',
    is_free: true,
    resultado_solicitacao: 'Análise técnica realizada e resposta enviada',
    descricao_completa:
      'Sistema para solicitação de novos pontos de ônibus baseado em demanda da população e viabilidade técnica do local.',
    documentos_necessarios: [
      'Comprovante de residência',
      'Justificativa da solicitação',
      'Assinaturas de moradores',
    ],
    instrucoes_solicitante:
      '1. Acesse o portal de transportes\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise técnica\n5. Receba o resultado',
    canais_digitais: ['https://www.rio.rj.gov.br/transporte'],
    canais_presenciais: ['Av. Presidente Antônio Carlos, 963 - Centro - RJ'],
    status: 0, // Draft
    awaiting_approval: true, // Awaiting approval
    published_at: undefined,
    last_update: Math.floor(new Date('2024-01-11').getTime() / 1000),
    created_at: Math.floor(new Date('2024-01-07').getTime() / 1000),
  },
]

// Convert API services to frontend format
export const mockServices: Service[] = mockApiServices.map(convertApiToFrontend)

// Convert Service to ServiceListItem for the data table
export const mockServicesListItems: ServiceListItem[] = mockServices.map(
  service => ({
    id: service.id,
    title: service.title,
    managingOrgan: service.managingOrgan,
    published_at: service.published_at || null,
    last_update: service.last_update,
    status: service.status,
  })
)
