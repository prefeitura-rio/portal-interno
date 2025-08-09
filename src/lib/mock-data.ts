import type { Course, CourseListItem } from '@/types/course'

// Mock data for course list (simplified version for the table)
export const mockCourseList: CourseListItem[] = [
  {
    id: '1',
    title: 'Desenvolvimento Web Frontend com React',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'receiving_registrations',
    created_at: new Date('2025-07-30T10:00:00Z'),
    registration_start: new Date('2025-08-01T00:00:00Z'),
    registration_end: new Date('2025-08-31T23:59:59Z'),
  },
  {
    id: '2',
    title: 'Python para Ciência de Dados',
    provider: 'DataScience Academy',
    duration: 60,
    vacancies: 15,
    status: 'in_progress',
    created_at: new Date('2025-02-10T14:30:00Z'),
    registration_start: new Date('2025-02-15T00:00:00Z'),
    registration_end: new Date('2025-03-15T23:59:59Z'),
  },
  {
    id: '3',
    title: 'DevOps e Kubernetes',
    provider: 'Cloud Masters',
    duration: 80,
    vacancies: 10,
    status: 'cancelled',
    created_at: new Date('2025-06-05T09:15:00Z'),
    registration_start: new Date('2025-06-10T00:00:00Z'),
    registration_end: new Date('2025-07-10T23:59:59Z'),
  },
  {
    id: '4',
    title: 'Mobile Development com React Native',
    provider: 'TechEducation',
    duration: 50,
    vacancies: 20,
    status: 'draft',
    created_at: new Date('2025-06-20T16:45:00Z'),
    registration_start: new Date('2025-07-01T00:00:00Z'),
    registration_end: new Date('2025-07-31T23:59:59Z'),
  },
  {
    id: '5',
    title: 'Machine Learning Fundamentals',
    provider: 'AI Institute',
    duration: 70,
    vacancies: 12,
    status: 'finished',
    created_at: new Date('2025-07-30T11:00:00Z'),
    registration_start: new Date('2025-08-01T00:00:00Z'),
    registration_end: new Date('2025-08-31T23:59:59Z'),
  },
  {
    id: '6',
    title: 'Advanced JavaScript and TypeScript',
    provider: 'JavaScript Academy',
    duration: 45,
    vacancies: 30,
    status: 'receiving_registrations',
    created_at: new Date('2025-01-12T08:30:00Z'),
    registration_start: new Date('2025-01-15T00:00:00Z'),
    registration_end: new Date('2025-02-15T23:59:59Z'),
  },
  {
    id: '7',
    title: 'Cybersecurity Essentials',
    provider: 'SecureLearn',
    duration: 35,
    vacancies: 18,
    status: 'in_progress',
    created_at: new Date('2025-01-18T13:20:00Z'),
    registration_start: new Date('2025-01-20T00:00:00Z'),
    registration_end: new Date('2025-02-20T23:59:59Z'),
  },
  {
    id: '8',
    title: 'UX/UI Design Masterclass',
    provider: 'Design Hub',
    duration: 55,
    vacancies: 22,
    status: 'finished',
    created_at: new Date('2025-01-08T15:10:00Z'),
    registration_start: new Date('2025-01-10T00:00:00Z'),
    registration_end: new Date('2025-02-10T23:59:59Z'),
  },
  {
    id: '9',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'draft',
    created_at: new Date('2025-01-15T10:00:00Z'),
    registration_start: new Date('2025-01-20T00:00:00Z'),
    registration_end: new Date('2025-02-20T23:59:59Z'),
  },
  {
    id: '10',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'scheduled',
    created_at: new Date('2025-01-15T10:00:00Z'),
    registration_start: new Date('2025-01-20T00:00:00Z'),
    registration_end: new Date('2025-02-20T23:59:59Z'),
  },
  {
    id: '11',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'in_progress',
    created_at: new Date('2025-01-15T10:00:00Z'),
    registration_start: new Date('2025-01-20T00:00:00Z'),
    registration_end: new Date('2025-02-20T23:59:59Z'),
  },
  {
    id: '12',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'finished',
    created_at: new Date('2024-01-15T10:00:00Z'),
    registration_start: new Date('2024-01-20T00:00:00Z'),
    registration_end: new Date('2024-02-20T23:59:59Z'),
  },
  {
    id: '13',
    title: 'Desenvolvimento Web Backend com Node.js',
    provider: 'TechEducation',
    duration: 40,
    vacancies: 25,
    status: 'cancelled',
    created_at: new Date('2024-01-15T10:00:00Z'),
    registration_start: new Date('2024-01-20T00:00:00Z'),
    registration_end: new Date('2024-02-20T23:59:59Z'),
  },
  {
    id: '14',
    title: 'Inteligência Artificial Avançada',
    provider: 'AI Masters',
    duration: 90,
    vacancies: 15,
    status: 'scheduled',
    created_at: new Date('2025-01-25T14:30:00Z'),
    registration_start: new Date('2025-02-01T00:00:00Z'),
    registration_end: new Date('2025-03-01T23:59:59Z'),
  },
  {
    id: '15',
    title: 'Blockchain e Criptomoedas',
    provider: 'Crypto Academy',
    duration: 55,
    vacancies: 20,
    status: 'scheduled',
    created_at: new Date('2025-01-28T09:15:00Z'),
    registration_start: new Date('2025-02-05T00:00:00Z'),
    registration_end: new Date('2025-03-05T23:59:59Z'),
  },
]

