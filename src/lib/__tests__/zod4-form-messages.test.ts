import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import { formatCourseValidationErrors } from '../course-form-errors.ts'
import { requiredError } from '../zod-errors.ts'

// DEV-76: migração dos formulários para o zod 4. Os schemas reais dos
// formulários de curso, oportunidade MEI e vaga de empregabilidade precisam
// manter as mensagens em pt-BR que tinham no zod 3 (`required_error`, mensagem
// calculada do refine) e o resumo do toast de campos obrigatórios.
//
// Carrega os formulários reais em Node puro: resolve o alias `@/` e os imports
// sem extensão do bundler do Next, transpila .ts/.tsx de src/ com o TypeScript
// do projeto e troca CSS e imagens por módulos vazios.
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

const courseForm = await import(
  '../../app/(private)/(app)/gorio/components/new-course-form.tsx'
)
const meiForm = await import(
  '../../app/(private)/(app)/gorio/oportunidades-mei/components/new-mei-opportunity-form.tsx'
)
const vagaForm = await import(
  '../../app/(private)/(app)/gorio/empregabilidade/components/new-empregabilidade-form.tsx'
)
const candidateForm = await import(
  '../../app/(private)/(app)/gorio/empregabilidade/components/new-candidate-form.tsx'
)

interface Issue {
  code: string
  path: PropertyKey[]
  message: string
}

function issuesOf(
  schema: { safeParse: (data: unknown) => unknown },
  data: unknown
): Issue[] {
  const result = schema.safeParse(data) as {
    success: boolean
    error?: { issues: Issue[] }
  }
  return result.success ? [] : (result.error?.issues ?? [])
}

function messageAt(issues: Issue[], path: PropertyKey[]): string | undefined {
  return issues.find(
    issue => JSON.stringify(issue.path) === JSON.stringify(path)
  )?.message
}

const at = (iso: string) => new Date(iso)

// Curso presencial sintético válido; cada teste tira ou estraga um campo
function presencialCourse() {
  return {
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
    modalidade: 'PRESENCIAL',
    locations: [
      {
        address: 'Rua Sintética de Teste, 100',
        neighborhood: 'Centro',
        zona: 'Centro',
        schedules: [
          {
            vacancies: 20,
            enrollmentStartDate: at('2026-01-05T09:00:00-03:00'),
            enrollmentEndDate: at('2026-01-15T18:00:00-03:00'),
            classStartDate: at('2026-01-20T09:00:00-03:00'),
            classEndDate: at('2026-02-28T18:00:00-03:00'),
            classTime: '09:00 - 12:00',
            classDays: 'Segunda, Quarta',
          },
        ],
      },
    ],
  }
}

describe('requiredError', () => {
  test('dá a mensagem só para o valor ausente', () => {
    const toMessage = requiredError('Campo é obrigatório.')
    assert.equal(toMessage({ input: undefined }), 'Campo é obrigatório.')
    assert.equal(toMessage({}), 'Campo é obrigatório.')
    assert.equal(toMessage({ input: null }), undefined)
    assert.equal(toMessage({ input: 'texto' }), undefined)
  })
})

describe('formulário de curso (fullFormSchema)', () => {
  test('curso válido é aceito (base dos demais casos)', () => {
    assert.deepEqual(
      issuesOf(courseForm.fullFormSchema, presencialCourse()),
      []
    )
  })

  test('datas e visibilidade ausentes têm a mensagem em pt-BR', () => {
    const course = presencialCourse()
    const turma = course.locations[0].schedules[0] as Record<string, unknown>
    const { enrollment_start_date, enrollment_end_date, is_visible, ...rest } =
      course
    turma.enrollmentStartDate = undefined
    turma.classEndDate = undefined
    const issues = issuesOf(courseForm.fullFormSchema, rest)
    assert.equal(
      messageAt(issues, ['enrollment_start_date']),
      'Data de início é obrigatória.'
    )
    assert.equal(
      messageAt(issues, ['enrollment_end_date']),
      'Data de término é obrigatória.'
    )
    assert.equal(
      messageAt(issues, ['is_visible']),
      'Visibilidade do curso é obrigatória.'
    )
    assert.equal(
      messageAt(issues, [
        'locations',
        0,
        'schedules',
        0,
        'enrollmentStartDate',
      ]),
      'Data de início das inscrições é obrigatória.'
    )
    assert.equal(
      messageAt(issues, ['locations', 0, 'schedules', 0, 'classEndDate']),
      'Data de fim das aulas é obrigatória.'
    )
  })

  test('data de outro tipo segue com a mensagem padrão, não a de obrigatório', () => {
    const issues = issuesOf(courseForm.fullFormSchema, {
      ...presencialCourse(),
      enrollment_start_date: 'não é data',
    })
    const message = messageAt(issues, ['enrollment_start_date'])
    assert.ok(message)
    assert.notEqual(message, 'Data de início é obrigatória.')
  })

  test('mensagens customizadas de texto e URL continuam as mesmas', () => {
    const issues = issuesOf(courseForm.fullFormSchema, {
      ...presencialCourse(),
      title: 'abc',
      cover_image: '',
    })
    assert.equal(
      messageAt(issues, ['title']),
      'Título deve ter pelo menos 5 caracteres.'
    )
    assert.equal(
      messageAt(issues, ['cover_image']),
      'A imagem de capa é obrigatória.'
    )
  })
})

