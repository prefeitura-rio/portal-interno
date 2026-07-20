# Heimdall — controle de acesso

Heimdall é o serviço de RBAC do ecossistema pref.rio. Ele gerencia **grupos**, **papéis**, **ações** e **mappings** (endpoint → ação), e sincroniza no **Cerbos** quais ações cada usuário pode executar.

O **portal-interno** consome a API do Heimdall para administrar esse modelo. A autorização em runtime das APIs do mesh **não** passa por esta tela: passa pelo gateway (Istio + cerbos-ext-authz + Cerbos), usando os dados que o Heimdall manteve.

OpenAPI da API: `/docs` (e `/openapi.json`) no serviço Heimdall.

---

## Modelo de entidades

```
Usuário (CPF = preferred_username do JWT)
  └─ Grupo(s)
       └─ Papel(éis)     → conjunto de Actions
            └─ Action    → o que o usuário pode fazer
                 └─ Mapping(s) → Method + path → Action
```

| Entidade                     | O que é                                                | Relacionamentos                                  |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| **Action**             | Capacidade nomeada (`user:read`, `course:list`, …) | Uma action pode ter vários endpoints            |
| **Mapping** (endpoint) | Associação`método HTTP + path` → action           | Um endpoint tem **exatamente uma** action |
| **Role**               | Conjunto de actions                                     | Role ↔ Action (N:N)                             |
| **Group**              | Conjunto de usuários                                   | Group ↔ User (N:N), Group ↔ Role (N:N)         |

Regras práticas:

- Action descreve **o que** alguém pode fazer, não o path HTTP.
- Mapping liga a requisição (`GET /api/v1/courses`) a uma action. Paths podem usar padrões/regex (ex.: `{cpf}`, `*`).
- Role abstrai um pacote de permissões reutilizável.
- Group é a unidade organizacional: coloca usuários em roles.
- A partir dessa hierarquia, o Heimdall gera **principal policies** no Cerbos (quais actions aquele subject pode fazer).

### Ações reservadas (convenção de gateway)

Não são “mágicas” no código do Heimdall — são actions convencionais usadas pelos mappings e pelo ext-authz:

| Action            | Significado                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `public`        | Endpoint público; sem exigência de permissão fina             |
| `authenticated` | Exige JWT válido;**não** checa roles/actions além disso |

---

## Fluxo de uma requisição

Referência para debug quando algo retorna 403 no mesh (superapp e demais serviços atrás do Istio).

![Fluxo de autorização: Internet → Cloud Armor → Istio → cerbos-ext-authz → Cerbos → API](/heimdall/request-flow.png)

1. **Internet → Cloud Armor** — WAF e rate limiting. Bloqueio aqui: `403` HTML genérico (*Forbidden*).
2. **Istio** recebe a requisição e pergunta ao **cerbos-ext-authz**: *posso acessar este endpoint?*
3. **cerbos-ext-authz** usa os **mappings** do Heimdall para resolver `método + path` → **action**.
4. Pergunta ao **Cerbos**: *este usuário pode executar essa action?* (policies sincronizadas pelo Heimdall).
5. **Nega** → `403` com mensagem *denied by ext_authz* + motivo. **Autoriza** → a requisição segue para a API destino.

Papel do Heimdall nesse desenho:

- **Admin/API** gerencia groups, roles, actions, mappings.
- **Sync → Cerbos**: quais actions cada usuário pode fazer.
- **Mappings → cerbos-ext-authz**: como traduzir endpoint em action.

---

## Exemplo concreto: RBAC da própria API Heimdall

O controle de acesso da API de controle de acesso. Serve de modelo para outros serviços.

### Actions

#### User Management

- `user:read` — ver informações de usuário
- `user:list` — listar usuários

#### Group Management

- `group:create` / `group:read` / `group:list` / `group:delete`
- `group:manage_members` — adicionar/remover membros

#### Role Management

- `role:create` / `role:read` / `role:list` / `role:delete`
- `role:assign` — atribuir roles a grupos
- `role:manage_actions` — adicionar/remover actions de roles

#### Action Management

- `action:create` / `action:read` / `action:list` / `action:update` / `action:delete`

#### Mapping Management

- `mapping:create` / `mapping:read` / `mapping:list` / `mapping:update` / `mapping:delete`
- `mapping:resolve` — resolver endpoint → action

#### System Administration

- `system:health` — health/readiness
- `system:docs` — documentação OpenAPI
- `system:policy_template` — template de policy Cerbos

### Roles

Cada role abaixo **inclui** as permissions do `viewer`, salvo `superadmin`.

