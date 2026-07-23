# 06 — Playbook de PR (PMs / Claude Code)

Checklist para transformar um pedido de alto nível (ex.: Jira) em um PR seguro neste repositório.

## 1. Entender o escopo

- [ ] A feature é **admin/backoffice**? Se for UX do cidadão → [superapp](https://github.com/prefeitura-rio/superapp).
- [ ] Precisa de endpoint novo, migration ou mudança de política RBAC no backend → outro GitHub repo ([app-go-api](https://github.com/prefeitura-rio/app-go-api), [heimdall-frontend](https://github.com/prefeitura-rio/heimdall-frontend), …). Documente com link; não invente backend aqui.
- [ ] Ler [00-overview.md](00-overview.md) e o domínio em [04-domains.md](04-domains.md).
- [ ] Não assumir pastas irmãs no disco — no GitHub/Jira só este repo está disponível.

## 2. Ler a fonte de verdade certa

- [ ] Doc Next.js (dual pointer — ver `AGENTS.md`): local se existir **ou** [llms.txt](https://nextjs.org/docs/llms.txt) / [docs/app](https://nextjs.org/docs/app).
- [ ] Temáticos: [01-architecture](01-architecture.md), [02-auth](02-auth.md), [03-apis-orval](03-apis-orval.md), [05-code-style](05-code-style.md).
- [ ] RBAC: [`HEIMDALL_RBAC.md`](../../HEIMDALL_RBAC.md) + `src/lib/route-permissions.ts`.
- [ ] Docs de domínio em `docs/` quando aplicável.

## 3. Localizar onde implementar

- [ ] Página sob `(private)/(app)/` no domínio certo (`gorio`, `servicos-municipais`, `heimdall`, …).
- [ ] **RBAC:** atualizar `ROUTE_PERMISSIONS` com os papéis corretos.
- [ ] **Menu:** atualizar `src/lib/menu-list.ts` se a entrada for navegável.
- [ ] Preferir BFF em `src/app/api/` + client Orval certo (`http-gorio`, `http-busca-search`, `http-heimdall`, `http-rmi`).

## 4. Decisões técnicas padrão

- [ ] RSC por padrão; `'use client'` só se necessário (tabelas/forms/TipTap ok no admin).
- [ ] Auth: cookies Keycloak + Heimdall — sem next-auth.
- [ ] Forms: RHF + Zod; listagens: TanStack Table/Query; estado UI: Zustand se já for o padrão da tela.
- [ ] UI: shadcn; só Tailwind em `className`; escala (`p-3`) > `p-[12px]`; cores via tokens de `globals.css`.
- [ ] Ícones: Lucide; customs em `src/components/icons/` se existirem.
- [ ] Flag MEI: lembrar que `NEXT_PUBLIC_FEATURE_FLAG === 'true'` **bloqueia** `oportunidades-mei`.

## 5. O que NÃO incluir no PR

- Regeneração Orval “por precaução” ou troca permanente de `orval.config.ts` sem pedido.
- Refactors amplos fora do ticket.
- Secrets / `.env` com credenciais.
- Mudanças em `node_modules` ou locks não relacionados.

## 6. Verificar antes de abrir o PR

```bash
npm run format
npm run lint
npm run typecheck
```

- [ ] Diff focado no pedido.
- [ ] Descrição do PR: o quê / por quê; links Jira; papéis Heimdall afetados; dependências em outros repos.
- [ ] Screenshots ou notas de QA se for UI visível.

## 7. Pedidos típicos de Jira → onde olhar

| Pedido (exemplo) | Começar em |
|------------------|------------|
| CRUD / fluxo de curso | `/gorio/courses`, `http-gorio/`, BFF courses |
| Vaga / empresa | `/gorio/empregabilidade`, papéis empregabilidade |
| Oportunidade MEI | `/gorio/oportunidades-mei` + flag + papéis admin/go:admin |
| Serviço municipal / aprovação | `/servicos-municipais/`, `http-busca-search/` |
| Usuários / grupos / papéis | `/heimdall/`, `http-heimdall/`, `HEIMDALL_RBAC.md` |
| Login / unauthorized / sessão | [02-auth.md](02-auth.md) — cuidado alto |
| Tela no portal do cidadão | **outro repo:** [superapp](https://github.com/prefeitura-rio/superapp) |
