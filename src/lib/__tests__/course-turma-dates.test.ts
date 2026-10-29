import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import {
  turmaDateMin,
  turmaDateOrderViolations,
  turmaDatesToClear,
} from '../course-turma-dates.ts'

// Carrega o formulário de curso real (new-course-form.tsx) em Node puro para
// validar o fullFormSchema: resolve o alias `@/` e os imports sem extensão do
// bundler do Next, transpila .ts/.tsx de src/ com o TypeScript do projeto e
// troca CSS e imagens por módulos vazios.
const SRC_ROOT = new URL('../../', import.meta.url)
const ASSET_PATTERN = /\.(css|png|jpe?g|gif|svg|webp)$/
const SOURCE_EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function findSourceFile(basePath: string): string | undefined {
  return SOURCE_EXTENSIONS.map(ext => `${basePath}${ext}`).find(
    candidate => existsSync(candidate) && statSync(candidate).isFile()
  )
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL
    let basePath: string | undefined
    if (specifier.startsWith('@/')) {
      basePath = fileURLToPath(new URL(specifier.slice(2), SRC_ROOT))
    } else if (specifier.startsWith('.') && parent?.startsWith(SRC_ROOT.href)) {
      basePath = fileURLToPath(new URL(specifier, parent))
    }
    if (basePath) {
      const file = findSourceFile(basePath)
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    try {
      return nextResolve(specifier, context)
    } catch (error) {
      // Subpaths sem `exports` (ex.: `next/navigation`) exigem a extensão em ESM
      if (/^[@a-z]/i.test(specifier) && !specifier.startsWith('node:')) {
        return nextResolve(`${specifier}.js`, context)
      }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (ASSET_PATTERN.test(url)) {
      return {
        format: 'module',
        source: 'export default { src: "" }',
        shortCircuit: true,
      }
    }
    if (url.startsWith(SRC_ROOT.href) && /\.tsx?$/.test(url)) {
      const { source } = nextLoad(url, { ...context, format: 'module' })
      const { outputText } = ts.transpileModule(String(source), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      })
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const { draftFormSchema, fullFormSchema } = await import(
  '../../app/(private)/(app)/gorio/components/new-course-form.tsx'
)

const at = (iso: string) => new Date(iso)

// Mensagem que o DEV-84 removeu: a regra agora é o encadeamento das 4 datas
const REMOVED_MESSAGE =
  'O fim das inscrições não pode ser posterior ao fim das aulas.'

const ENROLLMENT_START = '2026-01-05T09:00:00-03:00'
const ENROLLMENT_END = '2026-01-15T18:00:00-03:00'
const CLASS_START = '2026-01-20T09:00:00-03:00'
const CLASS_END = '2026-02-28T18:00:00-03:00'

interface TurmaIso {
  enrollmentStart?: string
  enrollmentEnd?: string
  classStart?: string | null
  classEnd?: string | null
}

function turma({
  enrollmentStart = ENROLLMENT_START,
  enrollmentEnd = ENROLLMENT_END,
  classStart = CLASS_START,
  classEnd = CLASS_END,
}: TurmaIso = {}) {
  return {
    vacancies: 20,
    enrollmentStartDate: at(enrollmentStart),
    enrollmentEndDate: at(enrollmentEnd),
    classStartDate: classStart ? at(classStart) : null,
    classEndDate: classEnd ? at(classEnd) : null,
    classTime: '09:00 - 12:00',
    classDays: 'Segunda, Quarta',
  }
}

// Curso sintético válido; só as turmas variam entre os testes
const baseCourse = {
  title: 'Curso de teste da validação',
  description: 'Descrição sintética do curso usada apenas no teste.',
  category: [1],
  enrollment_start_date: at('2026-01-05T09:00:00-03:00'),
  enrollment_end_date: at('2026-02-10T18:00:00-03:00'),
  orgao_id: 'orgao-teste',
  workload: '20 horas',
  target_audience: 'Público sintético de teste',
  institutional_logo: 'https://storage.googleapis.com/bucket-teste/logo.png',
  cover_image: 'https://storage.googleapis.com/bucket-teste/capa.png',
  is_visible: true,
  course_management_type: 'OWN_ORG',
  custom_fields: [],
}

function presencial(schedules: ReturnType<typeof turma>[]) {
  return {
    ...baseCourse,
    modalidade: 'PRESENCIAL',
    locations: [
      {
        address: 'Rua Sintética de Teste, 100',
        neighborhood: 'Centro',
        zona: 'Centro',
        schedules,
      },
    ],
  }
}

function online(remoteClass: ReturnType<typeof turma>[]) {
  return { ...baseCourse, modalidade: 'ONLINE', remote_class: remoteClass }
}

interface Issue {
  path: PropertyKey[]
  message: string
}

function issuesOf(course: unknown, schema = fullFormSchema): Issue[] {
  const result = schema.safeParse(course)
  return result.success ? [] : result.error.issues
}

function summary(issues: Issue[]) {
  return issues.map(issue => [issue.path.join('.'), issue.message])
}

describe('turmaDateOrderViolations', () => {
  test('ordem estrita das quatro datas não tem violação', () => {
    assert.deepEqual(turmaDateOrderViolations(turma()), [])
  })

  test('data igual à anterior viola, no campo posterior do par', () => {
    assert.deepEqual(
      turmaDateOrderViolations(turma({ enrollmentEnd: ENROLLMENT_START })),
      [
        {
          field: 'enrollmentEndDate',
          bound: 'enrollmentStartDate',
          message:
            'O fim das inscrições deve ser posterior ao início das inscrições.',
        },
      ]
    )
    assert.deepEqual(
      turmaDateOrderViolations(turma({ classStart: ENROLLMENT_END })),
      [
        {
          field: 'classStartDate',
          bound: 'enrollmentEndDate',
          message:
            'O início das aulas deve ser posterior ao fim das inscrições.',
        },
      ]
    )
    assert.deepEqual(
      turmaDateOrderViolations(turma({ classEnd: CLASS_START })),
      [
        {
          field: 'classEndDate',
          bound: 'classStartDate',
          message: 'O fim das aulas deve ser posterior ao início das aulas.',
        },
      ]
    )
  })

  test('início das aulas entre o início e o fim das inscrições viola', () => {
    const violations = turmaDateOrderViolations(
      turma({ classStart: '2026-01-10T09:00:00-03:00' })
    )
    assert.deepEqual(
      violations.map(v => v.field),
      ['classStartDate']
    )
  })

  test('um segundo depois do limite já vale', () => {
    assert.deepEqual(
      turmaDateOrderViolations(
        turma({
          classStart: '2026-01-15T18:00:01-03:00',
          classEnd: '2026-01-15T18:00:02-03:00',
        })
      ),
      []
    )
  })

  test('sem datas de aula (turma online), não há o que comparar nelas', () => {
    assert.deepEqual(
      turmaDateOrderViolations(turma({ classStart: null, classEnd: null })),
      []
    )
  })

  test('sem início das aulas, o fim das aulas é comparado ao fim das inscrições', () => {
    assert.deepEqual(
      turmaDateOrderViolations(
        turma({ classStart: null, classEnd: ENROLLMENT_END })
      ).map(v => [v.field, v.bound]),
      [['classEndDate', 'enrollmentEndDate']]
    )
  })

  test('data inválida é ignorada', () => {
    assert.deepEqual(
      turmaDateOrderViolations({
        enrollmentStartDate: at(ENROLLMENT_START),
        enrollmentEndDate: new Date('data inválida'),
        classStartDate: at(CLASS_START),
      }),
      []
    )
  })
})

describe('turmaDateMin (mínimo exclusivo do calendário)', () => {
  test('início das aulas usa o fim das inscrições, não o início', () => {
    assert.deepEqual(
      turmaDateMin(turma(), 'classStartDate'),
      at(ENROLLMENT_END)
    )
  })

  test('fim das aulas usa o início das aulas', () => {
    assert.deepEqual(turmaDateMin(turma(), 'classEndDate'), at(CLASS_START))
  })

  test('fim das inscrições usa o início das inscrições', () => {
    assert.deepEqual(
      turmaDateMin(turma(), 'enrollmentEndDate'),
      at(ENROLLMENT_START)
    )
  })

  test('alterar o fim das inscrições recalcula o mínimo do início das aulas', () => {
    const changed = { ...turma(), enrollmentEndDate: at(CLASS_START) }
    assert.deepEqual(turmaDateMin(changed, 'classStartDate'), at(CLASS_START))
  })

  test('sem a data anterior, cai na anterior a ela; sem nenhuma, não há mínimo', () => {
    assert.deepEqual(
      turmaDateMin({ ...turma(), classStartDate: null }, 'classEndDate'),
      at(ENROLLMENT_END)
    )
    assert.equal(turmaDateMin(turma(), 'enrollmentStartDate'), undefined)
    assert.equal(turmaDateMin({}, 'classStartDate'), undefined)
  })
})

describe('turmaDatesToClear (datas posteriores que deixam de valer)', () => {
  test('nada a limpar quando a ordem continua estrita', () => {
    assert.deepEqual(turmaDatesToClear(turma(), 'enrollmentEndDate'), [])
  })

  test('fim das inscrições depois do início das aulas limpa só o início das aulas', () => {
    const changed = {
      ...turma(),
      enrollmentEndDate: at('2026-01-25T18:00:00-03:00'),
    }
    assert.deepEqual(turmaDatesToClear(changed, 'enrollmentEndDate'), [
      'classStartDate',
    ])
  })

  test('fim das inscrições depois do fim das aulas limpa as duas datas de aula', () => {
    const changed = {
      ...turma(),
      enrollmentEndDate: at('2026-03-01T18:00:00-03:00'),
    }
    assert.deepEqual(turmaDatesToClear(changed, 'enrollmentEndDate'), [
      'classStartDate',
      'classEndDate',
    ])
  })

  test('data igual ao novo limite também é limpa', () => {
    const changed = { ...turma(), classStartDate: at(CLASS_END) }
    assert.deepEqual(turmaDatesToClear(changed, 'classStartDate'), [
      'classEndDate',
    ])
  })

  test('turma nova com as quatro datas iguais: escolher o início das inscrições limpa as demais', () => {
    const now = at('2026-01-01T10:00:00-03:00')
    const fresh = {
      enrollmentStartDate: at('2026-01-05T09:00:00-03:00'),
      enrollmentEndDate: now,
      classStartDate: now,
      classEndDate: now,
    }
    assert.deepEqual(turmaDatesToClear(fresh, 'enrollmentStartDate'), [
      'enrollmentEndDate',
      'classStartDate',
      'classEndDate',
    ])
  })

  test('não mexe nas datas anteriores à alterada', () => {
    const changed = {
      ...turma(),
      classStartDate: at('2026-01-01T09:00:00-03:00'),
    }
    assert.deepEqual(turmaDatesToClear(changed, 'classStartDate'), [])
  })
})

describe('fullFormSchema do formulário de curso', () => {
  test('curso presencial e online com as datas em ordem estrita são aceitos', () => {
    assert.deepEqual(summary(issuesOf(presencial([turma()]))), [])
    assert.deepEqual(summary(issuesOf(online([turma()]))), [])
  })

  test('rejeita turma presencial com início das aulas igual ao fim das inscrições', () => {
    const issues = issuesOf(
      presencial([turma(), turma({ classStart: ENROLLMENT_END })])
    )
    assert.deepEqual(summary(issues), [
      [
        'locations.0.schedules.1.classStartDate',
        'O início das aulas deve ser posterior ao fim das inscrições.',
      ],
    ])
  })

  test('rejeita turma online com início das aulas antes do fim das inscrições', () => {
    const issues = issuesOf(
      online([turma({ classStart: '2026-01-10T09:00:00-03:00' })])
    )
    assert.deepEqual(summary(issues), [
      [
        'remote_class.0.classStartDate',
        'O início das aulas deve ser posterior ao fim das inscrições.',
      ],
    ])
  })

  test('rejeita fim das aulas igual ao início das aulas e fim das inscrições igual ao início', () => {
    assert.deepEqual(
      summary(issuesOf(presencial([turma({ classEnd: CLASS_START })]))),
      [
        [
          'locations.0.schedules.0.classEndDate',
          'O fim das aulas deve ser posterior ao início das aulas.',
        ],
      ]
    )
    assert.deepEqual(
      summary(issuesOf(online([turma({ enrollmentEnd: ENROLLMENT_START })]))),
      [
        [
          'remote_class.0.enrollmentEndDate',
          'O fim das inscrições deve ser posterior ao início das inscrições.',
        ],
      ]
    )
  })

  test('inscrições até depois do fim das aulas é recusado sem a mensagem removida', () => {
    const issues = issuesOf(
      presencial([turma({ enrollmentEnd: '2026-03-05T18:00:00-03:00' })])
    )
    assert.ok(issues.length > 0)
    assert.ok(issues.every(issue => issue.message !== REMOVED_MESSAGE))
    assert.deepEqual(
      issues.map(issue => issue.path.join('.')),
      ['locations.0.schedules.0.classStartDate']
    )
  })

  test('aceita turma online sem datas de aula, com inscrições em ordem', () => {
    assert.deepEqual(
      summary(issuesOf(online([turma({ classStart: null, classEnd: null })]))),
      []
    )
  })
})

describe('draftFormSchema (salvar rascunho)', () => {
  test('rejeita turma presencial com início das aulas igual ao fim das inscrições', () => {
    const issues = issuesOf(
      {
        modalidade: 'PRESENCIAL',
        locations: [{ schedules: [turma({ classStart: ENROLLMENT_END })] }],
      },
      draftFormSchema
    )
    assert.deepEqual(summary(issues), [
      [
        'locations.0.schedules.0.classStartDate',
        'O início das aulas deve ser posterior ao fim das inscrições.',
      ],
    ])
  })

  test('rejeita turma online com fim das aulas igual ao início das aulas', () => {
    const issues = issuesOf(
      {
        modalidade: 'ONLINE',
        remote_class: [turma({ classEnd: CLASS_START })],
      },
      draftFormSchema
    )
    assert.deepEqual(summary(issues), [
      [
        'remote_class.0.classEndDate',
        'O fim das aulas deve ser posterior ao início das aulas.',
      ],
    ])
  })

  test('aceita rascunho com as datas em ordem estrita', () => {
    assert.deepEqual(
      summary(
        issuesOf(
          { modalidade: 'PRESENCIAL', locations: [{ schedules: [turma()] }] },
          draftFormSchema
        )
      ),
      []
    )
  })
})
