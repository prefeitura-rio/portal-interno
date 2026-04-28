'use client'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UnsavedChangesGuardProps {
  hasUnsavedChanges: boolean
  message?: string
  onConfirmNavigation?: () => void
  allowNavigation?: boolean // Quando true, permite navegação sem mostrar o modal
}

/**
 * Componente que intercepta navegação quando há mudanças não salvas
 */
export function UnsavedChangesGuard({
  hasUnsavedChanges,
  message = 'Você tem alterações não salvas. Tem certeza que deseja sair? As alterações serão perdidas.',
  onConfirmNavigation,
  allowNavigation = false,
}: UnsavedChangesGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  )
  const isNavigatingRef = useRef(false)

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

  // Interceptar cliques em links
  useEffect(() => {
    if (!hasUnsavedChanges || isNavigatingRef.current || allowNavigation) return

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement

      if (!link) return

      // Ignorar links externos ou com target="_blank"
      if (link.target === '_blank') return

      // Ignorar links que são âncoras (#)
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#')) return

      // Ignorar links externos (que começam com http e não são do mesmo domínio)
      if (href.startsWith('http') && !href.includes(window.location.origin)) {
        return
      }

      // Normalizar href para comparação
      let normalizedHref = href
      try {
        // Se for URL absoluta, pegar apenas o pathname
        if (href.startsWith('http')) {
          const url = new URL(href)
          normalizedHref = url.pathname + url.search
        } else {
          // Se for relativa, remover query params para comparação
          const [path] = href.split('?')
          normalizedHref = path
        }
      } catch {
        // Se não conseguir fazer parse, usar como está
        const [path] = href.split('?')
        normalizedHref = path
      }

      // Ignorar se é a mesma página (comparando pathname)
      if (
        normalizedHref === pathname ||
        normalizedHref === window.location.pathname
      ) {
        return
      }

      // Interceptar a navegação
      e.preventDefault()
      e.stopPropagation()

      // Usar href original para navegação
      setPendingNavigation(href)
      setShowDialog(true)
    }

    document.addEventListener('click', handleLinkClick, true)

    return () => {
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [hasUnsavedChanges, pathname, allowNavigation])

  // Interceptar navegação programática do router
  useEffect(() => {
    if (!hasUnsavedChanges || isNavigatingRef.current || allowNavigation) return

    const originalPush = router.push
    const originalReplace = router.replace
    const originalBack = router.back
    const originalForward = router.forward

    let pendingPush: string | null = null
    let pendingReplace: string | null = null

    router.push = ((...args: Parameters<typeof router.push>) => {
      if (isNavigatingRef.current) {
        return originalPush.apply(router, args)
      }

      let href = ''
      if (typeof args[0] === 'string') {
        href = args[0]
      } else if (
        args[0] &&
        typeof args[0] === 'object' &&
        'pathname' in args[0]
      ) {
        href = (args[0] as { pathname?: string }).pathname || ''
      }

      // Ignorar se é a mesma página
      if (href === pathname || !href) {
        return originalPush.apply(router, args)
      }

      pendingPush = href
      setPendingNavigation(href)
      setShowDialog(true)

      return Promise.resolve(false)
    }) as typeof router.push

    router.replace = ((...args: Parameters<typeof router.replace>) => {
      if (isNavigatingRef.current) {
        return originalReplace.apply(router, args)
      }

      let href = ''
      if (typeof args[0] === 'string') {
        href = args[0]
      } else if (
        args[0] &&
        typeof args[0] === 'object' &&
        'pathname' in args[0]
      ) {
        href = (args[0] as { pathname?: string }).pathname || ''
      }

      // Ignorar se é a mesma página
      if (href === pathname || !href) {
        return originalReplace.apply(router, args)
      }

      pendingReplace = href
      setPendingNavigation(href)
      setShowDialog(true)

      return Promise.resolve(false)
    }) as typeof router.replace

    router.back = (() => {
      if (isNavigatingRef.current) {
        return originalBack.apply(router, [])
      }

      setPendingNavigation('back')
      setShowDialog(true)
      return
    }) as typeof router.back

    router.forward = (() => {
      if (isNavigatingRef.current) {
        return originalForward.apply(router, [])
      }

      setPendingNavigation('forward')
      setShowDialog(true)
      return
    }) as typeof router.forward

    return () => {
      router.push = originalPush
      router.replace = originalReplace
      router.back = originalBack
      router.forward = originalForward
    }
  }, [hasUnsavedChanges, router, pathname, allowNavigation])

  const handleConfirm = useCallback(() => {
    isNavigatingRef.current = true
    setShowDialog(false)

    if (onConfirmNavigation) {
      onConfirmNavigation()
    }

    if (pendingNavigation) {
      if (pendingNavigation === 'back') {
        router.back()
      } else if (pendingNavigation === 'forward') {
        router.forward()
      } else {
        router.push(pendingNavigation)
      }
    }

    // Reset após um pequeno delay para permitir navegação
    setTimeout(() => {
      isNavigatingRef.current = false
      setPendingNavigation(null)
    }, 100)
  }, [pendingNavigation, router, onConfirmNavigation])

  const handleCancel = useCallback(() => {
    setShowDialog(false)
    setPendingNavigation(null)
  }, [])

  return (
    <ConfirmDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      title="Alterações não salvas"
      description={message}
      confirmText="Sair sem salvar"
      cancelText="Cancelar"
      variant="destructive"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}
