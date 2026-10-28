'use client'

import { Button } from '@/components/ui/button'
import { ThemeAwareVideo } from '@/components/ui/custom/theme-aware-video'
import { VIDEO_SOURCES } from '@/constants/videos-sources'
import { useLogout } from '@/hooks/use-logout'
import { useViewportHeight } from '@/hooks/useViewport'
import Link from 'next/link'

// A negação de uma rota por falta de papel não encerra a sessão: o usuário
// segue com acesso às páginas do próprio módulo. O logout completo (Keycloak +
// gov.br) só acontece pelo clique explícito em sair (DEV-67).
export default function Unauthorized() {
  const { isBelowBreakpoint } = useViewportHeight(648)
  const { isLoading, handleLogout } = useLogout()

  return (
    <div className="max-w-xl min-h-lvh mx-auto pt-16 md:pt-16 flex flex-col overflow-y-hidden">
      <div className="px-4">
        <ThemeAwareVideo
          source={VIDEO_SOURCES.sessionExpired}
          containerClassName="mb-4 md:mb-8 flex items-center justify-center h-[min(328px,50vh)] max-h-[328px]"
        />
        <h2 className="text-2xl text-center font-semibold text-foreground mb-1">
          Acesso Não Autorizado
        </h2>
        <p
          className={`text-muted-foreground text-center text-sm md:text-base ${isBelowBreakpoint ? 'mb-6' : 'mb-10'}`}
        >
          Você não possui permissão para acessar esta página. Se precisar de
          acesso, entre em contato com o administrador do sistema.
        </p>
        <div className="flex flex-col items-center gap-2 px-4 pb-2">
          <Button asChild className="w-56">
            <Link href="/">Voltar ao início</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-56"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? 'Saindo...' : 'Sair e entrar com outra conta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
