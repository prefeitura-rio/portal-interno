# Alterações na API - Tipo de Gestão do Curso

## Resumo
Refatoração do sistema de parceiro externo para suportar 3 tipos de gestão de curso, substituindo o campo booleano `is_external_partner` por um enum `course_management_type`.

## Mudanças Necessárias

### 1. Novo Campo: `course_management_type`

**Tipo:** Enum/String  
**Valores possíveis:**
- `OWN_ORG` - Curso gerido pelo próprio órgão
- `EXTERNAL_MANAGED_BY_ORG` - Curso de parceiro externo - Gerido pelo órgão
- `EXTERNAL_MANAGED_BY_PARTNER` - Curso de parceiro externo - Gerido pelo parceiro

**Obrigatório:** Sim (default: `OWN_ORG`)

### 2. Campos de Parceiro Externo (mantidos)

Os campos existentes devem ser mantidos, mas com validações condicionais:

- `external_partner_name` (string, opcional)
- `external_partner_url` (string, opcional)
- `external_partner_logo_url` (string, opcional)
- `external_partner_contact` (string, opcional)

### 3. Regras de Validação

#### Quando `course_management_type = 'OWN_ORG'`:
- Todos os campos de parceiro externo devem ser `null` ou vazios
- Não enviar campos de parceiro externo no payload

#### Quando `course_management_type = 'EXTERNAL_MANAGED_BY_ORG'`:
- `external_partner_name` → **OBRIGATÓRIO**
- `external_partner_logo_url` → Opcional
- `external_partner_url` → Deve ser `null` ou vazio
- `external_partner_contact` → Deve ser `null` ou vazio

#### Quando `course_management_type = 'EXTERNAL_MANAGED_BY_PARTNER'`:
- `external_partner_name` → **OBRIGATÓRIO**
- `external_partner_url` → **OBRIGATÓRIO**
- `external_partner_logo_url` → Opcional
- `external_partner_contact` → Opcional

### 4. Migração de Dados Existentes

Para cursos existentes que já possuem `is_external_partner = true`:

```sql
-- Exemplo de migração (ajustar conforme schema real)
UPDATE courses 
SET course_management_type = CASE
  WHEN external_partner_url IS NOT NULL AND external_partner_url != '' 
    THEN 'EXTERNAL_MANAGED_BY_PARTNER'
  WHEN external_partner_name IS NOT NULL AND external_partner_name != ''
    THEN 'EXTERNAL_MANAGED_BY_ORG'
  ELSE 'OWN_ORG'
END
WHERE is_external_partner = true;

-- Depois da migração, remover o campo is_external_partner (ou manter para compatibilidade temporária)
```

### 5. Schema de Resposta da API

A resposta da API deve incluir o novo campo:

```json
{
  "id": 123,
  "title": "Curso de Exemplo",
  "course_management_type": "EXTERNAL_MANAGED_BY_ORG",
  "external_partner_name": "PUC RJ",
  "external_partner_logo_url": "https://...",
  "external_partner_url": null,
  "external_partner_contact": null,
  ...
}
```

### 6. Endpoints Afetados

- `POST /api/v1/courses` - Criar curso
- `PUT /api/v1/courses/{id}` - Atualizar curso
- `GET /api/v1/courses/{id}` - Buscar curso
- `GET /api/v1/courses` - Listar cursos

### 7. Compatibilidade com Versões Antigas

**Recomendação:** Manter suporte ao campo `is_external_partner` por um período de transição (ex: 3 meses) para garantir compatibilidade.

**Lógica de compatibilidade:**
- Se `course_management_type` for enviado, usar esse valor
- Se apenas `is_external_partner` for enviado:
  - `is_external_partner = true` → `course_management_type = 'EXTERNAL_MANAGED_BY_PARTNER'` (assumir o caso mais completo)
  - `is_external_partner = false` → `course_management_type = 'OWN_ORG'`

### 8. Exemplo de Payload

**Caso 1: Curso próprio**
```json
{
  "title": "Curso Interno",
  "course_management_type": "OWN_ORG",
  ...
}
```

**Caso 2: Parceiro externo gerido pelo órgão**
```json
{
  "title": "Curso Parceiro",
  "course_management_type": "EXTERNAL_MANAGED_BY_ORG",
  "external_partner_name": "PUC RJ",
  "external_partner_logo_url": "https://storage.googleapis.com/.../logo.png",
  ...
}
```

**Caso 3: Parceiro externo gerido pelo parceiro**
```json
{
  "title": "Curso Parceiro Externo",
  "course_management_type": "EXTERNAL_MANAGED_BY_PARTNER",
  "external_partner_name": "PUC RJ",
  "external_partner_url": "https://www.puc-rio.br/curso",
  "external_partner_logo_url": "https://storage.googleapis.com/.../logo.png",
  "external_partner_contact": "WhatsApp: (21) 99999-9999",
  ...
}
```

## Checklist de Implementação

- [ ] Adicionar campo `course_management_type` ao modelo de dados
- [ ] Criar enum/migration para o novo campo
- [ ] Implementar validações condicionais conforme regras acima
- [ ] Atualizar documentação da API (Swagger/OpenAPI)
- [ ] Criar script de migração para dados existentes
- [ ] Implementar compatibilidade com `is_external_partner` (opcional, temporário)
- [ ] Atualizar testes unitários e de integração
- [ ] Testar todos os 3 cenários de gestão

## Observações

- O campo `external_partner_logo_url` deve continuar validando URLs do Google Cloud Storage quando preenchido
- A validação de URL deve ser aplicada apenas quando o campo não estiver vazio/null
- Considerar adicionar índices no banco de dados para `course_management_type` se houver necessidade de filtros/consultas frequentes

