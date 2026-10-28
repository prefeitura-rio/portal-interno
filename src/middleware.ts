import {
  type MiddlewareConfig,
  type NextRequest,
  NextResponse,
} from 'next/server'
import { isJwtExpired } from './lib'
import { getLogUserRef } from './lib/log-user-ref'
import {
  getUserFromHeimdallWithCache,
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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
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

    // Role-based access control (RBAC) using Heimdall user cache (heimdall_user cookie)
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
    if (path === '/session-expired' || path === '/unauthorized') {
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
