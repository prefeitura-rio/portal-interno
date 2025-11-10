# Migração da API: Múltiplas Turmas por Unidade (GO Rio - Cursos)

## Resumo

Agora cada unidade (`location`) pode ter várias turmas (`schedules`). As vagas passam a ser por turma e cada turma possui início/fim, horário e dias próprios.

- Antes: `location` possuía campos únicos de aula (vaga, datas, horário, dias)
- Agora: `location.schedules[]` com N turmas, e `vacancies` pertence ao `schedule`

## Alterações de Modelo

### Location
- `address`: string (obrigatório)
- `neighborhood`: string (obrigatório)
- `schedules`: Schedule[] (obrigatório, min 1)

### Schedule
- `vacancies`: number (1..1000, obrigatório)
- `class_start_date`: string ISO 8601 (obrigatório)
- `class_end_date`: string ISO 8601 (obrigatório, ≥ start)
- `class_time`: string (obrigatório)
- `class_days`: string (obrigatório)

## Mudanças no Banco

```sql
CREATE TABLE course_schedules (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES course_locations(id) ON DELETE CASCADE,
  vacancies INTEGER NOT NULL CHECK (vacancies BETWEEN 1 AND 1000),
  class_start_date TIMESTAMPTZ NOT NULL,
  class_end_date   TIMESTAMPTZ NOT NULL,
  class_time       VARCHAR(255) NOT NULL,
  class_days       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_schedules_location_id ON course_schedules(location_id);
```

Remover do `course_locations` os campos migrados para `schedules`:

```sql
ALTER TABLE course_locations
  DROP COLUMN IF EXISTS vacancies,
  DROP COLUMN IF EXISTS class_start_date,
  DROP COLUMN IF EXISTS class_end_date,
  DROP COLUMN IF EXISTS class_time,
  DROP COLUMN IF EXISTS class_days;
```

### Migração de Dados Legados

```sql
INSERT INTO course_schedules (
  location_id, vacancies, class_start_date, class_end_date, class_time, class_days
)
SELECT id,
       COALESCE(vacancies, 0),
       class_start_date,
       class_end_date,
       class_time,
       class_days
FROM course_locations
WHERE class_start_date IS NOT NULL;
```

## Endpoints Impactados

- `POST /api/courses` (criar)
- `PUT /api/courses/{id}` (atualizar)
- `GET /api/courses/{id}` (detalhe)

Todos devem trafegar `locations[].schedules[]` na estrutura nova.

### Exemplo de Request (POST/PUT – PRESENCIAL/HÍBRIDO)

```json
{
  "title": "Curso de Programação",
  "description": "Aprenda a programar...",
  "modalidade": "PRESENCIAL",
  "locations": [
    {
      "address": "Rua Example, 123",
      "neighborhood": "Centro",
      "schedules": [
        {
          "vacancies": 50,
          "class_start_date": "2025-01-15T09:00:00.000Z",
          "class_end_date": "2025-03-15T12:00:00.000Z",
          "class_time": "09:00 - 12:00",
          "class_days": "Segunda a Sexta"
        }
      ]
    }
  ],
  "turno": "LIVRE",
  "formato_aula": "PRESENCIAL",
  "instituicao_id": 1,
  "status": "opened"
}
```

### Exemplo de Response (GET)

```json
{
  "id": 123,
  "title": "Curso de Programação",
  "modalidade": "PRESENCIAL",
  "locations": [
    {
      "id": 456,
      "address": "Rua Example, 123",
      "neighborhood": "Centro",
      "schedules": [
        {
          "id": 789,
          "vacancies": 50,
          "class_start_date": "2025-01-15T09:00:00.000Z",
          "class_end_date": "2025-03-15T12:00:00.000Z",
          "class_time": "09:00 - 12:00",
          "class_days": "Segunda a Sexta"
        }
      ]
    }
  ],
  "status": "opened"
}
```

## Regras de Validação (API)

- Location
  - `address`: min 10 caracteres
  - `neighborhood`: min 3 caracteres
  - `schedules`: obrigatório, min 1
- Schedule
  - `vacancies`: 1..1000
  - `class_start_date` e `class_end_date`: obrigatórios e válidos
  - `class_end_date` ≥ `class_start_date`
  - `class_time` e `class_days`: obrigatórios
- Modalidade ONLINE: permanece igual usando `remote_class` (sem alterações)

## Semântica do PUT

Abordagem recomendada (simples): substituir todas as turmas da unidade pelas enviadas (delete-all e recriar por unidade).

Passos por unidade:
1. Garantir a existência/atualização da `location`
2. Deletar `course_schedules` vinculadas à `location`
3. Inserir os novos `schedules` na ordem recebida (se precisar manter ordem, considerar coluna `position`)

Alternativa: merge por `id` (mais complexo; definir regras claras de criação/atualização/remoção)

## Considerações

- Cascata: `ON DELETE CASCADE` garante remoção de `schedules` ao excluir `location`
- Índices: já indexado por `location_id`; considerar índices de período se necessário
- Performance: GET de detalhes com eager loading de `locations` e `schedules`
- Versionamento: se necessário manter v1, disponibilizar v2 com nova estrutura; o frontend atual consome e envia o formato novo

## Checklist

- [ ] Criar tabela `course_schedules` com FK e `ON DELETE CASCADE`
- [ ] Remover campos legados de `course_locations`
- [ ] Migrar dados legados para `course_schedules`
- [ ] Atualizar modelos/DTOs para `locations[].schedules[]`
- [ ] Implementar validações da nova estrutura
- [ ] POST/PUT persistirem `schedules` corretamente
- [ ] GET retornar `schedules` por `location`
- [ ] Atualizar documentação (Swagger/OpenAPI)
- [ ] Testar PRESENCIAL/HÍBRIDO; manter ONLINE com `remote_class`


