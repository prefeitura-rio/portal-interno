# Guia de Migração: Compatibilidade API de Serviços

## Resumo das Mudanças

Este documento descreve as alterações realizadas para criar compatibilidade entre o modelo de dados mockado do frontend e o modelo real da API (`GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService`).

## Principais Alterações

### 1. Atualização dos Tipos (`src/types/service.ts`)

**Novas interfaces adicionadas:**
- `ApiService`: Interface que corresponde exatamente ao `GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService`
- Funções de conversão `convertApiToFrontend` e `convertFrontendToApi`

**Lógica de Status Atualizada:**
- A API utiliza `status: number` (0=Draft, 1=Published) + `awaiting_approval: boolean`
- O frontend mantém `status: ServiceStatus` ('published' | 'awaiting_approval' | 'in_edition')
- **Mapeamento:**
  - `status: 1` → `'published'`
  - `status: 0` + `awaiting_approval: true` → `'awaiting_approval'`
  - `status: 0` + `awaiting_approval: false` → `'in_edition'`

### 2. Dados Mock Atualizados (`src/lib/mock-services.ts`)

**Estrutura anterior (Frontend):**
```typescript
interface Service {
  managingOrgan: string
  targetAudience: string
  requiredDocuments?: string
  // ...
}
```

**Nova estrutura (API):**
```typescript
interface GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService {
  orgao_gestor: string[]
  publico_especifico?: string[]
  documentos_necessarios?: string[]
  // ...
}
```

**Principais diferenças no mapeamento:**
- `managingOrgan` ↔ `orgao_gestor[0]` (primeiro elemento do array)
- `targetAudience` ↔ `publico_especifico[0]` (primeiro elemento do array)
- `requiredDocuments` ↔ `documentos_necessarios.join(', ')` (array → string)
- Timestamps convertidos entre `Date` e `number` (Unix timestamp)

### 3. Adapter de API (`src/lib/api-service-adapter.ts`)

**Novo arquivo criado com:**
- `API_CONFIG`: Configuração para alternar entre mock e API real
- `fetchServiceById()`: Buscar serviço por ID
- `fetchServices()`: Buscar lista de serviços com filtros
- `createService()`: Criar novo serviço
- `updateService()`: Atualizar serviço existente
- `deleteService()`: Deletar serviço

### 4. Hook Atualizado (`src/hooks/use-service.ts`)

**Alteração:**
- Agora utiliza o `api-service-adapter` ao invés de mock direto
- Preparado para transição automática quando API real estiver pronta

## Como Fazer a Transição para API Real

### Passo 1: Configurar API
No arquivo `src/lib/api-service-adapter.ts`, altere:
```typescript
export const API_CONFIG = {
  USE_MOCK_DATA: false, // Alterar para false
  BASE_URL: 'https://sua-api.com/api/services', // URL real da API
  // ...
}
```

### Passo 2: Verificar Endpoints
Certifique-se de que os endpoints da API real correspondem aos definidos em `API_CONFIG.ENDPOINTS`.

### Passo 3: Testar Conversões
As funções `convertApiToFrontend` e `convertFrontendToApi` em `src/types/service.ts` devem funcionar automaticamente, mas teste com dados reais da API.

## Estrutura de Campos

### Mapeamento Completo

| Frontend (Service) | API (GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService) | Conversão |
|-------------------|---------------------------|-----------|
| `id` | `id` | Direto |
| `managingOrgan` | `orgao_gestor[0]` | Primeiro elemento do array |
| `serviceCategory` | `tema_geral` | Direto |
| `targetAudience` | `publico_especifico[0]` | Primeiro elemento do array |
| `title` | `nome_servico` | Direto |
| `shortDescription` | `resumo` | Direto |
| `whatServiceDoesNotCover` | `servico_nao_cobre` | Direto |
| `serviceTime` | `tempo_atendimento` | Direto |
| `serviceCost` | `custo_servico` | Direto |
| `isFree` | `is_free` | Direto |
| `requestResult` | `resultado_solicitacao` | Direto |
| `fullDescription` | `descricao_completa` | Direto |
| `requiredDocuments` | `documentos_necessarios` | Array ↔ String (join/split) |
| `instructionsForRequester` | `instrucoes_solicitante` | Direto |
| `digitalChannels` | `canais_digitais` | Direto |
| `physicalChannels` | `canais_presenciais` | Direto |
| `status` | `status` + `awaiting_approval` | Lógica especial (ver acima) |
| `published_at` | `published_at` | Date ↔ Unix timestamp |
| `last_update` | `last_update` | Date ↔ Unix timestamp |
| `created_at` | `created_at` | Date ↔ Unix timestamp |

### Campos Exclusivos da API

Campos presentes apenas no `GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService` que não são usados no frontend:
- `autor`: string
- `embedding`: number[]
- `extra_fields`: GetApiV1AdminServicesIdVersions400
- `fixar_destaque`: boolean
- `legislacao_relacionada`: string[]
- `search_content`: string

## Exemplos de Uso

### Conversão API → Frontend
```typescript
import { convertApiToFrontend } from '@/types/service'

const apiResponse: GithubComPrefeituraRioAppBuscaSearchInternalModelsPrefRioService = {
  id: '1',
  nome_servico: 'Solicitação de Alvará',
  orgao_gestor: ['smcc'],
  status: 1,
  awaiting_approval: false,
  // ...
}

const frontendService = convertApiToFrontend(apiResponse)
// frontendService.status === 'published'
// frontendService.managingOrgan === 'smcc'
```

### Conversão Frontend → API
```typescript
import { convertFrontendToApi } from '@/types/service'

const frontendService: Service = {
  id: '1',
  title: 'Solicitação de Alvará',
  managingOrgan: 'smcc',
  status: 'awaiting_approval',
  // ...
}

const apiPayload = convertFrontendToApi(frontendService)
// apiPayload.status === 0
// apiPayload.awaiting_approval === true
// apiPayload.orgao_gestor === ['smcc']
```

## Testes Recomendados

1. **Teste de Conversão**: Verificar se todas as conversões funcionam corretamente
2. **Teste de Status**: Verificar os 3 cenários de status
3. **Teste de Arrays**: Verificar conversão de arrays (documentos, órgãos, público)
4. **Teste de Timestamps**: Verificar conversão de datas
5. **Teste de Campos Opcionais**: Verificar comportamento com campos undefined/null

## Próximos Passos

1. **Integrar API Real**: Alterar `USE_MOCK_DATA` para `false`
2. **Implementar Autenticação**: Adicionar headers de autenticação nos requests
3. **Tratamento de Erros**: Melhorar tratamento de erros específicos da API
4. **Cache**: Implementar cache de dados se necessário
5. **Validação**: Adicionar validação de schema para garantir compatibilidade
