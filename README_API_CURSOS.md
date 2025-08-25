# 🎓 API de Cursos - Documentação Completa para Desenvolvedor Backend

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Endpoints](#endpoints)
- [Estrutura de Dados](#estrutura-de-dados)
- [Exemplos](#exemplos)

---

## 🎯 Visão Geral

Esta API permite o gerenciamento completo de cursos no sistema, incluindo criação, edição, consulta, rascunhos e gerenciamento de inscrições. Os cursos podem ser de três modalidades: **Presencial**, **Semipresencial** ou **Remoto**, cada uma com estruturas de dados específicas.

### 🔑 Características Principais

- **Criação de cursos** com validações robustas
- **Sistema de rascunhos** para salvar progresso
- **Edição flexível** de cursos existentes
- **Listagem e filtros** para gerenciamento
- **Suporte a campos customizados** para inscrições
- **Gerenciamento de inscrições** com aprovação em lote
- **Validações de negócio** para datas e modalidades
- **Sistema de status** (rascunho, aberto, fechado, cancelado)

---

## 🚀 Endpoints

### 📚 **Gestão de Cursos**

#### 1. **POST** `/api/courses` - Criar Curso

**Descrição**: Cria um novo curso no sistema (status: "opened")

**Headers**:

```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body**: [Ver estrutura completa](#estrutura-de-dados)

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "id": "uuid-do-curso",
    "title": "Título do Curso",
    "status": "opened",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "message": "Curso criado com sucesso"
}
```

---

#### 2. **POST** `/api/courses/draft` - Criar Curso-Rascunho

**Descrição**: Cria um curso e salva como rascunho (status: "draft")

**Headers**:

```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body**: [Ver estrutura completa](#estrutura-de-dados)

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "id": "uuid-do-curso",
    "title": "Título do Curso",
    "status": "draft",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "message": "Rascunho salvo com sucesso"
}
```

---

#### 3. **PUT** `/api/courses/{courseId}` - Editar Curso

**Descrição**: Atualiza um curso existente

**Parâmetros**:
- `courseId`: UUID do curso

**Headers**: Mesmo do endpoint de criação

**Body**: Mesmo formato da criação (campos opcionais)

**Resposta**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-do-curso",
    "title": "Título Atualizado",
    "status": "opened",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Curso atualizado com sucesso"
}
```

**💡 Nota**: Este endpoint também é usado para **publicar rascunhos**, alterando o status de `"draft"` para `"opened"`. Para publicar um rascunho, envie o mesmo curso com `"status": "opened"`.

---

#### 4. **GET** `/api/courses` - Listar Cursos Criados

**Descrição**: Retorna lista paginada de cursos criados (status: "opened", "closed", "canceled")

**Headers**:

```
Authorization: Bearer {token}
```

**Query Parameters**:

```
?page=1&limit=10&status=opened&modalidade=Presencial&organization=org1&search=react
```

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "uuid-do-curso",
        "title": "Título do Curso",
        "description": "Descrição resumida...",
        "modalidade": "Presencial",
        "status": "opened",
        "organization": "org1",
        "enrollmentStartDate": "2024-01-15",
        "enrollmentEndDate": "2024-02-15",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

#### 5. **GET** `/api/courses/drafts` - Listar Cursos-Rascunho

**Descrição**: Retorna lista paginada de cursos salvos como rascunho (status: "draft")

**Headers**:

```
Authorization: Bearer {token}
```

**Query Parameters**:

```
?page=1&limit=10&organization=org1&search=react
```

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "id": "uuid-do-rascunho",
        "title": "Título do Rascunho",
        "description": "Descrição resumida...",
        "modalidade": "Remoto",
        "status": "draft",
        "organization": "org1",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

#### 6. **GET** `/api/courses/{courseId}` - Buscar Curso Específico

**Descrição**: Retorna dados completos de um curso específico

**Parâmetros**:

- `courseId`: UUID do curso

**Headers**:

```
Authorization: Bearer {token}
```

**Resposta**: [Ver estrutura completa](#estrutura-de-dados)

---

### 👥 **Gestão de Inscrições**

#### 7. **GET** `/api/courses/{courseId}/enrollments` - Listar Inscritos

**Descrição**: Retorna lista de candidatos inscritos em um curso específico

**Parâmetros**:

- `courseId`: UUID do curso

**Headers**:

```
Authorization: Bearer {token}
```

**Query Parameters**:

```
?page=1&limit=20&status=pending&search=12345678900
```

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": "uuid-da-inscricao",
        "cpf": "12345678900",
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "(11) 99999-9999",
        "status": "pending",
        "enrolledAt": "2024-01-15T10:00:00Z",
        "customFields": {
          "experiencia": "5 anos",
          "formacao": "Graduação em TI"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    },
    "summary": {
      "total": 150,
      "pending": 45,
      "approved": 80,
      "rejected": 15,
      "cancelled": 10
    }
  }
}
```

---

#### 8. **PUT** `/api/courses/{courseId}/enrollments/status` - Atualizar Status de Inscrições

**Descrição**: Atualiza o status de múltiplas inscrições de uma vez (aprovação em lote)

**Parâmetros**:

- `courseId`: UUID do curso

**Headers**:

```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body**:

```json
{
  "enrollmentIds": ["uuid-1", "uuid-2", "uuid-3"],
  "status": "approved",
  "reason": "Candidatos aprovados após análise curricular",
  "adminNotes": "Todos os candidatos atendem aos pré-requisitos"
}
```

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "updatedCount": 3,
    "status": "approved",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Status de 3 inscrições atualizado para 'approved'"
}
```

---

#### 9. **PUT** `/api/courses/{courseId}/enrollments/{enrollmentId}/status` - Atualizar Status Individual

**Descrição**: Atualiza o status de uma inscrição específica

**Parâmetros**:

- `courseId`: UUID do curso
- `enrollmentId`: UUID da inscrição

**Headers**:

```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body**:

```json
{
  "status": "rejected",
  "reason": "Não atende aos pré-requisitos mínimos",
  "adminNotes": "Candidato não possui experiência necessária"
}
```

**Resposta de Sucesso**:

```json
{
  "success": true,
  "data": {
    "enrollmentId": "uuid-da-inscricao",
    "status": "rejected",
    "reason": "Não atende aos pré-requisitos mínimos",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Status da inscrição atualizado para 'rejected'"
}
```

---

## 📊 Estrutura de Dados

### 🏗️ Campos Base (Sempre Obrigatórios)

```typescript
interface CourseBase {
  title: string;           // 5-100 caracteres
  description: string;     // 20-500 caracteres
  enrollmentStartDate: string;  // ISO 8601
  enrollmentEndDate: string;    // ISO 8601
  organization: string;    // Mínimo 1 caractere
  modalidade: 'Presencial' | 'Semipresencial' | 'Remoto';
  theme: string;           // 3-100 caracteres
  workload: string;        // 3-50 caracteres
  targetAudience: string;  // 10-200 caracteres
  institutionalLogo: string;  // URL válida
  coverImage: string;      // URL válida
  status: 'draft' | 'opened' | 'closed' | 'canceled';
}
```

### 🏠 Cursos Presenciais/Semipresenciais

```typescript
interface LocationClass {
  address: string;         // Mínimo 10 caracteres
  neighborhood: string;    // Mínimo 3 caracteres
  vacancies: number;       // 1-1000
  classStartDate: string;  // ISO 8601
  classEndDate: string;    // ISO 8601
  classTime: string;       // "HH:MM" ou "HH:MM - HH:MM"
  classDays: string;       // "Segunda, Quarta, Sexta"
}

interface PresentialCourse extends CourseBase {
  modalidade: 'Presencial' | 'Semipresencial';
  locations: LocationClass[];  // Mínimo 1 localização
}
```

### 🌐 Cursos Remotos

```typescript
interface RemoteClass {
  vacancies: number;       // 1-1000
  classStartDate: string;  // ISO 8601
  classEndDate: string;    // ISO 8601
  classTime: string;       // "HH:MM" ou "HH:MM - HH:MM"
  classDays: string;       // "Segunda, Quarta, Sexta"
}

interface RemoteCourse extends CourseBase {
  modalidade: 'Remoto';
  remoteClass: RemoteClass;
}
```

### 🔧 Campos Opcionais

```typescript
interface OptionalFields {
  prerequisites?: string;
  hasCertificate?: boolean;     // Default: false
  facilitator?: string;
  objectives?: string;
  expectedResults?: string;
  programContent?: string;
  methodology?: string;
  resourcesUsed?: string;
  materialUsed?: string;
  teachingMaterial?: string;
  customFields?: CustomField[];
}

interface CustomField {
  id: string;        // UUID
  title: string;     // Título do campo
  required: boolean; // Se é obrigatório na inscrição
}
```

### 📝 Estrutura de Inscrição

```typescript
interface Enrollment {
  id: string;                    // UUID da inscrição
  courseId: string;              // UUID do curso
  cpf: string;                   // CPF do candidato
  name: string;                   // Nome completo
  email: string;                  // Email
  phone: string;                  // Telefone
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  enrolledAt: string;            // Data da inscrição (ISO 8601)
  customFields: Record<string, string>;  // Campos customizados preenchidos
  adminNotes?: string;           // Notas do administrador
  reason?: string;               // Motivo da aprovação/rejeição
  updatedAt: string;             // Última atualização (ISO 8601)
}
```

---

## 💡 Exemplos Práticos

### 📚 Exemplo 1: Curso Remoto

```json
{
  "title": "React para Iniciantes",
  "description": "Aprenda React do zero com projetos práticos",
  "enrollmentStartDate": "2024-01-15",
  "enrollmentEndDate": "2024-02-15",
  "organization": "org1",
  "modalidade": "Remoto",
  "theme": "Tecnologia",
  "workload": "40 horas",
  "targetAudience": "Desenvolvedores iniciantes interessados em React",
  "institutionalLogo": "https://exemplo.com/logo.png",
  "coverImage": "https://exemplo.com/capa.jpg",
  "status": "draft",
  "hasCertificate": true,
  "facilitator": "João Silva",
  "remoteClass": {
    "vacancies": 50,
    "classStartDate": "2024-02-20",
    "classEndDate": "2024-04-20",
    "classTime": "19:00 - 22:00",
    "classDays": "Segunda, Quarta, Sexta"
  }
}
```

### 🏢 Exemplo 2: Curso Presencial

```json
{
  "title": "Gestão de Projetos Ágeis",
  "description": "Metodologias ágeis na prática",
  "enrollmentStartDate": "2024-01-10",
  "enrollmentEndDate": "2024-02-10",
  "organization": "org2",
  "modalidade": "Presencial",
  "theme": "Gestão",
  "workload": "60 horas",
  "targetAudience": "Gerentes de projeto e líderes de equipe",
  "institutionalLogo": "https://exemplo.com/logo2.png",
  "coverImage": "https://exemplo.com/capa2.jpg",
  "status": "opened",
  "hasCertificate": true,
  "customFields": [
    {
      "id": "field-1",
      "title": "Experiência em gestão",
      "required": true
    }
  ],
  "locations": [
    {
      "address": "Av. Paulista, 1000 - Bela Vista",
      "neighborhood": "Bela Vista",
      "vacancies": 25,
      "classStartDate": "2024-02-15",
      "classEndDate": "2024-05-15",
      "classTime": "14:00 - 18:00",
      "classDays": "Terça, Quinta"
    }
  ]
}
```

### 📝 Exemplo 3: Publicar Rascunho

**Endpoint**: `PUT /api/courses/{courseId}`

**Descrição**: Para publicar um curso que está como rascunho, atualize o status de `"draft"` para `"opened"`

**Body**:
```json
{
  "status": "opened"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-do-curso",
    "title": "React para Iniciantes",
    "status": "opened",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Curso publicado com sucesso"
}
```

**💡 Nota**: Ao publicar um rascunho, todos os outros campos permanecem inalterados. Apenas o status é atualizado de `"draft"` para `"opened"`.
