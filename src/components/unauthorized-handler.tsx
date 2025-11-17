'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function UnauthorizedHandler() {
  const pathname = usePathname()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const hasExecutedRef = useRef(false)

  useEffect(() => {
    if (pathname === '/unauthorized' && !hasExecutedRef.current) {
      hasExecutedRef.current = true

      const handleUnauthorizedLogout = async () => {
        try {
          // First logout from Keycloak
          await fetch('/api/auth/logout')

          // Then logout from gov.br via hidden iframe
          const redirectUri = `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/auth?client_id=${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI}&response_type=code`
          const govbrLogoutUrl = `${process.env.NEXT_PUBLIC_GOVBR_BASE_URL}logout?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`

          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = govbrLogoutUrl
          iframeRef.current = iframe

          document.body.appendChild(iframe)

          // Remove the iframe after loading with proper cleanup
          const cleanupIframe = () => {
            if (
              iframeRef.current &&
              iframeRef.current.parentNode === document.body
            ) {
              try {
                document.body.removeChild(iframeRef.current)
              } catch (error) {
                console.error('Error removing iframe:', error)
              }
              iframeRef.current = null
            }
          }

          iframe.onload = () => {
            setTimeout(cleanupIframe, 100)
          }

          iframe.onerror = () => {
            cleanupIframe()
          }

          // Fallback cleanup after 5 seconds
          setTimeout(cleanupIframe, 5000)
        } catch (error) {
          console.error('Error during unauthorized logout:', error)
        }
      }

      handleUnauthorizedLogout()
    }

    // Cleanup on unmount
    return () => {
      if (
        iframeRef.current &&
        iframeRef.current.parentNode === document.body
      ) {
        try {
          document.body.removeChild(iframeRef.current)
        } catch (error) {
          // Silently handle cleanup errors
        }
        iframeRef.current = null
      }
    }
  }, [pathname])

  return null
}