| Role                | Propósito                 | Além do viewer                                                                                       |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `viewer`          | Somente leitura            | `user/group/role/action/mapping` read+list, `mapping:resolve`, `system:health`, `system:docs` |
| `group_manager`   | Estrutura org. (grupos)    | `group:create`, `group:delete`, `group:manage_members`, `role:assign`                         |
| `role_manager`    | Estrutura de permissões   | `role:create`, `role:delete`, `role:manage_actions`                                             |
| `mapping_manager` | Integrações / endpoints  | `mapping:create`, `mapping:update`, `mapping:delete`                                            |
| `admin`           | Admin amplo (sem wildcard) | Tudo dos managers acima +`action:create/update/delete`, `system:policy_template`                  |
| `superadmin`      | Acesso total               | `*` (todas as actions)                                                                              |

### Groups

| Grupo                       | Role padrão        | Uso típico                          |
| --------------------------- | ------------------- | ------------------------------------ |
| `heimdall_viewers`        | `viewer`          | Auditoria, compliance, monitoramento |
| `heimdall_group_admins`   | `group_manager`   | RH/TI gerindo grupos e membership    |
| `heimdall_role_admins`    | `role_manager`    | Segurança definindo roles           |
| `heimdall_mapping_admins` | `mapping_manager` | DevOps configurando mappings         |
| `heimdall_admins`         | `admin`           | Admins de plataforma                 |
| `heimdall_superadmins`    | `superadmin`      | Arquitetos / acesso de emergência   |

### Mappings (endpoint → action)

| Method | Endpoint pattern                                        | Action                     |
| ------ | ------------------------------------------------------- | -------------------------- |
| GET    | `/api/v1/users/me`                                    | `user:read`              |
| GET    | `/api/v1/users/{cpf}`                                 | `user:read`              |
| GET    | `/api/v1/groups/`                                     | `group:list`             |
| POST   | `/api/v1/groups/`                                     | `group:create`           |
| DELETE | `/api/v1/groups/{group_name}`                         | `group:delete`           |
| GET    | `/api/v1/groups/{group_name}/members`                 | `group:read`             |
| POST   | `/api/v1/groups/{group_name}/members`                 | `group:manage_members`   |
| DELETE | `/api/v1/groups/{group_name}/members/{subject}`       | `group:manage_members`   |
| GET    | `/api/v1/roles/`                                      | `role:list`              |
| POST   | `/api/v1/roles/`                                      | `role:create`            |
| DELETE | `/api/v1/roles/{role_name}`                           | `role:delete`            |
| GET    | `/api/v1/roles/groups/{group_name}/roles`             | `role:read`              |
| POST   | `/api/v1/roles/groups/{group_name}/roles`             | `role:assign`            |
| DELETE | `/api/v1/roles/groups/{group_name}/roles/{role_name}` | `role:assign`            |
| GET    | `/api/v1/roles/{role_name}/actions`                   | `role:read`              |
| POST   | `/api/v1/roles/{role_name}/actions`                   | `role:manage_actions`    |
| DELETE | `/api/v1/roles/{role_name}/actions/{action_name}`     | `role:manage_actions`    |
| GET    | `/api/v1/actions/`                                    | `action:list`            |
| POST   | `/api/v1/actions/`                                    | `action:create`          |
| GET    | `/api/v1/actions/{action_id}`                         | `action:read`            |
| PUT    | `/api/v1/actions/{action_id}`                         | `action:update`          |
| DELETE | `/api/v1/actions/{action_id}`                         | `action:delete`          |
| GET    | `/api/v1/mappings/`                                   | `mapping:resolve`        |
| POST   | `/api/v1/mappings/`                                   | `mapping:create`         |
| GET    | `/api/v1/mappings/list`                               | `mapping:list`           |
| PUT    | `/api/v1/mappings/{mapping_id}`                       | `mapping:update`         |
| DELETE | `/api/v1/mappings/{mapping_id}`                       | `mapping:delete`         |
| GET    | `/api/v1/healthz`                                     | `system:health`          |
| GET    | `/api/v1/readyz`                                      | `system:health`          |
| GET    | `/api/v1/cerbos-policy-template`                      | `system:policy_template` |
| GET    | `/docs*`                                              | `system:docs`            |
| GET    | `/openapi.json`                                       | `system:docs`            |
| GET    | `/redoc`                                              | `system:docs`            |

---

## Onde gerenciar no portal

| Área       | Rota                                          |
| ----------- | --------------------------------------------- |
| Usuários   | [/heimdall/usuarios](/heimdall/usuarios)       |
| Grupos      | [/heimdall/grupos](/heimdall/grupos)           |
| Papéis     | [/heimdall/papeis](/heimdall/papeis)           |
| Ações     | [/heimdall/acoes](/heimdall/acoes)             |
| Mapeamentos | [/heimdall/mapeamentos](/heimdall/mapeamentos) |
| Health      | [/heimdall/health](/heimdall/health)           |
