// Resumo, para o toast, dos campos obrigatórios que faltam no formulário de
// curso. Conta como "campo obrigatório" o valor ausente ou do tipo errado
// (invalid_type, que no zod 4 inclui a data inválida), o texto curto ou a lista
// vazia (too_small) e o formato inválido, como uma URL (invalid_format).
export interface CourseValidationIssue {
  code: string
  path: readonly PropertyKey[]
}

export function formatCourseValidationErrors(
  issues: readonly CourseValidationIssue[]
): string {
  const requiredFields = issues
    .filter(
      err =>
        err.code === 'too_small' ||
        err.code === 'invalid_type' ||
        err.code === 'invalid_format'
    )
    .map(err => {
      const path = err.path.join('.')
      // Map technical field names to user-friendly labels
      const fieldLabels: Record<string, string> = {
        title: 'Título',
        description: 'Descrição',
        category: 'Categorias',
        enrollment_start_date: 'Data de início das inscrições',
        enrollment_end_date: 'Data de fim das inscrições',
        orgao_id: 'Órgão',
        modalidade: 'Modalidade',
        workload: 'Carga horária',
        target_audience: 'Público-alvo',
        institutional_logo: 'Logo institucional',
        cover_image: 'Imagem de capa',
        is_visible: 'Visibilidade do curso',
        locations: 'Unidades',
        'locations.0.address': 'Endereço da unidade',
        'locations.0.neighborhood': 'Bairro',
        'locations.0.schedules': 'Turmas',
        'locations.0.schedules.0.enrollmentStartDate':
          'Início das inscrições da turma',
        'locations.0.schedules.0.enrollmentEndDate':
          'Fim das inscrições da turma',
        remote_class: 'Turmas online',
        'remote_class.0.vacancies': 'Número de vagas',
        'remote_class.0.enrollmentStartDate': 'Início das inscrições da turma',
        'remote_class.0.enrollmentEndDate': 'Fim das inscrições da turma',
        'remote_class.0.classStartDate': 'Data de início das aulas',
        'remote_class.0.classEndDate': 'Data de fim das aulas',
        'remote_class.0.classTime': 'Horário das aulas',
        'remote_class.0.classDays': 'Dias de aula',
      }

      // Try to get user-friendly label, otherwise use path
      return fieldLabels[path] || path
    })

  if (requiredFields.length > 0) {
    const uniqueFields = Array.from(new Set(requiredFields))
    if (uniqueFields.length === 1) {
      return `Por favor, preencha o campo obrigatório: ${uniqueFields[0]}.`
    }
    if (uniqueFields.length <= 3) {
      return `Por favor, preencha os campos obrigatórios: ${uniqueFields.join(', ')}.`
    }
    return `Por favor, preencha os ${uniqueFields.length} campos obrigatórios destacados no formulário.`
  }

  return 'Por favor, verifique os campos obrigatórios destacados no formulário.'
}