// Mock data for detailed course information
export const mockCourses: Record<string, Course> = {
  '1': {
    id: '1',
    title: 'Desenvolvimento Web Frontend com React',
    description:
      'Curso completo de desenvolvimento web frontend utilizando React, TypeScript e modernas práticas de desenvolvimento. Aprenda a criar aplicações web responsivas e interativas.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-08-01'),
    enrollmentEndDate: new Date('2025-08-31'),
    workload: '40 horas',
    duration: 40,
    vacancies: 25,
    targetAudience:
      'Desenvolvedores iniciantes e intermediários, estudantes de tecnologia, profissionais que desejam migrar para desenvolvimento web.',
    prerequisites:
      'Conhecimento básico em HTML, CSS e JavaScript. Ensino médio completo.',
    hasCertificate: true,
    facilitator: 'João Silva',
    objectives:
      'Desenvolver habilidades em React, TypeScript e desenvolvimento web moderno. Capacitar para criação de aplicações web profissionais.',
    expectedResults:
      'Ao final do curso, os participantes estarão aptos a criar aplicações web completas usando React e TypeScript.',
    programContent:
      'Módulo 1: Introdução ao React\nMódulo 2: Componentes e Props\nMódulo 3: Estado e Ciclo de Vida\nMódulo 4: Hooks\nMódulo 5: Roteamento\nMódulo 6: Integração com APIs',
    methodology:
      'Aulas expositivas, exercícios práticos, projetos em grupo, estudos de caso.',
    resourcesUsed:
      'Computadores, projetor, ambiente de desenvolvimento online.',
    materialUsed: 'Slides, apostilas digitais, vídeos complementares.',
    teachingMaterial:
      'Documentação oficial do React, artigos técnicos, exercícios práticos.',
    locations: [
      {
        id: 'loc1',
        address: 'Rua das Flores, 123 - Centro',
        neighborhood: 'Centro',
        vacancies: 25,
        classStartDate: new Date('2025-09-01'),
        classEndDate: new Date('2025-10-30'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta, Sexta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'receiving_registrations',
    created_at: new Date('2025-07-30T10:00:00Z'),
    updated_at: new Date('2025-07-30T10:00:00Z'),
  },
  '2': {
    id: '2',
    title: 'Python para Ciência de Dados',
    description:
      'Curso avançado de Python focado em ciência de dados, machine learning e análise de dados. Aprenda pandas, numpy, matplotlib e scikit-learn.',
    organization: 'org2',
    provider: 'DataScience Academy',
    modalidade: 'Online',
    enrollmentStartDate: new Date('2025-02-15'),
    enrollmentEndDate: new Date('2025-03-15'),
    workload: '60 horas',
    duration: 60,
    vacancies: 15,
    targetAudience:
      'Profissionais de TI, analistas de dados, estudantes de estatística e áreas relacionadas.',
    prerequisites:
      'Conhecimento básico em programação e matemática. Ensino superior em andamento ou completo.',
    hasCertificate: true,
    facilitator: 'Maria Santos',
    objectives:
      'Dominar Python para análise de dados, visualização e machine learning básico.',
    expectedResults:
      'Capacidade de realizar análises de dados complexas e criar modelos de machine learning.',
    programContent:
      'Módulo 1: Python Básico\nMódulo 2: Pandas e Numpy\nMódulo 3: Visualização de Dados\nMódulo 4: Machine Learning Básico\nMódulo 5: Projeto Final',
    methodology:
      'Aulas online, exercícios práticos, projetos individuais e em grupo.',
    resourcesUsed: 'Plataforma online, Jupyter Notebooks, datasets reais.',
    materialUsed: 'Vídeo-aulas, documentação, exercícios interativos.',
    teachingMaterial:
      'Livros digitais, artigos científicos, datasets de exemplo.',
    locations: [
      {
        id: 'loc2',
        address: 'Plataforma Online',
        neighborhood: 'Online',
        vacancies: 15,
        classStartDate: new Date('2025-03-20'),
        classEndDate: new Date('2025-05-20'),
        classTime: '20:00 - 22:00',
        classDays: 'Terça, Quinta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'in_progress',
    created_at: new Date('2025-02-10T14:30:00Z'),
    updated_at: new Date('2025-02-10T14:30:00Z'),
  },
  '4': {
    id: '4',
    title: 'Mobile Development com React Native',
    description:
      'Desenvolva aplicativos móveis nativos usando React Native. Aprenda a criar apps para iOS e Android com uma única base de código.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Híbrido',
    enrollmentStartDate: new Date('2025-07-01'),
    enrollmentEndDate: new Date('2025-07-31'),
    workload: '50 horas',
    duration: 50,
    vacancies: 20,
    targetAudience:
      'Desenvolvedores web, estudantes de programação, profissionais interessados em mobile.',
    prerequisites:
      'Conhecimento em JavaScript e React. Experiência básica com desenvolvimento web.',
    hasCertificate: true,
    facilitator: 'Carlos Oliveira',
    objectives:
      'Criar aplicativos móveis funcionais usando React Native e publicar nas lojas.',
    expectedResults: 'Aplicativo completo publicado nas lojas de aplicativos.',
    programContent:
      'Módulo 1: Introdução ao React Native\nMódulo 2: Navegação e Componentes\nMódulo 3: APIs Nativas\nMódulo 4: Estado e Gerenciamento\nMódulo 5: Publicação',
    methodology: 'Aulas presenciais e online, desenvolvimento de projeto real.',
    resourcesUsed:
      'Computadores, smartphones para teste, ambiente de desenvolvimento.',
    materialUsed: 'Slides, código de exemplo, documentação oficial.',
    teachingMaterial: 'React Native docs, exemplos práticos, templates.',
    locations: [
      {
        id: 'loc4',
        address: 'Av. Paulista, 1000 - Bela Vista',
        neighborhood: 'Bela Vista',
        vacancies: 20,
        classStartDate: new Date('2025-08-15'),
        classEndDate: new Date('2025-10-15'),
        classTime: '19:00 - 21:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'draft',
    created_at: new Date('2025-06-20T16:45:00Z'),
    updated_at: new Date('2025-06-20T16:45:00Z'),
  },
  '3': {
    id: '3',
    title: 'DevOps e Kubernetes',
    description:
      'Aprenda DevOps moderno com foco em containers, Kubernetes e automação de infraestrutura. Domine as ferramentas essenciais para CI/CD.',
    organization: 'org3',
    provider: 'Cloud Masters',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-06-10'),
    enrollmentEndDate: new Date('2025-07-10'),
    workload: '80 horas',
    duration: 80,
    vacancies: 10,
    targetAudience:
      'DevOps engineers, sysadmins, desenvolvedores interessados em infraestrutura.',
    prerequisites:
      'Conhecimento básico em Linux, redes e programação. Experiência com sistemas operacionais.',
    hasCertificate: true,
    facilitator: 'Ana Costa',
    objectives:
      'Implementar práticas DevOps, gerenciar containers e orquestrar com Kubernetes.',
    expectedResults:
      'Capacidade de implementar pipelines CI/CD e gerenciar infraestrutura como código.',
    programContent:
      'Módulo 1: Introdução ao DevOps\nMódulo 2: Containers e Docker\nMódulo 3: Kubernetes Básico\nMódulo 4: CI/CD Pipelines\nMódulo 5: Monitoramento e Observabilidade',
    methodology:
      'Hands-on labs, projetos práticos, simulação de ambientes reais.',
    resourcesUsed:
      'Laboratório de computadores, ambiente cloud, ferramentas DevOps.',
    materialUsed:
      'Documentação técnica, scripts de exemplo, vídeos demonstrativos.',
    teachingMaterial: 'Kubernetes docs, Docker docs, artigos sobre DevOps.',
    locations: [
      {
        id: 'loc3',
        address: 'Rua da Tecnologia, 500 - Vila Madalena',
        neighborhood: 'Vila Madalena',
        vacancies: 10,
        classStartDate: new Date('2025-07-15'),
        classEndDate: new Date('2025-09-15'),
        classTime: '19:00 - 23:00',
        classDays: 'Terça, Quinta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'cancelled',
    created_at: new Date('2025-06-05T09:15:00Z'),
    updated_at: new Date('2025-06-05T09:15:00Z'),
  },
  '5': {
    id: '5',
    title: 'Machine Learning Fundamentals',
    description:
      'Fundamentos de Machine Learning com Python. Aprenda algoritmos, técnicas de validação e implementação de modelos preditivos.',
    organization: 'org4',
    provider: 'AI Institute',
    modalidade: 'Online',
    enrollmentStartDate: new Date('2025-08-01'),
    enrollmentEndDate: new Date('2025-08-31'),
    workload: '70 horas',
    duration: 70,
    vacancies: 12,
    targetAudience:
      'Cientistas de dados, analistas, profissionais de TI interessados em IA.',
    prerequisites:
      'Conhecimento em Python, estatística básica e álgebra linear. Ensino superior.',
    hasCertificate: true,
    facilitator: 'Dr. Roberto Lima',
    objectives:
      'Compreender fundamentos de ML e implementar modelos de machine learning.',
    expectedResults:
      'Capacidade de desenvolver e avaliar modelos de machine learning para problemas reais.',
    programContent:
      'Módulo 1: Introdução ao ML\nMódulo 2: Algoritmos Supervisionados\nMódulo 3: Algoritmos Não Supervisionados\nMódulo 4: Validação e Teste\nMódulo 5: Projeto Final',
    methodology: 'Aulas online, exercícios práticos, competições de ML.',
    resourcesUsed: 'Plataforma online, Jupyter notebooks, datasets públicos.',
    materialUsed: 'Vídeo-aulas, livros digitais, artigos científicos.',
    teachingMaterial: 'Scikit-learn docs, papers acadêmicos, datasets Kaggle.',
    locations: [
      {
        id: 'loc5',
        address: 'Plataforma Online',
        neighborhood: 'Online',
        vacancies: 12,
        classStartDate: new Date('2025-09-01'),
        classEndDate: new Date('2025-11-01'),
        classTime: '20:00 - 22:00',
        classDays: 'Segunda, Quarta, Sexta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'finished',
    created_at: new Date('2025-07-30T11:00:00Z'),
    updated_at: new Date('2025-07-30T11:00:00Z'),
  },
  '6': {
    id: '6',
    title: 'Advanced JavaScript and TypeScript',
    description:
      'JavaScript avançado e TypeScript para desenvolvedores experientes. Padrões avançados, performance e boas práticas.',
    organization: 'org5',
    provider: 'JavaScript Academy',
    modalidade: 'Híbrido',
    enrollmentStartDate: new Date('2025-01-15'),
    enrollmentEndDate: new Date('2025-02-15'),
    workload: '45 horas',
    duration: 45,
    vacancies: 30,
    targetAudience:
      'Desenvolvedores JavaScript intermediários e avançados, arquitetos de software.',
    prerequisites:
      'Conhecimento sólido em JavaScript, experiência com desenvolvimento web.',
    hasCertificate: true,
    facilitator: 'Pedro Santos',
    objectives:
      'Dominar JavaScript avançado e TypeScript para desenvolvimento de aplicações robustas.',
    expectedResults:
      'Capacidade de desenvolver aplicações JavaScript/TypeScript de alta qualidade.',
    programContent:
      'Módulo 1: JavaScript Avançado\nMódulo 2: TypeScript Fundamentos\nMódulo 3: Padrões de Design\nMódulo 4: Performance e Otimização\nMódulo 5: Frameworks Modernos',
    methodology: 'Code reviews, pair programming, projetos práticos.',
    resourcesUsed:
      'Computadores, ambiente de desenvolvimento, ferramentas de profiling.',
    materialUsed: 'Slides, código de exemplo, documentação técnica.',
    teachingMaterial:
      'ECMAScript docs, TypeScript docs, artigos sobre performance.',
    locations: [
      {
        id: 'loc6',
        address: 'Av. Brigadeiro Faria Lima, 2000 - Itaim Bibi',
        neighborhood: 'Itaim Bibi',
        vacancies: 30,
        classStartDate: new Date('2025-02-20'),
        classEndDate: new Date('2025-04-20'),
        classTime: '19:00 - 21:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'receiving_registrations',
    created_at: new Date('2025-01-12T08:30:00Z'),
    updated_at: new Date('2025-01-12T08:30:00Z'),
  },
  '7': {
    id: '7',
    title: 'Cybersecurity Essentials',
    description:
      'Fundamentos de segurança da informação, criptografia, análise de vulnerabilidades e boas práticas de segurança.',
    organization: 'org6',
    provider: 'SecureLearn',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-01-20'),
    enrollmentEndDate: new Date('2025-02-20'),
    workload: '35 horas',
    duration: 35,
    vacancies: 18,
    targetAudience:
      'Profissionais de TI, administradores de sistemas, auditores de segurança.',
    prerequisites:
      'Conhecimento básico em redes e sistemas operacionais. Interesse em segurança.',
    hasCertificate: true,
    facilitator: 'Mariana Silva',
    objectives:
      'Compreender fundamentos de segurança e implementar medidas de proteção.',
    expectedResults:
      'Capacidade de identificar vulnerabilidades e implementar controles de segurança.',
    programContent:
      'Módulo 1: Fundamentos de Segurança\nMódulo 2: Criptografia\nMódulo 3: Análise de Vulnerabilidades\nMódulo 4: Incident Response\nMódulo 5: Compliance e Auditoria',
    methodology:
      'Simulações de ataques, análise de casos reais, laboratórios práticos.',
    resourcesUsed:
      'Laboratório de segurança, ferramentas de análise, ambiente isolado.',
    materialUsed: 'Slides, casos de estudo, ferramentas de segurança.',
    teachingMaterial: 'OWASP docs, NIST guidelines, artigos sobre segurança.',
    locations: [
      {
        id: 'loc7',
        address: 'Rua Augusta, 1500 - Consolação',
        neighborhood: 'Consolação',
        vacancies: 18,
        classStartDate: new Date('2025-02-25'),
        classEndDate: new Date('2025-04-25'),
        classTime: '19:00 - 22:00',
        classDays: 'Terça, Quinta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'in_progress',
    created_at: new Date('2025-01-18T13:20:00Z'),
    updated_at: new Date('2025-01-18T13:20:00Z'),
  },
  '8': {
    id: '8',
    title: 'UX/UI Design Masterclass',
    description:
      'Design de experiência do usuário e interface. Metodologias de design thinking, prototipagem e validação de produtos.',
    organization: 'org7',
    provider: 'Design Hub',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-01-10'),
    enrollmentEndDate: new Date('2025-02-10'),
    workload: '55 horas',
    duration: 55,
    vacancies: 22,
    targetAudience:
      'Designers, product managers, desenvolvedores interessados em UX/UI.',
    prerequisites:
      'Conhecimento básico em design ou desenvolvimento. Interesse em experiência do usuário.',
    hasCertificate: true,
    facilitator: 'Camila Rodrigues',
    objectives:
      'Criar interfaces intuitivas e experiências de usuário excepcionais.',
    expectedResults:
      'Portfolio com projetos de UX/UI e capacidade de conduzir pesquisas de usuário.',
    programContent:
      'Módulo 1: Design Thinking\nMódulo 2: Pesquisa de Usuário\nMódulo 3: Wireframing e Prototipagem\nMódulo 4: Design de Interface\nMódulo 5: Validação e Testes',
    methodology: 'Projetos práticos, workshops, análise de casos reais.',
    resourcesUsed:
      'Computadores Mac, ferramentas de design, laboratório de usabilidade.',
    materialUsed: 'Slides, templates, ferramentas de prototipagem.',
    teachingMaterial:
      'Material de design, estudos de caso, ferramentas Figma/Sketch.',
    locations: [
      {
        id: 'loc8',
        address: 'Rua Oscar Freire, 800 - Jardins',
        neighborhood: 'Jardins',
        vacancies: 22,
        classStartDate: new Date('2025-02-15'),
        classEndDate: new Date('2025-04-15'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta, Sexta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'finished',
    created_at: new Date('2025-01-08T15:10:00Z'),
    updated_at: new Date('2025-01-08T15:10:00Z'),
  },
  '9': {
    id: '9',
    title: 'Desenvolvimento Web Backend com Node.js',
    description:
      'Desenvolvimento de APIs e aplicações backend usando Node.js, Express e banco de dados. Arquitetura de microsserviços.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-01-20'),
    enrollmentEndDate: new Date('2025-02-20'),
    workload: '40 horas',
    duration: 40,
    vacancies: 25,
    targetAudience:
      'Desenvolvedores frontend, estudantes de programação, profissionais de TI.',
    prerequisites:
      'Conhecimento básico em JavaScript e desenvolvimento web. Lógica de programação.',
    hasCertificate: true,
    facilitator: 'Lucas Mendes',
    objectives:
      'Desenvolver APIs RESTful e aplicações backend escaláveis com Node.js.',
    expectedResults:
      'Capacidade de criar e manter aplicações backend completas e APIs.',
    programContent:
      'Módulo 1: Node.js Fundamentos\nMódulo 2: Express.js\nMódulo 3: Banco de Dados\nMódulo 4: Autenticação e Autorização\nMódulo 5: Deploy e DevOps',
    methodology:
      'Desenvolvimento de projeto real, code reviews, pair programming.',
    resourcesUsed: 'Computadores, ambiente de desenvolvimento, banco de dados.',
    materialUsed: 'Slides, código de exemplo, documentação técnica.',
    teachingMaterial: 'Node.js docs, Express docs, artigos sobre backend.',
    locations: [
      {
        id: 'loc9',
        address: 'Rua das Flores, 123 - Centro',
        neighborhood: 'Centro',
        vacancies: 25,
        classStartDate: new Date('2025-02-25'),
        classEndDate: new Date('2025-04-25'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'draft',
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  },
  '10': {
    id: '10',
    title: 'Desenvolvimento Web Backend com Node.js',
    description:
      'Desenvolvimento de APIs e aplicações backend usando Node.js, Express e banco de dados. Arquitetura de microsserviços.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-01-20'),
    enrollmentEndDate: new Date('2025-02-20'),
    workload: '40 horas',
    duration: 40,
    vacancies: 25,
    targetAudience:
      'Desenvolvedores frontend, estudantes de programação, profissionais de TI.',
    prerequisites:
      'Conhecimento básico em JavaScript e desenvolvimento web. Lógica de programação.',
    hasCertificate: true,
    facilitator: 'Lucas Mendes',
    objectives:
      'Desenvolver APIs RESTful e aplicações backend escaláveis com Node.js.',
    expectedResults:
      'Capacidade de criar e manter aplicações backend completas e APIs.',
    programContent:
      'Módulo 1: Node.js Fundamentos\nMódulo 2: Express.js\nMódulo 3: Banco de Dados\nMódulo 4: Autenticação e Autorização\nMódulo 5: Deploy e DevOps',
    methodology:
      'Desenvolvimento de projeto real, code reviews, pair programming.',
    resourcesUsed: 'Computadores, ambiente de desenvolvimento, banco de dados.',
    materialUsed: 'Slides, código de exemplo, documentação técnica.',
    teachingMaterial: 'Node.js docs, Express docs, artigos sobre backend.',
    locations: [
      {
        id: 'loc10',
        address: 'Rua das Flores, 123 - Centro',
        neighborhood: 'Centro',
        vacancies: 25,
        classStartDate: new Date('2025-02-25'),
        classEndDate: new Date('2025-04-25'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'scheduled',
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  },
  '11': {
    id: '11',
    title: 'Desenvolvimento Web Backend com Node.js',
    description:
      'Desenvolvimento de APIs e aplicações backend usando Node.js, Express e banco de dados. Arquitetura de microsserviços.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2025-01-20'),
    enrollmentEndDate: new Date('2025-02-20'),
    workload: '40 horas',
    duration: 40,
    vacancies: 25,
    targetAudience:
      'Desenvolvedores frontend, estudantes de programação, profissionais de TI.',
    prerequisites:
      'Conhecimento básico em JavaScript e desenvolvimento web. Lógica de programação.',
    hasCertificate: true,
    facilitator: 'Lucas Mendes',
    objectives:
      'Desenvolver APIs RESTful e aplicações backend escaláveis com Node.js.',
    expectedResults:
      'Capacidade de criar e manter aplicações backend completas e APIs.',
    programContent:
      'Módulo 1: Node.js Fundamentos\nMódulo 2: Express.js\nMódulo 3: Banco de Dados\nMódulo 4: Autenticação e Autorização\nMódulo 5: Deploy e DevOps',
    methodology:
      'Desenvolvimento de projeto real, code reviews, pair programming.',
    resourcesUsed: 'Computadores, ambiente de desenvolvimento, banco de dados.',
    materialUsed: 'Slides, código de exemplo, documentação técnica.',
    teachingMaterial: 'Node.js docs, Express docs, artigos sobre backend.',
    locations: [
      {
        id: 'loc11',
        address: 'Rua das Flores, 123 - Centro',
        neighborhood: 'Centro',
        vacancies: 25,
        classStartDate: new Date('2025-02-25'),
        classEndDate: new Date('2025-04-25'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'in_progress',
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  },
  '12': {
    id: '12',
    title: 'Desenvolvimento Web Backend com Node.js',
    description:
      'Desenvolvimento de APIs e aplicações backend usando Node.js, Express e banco de dados. Arquitetura de microsserviços.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2024-01-20'),
    enrollmentEndDate: new Date('2024-02-20'),
    workload: '40 horas',
    duration: 40,
    vacancies: 25,
    targetAudience:
      'Desenvolvedores frontend, estudantes de programação, profissionais de TI.',
    prerequisites:
      'Conhecimento básico em JavaScript e desenvolvimento web. Lógica de programação.',
    hasCertificate: true,
    facilitator: 'Lucas Mendes',
    objectives:
      'Desenvolver APIs RESTful e aplicações backend escaláveis com Node.js.',
    expectedResults:
      'Capacidade de criar e manter aplicações backend completas e APIs.',
    programContent:
      'Módulo 1: Node.js Fundamentos\nMódulo 2: Express.js\nMódulo 3: Banco de Dados\nMódulo 4: Autenticação e Autorização\nMódulo 5: Deploy e DevOps',
    methodology:
      'Desenvolvimento de projeto real, code reviews, pair programming.',
    resourcesUsed: 'Computadores, ambiente de desenvolvimento, banco de dados.',
    materialUsed: 'Slides, código de exemplo, documentação técnica.',
    teachingMaterial: 'Node.js docs, Express docs, artigos sobre backend.',
    locations: [
      {
        id: 'loc12',
        address: 'Rua das Flores, 123 - Centro',
        neighborhood: 'Centro',
        vacancies: 25,
        classStartDate: new Date('2024-02-25'),
        classEndDate: new Date('2024-04-25'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'finished',
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
  },
  '13': {
    id: '13',
    title: 'Desenvolvimento Web Backend com Node.js',
    description:
      'Desenvolvimento de APIs e aplicações backend usando Node.js, Express e banco de dados. Arquitetura de microsserviços.',
    organization: 'org1',
    provider: 'TechEducation',
    modalidade: 'Presencial',
    enrollmentStartDate: new Date('2024-01-20'),
    enrollmentEndDate: new Date('2024-02-20'),
    workload: '40 horas',
    duration: 40,
    vacancies: 25,
    targetAudience:
      'Desenvolvedores frontend, estudantes de programação, profissionais de TI.',
    prerequisites:
      'Conhecimento básico em JavaScript e desenvolvimento web. Lógica de programação.',
    hasCertificate: true,
    facilitator: 'Lucas Mendes',
    objectives:
      'Desenvolver APIs RESTful e aplicações backend escaláveis com Node.js.',
    expectedResults:
      'Capacidade de criar e manter aplicações backend completas e APIs.',
    programContent:
      'Módulo 1: Node.js Fundamentos\nMódulo 2: Express.js\nMódulo 3: Banco de Dados\nMódulo 4: Autenticação e Autorização\nMódulo 5: Deploy e DevOps',
    methodology:
      'Desenvolvimento de projeto real, code reviews, pair programming.',
    resourcesUsed: 'Computadores, ambiente de desenvolvimento, banco de dados.',
    materialUsed: 'Slides, código de exemplo, documentação técnica.',
    teachingMaterial: 'Node.js docs, Express docs, artigos sobre backend.',
    locations: [
      {
        id: 'loc13',
        address: 'Rua das Flores, 123 - Centro',
        neighborhood: 'Centro',
        vacancies: 25,
        classStartDate: new Date('2024-02-25'),
        classEndDate: new Date('2024-04-25'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'cancelled',
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
  },
  '14': {
    id: '14',
    title: 'Inteligência Artificial Avançada',
    description:
      'Curso avançado de IA cobrindo deep learning, redes neurais, processamento de linguagem natural e visão computacional.',
    organization: 'org8',
    provider: 'AI Masters',
    modalidade: 'Híbrido',
    enrollmentStartDate: new Date('2025-02-01'),
    enrollmentEndDate: new Date('2025-03-01'),
    workload: '90 horas',
    duration: 90,
    vacancies: 15,
    targetAudience:
      'Cientistas de dados experientes, pesquisadores, profissionais de IA.',
    prerequisites:
      'Conhecimento avançado em Python, matemática, machine learning. Mestrado ou experiência equivalente.',
    hasCertificate: true,
    facilitator: 'Dr. Fernando Almeida',
    objectives:
      'Dominar técnicas avançadas de IA e implementar soluções complexas de deep learning.',
    expectedResults:
      'Capacidade de desenvolver e implementar sistemas de IA avançados.',
    programContent:
      'Módulo 1: Deep Learning Avançado\nMódulo 2: Redes Neurais Convolucionais\nMódulo 3: Processamento de Linguagem Natural\nMódulo 4: Visão Computacional\nMódulo 5: Projeto de Pesquisa',
    methodology:
      'Aulas teóricas e práticas, pesquisa aplicada, projetos inovadores.',
    resourcesUsed: 'GPUs, laboratório de IA, datasets especializados.',
    materialUsed: 'Papers acadêmicos, código de exemplo, datasets de pesquisa.',
    teachingMaterial:
      'Artigos científicos, frameworks de deep learning, datasets.',
    locations: [
      {
        id: 'loc14',
        address: 'Av. Rebouças, 1000 - Pinheiros',
        neighborhood: 'Pinheiros',
        vacancies: 15,
        classStartDate: new Date('2025-03-10'),
        classEndDate: new Date('2025-06-10'),
        classTime: '19:00 - 22:00',
        classDays: 'Segunda, Quarta, Sexta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'scheduled',
    created_at: new Date('2025-01-25T14:30:00Z'),
    updated_at: new Date('2025-01-25T14:30:00Z'),
  },
  '15': {
    id: '15',
    title: 'Blockchain e Criptomoedas',
    description:
      'Fundamentos de blockchain, smart contracts, criptomoedas e aplicações descentralizadas (DeFi). Tecnologias emergentes.',
    organization: 'org9',
    provider: 'Crypto Academy',
    modalidade: 'Online',
    enrollmentStartDate: new Date('2025-02-05'),
    enrollmentEndDate: new Date('2025-03-05'),
    workload: '55 horas',
    duration: 55,
    vacancies: 20,
    targetAudience:
      'Desenvolvedores, investidores, profissionais interessados em blockchain.',
    prerequisites:
      'Conhecimento básico em programação e criptografia. Interesse em tecnologias emergentes.',
    hasCertificate: true,
    facilitator: 'Ricardo Santos',
    objectives:
      'Compreender blockchain e desenvolver aplicações descentralizadas.',
    expectedResults:
      'Capacidade de criar smart contracts e entender ecossistema DeFi.',
    programContent:
      'Módulo 1: Fundamentos de Blockchain\nMódulo 2: Criptomoedas\nMódulo 3: Smart Contracts\nMódulo 4: DeFi e DApps\nMódulo 5: Regulamentação e Futuro',
    methodology:
      'Aulas online, desenvolvimento de smart contracts, análise de projetos.',
    resourcesUsed: 'Plataforma online, ambiente de desenvolvimento blockchain.',
    materialUsed:
      'Vídeo-aulas, documentação técnica, ferramentas de desenvolvimento.',
    teachingMaterial: 'Ethereum docs, Bitcoin whitepaper, artigos sobre DeFi.',
    locations: [
      {
        id: 'loc15',
        address: 'Plataforma Online',
        neighborhood: 'Online',
        vacancies: 20,
        classStartDate: new Date('2025-03-10'),
        classEndDate: new Date('2025-05-10'),
        classTime: '20:00 - 22:00',
        classDays: 'Terça, Quinta',
      },
    ],
    institutionalLogo: null,
    coverImage: null,
    customFields: [],
    status: 'scheduled',
    created_at: new Date('2025-01-28T09:15:00Z'),
    updated_at: new Date('2025-01-28T09:15:00Z'),
  },
}

// Helper function to get course by ID
export function getCourseById(id: string): Course | null {
  return mockCourses[id] || null
}

// Helper function to get course list filtered by status
export function getCourseListByStatus(status?: string): CourseListItem[] {
  if (!status) return mockCourseList
  return mockCourseList.filter(course => course.status === status)
}
