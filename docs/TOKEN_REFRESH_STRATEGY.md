# Estratégia de Refresh Token Automático

## Visão Geral

Este documento descreve a implementação de um sistema automático de refresh de tokens JWT para garantir que os usuários permaneçam autenticados durante o uso da aplicação, sem necessidade de re-login manual.

## Arquitetura do Sistema

### Configuração dos Tokens

- **Access Token**: Duração de **10 minutos**
- **Refresh Token**: Duração de **30 minutos**
- **Verificação**: A cada **1 minuto**
- **Refresh Automático**: **2 minutos antes** da expiração do access token

### Fluxo de Funcionamento

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Access Token  │    │  Refresh Token   │    │   Monitoring    │
│   (10 minutos)  │    │   (30 minutos)   │    │  (1 minuto)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TokenRefreshProvider                         │
│              (Envolve toda aplicação privada)                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useTokenRefresh Hook                         │
│  • Verifica token a cada 1 minuto                               │
│  • Refresh 2 minutos antes da expiração                         │
│  • Fallback para logout em caso de falha                        │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes da Implementação

### 1. Hook `useTokenRefresh`

**Localização**: `src/hooks/use-token-refresh.ts`

**Responsabilidades**:

- Monitoramento automático do status do token
- Verificação de expiração
- Execução do refresh automático
- Gerenciamento do ciclo de vida do monitoramento

**Configurações**:

```typescript
{
  checkInterval: 1,        // Verificar a cada 1 minuto
  refreshBeforeExpiry: 2   // Refresh 2 minutos antes da expiração
}
```

### 2. Provider `TokenRefreshProvider`

**Localização**: `src/components/providers/token-refresh-provider.tsx`

**Responsabilidades**:

- Inicialização do monitoramento ao montar o componente
- Cleanup ao desmontar
- Envolvimento de toda a aplicação privada

### 3. API Endpoints

#### `/api/auth/token-status` (GET)

**Localização**: `src/app/api/auth/token-status/route.ts`

**Função**: Verifica o status atual dos tokens
**Retorno**:

```json
{
  "authenticated": boolean,
  "token": string | null,
  "refreshToken": string | null,
  "isExpired": boolean,
  "message": string
}
```

#### `/api/auth/refresh` (POST)

**Localização**: `src/app/api/auth/refresh/route.ts`

**Função**: Executa o refresh dos tokens
**Retorno**:

```json
{
  "success": boolean,
  "message": string
}
```

### 4. Função de Refresh

**Localização**: `src/lib/token-refresh.ts`

**Responsabilidades**:

- Comunicação com o servidor de autenticação
- Processamento da resposta
- Retorno estruturado dos novos tokens

## Timeline de Funcionamento

### Cenário Normal (Usuário Ativo)

```
T+0min:  Token criado (válido por 10min)
T+1min:  ✅ Verificação: Token válido por 9min
T+2min:  ✅ Verificação: Token válido por 8min
T+3min:  ✅ Verificação: Token válido por 7min
T+4min:  ✅ Verificação: Token válido por 6min
T+5min:  ✅ Verificação: Token válido por 5min
T+6min:  ✅ Verificação: Token válido por 4min
T+7min:  ✅ Verificação: Token válido por 3min
T+8min:  🚨 Verificação: Token expira em 2min → REFRESH
T+8min:  ✅ Refresh realizado → Novo token (10min)
T+9min:  ✅ Verificação: Token válido por 9min
T+10min: ✅ Verificação: Token válido por 8min
...
```

### Cenário de Falha

```
T+8min:  🚨 Token expira em 2min → REFRESH
T+8min:  ❌ Refresh falhou (refresh_token expirado)
T+8min:  🔄 Redirecionamento para logout/login
```

## Integração no Layout

### Layout Privado

**Localização**: `src/app/(private)/layout.tsx`

```tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TokenRefreshProvider>
      <div>
        <SessionExpiredHandler />
        <UnauthorizedHandler />
        {children}
      </div>
    </TokenRefreshProvider>
  )
}
```

**Por que no layout privado?**

- Garante que o monitoramento só seja ativo em páginas que requerem autenticação
- Evita verificações desnecessárias em páginas públicas
- Integração perfeita com os handlers de sessão existentes

## Logs de Produção

### Logs Mantidos (Essenciais)

```typescript
// Início do monitoramento
console.log('🚀 Starting automatic token monitoring')

// Refresh bem-sucedido
console.log('✅ Access token refreshed successfully')

// Falhas críticas
console.log('❌ Refresh failed, redirecting to login...')
console.log('❌ No refresh token available, redirecting to login...')

// Parada do monitoramento
console.log('🛑 Stopping automatic token monitoring')
```

### Segurança

### Cookies

- **HttpOnly**: Previne acesso via JavaScript
- **Secure**: Apenas HTTPS em produção
- **SameSite**: Proteção CSRF
- **Path**: Limitado ao domínio da aplicação

### Fallbacks de Segurança

1. **Token Expirado**: Redirecionamento automático para logout
2. **Refresh Falhou**: Logout imediato
3. **Sem Refresh Token**: Redirecionamento para login
4. **Erro de Rede**: Parada do monitoramento

## Vantagens da Implementação

### Para o Usuário

- ✅ **Experiência contínua**: Nunca é deslogado durante o uso ativo
- ✅ **Transparente**: O refresh acontece em background
- ✅ **Seguro**: Logout automático em caso de problemas

### Para o Sistema

- ✅ **Eficiente**: Verificação otimizada (1 minuto)
- ✅ **Robusto**: Múltiplos fallbacks de segurança
- ✅ **Escalável**: Monitoramento por usuário ativo
- ✅ **Manutenível**: Código limpo e bem documentado

## Monitoramento e Debug

### Em Desenvolvimento

Para debug adicional, você pode adicionar temporariamente:

```typescript
// No useTokenRefresh hook
console.log('⏰ Token status:', {
  expiresAt: new Date(tokenExpiry).toISOString(),
  minutesUntilExpiry,
  needsRefresh: minutesUntilExpiry <= refreshBeforeExpiry
})
```

### Em Produção

Os logs essenciais permitem:

- Monitoramento de falhas de refresh
- Identificação de problemas de conectividade
- Acompanhamento do comportamento dos usuários

## Configuração para Diferentes Cenários

### Tokens Mais Longos (1 hora)

```typescript
useTokenRefresh({
  checkInterval: 5,        // Verificar a cada 5 minutos
  refreshBeforeExpiry: 10  // Refresh 10 minutos antes
})
```

### Tokens Mais Curtos (5 minutos)

```typescript
useTokenRefresh({
  checkInterval: 0.5,      // Verificar a cada 30 segundos
  refreshBeforeExpiry: 1   // Refresh 1 minuto antes
})
```

## Troubleshooting

### Problemas Comuns

1. **Refresh Falha Constantemente**

   - Verificar se o refresh_token não expirou (30 min)
   - Verificar conectividade com servidor de auth
   - Verificar configurações de CORS
2. **Usuário é Deslogado Inesperadamente**

   - Verificar se o refresh_token está sendo enviado
   - Verificar se os cookies estão sendo definidos corretamente
   - Verificar se o monitoramento está ativo
3. **Logs Não Aparecem**

   - Verificar se está no ambiente correto
   - Verificar se o provider está sendo montado
   - Verificar se há erros de JavaScript no console

## Conclusão

Esta implementação garante uma experiência de usuário fluida e segura, mantendo a autenticação ativa durante toda a sessão de uso, com fallbacks robustos para garantir a segurança da aplicação.
