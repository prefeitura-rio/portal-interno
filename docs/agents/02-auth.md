# 02 — Autenticação e RBAC (Keycloak + Heimdall)

## Modelo

1. OAuth2/OIDC Identidade Carioca (Keycloak) → cookies httpOnly `access_token` / `refresh_token`.
2. Middleware valida JWT (expiry + refresh).
3. Middleware consulta Heimdall `GET /users/me` (cache só na memória do servidor, chaveado pelo `access_token`: `src/lib/heimdall-user-cache.ts`). O cookie legado `heimdall_user` vinha do cliente e **nunca** decide papéis nem CPF; não reintroduza cache de autorização em cookie sem assinatura.
4. `hasRouteAccess(path, roles)` via `ROUTE_PERMISSIONS` (páginas).
5. Rotas de API (`/api/*`): `hasApiRouteAccess` via `API_ROUTE_PERMISSIONS`, no mesmo middleware; responde `401`/`403` em JSON e nega rota sem regra.

**Não use next-auth.** Auth é cookies Keycloak + Heimdall; não há camada Auth.js.

Diferente do [superapp](https://github.com/prefeitura-rio/superapp): aqui **Heimdall é obrigatório**.

## Arquivos âncora

| Concern | Path |
|---------|------|
| Middleware (auth, RBAC, CSP, flag MEI) | `src/middleware.ts` |
| Mapa rota → papéis | `src/lib/route-permissions.ts` |
| Constantes de papéis | `src/types/heimdall-roles.ts` |
| Helpers middleware / Heimdall fetch | `src/lib/middleware-helpers.ts` |
| Cache server `/me` | `src/lib/heimdall-user-cache.ts`, `src/lib/heimdall-user.ts` |
| Cookies | `src/lib/auth-cookie-config.ts` |
| Refresh | `src/lib/token-refresh.ts`, `docs/TOKEN_REFRESH_STRATEGY.md` |
| Auth API | `src/app/api/auth/{callback/keycloak,refresh,logout,token-status}` |
| Context/hooks client | `src/contexts/heimdall-user-context.tsx`, `src/hooks/use-heimdall-user.ts` |

## Papéis (exemplos)

- Globais: `admin`, `superadmin`
- Cursos: `go:admin`, `go:cursos:*` (ver `COURSES_ROLES`)
- Empregabilidade: `go:empregabilidade:*` (ver `EMPREGO_TRABALHO_ROLES`)
- Serviços: `busca:services:admin`, `busca:services:editor`

Matriz completa: [`HEIMDALL_RBAC.md`](../../HEIMDALL_RBAC.md).

## Ao criar rota nova

1. Adicionar path em `ROUTE_PERMISSIONS` com os papéis corretos (rota de API nova: em `API_ROUTE_PERMISSIONS`, com o caminho da pasta em `src/app/api`).
2. Se a rota aparece no sidebar, atualizar `src/lib/menu-list.ts`.
3. Sem papel adequado → `/unauthorized`. Logs do middleware nunca levam o CPF: use o identificador opaco de `src/lib/log-user-ref.ts`.

## O que fazer / não fazer

**Fazer**

- Reusar helpers de auth/Heimdall existentes.
- Tratar falha Heimdall / sem papel de forma explícita (não “liberar” por omissão).

**Não fazer**

- Introduzir next-auth / Auth.js.
- Proteger rotas **só** no client (sidebar hide ≠ segurança).
- Hardcodar bypass de RBAC em produção.

## Docs detalhadas

- [`HEIMDALL_RBAC.md`](../../HEIMDALL_RBAC.md)
- [`docs/TOKEN_REFRESH_STRATEGY.md`](../TOKEN_REFRESH_STRATEGY.md)
