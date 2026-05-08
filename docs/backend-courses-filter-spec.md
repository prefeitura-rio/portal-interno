# Spec: Filtro por múltiplos status no endpoint de cursos

**Para:** Fred (backend)
**Contexto:** O portal interno lista cursos em abas separadas ("Cursos Criados", "Em aprovação", "Em edição", "Rascunhos"). Hoje o endpoint `GET /api/v1/courses` não suporta filtro por múltiplos status nem paginação configurável — isso força o frontend a fazer workarounds pesados (até 9 requests paralelos) que quebram a paginação.

---

## O que precisa mudar

### 1. Filtro por múltiplos status (`status`)

O endpoint deve aceitar múltiplos valores de status em uma única requisição, separados por vírgula:

```
GET /api/v1/courses?status=accepting_enrollments,scheduled,finished
```

**Comportamento esperado:**
- Sem `status`: retorna **todos** os cursos (comportamento atual mantido)
- Com `status`: retorna apenas cursos cujo `status` está na lista informada
- Qualquer quantidade de status pode ser passada
- Status inválidos devem ser ignorados (não gerar erro 400)

**Por que:** Cada aba do portal exibe um conjunto específico de status. Sem esse filtro, o frontend precisa buscar tudo e filtrar localmente, o que quebra a paginação real.

**Mapeamento das abas do portal:**

| Aba | Status incluídos |
|-----|-----------------|
| Cursos Criados | `opened`, `closed`, `canceled`, `approved`, `published`, `pending_deletion`, `scheduled`, `accepting_enrollments`, `in_progress`, `finished` |
| Em aprovação | `in_review` |
| Em edição | `needs_changes` |
| Rascunhos | `draft` |

---

### 2. Paginação com `limit` padrão 10

O endpoint já tem paginação via `page` e aparentemente usa `limit`, mas o comportamento atual sugere que o default pode não ser 10. Confirmar e garantir:

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `page` | integer | `1` | Página solicitada (1-indexed) |
| `limit` | integer | `10` | Itens por página |

**Resposta de paginação esperada** (já existe, apenas confirmar campos):

```json
{
  "data": {
    "courses": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 843,
      "total_pages": 85
    }
  },
  "success": true
}
```

---

## Exemplos de uso

### Aba "Cursos Criados" (página 2)

```
GET /api/v1/courses?status=opened,scheduled,accepting_enrollments,in_progress,finished,closed,canceled,approved,published,pending_deletion&page=2&limit=10
```

### Aba "Rascunhos"

```
GET /api/v1/courses?status=draft&page=1&limit=10
```

### Com busca textual

```
GET /api/v1/courses?status=accepting_enrollments&search=python&page=1&limit=10
```

---

## O que o frontend vai fazer assim que isso estiver disponível

O frontend vai substituir os workarounds atuais por uma única chamada ao endpoint com os status corretos para cada aba, aproveitando a paginação real da API. Isso resolve o bug de paginação (hoje só aparece 1 página no portal) e reduz de 9 requests para 1 por carregamento de tab.

---

## Prioridade

Alta — o bug de paginação já está em produção. A aba "Cursos Criados" mostra apenas 10 cursos no total sem possibilidade de navegar pelas páginas.
