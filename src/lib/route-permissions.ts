import type { UploadFolder } from '@/lib/upload-folders'
import {
  BUSCA_SERVICES_ADMIN_ROLES,
  BUSCA_SERVICES_ROLES,
  COURSES_CASA_CIVIL_ROLES,
  COURSES_DASHBOARD_ROLES,
  COURSES_ROLES,
  CURRICULOS_ROLES,
  EMPREGO_TRABALHO_ROLES,
} from '@/types/heimdall-roles'

/**
 * Route permission configuration using Heimdall roles
 * Maps routes to their required roles from the Heimdall API
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // Dashboard - accessible to all authenticated users with any role
  '/': [
    'admin',
    'superadmin',
    'go:admin',
    'go:cursos:casa_civil',
    'go:cursos:editor',
    'busca:services:admin',
    'busca:services:editor',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
    'go:curriculos:admin',
    'go:curriculos:editor',
  ],

  // GO Rio - Capacitação (admin, superadmin, go:admin + Casa Civil curation)
  // ANTIGO: '/gorio/courses': ['admin', 'superadmin', 'go:admin'],
  '/gorio/courses': [...COURSES_ROLES],
  '/gorio/courses/new': [...COURSES_ROLES],
  // Dashboard de Capacitações (DEV-100): só Casa Civil e admins
  '/gorio/courses/dashboard': [...COURSES_DASHBOARD_ROLES],
  '/gorio/courses/course/*': [...COURSES_ROLES],

  // GO Rio - MEI (only admin, superadmin, go:admin - NOT empregabilidade roles)
  '/gorio/oportunidades-mei': ['admin', 'superadmin', 'go:admin'],
  '/gorio/oportunidades-mei/new': ['admin', 'superadmin', 'go:admin'],
  '/gorio/oportunidades-mei/oportunidade-mei/*': [
    'admin',
    'superadmin',
    'go:admin',
  ],

  // GO Rio - Empregabilidade (admin, superadmin, go:admin + 3 empregabilidade roles)
  '/gorio/empregabilidade': [...EMPREGO_TRABALHO_ROLES],
  '/gorio/empregabilidade/new': [...EMPREGO_TRABALHO_ROLES],
  // Empresas: list and new must be before /* so they match first
  '/gorio/empregabilidade/empresas': [
    'admin',
    'superadmin',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ],
  '/gorio/empregabilidade/new/empresa': [
    'admin',
    'superadmin',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ],
  '/gorio/empregabilidade/empresas/*': [
    'admin',
    'superadmin',
    'go:admin',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
  ],
  '/gorio/empregabilidade/*': [...EMPREGO_TRABALHO_ROLES],

  // GO Rio - Banco de currículos (admin, superadmin, go:admin + go:curriculos:*)
  '/gorio/banco-curriculos': [...CURRICULOS_ROLES],
  '/gorio/banco-curriculos/*': [...CURRICULOS_ROLES],

  // Serviços Municipais (admin, superadmin, busca:services roles - NOT empregabilidade)
  '/servicos-municipais/servicos': [
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
  ],
  '/servicos-municipais/servicos/new': [
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
  ],
  '/servicos-municipais/servicos/servico/*': [
    'admin',
    'superadmin',
    'busca:services:admin',
    'busca:services:editor',
  ],

  // Account - accessible to all authenticated users
  '/account': [
    'admin',
    'superadmin',
    'go:admin',
    'go:cursos:casa_civil',
    'go:cursos:editor',
    'busca:services:admin',
    'busca:services:editor',
    'go:empregabilidade:admin',
    'go:empregabilidade:editor_sem_curadoria',
    'go:empregabilidade:editor_com_curadoria',
    'go:curriculos:admin',
    'go:curriculos:editor',
  ],

  // Superadmin - vínculos CPF-Secretaria
  '/superadmin/vinculos-secretaria/adicionar': ['admin', 'superadmin'],
  '/superadmin/vinculos-secretaria/consultar': ['admin', 'superadmin'],

  // Heimdall admin - gestão de usuários, grupos, papéis, ações e mapeamentos
  '/heimdall': ['admin', 'superadmin'],
  '/heimdall/*': ['admin', 'superadmin'],
} as const

/**
 * Checks if a user has access to a specific route based on their roles from Heimdall
 * @param route - The route to check
 * @param userRoles - Array of user's roles from Heimdall API
 * @param userRef - Optional opaque user reference for logging (never the CPF;
 * see `getLogUserRef` in `log-user-ref.ts`)
 * @returns boolean indicating if access is allowed
 */
