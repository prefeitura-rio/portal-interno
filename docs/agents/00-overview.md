# 00 — Overview do ecossistema e limites do portal-interno

## Papel deste repositório

**portal-interno** = backoffice admin. Gerencia cursos, vagas/empregabilidade, oportunidades MEI, carta de serviços (fluxo de aprovação) e administração Heimdall (usuários/grupos/papéis).

Repo GitHub: [prefeitura-rio/portal-interno](https://github.com/prefeitura-rio/portal-interno).

> **Ambiente Jira / Claude Code:** o agent trabalha só neste checkout. Não existem pastas irmãs (`../app-go-api`, monorepo local). Para código ou specs de outros serviços, use os links GitHub abaixo (ou o client Orval já gerado em `src/http-*`).

## Mapa rápido (repos GitHub)

| Projeto | Papel | Repo | Relação com portal-interno |
|---------|-------|------|----------------------------|
| **portal-interno** | Backoffice admin | [prefeitura-rio/portal-interno](https://github.com/prefeitura-rio/portal-interno) | este repo |
| **superapp** | Portal do cidadão | [prefeitura-rio/superapp](https://github.com/prefeitura-rio/superapp) | Consome o que o backoffice publica; UX cidadão **não** vive aqui |
| **app-go-api** | API Go (cursos, empregos, MEI, currículo) | [prefeitura-rio/app-go-api](https://github.com/prefeitura-rio/app-go-api) | Cliente `src/http-gorio/` |
| **app-busca-search** | Carta de serviços | [prefeitura-rio/app-busca-search](https://github.com/prefeitura-rio/app-busca-search) | Cliente `src/http-busca-search/` |
| **app-rmi** | Dados do cidadão / PJ | [prefeitura-rio/app-rmi](https://github.com/prefeitura-rio/app-rmi) | Cliente `src/http-rmi/` |
| **heimdall-frontend** | Admin UI + backend RBAC | [prefeitura-rio/heimdall-frontend](https://github.com/prefeitura-rio/heimdall-frontend) | Cliente `src/http-heimdall/`; middleware chama `/users/me` |
| **app-catalogo** | Busca/recomendações (cidadão) | [prefeitura-rio/app-catalogo](https://github.com/prefeitura-rio/app-catalogo) | Usado sobretudo pelo superapp |

## Identidade e autorização

- Keycloak (`idrio_cidadao`) emite JWTs (cookies no portal).
- **Heimdall** resolve grupos/papéis (`GET /api/v1/users/me`) — **obrigatório** neste app (diferente do superapp).
- Matriz detalhada: [`HEIMDALL_RBAC.md`](../../HEIMDALL_RBAC.md).

## O que NÃO fazer neste repo

- Telas/fluxos do **cidadão** (carteira, inscrição pública, busca cidadão) → [superapp](https://github.com/prefeitura-rio/superapp).
- Handlers Go, migrations, workers → [app-go-api](https://github.com/prefeitura-rio/app-go-api) (ou API correspondente).
- Inventar endpoint de backend — só BFF em `src/app/api/` ou UI que chama APIs existentes.
- Assumir checkout local de outros projetos — no GitHub/Jira só este repo está disponível.
- Ignorar RBAC: rota sem `ROUTE_PERMISSIONS` (ou papel errado) quebra acesso ou abre buraco.

## O que SIM fazer neste repo

- Páginas admin no App Router (`gorio`, `servicos-municipais`, `heimdall`, `superadmin`).
- Proxies BFF em `src/app/api/` + clients Orval.
- Atualizar `route-permissions.ts` e `menu-list.ts` junto com rotas novas.
- Feature flags de superfície (ex.: MEI no middleware).
- Lint/typecheck (Biome + `tsc`).
- Documentar no PR dependências em outros repositórios (com link).
