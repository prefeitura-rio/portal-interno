import type { Service, ServiceListItem } from '@/types/service'

// Mock service data - shared between data table and API
export const mockServices: Service[] = [
  {
    id: '1',
    managingOrgan: 'smcc', //orgao_gestor: string[]
    serviceCategory: 'licencas', //tema_geral: string
    targetAudience: 'empresarios', //publico_especifico: string[]
    title: 'Solicitação de Alvará de Funcionamento', //nome_servico: string
    shortDescription: //resumo: string
      'Solicite o alvará de funcionamento para estabelecimentos comerciais e industriais no município.',
    whatServiceDoesNotCover: 'Não atende casos de emergência ou urgência', //servico_nao_cobre: string
    serviceTime: '15 dias úteis', //tempo_de_atendimento: string
    serviceCost: 'R$ 150,00', //custo_servico: string
    isFree: false,
    requestResult: 'Alvará de funcionamento emitido e disponível para download', //resultado_solicitacao: string
    fullDescription: //descricao_completa: string
      'O alvará de funcionamento é um documento obrigatório para o funcionamento de estabelecimentos comerciais, industriais e de prestação de serviços. Este serviço permite que empresários e empreendedores solicitem a autorização necessária para iniciar suas atividades no município.',
    requiredDocuments: //documentos_necessarios: string[]
      'RG, CPF, Comprovante de endereço, Contrato de locação ou escritura, Projeto arquitetônico aprovado',
    instructionsForRequester: //instrucoes_solicitante: string
      '1. Acesse o portal de serviços\n2. Preencha o formulário online\n3. Anexe os documentos necessários\n4. Aguarde a análise do pedido\n5. Receba o alvará por email',
    digitalChannels: [
      //canais_digitais: string[]
      'https://www.rio.rj.gov.br/alvara',
      'https://app.rio.rj.gov.br/servicos',
    ],
    physicalChannels: [
      'Rua da Alfândega, 123 - Centro - RJ',
      'Av. Rio Branco, 456 - Centro - RJ',
    ],
    status: 'published',
    published_at: new Date('2024-01-15'),
    last_update: new Date('2024-01-20'),
    created_at: new Date('2024-01-10'),
  },
  {
    id: '2',
    managingOrgan: 'smcg',
    serviceCategory: 'cidadania',
    targetAudience: 'geral',
    title: 'Cadastro de Microempreendedor Individual',
    shortDescription:
      'Cadastre-se como Microempreendedor Individual (MEI) e regularize sua situação fiscal.',
    whatServiceDoesNotCover: 'Não inclui consultoria contábil ou jurídica',
    serviceTime: 'Imediato',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Certificado de MEI emitido e CNPJ ativo',
    fullDescription:
      'O cadastro de MEI permite que trabalhadores autônomos se regularizem como empresários individuais, obtendo CNPJ e acesso a benefícios como previdência social e crédito.',
    requiredDocuments: 'RG, CPF, Comprovante de endereço, Comprovante de renda',
    instructionsForRequester:
      '1. Acesse o portal do MEI\n2. Preencha o formulário de cadastro\n3. Anexe os documentos\n4. Pague a taxa (se aplicável)\n5. Receba o certificado',
    digitalChannels: ['https://www.rio.rj.gov.br/mei'],
    physicalChannels: ['Praça da Cidadania, 789 - Centro - RJ'],
    status: 'waiting_approval',
    published_at: null,
    last_update: new Date('2024-01-18'),
    created_at: new Date('2024-01-15'),
  },
  {
    id: '3',
    managingOrgan: 'cgm',
    serviceCategory: 'licencas',
    targetAudience: 'geral',
    title: 'Licença para Eventos Públicos',
    shortDescription:
      'Solicite a licença necessária para realizar eventos públicos no município.',
    whatServiceDoesNotCover: 'Não cobre eventos privados em locais fechados',
    serviceTime: '10 dias úteis',
    serviceCost: 'R$ 200,00',
    isFree: false,
    requestResult: 'Licença para evento público emitida',
    fullDescription:
      'Licença obrigatória para realização de eventos públicos como feiras, festivais, shows e manifestações culturais em vias públicas ou espaços municipais.',
    requiredDocuments:
      'Projeto do evento, Plano de segurança, Comprovante de seguro, Documentos do responsável',
    instructionsForRequester:
      '1. Preencha o formulário de solicitação\n2. Anexe os documentos necessários\n3. Aguarde a análise\n4. Pague a taxa\n5. Receba a licença',
    digitalChannels: ['https://www.rio.rj.gov.br/eventos'],
    physicalChannels: ['Av. Presidente Vargas, 321 - Centro - RJ'],
    status: 'published',
    published_at: new Date('2024-01-10'),
    last_update: new Date('2024-01-22'),
    created_at: new Date('2024-01-05'),
  },
  {
    id: '4',
    managingOrgan: 'smdu',
    serviceCategory: 'cidadania',
    targetAudience: 'geral',
    title: 'Certidão de Tempo de Contribuição',
    shortDescription:
      'Solicite a certidão de tempo de contribuição para fins previdenciários.',
    whatServiceDoesNotCover: 'Não inclui análise de documentos específicos',
    serviceTime: '5 dias úteis',
    serviceCost: 'R$ 25,00',
    isFree: false,
    requestResult: 'Certidão emitida e disponível para download',
    fullDescription:
      'A certidão de tempo de contribuição é um documento que comprova o tempo de contribuição do segurado para fins de aposentadoria e outros benefícios previdenciários.',
    requiredDocuments:
      'RG, CPF, Carteira de trabalho, Comprovantes de contribuição',
    instructionsForRequester:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Pague a taxa\n5. Receba a certidão',
    digitalChannels: ['https://www.rio.rj.gov.br/certidoes'],
    physicalChannels: ['Rua Buenos Aires, 654 - Centro - RJ'],
    status: 'in_edition',
    published_at: null,
    last_update: new Date('2024-01-19'),
    created_at: new Date('2024-01-12'),
  },
  {
    id: '5',
    managingOrgan: 'smit',
    serviceCategory: 'cidadania',
    targetAudience: 'idosos',
    title: 'Isenção de IPTU para Idosos',
    shortDescription:
      'Solicite a isenção do Imposto Predial e Territorial Urbano (IPTU) para idosos.',
    whatServiceDoesNotCover: 'Não se aplica a imóveis comerciais',
    serviceTime: '30 dias úteis',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Isenção aprovada e aplicada automaticamente',
    fullDescription:
      'A isenção de IPTU para idosos é um benefício fiscal que isenta o pagamento do imposto para pessoas com 65 anos ou mais, desde que atendam aos critérios estabelecidos.',
    requiredDocuments:
      'RG, CPF, Comprovante de residência, Comprovante de renda, Documento do imóvel',
    instructionsForRequester:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba a confirmação',
    digitalChannels: ['https://www.rio.rj.gov.br/iptu'],
    physicalChannels: ['Rua da Assembleia, 987 - Centro - RJ'],
    status: 'published',
    published_at: new Date('2024-01-12'),
    last_update: new Date('2024-01-21'),
    created_at: new Date('2024-01-08'),
  },
  {
    id: '6',
    managingOrgan: 'seop',
    serviceCategory: 'cidadania',
    targetAudience: 'vulnerabilidade',
    title: 'Cadastro de Beneficiário de Programa Social',
    shortDescription:
      'Cadastre-se para participar de programas sociais municipais.',
    whatServiceDoesNotCover: 'Não garante aprovação automática',
    serviceTime: '15 dias úteis',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Cadastro realizado e análise em andamento',
    fullDescription:
      'O cadastro permite que famílias em situação de vulnerabilidade social participem de programas de assistência social oferecidos pela prefeitura.',
    requiredDocuments:
      'RG, CPF, Comprovante de residência, Comprovante de renda familiar, Número do NIS',
    instructionsForRequester:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba o resultado',
    digitalChannels: ['https://www.rio.rj.gov.br/assistencia'],
    physicalChannels: ['Av. Erasmo Braga, 147 - Centro - RJ'],
    status: 'waiting_approval',
    published_at: null,
    last_update: new Date('2024-01-17'),
    created_at: new Date('2024-01-10'),
  },
  {
    id: '7',
    managingOrgan: 'seop',
    serviceCategory: 'licencas',
    targetAudience: 'empresarios',
    title: 'Autorização para Obra em Via Pública',
    shortDescription:
      'Solicite autorização para realizar obras que afetem vias públicas.',
    whatServiceDoesNotCover: 'Não inclui obras de grande porte',
    serviceTime: '20 dias úteis',
    serviceCost: 'R$ 300,00',
    isFree: false,
    requestResult: 'Autorização emitida com condições específicas',
    fullDescription:
      'Autorização necessária para obras que interfiram no trânsito ou na estrutura de vias públicas, incluindo escavações, instalações e reformas.',
    requiredDocuments:
      'Projeto da obra, Plano de trânsito, Seguro de responsabilidade civil, Documentos do responsável técnico',
    instructionsForRequester:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Pague a taxa\n5. Aguarde a análise\n6. Receba a autorização',
    digitalChannels: ['https://www.rio.rj.gov.br/obras'],
    physicalChannels: ['Rua Mexico, 258 - Centro - RJ'],
    status: 'in_edition',
    published_at: null,
    last_update: new Date('2024-01-16'),
    created_at: new Date('2024-01-08'),
  },
  {
    id: '8',
    managingOrgan: 'seop',
    serviceCategory: 'cidadania',
    targetAudience: 'pcd',
    title: 'Cartão de Estacionamento para PcD',
    shortDescription:
      'Solicite o cartão de estacionamento para pessoas com deficiência.',
    whatServiceDoesNotCover: 'Não inclui vagas em shoppings privados',
    serviceTime: '10 dias úteis',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Cartão emitido e enviado por correio',
    fullDescription:
      'O cartão de estacionamento para PcD permite o uso de vagas especiais em vias públicas e estacionamentos municipais.',
    requiredDocuments:
      'RG, CPF, Laudo médico comprobatório, Comprovante de residência',
    instructionsForRequester:
      '1. Acesse o portal de serviços\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba o cartão',
    digitalChannels: ['https://www.rio.rj.gov.br/pcd'],
    physicalChannels: ['Av. Churchill, 369 - Centro - RJ'],
    status: 'published',
    published_at: new Date('2024-01-08'),
    last_update: new Date('2024-01-23'),
    created_at: new Date('2024-01-05'),
  },
  {
    id: '9',
    managingOrgan: 'sme',
    serviceCategory: 'educacao',
    targetAudience: 'estudantes',
    title: 'Solicitação de Bolsa de Estudos Municipal',
    shortDescription:
      'Solicite bolsa de estudos para cursos técnicos e superiores em instituições conveniadas.',
    whatServiceDoesNotCover: 'Não inclui cursos de pós-graduação',
    serviceTime: '30 dias úteis',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Bolsa aprovada e matrícula realizada automaticamente',
    fullDescription:
      'Programa de bolsas de estudos para estudantes de baixa renda cursarem ensino técnico e superior em instituições conveniadas com a prefeitura.',
    requiredDocuments:
      'RG, CPF, Comprovante de renda familiar, Histórico escolar, Comprovante de residência',
    instructionsForRequester:
      '1. Acesse o portal de bolsas\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise\n5. Receba o resultado',
    digitalChannels: ['https://www.rio.rj.gov.br/bolsas'],
    physicalChannels: ['Rua Afonso Cavalcanti, 741 - Cidade Nova - RJ'],
    status: 'waiting_approval',
    published_at: null,
    last_update: new Date('2024-01-14'),
    created_at: new Date('2024-01-10'),
  },
  {
    id: '10',
    managingOrgan: 'sms',
    serviceCategory: 'saude',
    targetAudience: 'geral',
    title: 'Agendamento de Consulta Médica',
    shortDescription:
      'Agende consultas médicas em unidades de saúde municipais.',
    whatServiceDoesNotCover: 'Não inclui consultas de emergência',
    serviceTime: 'Imediato',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Consulta agendada com confirmação por SMS',
    fullDescription:
      'Sistema de agendamento online para consultas médicas em unidades de saúde da rede municipal, com opções de especialidades e horários disponíveis.',
    requiredDocuments: 'RG, CPF, Cartão SUS, Comprovante de residência',
    instructionsForRequester:
      '1. Acesse o portal de saúde\n2. Selecione a especialidade\n3. Escolha data e horário\n4. Confirme o agendamento\n5. Receba a confirmação',
    digitalChannels: ['https://www.rio.rj.gov.br/saude'],
    physicalChannels: [
      'Av. Brigadeiro Trompowsky, 852 - Ilha do Governador - RJ',
    ],
    status: 'waiting_approval',
    published_at: null,
    last_update: new Date('2024-01-13'),
    created_at: new Date('2024-01-09'),
  },
  {
    id: '11',
    managingOrgan: 'smtr',
    serviceCategory: 'transporte',
    targetAudience: 'geral',
    title: 'Solicitação de Ponto de Ônibus',
    shortDescription:
      'Solicite a instalação de novo ponto de ônibus em sua região.',
    whatServiceDoesNotCover: 'Não garante aprovação automática',
    serviceTime: '60 dias úteis',
    serviceCost: 'Gratuito',
    isFree: true,
    requestResult: 'Análise técnica realizada e resposta enviada',
    fullDescription:
      'Sistema para solicitação de novos pontos de ônibus baseado em demanda da população e viabilidade técnica do local.',
    requiredDocuments:
      'Comprovante de residência, Justificativa da solicitação, Assinaturas de moradores',
    instructionsForRequester:
      '1. Acesse o portal de transportes\n2. Preencha o formulário\n3. Anexe os documentos\n4. Aguarde a análise técnica\n5. Receba o resultado',
    digitalChannels: ['https://www.rio.rj.gov.br/transporte'],
    physicalChannels: ['Av. Presidente Antônio Carlos, 963 - Centro - RJ'],
    status: 'waiting_approval',
    published_at: null,
    last_update: new Date('2024-01-11'),
    created_at: new Date('2024-01-07'),
  },
]

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
