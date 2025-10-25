# Sistema RBAC com Heimdall API

Documentação oficial do sistema de controle de acesso baseado em roles (RBAC) integrado com a API Heimdall.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Roles Disponíveis](#roles-disponíveis)
3. [Arquitetura](#arquitetura)
4. [Como Funciona](#como-funciona)
5. [Uso em Client Components](#uso-em-client-components)
6. [Uso em Server Components](#uso-em-server-components)
7. [Proteção de Rotas](#proteção-de-rotas)
8. [Adicionando Novos Módulos](#adicionando-novos-módulos)
9. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

O sistema utiliza a **API Heimdall** como fonte única de verdade para roles e permissões de usuários. A API é chamada **apenas uma vez** durante o ciclo de vida da aplicação, com um sistema de cache global que compartilha os dados entre todos os componentes.

### Fluxo de Autenticação/Autorização

```
1. Usuário faz login → JWT é armazenado em cookie HTTP-only
2. Middleware valida JWT (expiração) e roles via Heimdall API
3. Aplicação client-side chama API Heimdall UMA VEZ
4. Cache global compartilha roles entre todos os componentes
5. Roles do Heimdall controlam acesso a módulos e funcionalidades
```

### Princípios Fundamentais

- ✅ **Single Source of Truth**: API Heimdall é a única fonte de roles
- ✅ **Cache Global**: Uma única chamada HTTP para toda a aplicação
- ✅ **Pub/Sub Pattern**: Componentes são notificados quando dados carregam
- ✅ **Server + Client**: Proteção em ambas as camadas

---

## 🔑 Roles Disponíveis

| Role                      | Descrição         | Acesso                                 |
| ------------------------- | ------------------- | -------------------------------------- |
| `admin`                 | Administrador       | Acesso total a todos os módulos       |
| `superadmin`            | Super Administrador | Acesso irrestrito a toda a plataforma  |
| `go:admin`              | Admin GO Rio        | Apenas módulo GO Rio (Cursos e Vagas) |
| `busca:services:admin`  | Admin Serviços     | Gerencia e aprova serviços municipais |
| `busca:services:editor` | Editor Serviços    | Cria e edita serviços municipais      |

### Matriz de Acesso

| Módulo/Recurso      | admin | superadmin | go:admin | busca:services:admin | busca:services:editor |
| -------------------- | ----- | ---------- | -------- | -------------------- | --------------------- |
| Dashboard            | ✅    | ✅         | ✅       | ✅                   | ✅                    |
| GO Rio - Cursos      | ✅    | ✅         | ✅       | ❌                   | ❌                    |
| GO Rio - Vagas       | ✅    | ✅         | ✅       | ❌                   | ❌                    |
| Serviços Municipais | ✅    | ✅         | ❌       | ✅                   | ✅                    |
| Aprovar Serviços    | ✅    | ✅         | ❌       | ✅                   | ❌                    |
| Minha Conta          | ✅    | ✅         | ✅       | ✅                   | ✅                    |

---

## 🏗️ Arquitetura

### Sistema de Cache Global

O sistema implementa um **cache singleton** que garante que a API Heimdall seja chamada apenas uma vez:

```typescript
// Cache global compartilhado
let cachedUser: HeimdallUser | null = null
let isLoading = false
let loadingPromise: Promise<HeimdallUser | null> | null = null
const subscribers = new Set<(user: HeimdallUser | null) => void>()
```

**Fluxo do Cache:**

1. Primeiro componente solicita dados → Faz chamada HTTP à API
2. Componentes subsequentes → Recebem dados do cache
3. Todos os componentes se inscrevem para atualizações
4. Quando dados chegam → Todos são notificados simultaneamente

### Camadas de Autorização

**1. Middleware (Edge Runtime)**

- ✅ Valida expiração do JWT
- ✅ Faz refresh automático do token
- ✅ Valida roles específicas através da API Heimdall
- ✅ Bloqueia acesso não autorizado baseado em permissões de rota

**2. Application Layer**

- ✅ Client Components: Context + Hooks com cache global
- ✅ Server Components: Funções server-side para buscar roles
- ✅ Layouts: Proteção de seções inteiras
- ✅ Componentes: Controle condicional de UI

### Arquivos Principais

```
src/
├── types/heimdall-roles.ts              # Tipos e helpers de roles
├── app/api/heimdall/user/route.ts       # API route proxy para Heimdall
├── hooks/use-heimdall-user.ts           # Hooks + cache global
├── contexts/heimdall-user-context.tsx   # Context provider centralizado
├── lib/
│   ├── server-auth.ts                   # Helpers server-side
│   ├── route-permissions.ts             # Configuração de permissões
│   ├── middleware-helpers.ts            # Helpers do middleware
│   └── menu-list.ts                     # Configuração do menu
└── middleware.ts                        # Middleware de autenticação + RBAC
```

---

## ⚙️ Como Funciona

### 0. Middleware RBAC (Primeira Camada de Proteção)

```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('access_token')
  const path = request.nextUrl.pathname

  // 1. Valida expiração do JWT
  if (isJwtExpired(authToken.value)) {
    return handleExpiredToken(...)
  }

  // 2. Busca roles do usuário via Heimdall API
  const userRoles = await getUserRolesInMiddleware(authToken.value)

  // 3. Verifica se usuário tem acesso à rota
  const hasAccess = hasRouteAccess(path, userRoles)

  // 4. Bloqueia se não tiver permissão
  if (!hasAccess) {
    return handleUnauthorizedUser(...) // Redireciona para /unauthorized
  }

  // 5. Permite acesso
  return NextResponse.next()
}
```

**Fluxo:**
1. Usuário tenta acessar `/servicos-municipais/servicos/new`
2. Middleware valida JWT e busca roles do Heimdall
3. Middleware verifica em `route-permissions.ts` se a role permite acesso
4. Se não permitir, redireciona para `/unauthorized`
5. Se permitir, continua para a página

> **⚠️ Nota de Performance:** O middleware faz uma chamada à API Heimdall em cada request para rotas protegidas. Isso garante permissões sempre atualizadas.

### 1. Cache Global (Client-Side)

```typescript
// src/hooks/use-heimdall-user.ts

// Singleton cache - garante apenas 1 chamada HTTP
let cachedUser: HeimdallUser | null = null
let isLoading = false
let loadingPromise: Promise<HeimdallUser | null> | null = null
const subscribers = new Set<(user: HeimdallUser | null) => void>()

async function fetchHeimdallUser(): Promise<HeimdallUser | null> {
  // Se já tem cache, retorna imediatamente
  if (cachedUser !== null) return cachedUser

  // Se já está buscando, aguarda a mesma promise
  if (isLoading && loadingPromise) return loadingPromise

  // Faz a busca (apenas uma vez!)
  loadingPromise = fetch('/api/heimdall/user').then(...)

  // Notifica todos os subscribers
  notifySubscribers(data)

  return data
}
```

### 2. Context Provider

```typescript
// src/contexts/heimdall-user-context.tsx
export function HeimdallUserProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useHeimdallUserWithLoading() // Usa cache global

  const isAdmin = hasAdminPrivileges(user?.roles)
  const canEditGoRio = canEditGoRio(user?.roles)
  // ... outras permissões calculadas

  return (
    <HeimdallUserContext.Provider value={{ user, loading, isAdmin, canEditGoRio, ... }}>
      {children}
    </HeimdallUserContext.Provider>
  )
}
```

### 3. API Route Proxy

```typescript
// src/app/api/heimdall/user/route.ts
export async function GET() {
  const accessToken = cookies().get('access_token')

  // Chama API Heimdall
  const response = await getCurrentUserInfoApiV1UsersMeGet()

  return NextResponse.json({
    id: response.data.id,
    cpf: response.data.cpf,
    display_name: response.data.display_name,
    groups: response.data.groups,
    roles: response.data.roles, // ← Roles do Heimdall
  })
}
```

---

## 💻 Uso em Client Components

### Context Provider (Recomendado)

O modo mais eficiente de acessar roles em client components é através do context:

```typescript
'use client'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'

export function MyComponent() {
  const {
    user,           // Dados completos do usuário
    loading,        // Estado de carregamento
    isAdmin,        // É admin ou superadmin?
    canEditGoRio,   // Pode editar no GO Rio?
    canEditBuscaServices, // Pode editar serviços?
  } = useHeimdallUserContext()

  if (loading) return <Skeleton />

  return (
    <div>
      {canEditGoRio && <Button>Criar Curso</Button>}
    </div>
  )
}
```

### Hooks Disponíveis (Alternativa)

Se não quiser usar o context, pode usar os hooks diretamente (mas eles também usam o cache global):

```typescript
import {
  useHeimdallUser,              // Retorna user completo
  useHeimdallUserWithLoading,   // Retorna user + loading state
  useHasRole,                   // Verifica roles específicas
  useIsAdmin,                   // Verifica se é admin/superadmin
  useHasGoRioAccess,            // Verifica acesso ao GO Rio
  useCanEditGoRio,              // Verifica se pode editar GO Rio
  useHasBuscaServicesAccess,    // Verifica acesso a Serviços
  useCanEditBuscaServices,      // Verifica se pode editar serviços
  useIsBuscaServicesAdmin,      // Verifica se é admin de serviços
} from '@/hooks/use-heimdall-user'
```

### Exemplo: Mostrar/Ocultar Botão

```typescript
'use client'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'

export function NewCourseButton() {
  const { canEditGoRio } = useHeimdallUserContext()

  if (!canEditGoRio) return null

  return <Button>Criar Novo Curso</Button>
}
```

### Exemplo: Diferentes UIs por Role

```typescript
'use client'
import { useHeimdallUserContext } from '@/contexts/heimdall-user-context'

export function Dashboard() {
  const { isAdmin, hasGoRioAccess, user } = useHeimdallUserContext()

  return (
    <div>
      <h1>Dashboard</h1>

      {isAdmin && <AdminPanel />}
      {hasGoRioAccess && <GoRioStats />}
      {user?.roles?.includes('busca:services:editor') && <ServicesDrafts />}
    </div>
  )
}
```

---

## 🖥️ Uso em Server Components

### Helpers Disponíveis

```typescript
import {
  getUserRolesServer,          // Retorna roles do usuário
  requireRoles,                // Exige roles específicas (redireciona se não tiver)
  requireGoRioAccess,          // Exige acesso GO Rio
  requireAdminAccess,          // Exige admin/superadmin
  requireBuscaServicesAccess,  // Exige acesso a serviços
} from '@/lib/server-auth'
```

### Exemplo: Proteger Página Inteira

```typescript
// src/app/(private)/(app)/admin-only/page.tsx
import { requireAdminAccess } from '@/lib/server-auth'

export default async function AdminPage() {
  // Se não for admin/superadmin, redireciona para /unauthorized
  await requireAdminAccess()

  return (
    <div>
      <h1>Painel Administrativo</h1>
    </div>
  )
}
```

### Exemplo: Renderização Condicional

```typescript
import { getUserRolesServer } from '@/lib/server-auth'
import { hasAdminPrivileges } from '@/types/heimdall-roles'

export default async function Dashboard() {
  const roles = await getUserRolesServer()
  const isAdmin = hasAdminPrivileges(roles)

  return (
    <div>
      <h1>Dashboard</h1>
      {isAdmin && <AdminStats />}
      {roles?.includes('go:admin') && <GoRioStats />}
    </div>
  )
}
```

---

## 🔒 Proteção de Rotas

### Método 1: Context Provider no Layout (Recomendado)

```typescript
// src/app/(private)/(app)/layout.tsx
import { HeimdallUserProvider } from '@/contexts/heimdall-user-context'

export default async function Layout({ children }) {
  return (
    <HeimdallUserProvider>
      {children}
    </HeimdallUserProvider>
  )
}
```

### Método 2: Server-Side Protection

```typescript
// src/app/(private)/(app)/gorio/page.tsx
import { requireGoRioAccess } from '@/lib/server-auth'

export default async function GorioPage() {
  await requireGoRioAccess() // Redireciona se não tiver acesso

  return <div>Conteúdo GO Rio</div>
}
```

### Método 3: Middleware Protection (Automático)

O middleware já protege automaticamente baseado em `route-permissions.ts`:

```typescript
// src/lib/route-permissions.ts
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/gorio': ['admin', 'superadmin', 'go:admin'],
  '/gorio/courses': ['admin', 'superadmin', 'go:admin'],
  '/servicos-municipais': ['admin', 'superadmin', 'busca:services:admin', 'busca:services:editor'],
}
```

---

## ➕ Adicionando Novos Módulos

### Passo 1: Definir Nova Role

```typescript
// src/types/heimdall-roles.ts
export type HeimdallRole =
  | 'admin'
  | 'superadmin'
  | 'go:admin'
  | 'busca:services:admin'
  | 'busca:services:editor'
  | 'analytics:viewer'  // ← Nova role

// Adicionar helper function
export function hasAnalyticsAccess(roles: string[] | undefined): boolean {
  if (!roles) return false
  return (
    hasAdminPrivileges(roles) ||
    roles.includes('analytics:viewer')
  )
}
```

### Passo 2: Adicionar no Context

```typescript
// src/contexts/heimdall-user-context.tsx
import { hasAnalyticsAccess } from '@/types/heimdall-roles'

interface HeimdallUserContextType {
  // ... existing properties
  hasAnalyticsAccess: boolean
}

export function HeimdallUserProvider({ children }) {
  const { user, loading } = useHeimdallUserWithLoading()
  const analyticsAccess = hasAnalyticsAccess(user?.roles)

  return (
    <HeimdallUserContext.Provider value={{ ..., hasAnalyticsAccess: analyticsAccess }}>
      {children}
    </HeimdallUserContext.Provider>
  )
}
```

### Passo 3: Configurar Permissões de Rota

```typescript
// src/lib/route-permissions.ts
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/analytics': ['admin', 'superadmin', 'analytics:viewer'],
  '/analytics/reports': ['admin', 'superadmin', 'analytics:viewer'],
}
```

### Passo 4: Adicionar no Menu

```typescript
// src/lib/menu-list.ts
{
  href: '/analytics',
  label: 'Analytics',
  icon: BarChart3,
  allowedRoles: ['admin', 'superadmin', 'analytics:viewer'],
}
```

---

## 📚 Exemplos Práticos

### Navegação sem Reload

```typescript
'use client'
import { useRouter } from 'next/navigation'

export function DataTable({ data }) {
  const router = useRouter()

  return (
    <DataTable
      data={data}
      onRowClick={(row) => {
        // ✅ Correto: Navegação client-side
        router.push(`/detail/${row.id}`)

        // ❌ Errado: Recarrega a página inteira
        // window.location.href = `/detail/${row.id}`
      }}
    />
  )
}
```

### Cache Global em Ação

```typescript
// Componente 1
function Header() {
  const { user } = useHeimdallUserContext() // Trigger: 1ª chamada HTTP
  return <div>{user?.display_name}</div>
}

// Componente 2 (montado ao mesmo tempo)
function Sidebar() {
  const { user } = useHeimdallUserContext() // Cache: Retorna instantaneamente
  return <div>{user?.roles?.length} roles</div>
}

// Componente 3 (montado depois)
function Dashboard() {
  const { user } = useHeimdallUserContext() // Cache: Retorna instantaneamente
  return <div>Welcome {user?.display_name}</div>
}

// Resultado: Apenas 1 chamada HTTP para os 3 componentes! 🎉
```

---

## 🔧 Troubleshooting

### Problema: Múltiplas chamadas à API Heimdall

**Causa**: Isso NÃO deveria mais acontecer com o cache global.

**Solução**:
1. Verifique se está usando `useHeimdallUserContext()` (context)
2. Certifique-se de que `HeimdallUserProvider` está no layout raiz
3. Verifique o Network tab - deve ter apenas 1 chamada

### Problema: Dados não atualizam após mudança de role

**Solução**: Limpe o cache manualmente:

```typescript
import { clearHeimdallUserCache } from '@/hooks/use-heimdall-user'

// Após logout ou mudança de permissões
clearHeimdallUserCache()
```

---

## ✅ Checklist para Novos Módulos

- [ ] Definir role(s) em `src/types/heimdall-roles.ts`
- [ ] Adicionar helpers de permissão (ex: `hasAnalyticsAccess()`)
- [ ] Adicionar propriedade no context (`src/contexts/heimdall-user-context.tsx`)
- [ ] Adicionar item no menu (`src/lib/menu-list.ts`)
- [ ] Configurar permissões de rota (`src/lib/route-permissions.ts`)
- [ ] Criar proteções server-side se necessário
- [ ] Testar cache global (deve ter apenas 1 chamada HTTP)

---

## 🚨 Regras de Ouro

1. **API Heimdall é a fonte única de verdade** - Nunca use roles do JWT
2. **Uma chamada HTTP apenas** - Cache global garante isso
3. **Use Context Provider** - `useHeimdallUserContext()` é o padrão
4. **Navegação client-side** - Use `router.push()`, nunca `window.location.href`
5. **Middleware valida primeiro** - Servidor sempre verifica permissões
6. **Context + Middleware** - Proteção dupla (UX + Segurança)

---

**Última atualização:** 2025-10-25
**Sistema:** Heimdall RBAC com Cache Global