export function hasRouteAccess(
  route: string,
  userRoles: string[] | null | undefined,
  userRef?: string
): boolean {
  const logPrefix = userRef
    ? `[${userRef}] [ROUTE_PERMISSIONS]`
    : '[ROUTE_PERMISSIONS]'

  if (!userRoles || userRoles.length === 0) {
    console.warn(
      `${logPrefix} Access denied for route "${route}": No user roles provided (userRoles is ${userRoles === null ? 'null' : userRoles === undefined ? 'undefined' : 'empty array'})`
    )
    return false
  }

  // Check exact match first
  const exactMatch = ROUTE_PERMISSIONS[route]
  if (exactMatch) {
    const hasAccess = userRoles.some(role => exactMatch.includes(role))
    if (!hasAccess) {
      console.warn(
        `${logPrefix} Access denied for route "${route}": missing required role. Required roles:`,
        exactMatch
      )
    }
    return hasAccess
  }

  // Check wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        const hasAccess = userRoles.some(role => allowedRoles.includes(role))
        if (!hasAccess) {
          console.warn(
            `${logPrefix} Access denied for route "${route}" (pattern: "${routePattern}"): missing required role. Required roles:`,
            allowedRoles
          )
        }
        return hasAccess
      }
    }
  }

  // Default to denying access for unmatched routes
  console.warn(
    `${logPrefix} No permission rule found for route "${route}". Access denied by default.`
  )
  return false
}

/**
 * Gets all allowed roles for a specific route
 * @param route - The route to check
 * @returns Array of allowed roles or null if route not found
 */
export function getAllowedRoles(route: string): string[] | null {
  // Check exact match first
  const exactMatch = ROUTE_PERMISSIONS[route]
  if (exactMatch) {
    return exactMatch
  }

  // Check wildcard matches
  for (const [routePattern, allowedRoles] of Object.entries(
    ROUTE_PERMISSIONS
  )) {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2)
      if (route.startsWith(baseRoute)) {
        return allowedRoles
      }
    }
  }

  return null
}

/**
 * Regra de acesso de uma rota de API (BFF em `src/app/api`):
 * - `public`: sem sessão (login, refresh, logout, health checks);
 * - `authenticated`: só a sessão válida, sem papel (dados do próprio usuário);
 * - `roles`: o usuário precisa de ao menos um papel de **cada** grupo de
 *   `anyOfEach` (um grupo só = "qualquer um destes papéis").
 */
export type ApiRoutePermission =
  | { readonly kind: 'public' }
  | { readonly kind: 'authenticated' }
  | {
      readonly kind: 'roles'
      readonly anyOfEach: readonly (readonly string[])[]
    }

const PUBLIC_API: ApiRoutePermission = { kind: 'public' }
const AUTHENTICATED_API: ApiRoutePermission = { kind: 'authenticated' }

function anyOf(roles: readonly string[]): ApiRoutePermission {
  return { kind: 'roles', anyOfEach: [roles] }
}

/** Qualquer papel do backoffice (o mesmo conjunto do dashboard `/`). */
const BACKOFFICE_ROLES = [
  'admin',
  'superadmin',
  'go:admin',
  'go:cursos:casa_civil',
  'go:cursos:editor',
  'busca:services:admin',
  'busca:services:editor',
  'go:empregabilidade:admin',
  'go:empregabilidade:editor_sem_curadoria',
  'go:empregabilidade:editor_com_curadoria',
  'go:curriculos:admin',
  'go:curriculos:editor',
] as const
const ADMIN_ROLES = ['admin', 'superadmin'] as const
const MEI_ROLES = ['admin', 'superadmin', 'go:admin'] as const

const BACKOFFICE_API = anyOf(BACKOFFICE_ROLES)
const ADMIN_API = anyOf(ADMIN_ROLES)
const COURSES_API = anyOf(COURSES_ROLES)
// Aprovar/publicar curso: só a curadoria (Casa Civil), como na UI (DEV-125)
const COURSES_CASA_CIVIL_API = anyOf(COURSES_CASA_CIVIL_ROLES)
const COURSES_DASHBOARD_API = anyOf(COURSES_DASHBOARD_ROLES)
const EMPREGO_TRABALHO_API = anyOf(EMPREGO_TRABALHO_ROLES)
const CURRICULOS_API = anyOf(CURRICULOS_ROLES)
const MEI_API = anyOf(MEI_ROLES)
const BUSCA_SERVICES_API = anyOf(BUSCA_SERVICES_ROLES)
// Publicar/despublicar/devolver/reverter serviço: só o admin do módulo, como
// na UI (DEV-125)
const BUSCA_SERVICES_ADMIN_API = anyOf(BUSCA_SERVICES_ADMIN_ROLES)

