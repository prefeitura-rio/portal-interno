import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import {
  ENROLLMENT_END_AFTER_CLASS_END_MESSAGE,
  isEnrollmentEndAfterClassEnd,
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

const { fullFormSchema } = await import(
  '../../app/(private)/(app)/gorio/components/new-course-form.tsx'
)

const at = (iso: string) => new Date(iso)

const CLASS_END = '2026-02-28T18:00:00-03:00'

function turma(enrollmentEnd: string, classEnd: string | null = CLASS_END) {
  return {
    vacancies: 20,
    enrollmentStartDate: at('2026-01-05T09:00:00-03:00'),
    enrollmentEndDate: at(enrollmentEnd),
    classStartDate: at('2026-01-20T09:00:00-03:00'),
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

function enrollmentEndIssues(course: unknown) {
  const result = fullFormSchema.safeParse(course)
  const issues = result.success ? [] : result.error.issues
  return {
    success: result.success,
    otherIssues: issues.filter(
      issue => issue.message !== ENROLLMENT_END_AFTER_CLASS_END_MESSAGE
    ),
    paths: issues
      .filter(issue => issue.message === ENROLLMENT_END_AFTER_CLASS_END_MESSAGE)
      .map(issue => issue.path),
  }
}

describe('isEnrollmentEndAfterClassEnd', () => {
  test('inscrições até depois do fim das aulas é inválido', () => {
    assert.equal(
      isEnrollmentEndAfterClassEnd({
        enrollmentEndDate: at('2026-03-01T18:00:00-03:00'),
        classEndDate: at(CLASS_END),
      }),
      true
    )
    assert.equal(
      isEnrollmentEndAfterClassEnd({
        enrollmentEndDate: at('2026-02-28T18:01:00-03:00'),
        classEndDate: at(CLASS_END),
      }),
      true
    )
  })

  test('inscrições até igual ou antes do fim das aulas é válido', () => {
    assert.equal(
      isEnrollmentEndAfterClassEnd({
        enrollmentEndDate: at(CLASS_END),
        classEndDate: at(CLASS_END),
      }),
      false
    )
    assert.equal(
      isEnrollmentEndAfterClassEnd({
        enrollmentEndDate: at('2026-01-15T18:00:00-03:00'),
        classEndDate: at(CLASS_END),
      }),
      false
    )
  })

  test('sem data final das aulas, ou com data inválida, não há o que comparar', () => {
    const enrollmentEndDate = at('2026-03-01T18:00:00-03:00')
    assert.equal(
      isEnrollmentEndAfterClassEnd({ enrollmentEndDate, classEndDate: null }),
      false
    )
    assert.equal(isEnrollmentEndAfterClassEnd({ enrollmentEndDate }), false)
    assert.equal(
      isEnrollmentEndAfterClassEnd({
        enrollmentEndDate,
        classEndDate: new Date('data inválida'),
      }),
      false
    )
    assert.equal(
      isEnrollmentEndAfterClassEnd({
        enrollmentEndDate: null,
        classEndDate: at(CLASS_END),
      }),
      false
    )
  })
})

describe('fullFormSchema do formulário de curso', () => {
  test('curso presencial válido é aceito (base dos demais casos)', () => {
    const result = enrollmentEndIssues(
      presencial([turma('2026-02-10T18:00:00-03:00')])
    )
    assert.deepEqual(result.otherIssues, [])
    assert.equal(result.success, true)
  })

  test('rejeita turma presencial com inscrições até depois do fim das aulas', () => {
    const result = enrollmentEndIssues(
      presencial([
        turma('2026-02-10T18:00:00-03:00'),
        turma('2026-03-05T18:00:00-03:00'),
      ])
    )
    assert.equal(result.success, false)
    assert.deepEqual(result.otherIssues, [])
    assert.deepEqual(result.paths, [
      ['locations', 0, 'schedules', 1, 'enrollmentEndDate'],
    ])
  })

  test('rejeita turma online com inscrições até depois do fim das aulas', () => {
    const result = enrollmentEndIssues(
      online([turma('2026-03-05T18:00:00-03:00')])
    )
    assert.equal(result.success, false)
    assert.deepEqual(result.otherIssues, [])
    assert.deepEqual(result.paths, [['remote_class', 0, 'enrollmentEndDate']])
  })

  test('aceita inscrições até igual ao fim das aulas', () => {
    const result = enrollmentEndIssues(presencial([turma(CLASS_END)]))
    assert.deepEqual(result.otherIssues, [])
    assert.equal(result.success, true)
  })

  test('aceita turma online sem datas de aula, qualquer que seja o fim das inscrições', () => {
    const semAulas = {
      ...turma('2026-03-05T18:00:00-03:00', null),
      classStartDate: null,
    }
    const result = enrollmentEndIssues(online([semAulas]))
    assert.deepEqual(result.otherIssues, [])
    assert.equal(result.success, true)
  })
})