describe('resumo do toast de campos obrigatórios do curso', () => {
  test('conta data ausente, texto curto e URL inválida', () => {
    const { enrollment_start_date, ...course } = presencialCourse()
    const issues = issuesOf(courseForm.fullFormSchema, {
      ...course,
      title: '',
      cover_image: '',
    })
    assert.equal(
      formatCourseValidationErrors(issues),
      'Por favor, preencha os campos obrigatórios: Título, Data de início das inscrições, Imagem de capa.'
    )
  })

  test('um campo só e nenhum campo obrigatório', () => {
    assert.equal(
      formatCourseValidationErrors([{ code: 'invalid_type', path: ['title'] }]),
      'Por favor, preencha o campo obrigatório: Título.'
    )
    assert.equal(
      formatCourseValidationErrors([{ code: 'custom', path: ['title'] }]),
      'Por favor, verifique os campos obrigatórios destacados no formulário.'
    )
  })
})

describe('formulário de oportunidade MEI (fullFormSchema)', () => {
  test('prazo de expiração ausente tem a mensagem em pt-BR', () => {
    const issues = issuesOf(meiForm.fullFormSchema, {
      orgao_id: 'orgao-teste',
      subclasses: ['0000-0/00'],
      title: 'Oportunidade de teste',
      description: 'Descrição sintética do serviço usada apenas no teste.',
      address: 'Rua Sintética de Teste',
      number: '100',
      neighborhood: 'Centro',
      forma_pagamento: 'PIX',
      prazo_pagamento: '30 dias',
      cover_image:
        'https://storage.googleapis.com/rj-escritorio-dev-public/superapp/capa.png',
    })
    assert.deepEqual(
      issues.map(issue => [issue.path, issue.message]),
      [
        [
          ['opportunity_expiration_date'],
          'Prazo para expiração da oportunidade é obrigatório.',
        ],
      ]
    )
  })
})

describe('formulário de vaga de empregabilidade', () => {
  test('publicar sem data limite tem a mensagem em pt-BR', () => {
    const issues = issuesOf(vagaForm.publishValidationSchema, {
      titulo: 'Vaga de teste',
      descricao: 'Descrição sintética',
      contratante: 'empresa-teste',
      regime_contratacao: 'clt',
      modelo_trabalho: 'presencial',
      bairro: 'Centro',
      id_orgao_parceiro: 'orgao-teste',
      requisitos: 'Requisitos sintéticos',
      responsabilidades: 'Responsabilidades sintéticas',
    })
    assert.deepEqual(
      issues.map(issue => [issue.path, issue.message]),
      [[['data_limite'], 'Data limite é obrigatória.']]
    )
  })

  test('rascunho mantém as mensagens dos campos obrigatórios', () => {
    const issues = issuesOf(vagaForm.draftValidationSchema, {
      titulo: '',
      descricao: 'Descrição sintética',
      contratante: 'empresa-teste',
      regime_contratacao: 'clt',
      modelo_trabalho: '',
    })
    assert.deepEqual(
      issues.map(issue => issue.message),
      ['Título é obrigatório.', 'Modelo de trabalho é obrigatório.']
    )
  })
})

describe('formulário de candidato (informação complementar numérica)', () => {
  const schema = candidateForm.createFormSchema([
    {
      id: 'idade',
      title: 'Idade',
      required: false,
      field_type: 'number',
      valor_min: 18,
      valor_max: 65,
    },
  ])
  const candidate = (resposta: string) => ({
    cpf: '52998224725',
    nome: 'Pessoa de Teste',
    email: '',
    resposta_idade: resposta,
  })

  test('a mensagem diz o limite ou o número inválido', () => {
    assert.equal(
      messageAt(issuesOf(schema, candidate('10')), ['resposta_idade']),
      'Valor mínimo: 18'
    )
    assert.equal(
      messageAt(issuesOf(schema, candidate('70')), ['resposta_idade']),
      'Valor máximo: 65'
    )
    assert.equal(
      messageAt(issuesOf(schema, candidate('abc')), ['resposta_idade']),
      'Informe um número válido'
    )
  })

  test('valor no intervalo ou em branco é aceito', () => {
    assert.deepEqual(issuesOf(schema, candidate('30')), [])
    assert.deepEqual(issuesOf(schema, candidate('')), [])
  })
})