/**
 * Papéis exigidos por rota de API, aplicados pelo middleware antes do handler.
 *
 * A chave é o caminho da pasta da rota em `src/app/api` (segmento dinâmico
 * entre colchetes casa um segmento qualquer). Cada rota repete os papéis da
 * página que a consome (`ROUTE_PERMISSIONS`); catálogos sem dado pessoal
 * (secretarias, categorias, CNAEs, listas de domínio) valem para qualquer papel
 * do backoffice. Rota de uma ação que a UI mostra só a parte dos papéis do
 * módulo (aprovar/publicar) exige essa parte, não o módulo inteiro. Rota sem
 * entrada aqui é negada (403): toda rota nova em `src/app/api` precisa de uma
 * regra.
 */
export const API_ROUTE_PERMISSIONS: Record<string, ApiRoutePermission> = {
  // Autenticação e saúde: precisam funcionar sem sessão (ou com ela expirada)
  '/api/auth/callback/keycloak': PUBLIC_API,
  '/api/auth/logout': PUBLIC_API,
  '/api/auth/refresh': PUBLIC_API,
  '/api/auth/token-status': PUBLIC_API,
  '/api/health': PUBLIC_API,

  // Dados do próprio usuário logado
  '/api/heimdall/user': AUTHENTICATED_API,
  '/api/me/secretarias': AUTHENTICATED_API,

  // Catálogos compartilhados entre módulos (sem dado pessoal)
  '/api/departments': BACKOFFICE_API,
  '/api/departments/[cd_ua]': BACKOFFICE_API,
  '/api/categorias': BACKOFFICE_API,
  '/api/subcategories': BACKOFFICE_API,
  '/api/cnaes': BACKOFFICE_API,
  '/api/empregabilidade/escolaridades': BACKOFFICE_API,
  '/api/empregabilidade/idiomas': BACKOFFICE_API,
  '/api/empregabilidade/modelos-trabalho': BACKOFFICE_API,
  '/api/empregabilidade/niveis-idioma': BACKOFFICE_API,
  '/api/empregabilidade/regimes-contratacao': BACKOFFICE_API,
  '/api/empregabilidade/tipos-pcd': BACKOFFICE_API,

  // Upload de imagens (cursos, empresas e oportunidades MEI). O handler
  // confere a pasta pedida com UPLOAD_FOLDER_ROLES.
  '/api/upload/signed-url': {
    kind: 'roles',
    anyOfEach: [[...COURSES_ROLES, ...EMPREGO_TRABALHO_ROLES]],
  },

  // GO Rio - Capacitação (página /gorio/courses)
  '/api/courses': COURSES_API,
  '/api/courses/[course-id]': COURSES_API,
  '/api/courses/[course-id]/approve': COURSES_CASA_CIVIL_API,
  '/api/courses/[course-id]/publish': COURSES_CASA_CIVIL_API,
  '/api/courses/[course-id]/publish-directly': COURSES_CASA_CIVIL_API,
  // "Enviar para edição" (em revisão) é da Casa Civil, mas a mesma rota faz o
  // "Propor edição" do Editor (curso publicado ou encerrado)
  '/api/courses/[course-id]/request-changes': COURSES_API,
  '/api/courses/[course-id]/request-deletion': COURSES_API,
  '/api/courses/[course-id]/send-to-review': COURSES_API,
  // Dashboard de Capacitações (página /gorio/courses/dashboard)
  '/api/courses/dashboard': COURSES_DASHBOARD_API,
  '/api/courses/draft': COURSES_API,
  '/api/courses/drafts': COURSES_API,
  '/api/courses/in-review': COURSES_API,
  '/api/courses/needs-changes': COURSES_API,
  '/api/courses/new': COURSES_API,
  '/api/courses/publish-directly': COURSES_CASA_CIVIL_API,
  '/api/courses/send-to-review': COURSES_API,
  '/api/enrollments/[course-id]': COURSES_API,
  '/api/enrollments/[course-id]/[enrollment-id]': COURSES_API,
  '/api/enrollments/[course-id]/certificate': COURSES_API,
  '/api/enrollments/[course-id]/check-rmi-consistency': COURSES_API,
  '/api/enrollments/[course-id]/import': COURSES_API,
  '/api/jobs/[jobId]/status': COURSES_API,

  // GO Rio - Empregabilidade (página /gorio/empregabilidade)
  '/api/empregabilidade/candidaturas': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/candidaturas/[id]/approve': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/candidaturas/[id]/etapa': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/candidaturas/[id]/reject': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/candidaturas/[id]/status': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/candidaturas/bulk-etapa': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/candidaturas/bulk-status': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/empresas': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/empresas/[cnpj]': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/empresas/consulta-cnpj/[cnpj]': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/discontinue': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/freeze': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/idiomas-requisito': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/publish': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/reactivate': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/send-to-approval': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/send-to-draft': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/[id]/unfreeze': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/draft': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/new': EMPREGO_TRABALHO_API,
  '/api/empregabilidade/vagas/new/send-to-approval': EMPREGO_TRABALHO_API,
  '/api/empregos/[id]': EMPREGO_TRABALHO_API,
  '/api/empregos/[id]/candidatos': EMPREGO_TRABALHO_API,

  // GO Rio - Banco de currículos (página /gorio/banco-curriculos)
  '/api/empregabilidade/banco-curriculos': CURRICULOS_API,
  '/api/empregabilidade/banco-curriculos/[cpf]': CURRICULOS_API,
  '/api/empregabilidade/banco-curriculos/[cpf]/candidaturas': CURRICULOS_API,
  // Associar o candidato a vagas também exige um papel de Emprego e trabalho
  '/api/empregabilidade/banco-curriculos/[cpf]/associacoes': {
    kind: 'roles',
    anyOfEach: [CURRICULOS_ROLES, EMPREGO_TRABALHO_ROLES],
  },

  // GO Rio - MEI (página /gorio/oportunidades-mei)
  '/api/oportunidades-mei': MEI_API,
  '/api/oportunidades-mei/[id]': MEI_API,
  '/api/oportunidades-mei/[id]/publish': MEI_API,
  '/api/oportunidades-mei/[id]/propostas': MEI_API,
  '/api/oportunidades-mei/[id]/propostas/[propostaId]/status': MEI_API,
  '/api/oportunidades-mei/[id]/propostas/bulk-status': MEI_API,
  '/api/legal-entity/[cnpj]': MEI_API,

  // Serviços Municipais (página /servicos-municipais/servicos)
  '/api/services': BUSCA_SERVICES_API,
  '/api/services/[service-id]': BUSCA_SERVICES_API,
  '/api/services/[service-id]/publish': BUSCA_SERVICES_ADMIN_API,
  '/api/services/[service-id]/rollback': BUSCA_SERVICES_ADMIN_API,
  '/api/services/[service-id]/send-to-approval': BUSCA_SERVICES_API,
  '/api/services/[service-id]/send-to-edition': BUSCA_SERVICES_ADMIN_API,
  '/api/services/[service-id]/unpublish': BUSCA_SERVICES_ADMIN_API,
  '/api/services/[service-id]/versions': BUSCA_SERVICES_API,
  '/api/services/[service-id]/versions/compare': BUSCA_SERVICES_API,
  '/api/tombamentos': BUSCA_SERVICES_API,
  '/api/tombamentos/[tombamento-id]': BUSCA_SERVICES_API,
  '/api/tombamentos/by-old-service': BUSCA_SERVICES_API,

  // Superadmin - vínculos CPF-Secretaria (página /superadmin/vinculos-secretaria)
  '/api/admin/cpf-secretaria/[cpf]': ADMIN_API,
  '/api/admin/cpf-secretaria/[cpf]/[cdUa]': ADMIN_API,

  // Heimdall admin (página /heimdall)
  '/api/heimdall/acoes': ADMIN_API,
  '/api/heimdall/acoes/[id]': ADMIN_API,
  '/api/heimdall/cerbos-policy-template': ADMIN_API,
  '/api/heimdall/comparar': ADMIN_API,
  '/api/heimdall/grupos': ADMIN_API,
  '/api/heimdall/grupos/[name]': ADMIN_API,
  '/api/heimdall/grupos/[name]/membros': ADMIN_API,
  '/api/heimdall/grupos/[name]/membros/[cpf]': ADMIN_API,
  '/api/heimdall/grupos/[name]/papeis': ADMIN_API,
  '/api/heimdall/grupos/[name]/papeis/[role]': ADMIN_API,
  '/api/heimdall/healthz': ADMIN_API,
  '/api/heimdall/mapeamentos': ADMIN_API,
  '/api/heimdall/mapeamentos/[id]': ADMIN_API,
  '/api/heimdall/mapeamentos/resolver': ADMIN_API,
  '/api/heimdall/papeis': ADMIN_API,
  '/api/heimdall/papeis/[name]': ADMIN_API,
  '/api/heimdall/papeis/[name]/acoes': ADMIN_API,
  '/api/heimdall/papeis/[name]/acoes/[action]': ADMIN_API,
  '/api/heimdall/readyz': ADMIN_API,
  '/api/heimdall/usuarios': ADMIN_API,
  '/api/heimdall/usuarios/[cpf]': ADMIN_API,
}

