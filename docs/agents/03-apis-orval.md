# 03 — APIs e Orval

## Clientes gerados

| Pasta | Backend (GitHub) | Mutator (raiz do repo) | Base URL (env) |
|-------|------------------|------------------------|----------------|
| `src/http-gorio/` | [app-go-api](https://github.com/prefeitura-rio/app-go-api) | `custom-fetch-gorio.ts` → `customFetchGoRio` | `COURSES_BASE_API_URL` |
| `src/http-busca-search/` | [app-busca-search](https://github.com/prefeitura-rio/app-busca-search) | `custom-fetch-busca-search.ts` → `customFetchBuscaSearch` | `BUSCA_SEARCH_API_URL` |
| `src/http-heimdall/` | [heimdall-frontend](https://github.com/prefeitura-rio/heimdall-frontend) / Heimdall API | `custom-fetch-heimdall.ts` → `customFetchHeimdall` | `HEIMDALL_BASE_API_URL` |
| `src/http-rmi/` | [app-rmi](https://github.com/prefeitura-rio/app-rmi) | `custom-fetch-rmi.ts` → `customFetchRmi` | `RMI_BASE_API_URL` |

Os mutators injetam `Authorization: Bearer` a partir dos cookies de sessão.

A UI em geral chama **BFF** em `src/app/api/*`, que por sua vez usa esses clients no server.

## Orval — config ativa única

[`orval.config.ts`](../../orval.config.ts) aponta para **um** target por vez (hoje tipicamente RMI ou outro, conforme o último regen).

Para regenerar outro client: editar `input` / `target` / `schemas` / `baseUrl` / mutator conforme [`../orval-apis.md`](../orval-apis.md), rodar Orval, e **não** commititar config “trocada” sem combinar com o time.

## Regras

- Preferir funções geradas em `src/http-*` em vez de `fetch` manual.
- Não editar arquivos gerados à mão; regenere a partir da OpenAPI.
- Mudança de contrato = PR no repo da API, depois regenerar o client aqui.
- Preferir estender `src/app/api/` a expor backend cru no browser.

## Quando o código da API não está no checkout

No Jira / Claude Code no GitHub, só o `portal-interno` está clonado. Nesse caso:

1. Use o client Orval e tipos já gerados em `src/http-*`.
2. Se precisar inspecionar a API, abra o repo GitHub correspondente ou a OpenAPI raw — não invente shape de response.
3. Se faltar endpoint, documente a dependência no PR com link para o outro repo.

## Docs relacionadas

- [`../orval-apis.md`](../orval-apis.md)
- [`../API_INTEGRATION.md`](../API_INTEGRATION.md)
- Overview: [00-overview.md](00-overview.md)
