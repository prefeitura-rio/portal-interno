# User Role Context - Documentação

## Visão Geral

O sistema de controle de acesso baseado em roles (RBAC) utiliza um contexto React (`UserRoleContext`) para gerenciar e compartilhar informações de permissões do usuário em toda a aplicação.

## Arquitetura

### Componentes Principais

1. **Hook de Fetch**: `useUserRoleWithLoading` ([use-user-role.ts](../src/hooks/use-user-role.ts))
2. **Context Provider**: `UserRoleProvider` ([user-role-context.tsx](../src/contexts/user-role-context.tsx))
3. **Hook de Consumo**: `useUserRoleContext()`

### Fluxo de Dados

```
UserRoleProvider (layout.tsx)
    ↓
useUserRoleWithLoading (hook)
    ↓
Fetch /api/user-role (com cache singleton)
    ↓
UserRoleContext
    ↓
Componentes filhos (via useUserRoleContext)
```

## Cache Singleton

Para evitar múltiplas chamadas à API (especialmente em desenvolvimento com React Strict Mode), o hook implementa um **cache singleton**:

```typescript
// Singleton cache to prevent multiple fetches
let cachedUserRole: UserRole | null = null
let cachedPromise: Promise<UserRole | null> | null = null
```

### Benefícios

- ✅ **1 única chamada HTTP** mesmo com re-montagens do React
- ✅ **Compatível com Strict Mode** (desenvolvimento)
- ✅ **Performance otimizada** - valor em cache é retornado instantaneamente
- ✅ **Previne race conditions** - promessas simultâneas são deduplicadas

## Como Usar

### 1. Consumir o Contexto em Componentes

```tsx
import { useUserRoleContext } from '@/contexts/user-role-context'

export function MyComponent() {
  const { userRole, loading, isAdmin, hasElevatedPermissions } = useUserRoleContext()

  if (loading) {
    return <Spinner />
  }

  return (
    <div>
      {hasElevatedPermissions && <AdminButton />}
      {isAdmin && <SuperAdminPanel />}
    </div>
  )
}
```

### 2. Valores Disponíveis

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| `userRole` | `UserRole \| null` | Role do usuário: `'admin'`, `'geral'`, `'editor'`, ou `null` |
| `loading` | `boolean` | `true` enquanto busca os dados |
| `isAdmin` | `boolean` | `true` se `userRole === 'admin'` |
| `hasElevatedPermissions` | `boolean` | `true` se `userRole === 'admin' \|\| userRole === 'geral'` |

### 3. Hierarquia de Permissões

```
admin (maior permissão)
  ↓
geral (permissões elevadas)
  ↓
editor (permissões básicas)
```

## Padrões de Uso

### ✅ Correto

```tsx
// Usar o contexto que já existe no layout
import { useUserRoleContext } from '@/contexts/user-role-context'

function MyPage() {
  const { hasElevatedPermissions } = useUserRoleContext()
  return <div>{hasElevatedPermissions && <Button />}</div>
}
```

### ❌ Incorreto

```tsx
// NÃO fazer fetch direto - isso cria chamadas duplicadas
import { useUserRoleWithLoading } from '@/hooks/use-user-role'

function MyComponent() {
  const { userRole } = useUserRoleWithLoading() // ❌ Evite isso!
  // ...
}
```

## Localização no Código

### Provider (Raiz da Aplicação)

**Arquivo**: [src/app/(private)/(app)/layout.tsx](../src/app/(private)/(app)/layout.tsx)

```tsx
export default async function Layout({ children }) {
  return (
    <UserRoleProvider>
      {children}
    </UserRoleProvider>
  )
}
```

O `UserRoleProvider` está configurado no **layout principal** da aplicação, garantindo que todos os componentes filhos tenham acesso ao contexto.

### Exemplos de Uso

#### Controle de Renderização Condicional

```tsx
const { hasElevatedPermissions } = useUserRoleContext()

return (
  <>
    {hasElevatedPermissions && (
      <Link href="/gorio/oportunidades-mei/new">
        <Button>Nova oportunidade MEI</Button>
      </Link>
    )}
  </>
)
```

#### Controle de Ações em Tabelas

```tsx
const canEditOportunidade = () => {
  if (!userRole) return false

  if (userRole === 'admin' || userRole === 'geral') {
    return true
  }

  if (userRole === 'editor') {
    return oportunidade.status === 'draft'
  }

  return false
}
```

## Troubleshooting

### Problema: Múltiplas chamadas ao `/api/user-role`

**Causa**: Componentes fazendo fetch direto em vez de usar o contexto.

**Solução**: Sempre use `useUserRoleContext()` em vez de `useUserRoleWithLoading()` nos componentes.

### Problema: `useUserRoleContext must be used within a UserRoleProvider`

**Causa**: Componente está fora da árvore do `UserRoleProvider`.

**Solução**: Verifique se o componente está dentro de `src/app/(private)/(app)/` ou adicione o provider no layout pai.

### Limpar Cache (se necessário)

Se precisar invalidar o cache (exemplo: após logout):

```typescript
// Adicione no use-user-role.ts
export function clearUserRoleCache() {
  cachedUserRole = null
  cachedPromise = null
}

// Use onde necessário
import { clearUserRoleCache } from '@/hooks/use-user-role'
clearUserRoleCache()
```

## API Endpoint

**Endpoint**: `GET /api/user-role`

**Resposta**:
```json
{
  "role": "admin" | "geral" | "editor"
}
```

O endpoint lê o token JWT armazenado em **HTTP-only cookies** e extrai o role do usuário.

## Boas Práticas

1. ✅ Sempre use `useUserRoleContext()` nos componentes
2. ✅ Use `loading` para mostrar estados de carregamento
3. ✅ Combine com route permissions ([route-permissions.ts](../src/lib/route-permissions.ts))
4. ✅ Prefira helpers (`isAdmin`, `hasElevatedPermissions`) em vez de comparações diretas
5. ❌ Nunca chame `useUserRoleWithLoading()` diretamente em componentes (use apenas no Provider)

## Relacionados

- [CLAUDE.md](../CLAUDE.md) - Arquitetura geral do projeto
- [route-permissions.ts](../src/lib/route-permissions.ts) - Permissões por rota
- [middleware.ts](../src/middleware.ts) - Middleware de autenticação
- [jwt-utils.ts](../src/lib/jwt-utils.ts) - Utilitários de JWT
