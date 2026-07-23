# 04 — Domínios e feature flags

## Domínios principais

| Domínio | Rotas âncora | Código / client |
|---------|--------------|-----------------|
| Capacitação (cursos) | `/gorio/courses`, `/new`, `/course/[course-id]` | `gorio/`, `http-gorio/`, BFF courses |
| Empregabilidade | `/gorio/empregabilidade`, `/new`, `/[id]`, `/empresas`, `/empresas/[cnpj]` | `http-gorio/`, BFF empregabilidade |
| MEI | `/gorio/oportunidades-mei`, `/new`, `/oportunidade-mei/[id]` | `http-gorio/`; papéis admin/go:admin; **feature flag** |
| Serviços municipais | `/servicos-municipais/servicos`, `/new`, `/servico/[id]` | `http-busca-search/`, BFF services |
| Heimdall admin | `/heimdall`, `/usuarios`, `/grupos`, `/papeis`, `/acoes`, `/mapeamentos`, … | `http-heimdall/` |
| Superadmin | `/superadmin/vinculos-secretaria/*` | papéis elevados |
| Conta / home | `/account`, `/` | dashboard |

Menu: `src/lib/menu-list.ts`. Permissões: `src/lib/route-permissions.ts`.

## Feature flag MEI

Em `src/middleware.ts`: quando `NEXT_PUBLIC_FEATURE_FLAG === 'true'`, rotas com `oportunidades-mei` são **bloqueadas**.

Atenção: o nome da env é genérico; o efeito atual é **bloquear MEI** quando `'true'` — não tratar como “liga tudo”.

## Docs de domínio

- Cursos / API: [`../README_API_CURSOS.md`](../README_API_CURSOS.md), [`../API_INTEGRATION.md`](../API_INTEGRATION.md)
- TipTap: [`../tiptap-markdown-implementation.md`](../tiptap-markdown-implementation.md)
- Upload GCS: [`../image-upload-gcs.md`](../image-upload-gcs.md)
- Schedules / status: docs `gorio-*` e `refactor-course-status-*` em `docs/`
- RBAC: [`../../HEIMDALL_RBAC.md`](../../HEIMDALL_RBAC.md)
