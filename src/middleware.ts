import {
  type MiddlewareConfig,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { isJwtExpired } from './lib'
import {
  getUserRolesInMiddleware,
  handleExpiredToken,
  handleUnauthorizedUser,
} from './lib/middleware-helpers'
import { hasRouteAccess } from './lib/route-permissions'

const publicRoutes = [
  { path: '/description', whenAuthenticated: 'next' },
  { path: '/authentication-required/wallet', whenAuthenticated: 'redirect' },
  { path: '/manifest.json', whenAuthenticated: 'next' },
  { path: '/session-expired', whenAuthenticated: 'next' },
  { path: '/unauthorized', whenAuthenticated: 'next' },
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

/**
 * Extracts CPF from JWT token for logging purposes
 * @param accessToken - The user's access token
 * @returns CPF string or 'unknown' if not found
 */
function getCpfFromToken(accessToken: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    )
    return payload.preferred_username || payload.cpf || payload.sub || 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const publicRoute = publicRoutes.find(route => matchRoute(path, route.path))
  const authToken = request.cookies.get('access_token')
  const refreshToken = request.cookies.get('refresh_token')

  // TEMPORARY: Block access to "oportunidades-mei" routes when feature flag is enabled
  // TODO: Remove this block once the feature is ready
  if (
    path.includes('oportunidades-mei') &&
    process.env.NEXT_PUBLIC_FEATURE_FLAG === 'true'
  ) {
    return await handleUnauthorizedUser(request)
  }

  if (!authToken && publicRoute) {
    return NextResponse.next()
  }

  if (!authToken && !publicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.href = REDIRECT_WHEN_NOT_AUTHENTICATED_ROUTE
    return NextResponse.redirect(redirectUrl)
  }

  if (authToken && !publicRoute) {
    const cpf = getCpfFromToken(authToken.value)

    // Check if JWT is expired
    if (isJwtExpired(authToken.value)) {
      console.log(`[${cpf}] [MIDDLEWARE] JWT expired for path: ${path}`)
      return await handleExpiredToken(request, refreshToken?.value)
    }

    // Role-based access control (RBAC) using Heimdall API
    // Fetch user roles and verify route access
    console.log(`[${cpf}] [MIDDLEWARE] Checking access for path: ${path}`)
    const userRoles = await getUserRolesInMiddleware(authToken.value)

    console.log(`[${cpf}] [MIDDLEWARE] User roles retrieved:`, userRoles)

    // Check if user has access to the requested route
    const hasAccess = hasRouteAccess(path, userRoles, cpf)

    console.log(
      `[${cpf}] [MIDDLEWARE] Access check result for ${path}:`,
      hasAccess
    )

    if (!hasAccess) {
      // User doesn't have required roles for this route
      console.error(
        `[${cpf}] [MIDDLEWARE] Access DENIED for path: ${path}. User roles:`,
        userRoles,
        'Required roles for this route:',
        hasAccess ? 'N/A' : 'Check route-permissions.ts'
      )
      return await handleUnauthorizedUser(request)
    }

    console.log(`[${cpf}] [MIDDLEWARE] Access GRANTED for path: ${path}`)

    return NextResponse.next()
  }

  // Handle case where user has auth token but is accessing a public route
  if (authToken && publicRoute) {
    // Skip token validation for special error pages to prevent redirect loops
    if (path === '/session-expired' || path === '/unauthorized') {
      return NextResponse.next()
    }

    // Check if JWT is expired even for public routes when user is authenticated
    if (isJwtExpired(authToken.value)) {
      return await handleExpiredToken(request, refreshToken?.value)
    }

    return NextResponse.next()
  }
}

export const config: MiddlewareConfig = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
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
  ],
}
