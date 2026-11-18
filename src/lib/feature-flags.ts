/**
 * Feature flags de runtime, lidas só no servidor (DEV-644).
 *
 * Diferente de `NEXT_PUBLIC_FEATURE_FLAG` (embutida no bundle no `next build`),
 * estas variáveis vêm do Secret do pod (Infisical, com auto-reload) e são lidas
 * de `process.env` a cada requisição: trocar o valor no Infisical surte efeito
 * no reinício dos pods, sem novo build nem deploy.
 *
 * Regras:
 * - Seguras por padrão: só o valor exato `'true'` liga; ausente, vazio ou
 *   qualquer outro valor (`'false'`, `'TRUE'`, `'1'`) deixa desligado.
 * - Só em código de servidor (Route Handler, Server Component, layout), sempre
 *   em renderização dinâmica (`export const dynamic = 'force-dynamic'` no
 *   segmento ou `await connection()` antes de ler). Nunca
 *   importe este módulo em componente client: lá `process.env.FEATURE_*` não
 *   existe. O valor chega ao client como prop ou contexto vindo do servidor
 *   (`FeatureFlagsProvider`).
 */

/**
 * Dashboard de Capacitações: menu, página `/gorio/courses/dashboard` e BFF
 * `/api/courses/dashboard`. Somada ao RBAC de `COURSES_DASHBOARD_ROLES`, nunca
 * no lugar dele. Variável `FEATURE_COURSES_DASHBOARD` (`'true'` em staging,
 * `'false'` em produção até a homologação da Casa Civil).
 */
export function isCoursesDashboardEnabled(): boolean {
  return process.env.FEATURE_COURSES_DASHBOARD === 'true'
}

/** Flags que o servidor repassa à UI (menu lateral). */
export interface RuntimeFeatureFlags {
  coursesDashboard: boolean
}

/** As flags de runtime atuais, para injetar no client a partir do servidor. */
export function getRuntimeFeatureFlags(): RuntimeFeatureFlags {
  return { coursesDashboard: isCoursesDashboardEnabled() }
}
