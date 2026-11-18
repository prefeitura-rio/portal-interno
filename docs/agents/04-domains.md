# 04 — Domínios e feature flags

## Domínios principais

| Domínio | Rotas âncora | Código / client |
|---------|--------------|-----------------|
| Capacitação (cursos) | `/gorio/courses`, `/new`, `/course/[course-id]`, `/dashboard` (Casa Civil e admins; **feature flag runtime**) | `gorio/`, `http-gorio/`, BFF courses |
| Empregabilidade | `/gorio/empregabilidade`, `/new`, `/[id]`, `/empresas`, `/empresas/[cnpj]` | `http-gorio/`, BFF empregabilidade |
| Banco de currículos | `/gorio/banco-curriculos`, `/[cpf]` | `http-gorio/empregabilidade-banco-curriculos`, BFF `api/empregabilidade/banco-curriculos`; papéis `go:curriculos:*` |
| MEI | `/gorio/oportunidades-mei`, `/new`, `/oportunidade-mei/[id]` | `http-gorio/`; papéis admin/go:admin; **feature flag** |
| Serviços municipais | `/servicos-municipais/servicos`, `/new`, `/servico/[id]` | `http-busca-search/`, BFF services |
| Heimdall admin | `/heimdall`, `/usuarios`, `/grupos`, `/papeis`, `/acoes`, `/mapeamentos`, … | `http-heimdall/` |
| Superadmin | `/superadmin/vinculos-secretaria/*` | papéis elevados |
| Conta / home | `/account`, `/` | dashboard |

Menu: `src/lib/menu-list.ts`. Permissões: `src/lib/route-permissions.ts`.

## Feature flag MEI

Em `src/middleware.ts`: quando `NEXT_PUBLIC_FEATURE_FLAG === 'true'`, rotas com `oportunidades-mei` são **bloqueadas**.

Atenção: o nome da env é genérico; o efeito atual é **bloquear MEI** quando `'true'` — não tratar como “liga tudo”.

É flag de **build** (`NEXT_PUBLIC_*` é embutida no bundle no `next build`): trocar o valor exige novo build.

## Feature flags de runtime (server-side)

Helpers em `src/lib/feature-flags.ts`, no padrão do superapp: `process.env.NOME === 'true'`, lidos **só no servidor** e **seguros por padrão** (ausente, vazio ou qualquer valor diferente de `'true'` = desligado). As variáveis vêm do Secret do pod (Infisical, com `secrets.infisical.com/auto-reload` em `k8s/*/resources.yaml`): trocar o valor no Infisical surte efeito no reinício automático dos pods, **sem novo build** nem mudança no Dockerfile.

| Variável | Helper | Efeito quando desligada | Valores |
|----------|--------|-------------------------|---------|
| `FEATURE_COURSES_DASHBOARD` | `isCoursesDashboardEnabled()` | Some o item "Dashboard" de Capacitação no menu; `/gorio/courses/dashboard` → 404 (no `src/middleware.ts`, depois do RBAC, via `isPageDisabledByFeatureFlag()`; o `notFound()` no `layout.tsx` da rota é a segunda barreira, para o prefetch que o middleware não casa); `GET /api/courses/dashboard` → 404, sem chamar a API. Vale para todos os papéis, inclusive admins | `true` em staging; `false` em produção até a homologação da Casa Civil |

Regras para flag nova:

- Leia só em código de servidor (Route Handler, Server Component, layout) e em renderização dinâmica (`export const dynamic = 'force-dynamic'` no segmento ou `await connection()`), senão o valor congela no build.
- Nunca leia `process.env.FEATURE_*` nem importe `@/lib/feature-flags` (fora `import type`) em componente `'use client'`: o valor chega ao client pelo `FeatureFlagsProvider` (`src/contexts/feature-flags-context.tsx`), alimentado por `getRuntimeFeatureFlags()` no layout `(private)/(app)/layout.tsx`. Fora do provider, tudo fica desligado.
- Página desligada: o 404 sai do middleware (`isPageDisabledByFeatureFlag()`), não do `notFound()` (que já chega em streaming, com status 200) nem de rewrite para `/_not-found` (o middleware roda de novo no caminho reescrito e o RBAC nega rota sem regra).
- A flag **soma-se** ao RBAC (`ROUTE_PERMISSIONS` / `API_ROUTE_PERMISSIONS`), nunca o substitui: o middleware recusa quem não tem o papel antes da checagem da flag.
- A variável é criada no Infisical (staging e produção) por quem administra os segredos; este repo não define o valor.

## Docs de domínio

- Cursos / API: [`../README_API_CURSOS.md`](../README_API_CURSOS.md), [`../API_INTEGRATION.md`](../API_INTEGRATION.md)
- TipTap: [`../tiptap-markdown-implementation.md`](../tiptap-markdown-implementation.md)
- Upload GCS: [`../image-upload-gcs.md`](../image-upload-gcs.md)
- Schedules / status: docs `gorio-*` e `refactor-course-status-*` em `docs/`
- RBAC: [`../../HEIMDALL_RBAC.md`](../../HEIMDALL_RBAC.md)