/**
 * Papéis exigidos por pasta de `/api/upload/signed-url`: os mesmos da página
 * que envia imagens para ela. A regra da rota em `API_ROUTE_PERMISSIONS` só
 * deixa entrar quem tem papel de algum desses módulos; o handler confere a
 * `folder` do corpo com esta tabela.
 */
export const UPLOAD_FOLDER_ROLES: Record<UploadFolder, readonly string[]> = {
  // /gorio/courses
  courses: COURSES_ROLES,
  // /gorio/empregabilidade/empresas e /gorio/empregabilidade/new/empresa
  empresas: EMPREGO_TRABALHO_ROLES,
  // /gorio/oportunidades-mei
  mei: MEI_ROLES,
}

/**
 * Confere se os papéis do usuário (do Heimdall) cobrem a pasta de upload.
 * Sem papéis (Heimdall indisponível ou usuário sem papel), nega.
 */
export function hasUploadFolderAccess(
  folder: UploadFolder,
  userRoles: readonly string[] | null | undefined
): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false
  }

  const allowedRoles = UPLOAD_FOLDER_ROLES[folder]
  return userRoles.some(role => allowedRoles.includes(role))
}

function splitPath(path: string): string[] {
  return path.split('/').filter(segment => segment.length > 0)
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith('[') && segment.endsWith(']')
}

