'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean
  message?: string
  onConfirm?: () => void
  onCancel?: () => void
}

/**
 * Hook para interceptar navegação quando há mudanças não salvas
 *
 * @param hasUnsavedChanges - Indica se há mudanças não salvas
 * @param message - Mensagem customizada para o diálogo do browser (opcional)
 * @param onConfirm - Callback quando o usuário confirma a navegação
 * @param onCancel - Callback quando o usuário cancela a navegação
 *
 * @returns Objeto com função para confirmar navegação programaticamente
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  message = 'Você tem alterações não salvas. Tem certeza que deseja sair?',
  onConfirm,
  onCancel,
}: UseUnsavedChangesOptions) {
  const router = useRouter()
  const pendingNavigationRef = useRef<string | null>(null)
  const shouldBlockRef = useRef(false)

  // Interceptar navegação do browser (fechar aba, recarregar, etc)
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, message])

  // Interceptar navegação do Next.js router
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // Interceptar cliques em links
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement

      if (!link) return

      // Ignorar links externos ou com target="_blank"
      if (link.target === '_blank' || link.href.startsWith('http')) {
        return
      }

      // Ignorar links que não são do Next.js (sem data-nextjs-router)
      if (!link.hasAttribute('data-nextjs-router')) {
        return
      }

      const href = link.getAttribute('href')
      if (!href) return

      // Verificar se é uma navegação diferente da página atual
      const currentPath = window.location.pathname
      if (href === currentPath || href.startsWith('#')) {
        return
      }

      e.preventDefault()
      pendingNavigationRef.current = href
      shouldBlockRef.current = true

      // Disparar evento customizado para mostrar o modal
      window.dispatchEvent(
        new CustomEvent('unsaved-changes-navigation', {
          detail: { href, preventDefault: () => {} },
        })
      )
    }

    // Interceptar navegação programática do router
    const originalPush = router.push
    const originalReplace = router.replace

    router.push = ((...args: Parameters<typeof router.push>) => {
      if (hasUnsavedChanges && shouldBlockRef.current) {
        pendingNavigationRef.current = args[0] as string
        shouldBlockRef.current = true

        // Disparar evento customizado
        window.dispatchEvent(
          new CustomEvent('unsaved-changes-navigation', {
            detail: { href: args[0], preventDefault: () => {} },
          })
        )

        return Promise.resolve(false)
      }

      return originalPush.apply(router, args)
    }) as typeof router.push

    router.replace = ((...args: Parameters<typeof router.replace>) => {
      if (hasUnsavedChanges && shouldBlockRef.current) {
        pendingNavigationRef.current = args[0] as string
        shouldBlockRef.current = true

        // Disparar evento customizado
        window.dispatchEvent(
          new CustomEvent('unsaved-changes-navigation', {
            detail: { href: args[0], preventDefault: () => {} },
          })
        )

        return Promise.resolve(false)
      }

      return originalReplace.apply(router, args)
    }) as typeof router.replace

    document.addEventListener('click', handleLinkClick, true)

    return () => {
      document.removeEventListener('click', handleLinkClick, true)
      router.push = originalPush
      router.replace = originalReplace
    }
  }, [hasUnsavedChanges, router])

  // Função para confirmar navegação
  const confirmNavigation = (href?: string) => {
    shouldBlockRef.current = false
    const targetHref = href || pendingNavigationRef.current

    if (targetHref) {
      if (onConfirm) {
        onConfirm()
      }
      router.push(targetHref)
      pendingNavigationRef.current = null
    }
  }

  // Função para cancelar navegação
  const cancelNavigation = () => {
    shouldBlockRef.current = false
    pendingNavigationRef.current = null
    if (onCancel) {
      onCancel()
    }
  }

  return {
    confirmNavigation,
    cancelNavigation,
    pendingNavigation: pendingNavigationRef.current,
  }
}
