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

O sistema utiliza a **API Heimdall** como fonte única de verdade para roles e permissões de usuários. Não dependemos mais de roles extraídas do JWT - todas as verificações de acesso são baseadas nas roles retornadas pela API do Heimdall.

### Fluxo de Autenticação/Autorização

```
1. Usuário faz login → JWT é armazenado em cookie HTTP-only
2. Middleware valida apenas JWT (expiração)
3. Aplicação chama API Heimdall para buscar roles do usuário
4. Roles do Heimdall controlam acesso a módulos e funcionalidades
```

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

### Camadas de Autorização

**1. Middleware (Edge Runtime)**

- ✅ Valida expiração do JWT
- ✅ Faz refresh automático do token
- ❌ **NÃO** valida roles específicas (limitação do Edge Runtime)

**2. Application Layer**

- ✅ Client Components: Hooks para buscar roles
- ✅ Server Components: Funções server-side para buscar roles
- ✅ Layouts: Proteção de seções inteiras
- ✅ Componentes: Controle condicional de UI

### Arquivos Principais

```
src/
├── types/heimdall-roles.ts              # Tipos e helpers de roles
├── app/api/heimdall/user/route.ts       # API route proxy para Heimdall
├── hooks/use-heimdall-user.ts           # Hooks client-side
├── lib/
│   ├── server-auth.ts                   # Helpers server-side
│   ├── route-permissions.ts             # Configuração de permissões
│   └── menu-list.ts                     # Configuração do menu
├── components/auth/protected-route.tsx  # Wrapper de proteção
└── middleware.ts                        # Middleware de autenticação
```

---

## ⚙️ Como Funciona

### 1. API Route Proxy (`/api/heimdall/user`)

```typescript
// src/app/api/heimdall/user/route.ts
export async function GET() {
  const accessToken = cookies.get('access_token')

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

### 2. Client Components

```typescript
'use client'
import { useHeimdallUser } from '@/hooks/use-heimdall-user'

function MyComponent() {
  const user = useHeimdallUser()

  // user = {
  //   id: 2,
  //   cpf: "12345678901",
  //   display_name: "João Silva",
  //   groups: ["heimdall_admins"],
  //   roles: ["admin", "go:admin"] // ← Roles do Heimdall
  // }
}
```

### 3. Server Components

```typescript
// src/app/(private)/(app)/my-page/page.tsx
import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'

export default async function MyPage() {
  const response = await getCurrentUserInfoApiV1UsersMeGet()
  const userRoles = response.data.roles

  // Valida acesso
  const hasAccess = userRoles?.includes('admin') || userRoles?.includes('go:admin')

  if (!hasAccess) redirect('/unauthorized')
}
```

---

## 💻 Uso em Client Components

### Hooks Disponíveis

```typescript
import {
  useHeimdallUser,              // Retorna user completo
  useHeimdallUserWithLoading,   // Retorna user + loading state
  useHasRole,                   // Verifica roles específicas
  useIsAdmin,                   // Verifica se é admin/superadmin
  useHasGoRioAccess,            // Verifica acesso ao GO Rio
  useHasBuscaServicesAccess,    // Verifica acesso a Serviços
  useCanEditBuscaServices,      // Verifica se pode editar serviços
  useIsBuscaServicesAdmin,      // Verifica se é admin de serviços
} from '@/hooks/use-heimdall-user'
```

### Exemplo 1: Mostrar/Ocultar Botão

```typescript
'use client'

import { useHasGoRioAccess } from '@/hooks/use-heimdall-user'
import { Button } from '@/components/ui/button'

export function NewCourseButton() {
  const hasAccess = useHasGoRioAccess()

  if (!hasAccess) return null

  return (
    <Button>
      Criar Novo Curso
    </Button>
  )
}
```

### Exemplo 2: Diferentes UIs por Role

```typescript
'use client'

import { useIsAdmin, useHeimdallUser } from '@/hooks/use-heimdall-user'

export function Dashboard() {
  const isAdmin = useIsAdmin()
  const user = useHeimdallUser()

  return (
    <div>
      <h1>Dashboard</h1>

      {isAdmin && (
        <AdminPanel />
      )}

      {user?.roles?.includes('go:admin') && (
        <GoRioStats />
      )}

      {user?.roles?.includes('busca:services:editor') && (
        <ServicesDrafts />
      )}
    </div>
  )
}
```

### Exemplo 3: Verificar Múltiplas Roles

```typescript
'use client'

import { useHasRole } from '@/hooks/use-heimdall-user'

