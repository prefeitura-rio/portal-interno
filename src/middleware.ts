import {
  type MiddlewareConfig,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { isJwtExpired } from './lib'
import { getLogUserRef, redactCpfForLog } from './lib/log-user-ref'
import {
  getUserFromHeimdallWithCache,
  handleExpiredToken,
  handleUnauthorizedUser,
} from './lib/middleware-helpers'
import {
  findApiRoutePermission,
  hasApiRouteAccess,
  hasRouteAccess,
} from './lib/route-permissions'

const publicRoutes = [
  { path: '/description', whenAuthenticated: 'next' },
  { path: '/authentication-required/wallet', whenAuthenticated: 'redirect' },
  { path: '/manifest.json', whenAuthenticated: 'next' },
  { path: '/session-expired', whenAuthenticated: 'next' },
  { path: '/unauthorized', whenAuthenticated: 'next' },
  { path: '/login-error', whenAuthenticated: 'next' },
] as const

function matchRoute(pathname: string, routePath: string): boolean {
  // Handle exact match
  if (routePath === pathname) {
    return true
  }

  // Handle wildcard match (ending with /*)
  if (routePath.endsWith('/*')) {
    const baseRoute = routePath.slice(0, -2) // Remove /*
    return pathname.startsWith(`${baseRoute}/`) || pathname === baseRoute
  }

  return false
}

export const REDIRECT_WHEN_NOT_AUTHENTICATED_ROUTE = `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/auth?client_id=${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI}&response_type=code`

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

function apiErrorResponse(status: 401 | 403, error: string): NextResponse {
  return NextResponse.json({ error }, { status })
}

/**
 * RBAC das rotas de API (BFF): confere sessão e papéis antes do handler, com
 * as regras de `API_ROUTE_PERMISSIONS`. Responde JSON (401/403) em vez de
 * redirecionar, e nega por padrão a rota sem regra. Os logs levam só o padrão
 * da rota (nunca o caminho com CPF) e a referência opaca do usuário.
 */
async function handleApiRequest(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname
  const route = findApiRoutePermission(path)

  if (route?.permission.kind === 'public') {
    return NextResponse.next()
  }

  const authToken = request.cookies.get('access_token')?.value
  if (!authToken) {
    return apiErrorResponse(401, 'Unauthorized')
  }

  if (isJwtExpired(authToken)) {
    return apiErrorResponse(401, 'Token expired')
  }

  const response = NextResponse.next()

  if (route?.permission.kind === 'authenticated') {
    return response
  }

  const userRef = await getLogUserRef(authToken)

  if (!route) {
    console.warn(
      `[${userRef}] [MIDDLEWARE] API access denied: no permission rule for ${request.method} ${redactCpfForLog(path)} (see API_ROUTE_PERMISSIONS)`
    )
    return apiErrorResponse(403, 'Forbidden')
  }

  const user = await getUserFromHeimdallWithCache(request, response, authToken)

  if (!hasApiRouteAccess(route.permission, user?.roles)) {
    console.warn(
      `[${userRef}] [MIDDLEWARE] API access denied for ${request.method} ${route.pattern}: missing required role (see API_ROUTE_PERMISSIONS)`
    )
    return apiErrorResponse(403, 'Forbidden')
  }

  return response
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (isApiPath(path)) {
    return await handleApiRequest(request)
  }

  const publicRoute = publicRoutes.find(route => matchRoute(path, route.path))
  const authToken = request.cookies.get('access_token')
  const refreshToken = request.cookies.get('refresh_token')
  const response = NextResponse.next()

  // TEMPORARY: Block access to "oportunidades-mei" routes when feature flag is enabled
  // TODO: Remove this block once MEI is ready for production
  if (
    path.includes('oportunidades-mei') &&
    process.env.NEXT_PUBLIC_FEATURE_FLAG === 'true'
  ) {
    return await handleUnauthorizedUser(request)
  }

  if (!authToken && publicRoute) {
    return response
  }

  if (!authToken && !publicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.href = REDIRECT_WHEN_NOT_AUTHENTICATED_ROUTE
    return NextResponse.redirect(redirectUrl)
  }

  if (authToken && !publicRoute) {
    // Check if JWT is expired
    if (isJwtExpired(authToken.value)) {
      return await handleExpiredToken(request, refreshToken?.value)
    }

    // Role-based access control (RBAC) using the server-side Heimdall user cache
    // (keyed by access_token; the client-controlled heimdall_user cookie is ignored)
    // Fetch user once (with cache) and verify route access based on roles from /me
    const user = await getUserFromHeimdallWithCache(
      request,
      response,
      authToken.value
    )

    const userRoles = user?.roles ?? null

    // Opaque, non-reversible user reference: logs must never carry the CPF
    const userRef = await getLogUserRef(authToken.value)

    // Check if user has access to the requested route
    const hasAccess = hasRouteAccess(path, userRoles, userRef)

    if (!hasAccess) {
      // User doesn't have required roles for this route
      console.warn(
        `[${userRef}] [MIDDLEWARE] Access denied for path: ${path} (see route-permissions.ts)`
      )
      return await handleUnauthorizedUser(request)
    }

    return response
  }

  // Handle case where user has auth token but is accessing a public route
  if (authToken && publicRoute) {
    // Skip token validation for special error pages to prevent redirect loops
    if (
      path === '/session-expired' ||
      path === '/unauthorized' ||
      path === '/login-error'
    ) {
      return response
    }

    // Check if JWT is expired even for public routes when user is authenticated
    if (isJwtExpired(authToken.value)) {
      return await handleExpiredToken(request, refreshToken?.value)
    }

    return response
  }
}

export const config: MiddlewareConfig = {
  matcher: [
    /*
     * Match all page paths except for the ones starting with:
     * - api (API routes, matched by the entry below)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    // API routes (BFF): RBAC by API_ROUTE_PERMISSIONS (see handleApiRequest)
    '/api/:path*',
  ],
}
