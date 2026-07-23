# 05 — Code style e convenções

Stack alvo: TypeScript, Next.js **15.5** App Router, React 19, shadcn/ui, Radix, Tailwind 4.

## Estrutura e estilo

- Código TypeScript conciso e funcional; evitar classes.
- Preferir iteração e modularização a duplicação.
- Nomes descritivos com verbos auxiliares (`isLoading`, `hasError`).
- Ordem típica de arquivo: export do componente → subcomponentes → helpers → conteúdo estático → tipos.
- Diretórios: `lowercase-with-dashes`.
- Preferir **named exports** para componentes.

## TypeScript

- Preferir `interface` a `type` para props/objetos.
- Evitar `enum`; usar maps/const objects.
- Zod para validação e inferência de tipos.
- Componentes funcionais com interface de props.

## Sintaxe

- Funções puras com keyword `function`.
- Condicionais simples sem chaves desnecessárias.
- JSX declarativo.

## UI — shadcn, Tailwind, ícones e tokens

- **shadcn/ui primeiro:** reutilizar `src/components/ui/` (`components.json` → new-york) antes de criar UI do zero. Radix + Tailwind; mobile-first onde fizer sentido (admin pode ser desktop-first, mas mantenha consistência com o design system).
- Chrome admin: sidebar, data-table, TipTap — reutilizar padrões existentes.

### Tailwind (obrigatório)

- Estilizar **sempre** com classes Tailwind (`className`). **Não** usar CSS inline (`style={{ ... }}`) salvo necessidade real (valor dinâmico, CSS variables em runtime, libs de terceiros).
- Preferir a **escala do Tailwind** a valores arbitrários: `p-3` em vez de `p-[12px]`; `gap-4` em vez de `gap-[16px]`. Arbitrary (`[…]`) só sem token equivalente.
- Evitar novas folhas `.css` para layout/espaçamento/cores de componente.

### Cores

- Evitar cores hardcoded (`#13335a`, `bg-[#…]`, `text-blue-500` ad-hoc).
- Preferir tokens em [`src/app/globals.css`](../../src/app/globals.css) (`bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, tokens de sidebar, etc.).
- Token novo: adicionar em `globals.css` e usar a classe gerada.

### Ícones

1. **Lucide React** é o padrão deste projeto (`iconLibrary` no shadcn).
2. Customs existentes: `src/components/icons/` (`cost-icon`, `department-icon`, `pref-logo`, …) — reutilizar se couber.
3. Se criar ícone custom novo, colocar em `src/components/icons/` e mencionar no PR.

## Performance / RSC

- Minimizar `'use client'`, `useEffect` e `useState`; favor Server Components quando possível.
- Client components (tabelas, forms, TipTap, dnd) são esperados em telas admin — isolar a superfície client.

## Estado

- Remoto: TanStack Query.
- UI local complexa: Zustand (+ Immer).
- Forms: RHF + Zod.
- Tabelas: TanStack Table.

## Qualidade

- Lint/format: Biome (`npm run lint`, `npm run format`).
- Types: `npm run typecheck`.
- **Não há** suite Vitest/Playwright neste repo; o gate de PR é lint + typecheck.

## Next.js

Dual pointer em `AGENTS.md`: `node_modules/next/dist/docs/` se existir; senão [llms.txt](https://nextjs.org/docs/llms.txt) / [docs/app](https://nextjs.org/docs/app). Neste repo (Next 15.5) o path local costuma não existir — preferir remoto.