export function ApproveButton() {
  const canApprove = useHasRole(['admin', 'superadmin', 'busca:services:admin'])

  if (!canApprove) return null

  return <Button>Aprovar Serviço</Button>
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

### Exemplo 1: Proteger Página Inteira

```typescript
// src/app/(private)/(app)/admin-only/page.tsx

import { requireAdminAccess } from '@/lib/server-auth'

export default async function AdminPage() {
  // Se não for admin/superadmin, redireciona para /unauthorized
  await requireAdminAccess()

  return (
    <div>
      <h1>Painel Administrativo</h1>
      {/* Conteúdo apenas para admins */}
    </div>
  )
}
```

### Exemplo 2: Renderização Condicional

```typescript
// src/app/(private)/(app)/dashboard/page.tsx

import { getUserRolesServer } from '@/lib/server-auth'
import { hasAdminPrivileges } from '@/types/heimdall-roles'

export default async function Dashboard() {
  const roles = await getUserRolesServer()
  const isAdmin = hasAdminPrivileges(roles)

  return (
    <div>
      <h1>Dashboard</h1>

      {isAdmin && (
        <AdminStats />
      )}

      {roles?.includes('go:admin') && (
        <GoRioStats />
      )}
    </div>
  )
}
```

---

## 🔒 Proteção de Rotas

### Método 1: Layout Protection (Recomendado para Módulos)

```typescript
// src/app/(private)/(app)/gorio/layout.tsx

import { ProtectedRoute } from '@/components/auth/protected-route'

export default function GorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'superadmin', 'go:admin']}>
      {children}
    </ProtectedRoute>
  )
}
```

**Resultado:** Todas as páginas dentro de `/gorio/*` exigem uma dessas roles.

### Método 2: Component Wrapper (Para Páginas Específicas)

```typescript
// src/app/(private)/(app)/special-page/page.tsx
'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'

export default function SpecialPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'busca:services:admin']}>
      <div>Conteúdo protegido</div>
    </ProtectedRoute>
  )
}
```

### Método 3: Server-Side Protection

```typescript
// src/app/(private)/(app)/api-admin/page.tsx

import { requireRoles } from '@/lib/server-auth'

export default async function ApiAdminPage() {
  await requireRoles(['admin', 'superadmin'])

  return <div>Página de administração de APIs</div>
}
```

---

## ➕ Adicionando Novos Módulos

### Passo 1: Definir Nova Role (se necessário)

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

### Passo 2: Adicionar no Menu

```typescript
// src/lib/menu-list.ts

import { BarChart3 } from 'lucide-react'

export function getMenuList(pathname: string): Group[] {
  return [
    // ... outros grupos
    {
      groupLabel: 'Analytics',
      menus: [
        {
          href: '/analytics',
          label: 'Relatórios',
          icon: BarChart3,
          allowedRoles: ['admin', 'superadmin', 'analytics:viewer'],
        },
      ],
    },
  ]
}
```

### Passo 3: Configurar Permissões de Rota

```typescript
// src/lib/route-permissions.ts

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // ... rotas existentes

  // Analytics
  '/analytics': ['admin', 'superadmin', 'analytics:viewer'],
  '/analytics/reports': ['admin', 'superadmin', 'analytics:viewer'],
  '/analytics/export': ['admin', 'superadmin'], // Apenas admins podem exportar
}
```

### Passo 4: Criar Layout Protegido

```typescript
// src/app/(private)/(app)/analytics/layout.tsx

import { ProtectedRoute } from '@/components/auth/protected-route'

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'superadmin', 'analytics:viewer']}>
      {children}
    </ProtectedRoute>
  )
}
```

### Passo 5: Criar Hook Específico (Opcional)

```typescript
// src/hooks/use-heimdall-user.ts

export function useHasAnalyticsAccess(): boolean {
  const user = useHeimdallUser()
  return hasAnalyticsAccess(user?.roles)
}
```

### Passo 6: Adicionar na Página de Conta

```typescript
// src/app/(private)/(app)/account/page.tsx

// Na função getModuleAccess:
function getModuleAccess(roles: string[] | undefined) {
  const hasAdminPrivileges = roles?.includes('admin') || roles?.includes('superadmin')

  return {
    dashboard: true,
    goRio: hasAdminPrivileges || roles?.includes('go:admin'),
    servicosMunicipais: hasAdminPrivileges || roles?.includes('busca:services:admin') || roles?.includes('busca:services:editor'),
    analytics: hasAdminPrivileges || roles?.includes('analytics:viewer'), // ← Novo
  }
}

// No JSX:
{moduleAccess.analytics && (
  <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-primary">
    <div className="rounded-full p-2 bg-primary/10">
      <BarChart3 className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Analytics</p>
        <Check className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Relatórios e métricas
      </p>
    </div>
  </div>
)}
```

---

## 📚 Exemplos Práticos

### Exemplo Completo: Botão de Ação Condicional

```typescript
'use client'

import { useHasRole, useIsAdmin } from '@/hooks/use-heimdall-user'
import { Button } from '@/components/ui/button'
import { Trash2, Edit, Check } from 'lucide-react'

interface ServiceActionsProps {
  serviceId: string
  status: 'draft' | 'pending' | 'published'
}

export function ServiceActions({ serviceId, status }: ServiceActionsProps) {
  const isAdmin = useIsAdmin()
  const canEdit = useHasRole(['admin', 'superadmin', 'busca:services:admin', 'busca:services:editor'])
  const canApprove = useHasRole(['admin', 'superadmin', 'busca:services:admin'])

  return (
    <div className="flex gap-2">
      {/* Editar: Editor ou Admin */}
      {canEdit && (
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      )}

      {/* Aprovar: Apenas Admin de Serviços */}
      {canApprove && status === 'pending' && (
        <Button variant="default" size="sm">
          <Check className="h-4 w-4 mr-2" />
          Aprovar
        </Button>
      )}

      {/* Excluir: Apenas Super Admin */}
      {isAdmin && (
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      )}
    </div>
  )
}
```

### Exemplo Completo: Tabela com Colunas Condicionais

```typescript
'use client'

import { useIsAdmin, useHeimdallUser } from '@/hooks/use-heimdall-user'
import { ColumnDef } from '@tanstack/react-table'

export function useServiceColumns() {
  const isAdmin = useIsAdmin()
  const user = useHeimdallUser()
  const canApprove = user?.roles?.some(r => ['admin', 'superadmin', 'busca:services:admin'].includes(r))

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: 'title',
      header: 'Título',
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'createdBy',
      header: 'Criado por',
      // Mostrar apenas para admins
      cell: ({ row }) => isAdmin ? row.original.createdBy : '---',
    },
  ]

  // Adicionar coluna de ações apenas se tiver permissão
  if (canApprove || isAdmin) {
    columns.push({
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => <ServiceActions service={row.original} />,
    })
  }

  return columns
}
```

### Exemplo Completo: Formulário com Campos Condicionais

```typescript
'use client'

import { useIsAdmin, useHasRole } from '@/hooks/use-heimdall-user'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function CourseForm() {
  const isAdmin = useIsAdmin()
  const canSetExternalPartner = useHasRole(['admin', 'superadmin', 'go:admin'])

  return (
    <form>
      <Input label="Título do Curso" name="title" required />
      <Input label="Descrição" name="description" />

      {/* Campo visível apenas para go:admin ou superior */}
      {canSetExternalPartner && (
        <Select label="Parceiro Externo" name="externalPartner">
          <option value="">Nenhum</option>
          <option value="partner1">Parceiro 1</option>
        </Select>
      )}

      {/* Campo visível apenas para super admins */}
      {isAdmin && (
        <Select label="Secretaria" name="secretariat">
          <option value="sme">SME</option>
          <option value="smtr">SMTR</option>
        </Select>
      )}

      <Button type="submit">Salvar</Button>
    </form>
  )
}
```

---

## 🔧 Configuração

### Variável de Ambiente Obrigatória

```env
# .env
NEXT_PUBLIC_HEIMDALL_BASE_API_URL=...
```

### Middleware Config

O middleware já está configurado para:

- ✅ Validar JWT (expiração)
- ✅ Fazer refresh automático do token
- ✅ Aplicar CSP headers
- ❌ **NÃO** valida roles (feito na application layer)

---

## ✅ Checklist para Novos Módulos

- [ ] Definir role(s) em `src/types/heimdall-roles.ts`
- [ ] Adicionar helpers de permissão (ex: `hasAnalyticsAccess()`)
- [ ] Adicionar item no menu (`src/lib/menu-list.ts`)
- [ ] Configurar permissões de rota (`src/lib/route-permissions.ts`)
- [ ] Criar layout protegido (`src/app/(private)/(app)/module/layout.tsx`)
- [ ] Criar hook específico se necessário (`src/hooks/use-heimdall-user.ts`)
- [ ] Adicionar card na página de conta (`src/app/(private)/(app)/account/page.tsx`)
- [ ] Atualizar esta documentação

---

## 🚨 Importante

1. **Middleware NÃO valida roles específicas** - Apenas valida JWT
2. **Sempre use Heimdall API como fonte de verdade** - Não dependa de roles do JWT
3. **Client Components**: Use hooks `use-heimdall-user`
4. **Server Components**: Use helpers `server-auth`
5. **Proteção de Layout > Proteção de Página** - Prefira proteger módulos inteiros via layout

---

**Última atualização:** 2025-10-18
