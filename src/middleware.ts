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

export async function middleware(request: NextRequest) {
  // Generate nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Define CSP header with nonce support
  const isDevelopment = process.env.NODE_ENV === 'development'

  // SHA256 hashes for inline scripts
  const scriptHashes = [
    'sha256-UnthrFpGFotkvMOTp/ghVMSXoZZj9Y6epaMsaBAbUtg=',
    'sha256-TtbCxulSBIRcXKJGEUTNzReCryzD01lKLU4IQV8Ips0=',
    'sha256-QaDv8TLjywIM3mKcA73bK0btmqNpUfcuwzqZ4U9KTsk=',
    'sha256-rbbnijHn7DZ6ps39myQ3cVQF1H+U/PJfHh5ei/Q2kb8=',
  ]

  const scriptSrcDirectives = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...scriptHashes.map(hash => `'${hash}'`),
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ]

  const cspHeader = `
    default-src 'self' https://*.googleapis.com/rj-escritorio-dev-public/;
    script-src ${scriptSrcDirectives.join(' ')};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.google-analytics.com https://*.googletagmanager.com https://www.googletagmanager.com https://static.hotjar.com https://script.hotjar.com https://flagcdn.com https://*.doubleclick.net https://*.apps.rio.gov.br https://*.googleapis.com/;
    font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com;
    connect-src 'self' https://*.google.com/ https://www.google.com/* https://*.acesso.gov.br/ https://auth-idriohom.apps.rio.gov.br/ https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.googletagmanager.com https://*.hotjar.com https://*.hotjar.io https://metrics.hotjar.io wss://*.hotjar.com https://*.doubleclick.net https://*.app.dados.rio;
    frame-src 'self' https://*.google.com/ https://www.google.com/* https://*.acesso.gov.br/ https://www.googletagmanager.com https://vars.hotjar.com https://*.doubleclick.net;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://*.acesso.gov.br/ https://*.google-analytics.com https://*.googletagmanager.com https://www.googletagmanager.com https://www.googletagmanager.com/* https://static.hotjar.com https://script.hotjar.com https://flagcdn.com https://*.doubleclick.net;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.trim()

  // Clean up CSP header
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim()

  const path = request.nextUrl.pathname
  const publicRoute = publicRoutes.find(route => matchRoute(path, route.path))
  const authToken = request.cookies.get('access_token')
  const refreshToken = request.cookies.get('refresh_token')

  // Set up request headers with nonce and CSP
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue
  )

  // TEMPORARY: Block access to "oportunidades-mei" routes when feature flag is enabled
  // TODO: Remove this block once the feature is ready
  if (
    path.includes('oportunidades-mei') &&
    process.env.NEXT_PUBLIC_FEATURE_FLAG === 'true'
  ) {
    return await handleUnauthorizedUser(
      request,
      requestHeaders,
      contentSecurityPolicyHeaderValue
    )
  }

  if (!authToken && publicRoute) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set(
      'Content-Security-Policy',
      contentSecurityPolicyHeaderValue
    )
    return response
  }

  if (!authToken && !publicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.href = REDIRECT_WHEN_NOT_AUTHENTICATED_ROUTE
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set(
      'Content-Security-Policy',
      contentSecurityPolicyHeaderValue
    )
    return response
  }

  if (authToken && !publicRoute) {
    // Check if JWT is expired
    if (isJwtExpired(authToken.value)) {
      return await handleExpiredToken(
        request,
        refreshToken?.value,
        requestHeaders,
        contentSecurityPolicyHeaderValue
      )
    }

    // Role-based access control (RBAC) using Heimdall API
    // Fetch user roles and verify route access
    const userRoles = await getUserRolesInMiddleware(authToken.value)

    // Check if user has access to the requested route
    const hasAccess = hasRouteAccess(path, userRoles)

    if (!hasAccess) {
      // User doesn't have required roles for this route
      return await handleUnauthorizedUser(
        request,
        requestHeaders,
        contentSecurityPolicyHeaderValue
      )
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set(
      'Content-Security-Policy',
      contentSecurityPolicyHeaderValue
    )
    return response
  }

  // Handle case where user has auth token but is accessing a public route
  if (authToken && publicRoute) {
    // Skip token validation for special error pages to prevent redirect loops
    if (path === '/session-expired' || path === '/unauthorized') {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      response.headers.set(
        'Content-Security-Policy',
        contentSecurityPolicyHeaderValue
      )
      return response
    }

    // Check if JWT is expired even for public routes when user is authenticated
    if (isJwtExpired(authToken.value)) {
      return await handleExpiredToken(
        request,
        refreshToken?.value,
        requestHeaders,
        contentSecurityPolicyHeaderValue
      )
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    response.headers.set(
      'Content-Security-Policy',
      contentSecurityPolicyHeaderValue
    )
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