/**
 * Casa um caminho com o padrão de uma rota de API.
 * @returns a especificidade (1 = segmento literal, 0 = dinâmico) de cada
 * segmento, ou `null` se não casa
 */
function matchApiRoutePattern(
  patternSegments: string[],
  pathSegments: string[]
): number[] | null {
  if (patternSegments.length !== pathSegments.length) {
    return null
  }

  const specificity: number[] = []
  for (const [index, patternSegment] of patternSegments.entries()) {
    if (isDynamicSegment(patternSegment)) {
      specificity.push(0)
    } else if (patternSegment === pathSegments[index]) {
      specificity.push(1)
    } else {
      return null
    }
  }
  return specificity
}

function isMoreSpecific(candidate: number[], current: number[]): boolean {
  for (const [index, value] of candidate.entries()) {
    if (value !== current[index]) {
      return value > (current[index] ?? 0)
    }
  }
  return false
}

/**
 * Acha a regra de uma rota de API. Como no roteamento do Next, segmento
 * literal tem precedência sobre segmento dinâmico (`/api/courses/draft` antes
 * de `/api/courses/[course-id]`).
 * @returns o padrão da rota e a regra, ou `null` se a rota não tem regra
 */
export function findApiRoutePermission(
  path: string
): { pattern: string; permission: ApiRoutePermission } | null {
  const pathSegments = splitPath(path)
  let best: {
    pattern: string
    permission: ApiRoutePermission
    specificity: number[]
  } | null = null

  for (const [pattern, permission] of Object.entries(API_ROUTE_PERMISSIONS)) {
    const specificity = matchApiRoutePattern(splitPath(pattern), pathSegments)
    if (
      specificity &&
      (!best || isMoreSpecific(specificity, best.specificity))
    ) {
      best = { pattern, permission, specificity }
    }
  }

  return best ? { pattern: best.pattern, permission: best.permission } : null
}

/**
 * Confere se os papéis do usuário (do Heimdall) satisfazem a regra de uma
 * rota de API. Sem papéis (Heimdall indisponível ou usuário sem papel), só as
 * regras `public` e `authenticated` passam.
 */
export function hasApiRouteAccess(
  permission: ApiRoutePermission,
  userRoles: readonly string[] | null | undefined
): boolean {
  if (permission.kind !== 'roles') {
    return true
  }

  if (!userRoles || userRoles.length === 0) {
    return false
  }

  return permission.anyOfEach.every(group =>
    group.some(role => userRoles.includes(role))
  )
}
