# Diagnóstico: Problema de Acesso Bloqueado no Desktop

## Problema Relatado
Alguns usuários conseguem acessar a aplicação pelo celular, mas são bloqueados (redirecionados para `/unauthorized`) quando tentam acessar pelo computador.

## Possíveis Causas Identificadas

### 1. **Falha na Chamada ao Heimdall API (MAIS PROVÁVEL)**

A chamada para buscar as roles do usuário pode estar fallhando silenciosamente no computador devido a:

- **Firewall/Antivírus corporativo** bloqueando conexões HTTPS ao Heimdall
- **Proxy corporativo** interferindo nas requisições
- **Certificados SSL/TLS** inválidos ou bloqueados pelo antivírus
- **Timeout de rede** - conexão Wi-Fi corporativa mais lenta que 4G/5G
- **DNS corporativo** com problemas de resolução

### 2. **Comportamento Atual do Código**

Quando `getUserRolesInMiddleware()` retorna `null` (por qualquer erro):
```typescript
const userRoles = await getUserRolesInMiddleware(authToken.value)
// Se houver erro, userRoles = null

const hasAccess = hasRouteAccess(path, userRoles)
// hasRouteAccess retorna false quando userRoles é null

if (!hasAccess) {
  // Usuário é redirecionado para /unauthorized
  return await handleUnauthorizedUser(...)
}
```

**Isso significa que qualquer falha de rede/API bloqueia o acesso!**

## Alterações Implementadas para Debug

### 1. Logging Detalhado em `middleware-helpers.ts`

Adicionado logging completo com CPF do usuário e ID único de requisição:

```typescript
// Logs adicionados:
- CPF do usuário (extraído do token JWT via preferred_username)
- URL da API Heimdall sendo chamada
- Status da resposta HTTP
- Corpo do erro (se houver)
- Timeout (10 segundos)
- Stack trace de erros
- Número de roles retornadas
```

### 2. Logging no Middleware Principal (`middleware.ts`)

```typescript
// Logs adicionados em cada etapa:
- CPF do usuário (extraído do token JWT)
- Path sendo acessado
- Roles do usuário retornadas
- Resultado da verificação de acesso
- Motivo da negação (se aplicável)
```

### 3. Logging em `route-permissions.ts`

```typescript
// Logs detalhados de:
- CPF do usuário (quando disponível)
- Quando userRoles é null/undefined/vazio
- Match exato de rotas
- Match de wildcards
- Rotas sem regra de permissão
```

## Como Diagnosticar

### Passo 1: Pedir para o usuário tentar acessar pelo desktop

Quando um usuário reportar o problema, peça para ele tentar acessar novamente.

### Passo 2: Verificar os logs do servidor

No terminal onde o Next.js está rodando, você verá logs como:

```
[12345678901] [abc123] Fetching user roles from Heimdall API: https://heimdall.api.url/api/v1/users/me
[12345678901] [abc123] Heimdall API response status: 200
[12345678901] [abc123] Successfully fetched 2 roles: ["admin", "go:admin"]
[12345678901] [MIDDLEWARE] Checking access for path: /gorio/courses
[12345678901] [MIDDLEWARE] User roles retrieved: ["admin", "go:admin"]
[12345678901] [ROUTE_PERMISSIONS] Wildcard match for route "/gorio/courses": true
[12345678901] [MIDDLEWARE] Access GRANTED for path: /gorio/courses
```

**Nota:** O primeiro número entre colchetes (ex: `[12345678901]`) é o CPF do usuário, facilitando a identificação de qual usuário está tendo problemas.

### Passo 3: Identificar o problema

#### **Se você ver erro de timeout:**
```
[12345678901] [abc123] Heimdall API request timed out after 10 seconds
[12345678901] [ROUTE_PERMISSIONS] Access denied: No user roles provided (userRoles is null)
```
**Causa:** Rede corporativa lenta ou firewall bloqueando a conexão.

#### **Se você ver erro HTTP (ex: 401, 403, 500):**
```
[12345678901] [abc123] Heimdall API returned status 401. Error body: Unauthorized
```
**Causa:** Token JWT pode estar corrompido ou expirado prematuramente.

#### **Se você ver erro de conexão:**
```
[12345678901] [abc123] Fetch error when calling Heimdall API: Failed to fetch
```
**Causa:** Firewall/antivírus bloqueando, proxy corporativo, ou certificado SSL inválido.

#### **Se você ver erro de DNS:**
```
[12345678901] [abc123] Fetch error: getaddrinfo ENOTFOUND heimdall.api.url
```
**Causa:** DNS corporativo não consegue resolver o domínio do Heimdall.

## Soluções Possíveis

### Solução 1: Aumentar o Timeout (se for problema de rede lenta)

Em `src/lib/middleware-helpers.ts:106`, aumentar de 10000 para 30000:
```typescript
const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
```

### Solução 2: Adicionar Retry com Backoff (se for problema intermitente)

Implementar retry automático em caso de falha.

### Solução 3: Fallback para Roles em Cache (se Heimdall ficar indisponível)

Armazenar as roles do usuário em um cookie ou header após primeira autenticação bem-sucedida.

### Solução 4: Whitelist de IPs (se for firewall corporativo)

Solicitar à TI corporativa para adicionar o domínio do Heimdall na whitelist do firewall.

### Solução 5: Verificar User-Agent

Alguns firewalls corporativos bloqueiam requests sem User-Agent padrão de navegador.

## Próximos Passos

1. **Deploy com os logs implementados**
2. **Pedir para usuário afetado tentar novamente**
3. **Analisar os logs para identificar o erro exato**
4. **Implementar a solução apropriada baseado no erro**

## Informações Úteis para Coleta

Quando um usuário reportar o problema, peça:

- Sistema operacional e versão
- Navegador e versão
- Se está conectado via VPN corporativa
- Se há antivírus ativo
- Se consegue acessar o Heimdall diretamente (abrir o URL no navegador)
- Screenshot do DevTools > Network tab mostrando a requisição falhando (se possível)
