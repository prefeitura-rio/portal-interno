# 01 — Arquitetura do portal-interno

## App Router — route groups

Sob `src/app/`:

| Área                  | Path                                            | Notas                                                                   |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| App autenticada        | `(private)/(app)/`                            | Shell admin (sidebar, etc.)                                             |
| Capacitação / GO Rio | `(private)/(app)/gorio/`                      | Cursos, empregabilidade, MEI                                            |
| Serviços municipais   | `(private)/(app)/servicos-municipais/`        | Fluxo de aprovação                                                    |
| Heimdall UI            | `(private)/(app)/heimdall/`                   | Usuários, grupos, papéis, ações, mapeamentos                        |
| Superadmin             | `(private)/(app)/superadmin/`                 | Vínculos secretaria                                                    |
| Conta / dashboard      | `(private)/(app)/account/`, `(dashboard)/`  |                                                                         |
| Sessão                | `(private)/session-expired`, `unauthorized` |                                                                         |
| Público               | `(public)/description`                        |                                                                         |
| BFF                    | `app/api/**`                                  | Auth, courses, empregabilidade, MEI, services, heimdall proxy, upload… |

## Onde colocar código

| Pasta                                                                 | Uso                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/app/(private)/(app)/...`                                       | Páginas admin                                                     |
| `src/components/`                                                   | Shared +`ui/` (shadcn) + chrome (sidebar, etc.)                  |
| `src/components/icons/`                                             | Ícones custom pontuais                                            |
| `src/app/api/`                                                      | Route Handlers / BFF (preferencial para o browser)                 |
| `src/http-*`                                                        | Clientes Orval —**não** editar à mão salvo regeneração |
| `src/lib/`                                                          | Auth, Heimdall,`route-permissions`, `menu-list`, utils         |
| `src/hooks/`, `src/contexts/`, `src/constants/`, `src/types/` | Suporte                                                            |

## Estado e dados

- **TanStack Query** para dados remotos no client.
- **Zustand (+ Immer)** para estado de UI/admin complexo.
- **TanStack Table** para listagens admin.
- **TipTap** para rich text / markdown.
- **React Hook Form + Zod** para forms.
- Menu lateral: `src/lib/menu-list.ts` — atualizar ao adicionar seções.

## BFF vs chamada direta

- Preferir `src/app/api/*` no browser; o BFF usa mutators Orval com cookies no server.
- Não duplicar lógica de negócio que já existe na API Go.
- Clients Orval (`http-gorio`, etc.) são a fonte tipada no server/BFF.

## Docs relacionadas

- Auth/RBAC: [02-auth.md](02-auth.md)
- APIs: [03-apis-orval.md](03-apis-orval.md)
- Domínios: [04-domains.md](04-domains.md)
