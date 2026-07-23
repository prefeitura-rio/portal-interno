<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Portal Interno — contexto para agentes

Backoffice da Prefeitura do Rio (pref.rio). Este repositório é o frontend Next.js **admin** — gestão de cursos, empregabilidade, MEI, carta de serviços e Heimdall. **Não** é o portal do cidadão ([superapp](https://github.com/prefeitura-rio/superapp)).

Repo: [prefeitura-rio/portal-interno](https://github.com/prefeitura-rio/portal-interno).

## Stack (fonte de verdade: `package.json`)

- Next.js **15.5** (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (Radix)
- TanStack Query v5 + TanStack Table + Zustand (+ Immer)
- React Hook Form + Zod, TipTap, dnd-kit
- Orval (clientes OpenAPI → TypeScript)
- Biome (lint/format)

## Docs Next.js (dual pointer)

A training data está desatualizada. Use **uma** destas fontes (nesta ordem):

1. **Local (se existir após `npm install`):** `node_modules/next/dist/docs/` — docs empacotadas (disponíveis de forma confiável no Next ≥16.2; neste repo **15.5** o path costuma **não** existir).
2. **Remoto (preferencial neste projeto / CI / Claude Code no GitHub / sem `node_modules`):**
   - Índice LLM: [https://nextjs.org/docs/llms.txt](https://nextjs.org/docs/llms.txt)
   - Docs App Router: [https://nextjs.org/docs/app](https://nextjs.org/docs/app)
   - Guia AI agents: [https://nextjs.org/docs/app/guides/ai-agents](https://nextjs.org/docs/app/guides/ai-agents)

Agentes via Jira → GitHub em geral **não** têm `node_modules` — use o ponteiro remoto.

## Antes de implementar

1. Ler a doc Next.js relevante (dual pointer acima).
2. Abrir o arquivo temático em `docs/agents/` que cobre a tarefa.
3. Para RBAC, ler [`HEIMDALL_RBAC.md`](HEIMDALL_RBAC.md) e [`src/lib/route-permissions.ts`](src/lib/route-permissions.ts).
4. Para o ecossistema, usar [00-overview.md](docs/agents/00-overview.md) e links GitHub — **não** assumir pastas irmãs no disco. Este repo no GitHub é standalone.

## Índice — `docs/agents/`

| Arquivo                                             | Quando ler                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| [00-overview.md](docs/agents/00-overview.md)         | Papel do backoffice vs outros projetos; o que**não** mudar aqui |
| [01-architecture.md](docs/agents/01-architecture.md) | Rotas, BFF, estado, menu                                               |
| [02-auth.md](docs/agents/02-auth.md)                 | Keycloak, Heimdall, route permissions                                  |
| [03-apis-orval.md](docs/agents/03-apis-orval.md)     | Clientes`http-*`, mutators, regenerar Orval                          |
| [04-domains.md](docs/agents/04-domains.md)           | Cursos, empregabilidade, MEI, serviços, Heimdall UI, superadmin       |
| [05-code-style.md](docs/agents/05-code-style.md)     | Convenções de código e UI                                           |
| [06-pr-playbook.md](docs/agents/06-pr-playbook.md)   | Checklist para PRs de alto nível (PMs / Claude Code)                  |

## Regras de ouro

- Auth = cookies JWT do Keycloak (`access_token` / `refresh_token`) + **Heimdall RBAC**. **Não** usar next-auth.
- Toda rota nova protegida precisa de entrada em `ROUTE_PERMISSIONS` (e, se aparecer no menu, em `src/lib/menu-list.ts`).
- Preferir BFF em `src/app/api/` + clients Orval no server; evitar chamar backends direto do browser.
- Dados de API: cliente Orval certo em `src/http-*` — não inventar fetch ad-hoc se o client já existe.
- Não regenerar Orval nem editar specs OpenAPI sem necessidade explícita da tarefa.
- Mudanças de handlers Go, migrations ou políticas Heimdall de backend **não** pertencem a este repo (salvo UI admin Heimdall aqui).
- UX do cidadão (busca pública, carteira, inscrição) → [superapp](https://github.com/prefeitura-rio/superapp).
- UI: shadcn (`src/components/ui/`) + Tailwind; sem CSS inline salvo necessidade; escala (`p-3`) > arbitrary (`p-[12px]`); cores via tokens em `src/app/globals.css`.
- Ícones: **Lucide** por padrão; 
- Qualidade: `npm run lint` + `npm run typecheck` (não há Vitest/Playwright neste repo).
