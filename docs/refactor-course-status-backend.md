# Refactor: Status de cursos migrado para o backend

**Data:** 2026-04-27

## Contexto

O frontend calculava dinamicamente os status de cursos publicados comparando datas no cliente. Com a mudança no backend, esses status passaram a ser calculados e retornados diretamente pela API no campo `status`.

## Status dinâmicos que migraram para o backend

| Status | Quando ocorre |
|---|---|
| `scheduled` | `enrollment_start_date` ainda não chegou |
| `accepting_enrollments` | Dentro do período de inscrição |
| `in_progress` | Período de aulas em andamento (ou `LIVRE_FORMACAO_ONLINE` após fim das inscrições) |
| `finished` | Período de aulas encerrado em todas as turmas |

## O que mudou no frontend

### `src/lib/api-transformers.ts`
- Removida a função `getDynamicCourseStatus()` (~145 linhas de lógica de comparação de datas)
- `transformApiCourseToCourseListItem()` agora usa `apiCourse.status` diretamente
- Campo `originalStatus` removido do objeto retornado (era o status bruto antes da derivação; agora `status` já é o valor bruto)

### `src/lib/utils.ts`
- Removida a função `getDynamicCourseStatus()` (~140 linhas)
- `transformApiCourseToCourse()` agora usa `courseData.status` diretamente
- `originalStatus` removido do objeto retornado
- Import de `CourseStatus` removido (não era mais necessário)

### `src/types/course.ts`
- `ApiCourse.status` atualizado para incluir todos os novos valores retornados pela API: `scheduled`, `accepting_enrollments`, `in_progress`, `finished`, `in_review`, `needs_changes`, `approved`, `published`, `pending_deletion`
- Campo `originalStatus?` removido das interfaces `CourseListItem` e `Course`
- Comentário `// Status dinâmicos (frontend only)` removido

### `src/app/api/courses/route.ts`
- `CREATED_TAB_STATUSES` atualizado para incluir os novos status (`scheduled`, `accepting_enrollments`, `in_progress`, `finished`), necessários para buscar cursos publicados que agora chegam com esses valores explícitos

### `src/app/api/courses/in-review/route.ts`
- Campo `originalStatus` removido do objeto de fallback no bloco `catch`

### `src/app/(private)/(app)/gorio/courses/course/[course-id]/page.tsx`
- Comentário obsoleto sobre `originalStatus` removido

## O que não mudou

- **Display de badges** — `statusConfig` nas páginas de listagem e detalhe já tinha entradas para todos os novos status; nenhuma mudança necessária
- **Fluxo de curadoria** — status `in_review`, `needs_changes`, `approved`, `pending_deletion` já vinham do backend; sem alteração
- **Rascunhos** — `draft` não foi afetado
- **`deriveCourseType()`** — usava `apiCourse.status` diretamente; continua funcionando
