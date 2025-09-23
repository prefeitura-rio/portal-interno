# Role-Based Access Control (RBAC) System

This document explains how to use the role-based access control system implemented in this Next.js application.

## Overview

The system extracts user roles from JWT tokens using the "go:" prefix pattern (e.g., "go:admin", "go:geral", "go:editor") and provides comprehensive access control throughout the application.

## Available Roles

- `admin`: Full administrative access
- `geral`: General management access (elevated permissions)
- `editor`: Content editing access

## JWT Token Structure Support

The system supports multiple JWT token structures and will automatically detect roles from:

1. **Client ID specific structure**: `resource_access[CLIENT_ID].roles`
2. **Superapp structure**: `resource_access.superapp.roles` 
3. **Any resource_access key**: Falls back to any key with a `roles` array

Example JWT payload structures:
```json
// Structure 1: Client ID specific
{
  "resource_access": {
    "your-client-id": {
      "roles": ["go:admin", "admin:login"]
    }
  }
}

// Structure 2: Superapp (common structure)
{
  "resource_access": {
    "superapp": {
      "roles": ["go:admin", "admin:login"]
    }
  }
}
```

## Core Components

### 1. JWT Utilities (`src/lib/jwt-utils.ts`)

#### Functions:
- `getUserRole(token: string): UserRole | null` - Extracts role from JWT token
- `hasRole(token: string, allowedRoles: UserRole[]): boolean` - Checks if user has any of the specified roles
- `isAdmin(token: string): boolean` - Checks if user is admin
- `hasElevatedPermissions(token: string): boolean` - Checks if user has admin or geral role

#### Example:
```typescript
import { getUserRole, hasRole } from '@/lib/jwt-utils'

const token = 'your-jwt-token'
const userRole = getUserRole(token) // Returns 'admin', 'geral', 'editor', or null
const canEdit = hasRole(token, ['admin', 'geral']) // Returns boolean
```

### 2. Route Permissions (`src/lib/route-permissions.ts`)

Defines which roles can access specific routes.

#### Functions:
- `hasRouteAccess(route: string, userRole: UserRole | null): boolean`
- `getAllowedRoles(route: string): UserRole[] | null`

#### Configuration:
Routes are configured in the `ROUTE_PERMISSIONS` object:

```typescript
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/': ['admin', 'geral', 'editor'],
  '/servicos-municipais/servicos/new': ['admin', 'geral'],
  // ... more routes
}
```

### 3. Menu System (`src/lib/menu-list.ts`)

#### Functions:
- `getMenuList(pathname: string): Group[]` - Returns complete menu structure
- `getFilteredMenuList(pathname: string, userRole: UserRole | null): Group[]` - Returns filtered menu based on user role

#### Menu Configuration:
Each menu item and submenu can specify `allowedRoles`:

```typescript
{
  href: '/servicos-municipais/servicos/new',
  label: 'Novo Serviço',
  allowedRoles: ['admin', 'geral'],
}
```

### 4. React Hooks (`src/hooks/use-user-role.ts`)

Client-side hooks for accessing user role information:

#### Available Hooks:
- `useUserRole(): UserRole | null` - Gets current user's role
- `useHasRole(allowedRoles: UserRole[]): boolean` - Checks if user has any of the specified roles
- `useIsAdmin(): boolean` - Checks if user is admin
- `useHasElevatedPermissions(): boolean` - Checks if user has admin or geral role

#### Example Usage:
```typescript
import { useUserRole, useHasElevatedPermissions } from '@/hooks/use-user-role'

function MyComponent() {
  const userRole = useUserRole()
  const hasElevatedPermissions = useHasElevatedPermissions()
  
  return (
    <div>
      {userRole && <p>Your role: {userRole}</p>}
      {hasElevatedPermissions && <button>Admin Action</button>}
    </div>
  )
}
```

## Middleware Protection

The middleware automatically protects routes based on the `ROUTE_PERMISSIONS` configuration. Users without proper roles will be redirected to the unauthorized page.

## Implementation Examples

### 1. Protecting UI Elements

```typescript
import { useHasRole } from '@/hooks/use-user-role'

function ServiceActions() {
  const canCreateService = useHasRole(['admin', 'geral'])
  
  return (
    <div>
      {canCreateService && (
        <Button onClick={createService}>
          Create New Service
        </Button>
      )}
    </div>
  )
}
```

### 2. Server-Side Role Checking

```typescript
import { getUserRole } from '@/lib/jwt-utils'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const token = cookieStore.get('access_token')?.value
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const userRole = getUserRole(token)
  if (!userRole || !['admin', 'geral'].includes(userRole)) {
    return new Response('Forbidden', { status: 403 })
  }
  
  // Proceed with admin/geral only logic
}
```

### 3. Menu Filtering

The menu component automatically filters items based on user roles:

```typescript
import { Menu } from '@/components/admin-panel/menu'

// Menu automatically shows only items the user has access to
function Layout() {
  return <Menu isOpen={true} />
}
```

## Adding New Routes

1. Add the route and its allowed roles to `ROUTE_PERMISSIONS` in `src/lib/route-permissions.ts`:

```typescript
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // ... existing routes
  '/new-feature': ['admin'], // Only admin can access
  '/new-feature/edit/*': ['admin', 'geral'], // Admin and geral can edit
}
```

2. Add menu items with role restrictions in `src/lib/menu-list.ts`:

```typescript
{
  href: '/new-feature',
  label: 'New Feature',
  allowedRoles: ['admin'],
  submenus: [
    {
      href: '/new-feature/edit',
      label: 'Edit',
      allowedRoles: ['admin', 'geral'],
    }
  ]
}
```

## Migration from isAdmin Pattern

Replace hardcoded `isAdmin` checks with role-based hooks:

### Before:
```typescript
function Component({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div>
      {isAdmin && <AdminButton />}
    </div>
  )
}
```

### After:
```typescript
import { useHasElevatedPermissions } from '@/hooks/use-user-role'

function Component() {
  const hasElevatedPermissions = useHasElevatedPermissions()
  
  return (
    <div>
      {hasElevatedPermissions && <AdminButton />}
    </div>
  )
}
```

## Security Notes

1. **Client-side checks are for UX only** - Always validate permissions on the server side
2. **Middleware protection** - Routes are protected at the middleware level
3. **Token validation** - The system validates JWT tokens and their expiration
4. **Role extraction** - Roles are extracted securely from the JWT payload

## Troubleshooting

### Common Issues:

1. **Menu items not showing**: Check if the user role is included in the `allowedRoles` array
2. **Route access denied**: Verify the route is configured in `ROUTE_PERMISSIONS`
3. **Role not detected**: Ensure the JWT token contains the role with "go:" prefix
4. **Client-side role is null**: Check if the access token cookie is set and valid

### Debug Tips:

```typescript
// Debug user role
const userRole = useUserRole()
console.log('Current user role:', userRole)

// Debug route access
import { hasRouteAccess } from '@/lib/route-permissions'
const canAccess = hasRouteAccess('/your-route', userRole)
console.log('Can access route:', canAccess)
```

