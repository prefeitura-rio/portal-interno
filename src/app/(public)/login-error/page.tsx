'use client'

import govbrLogo from '@/assets/govbr.svg'
import { ThemeAwareVideo } from '@/components/ui/custom/theme-aware-video'
import { LOGIN_ROUTE } from '@/constants/url'
import { VIDEO_SOURCES } from '@/constants/videos-sources'
import { useViewportHeight } from '@/hooks/useViewport'
import {
  LOGIN_ERROR_REASON_PARAM,
  getLoginErrorMessage,
  parseLoginErrorReason,
} from '@/lib/login-error-reason'
import Image from 'next/image'
import { use } from 'react'

type LoginErrorProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default function LoginError({ searchParams }: LoginErrorProps) {
  const { isBelowBreakpoint } = useViewportHeight(648)
  // Login expirado (state do OAuth vencido ou de outro navegador) tem texto
  // próprio; qualquer outro valor mostra a falha do serviço de identidade
  const { title, description } = getLoginErrorMessage(
    parseLoginErrorReason(use(searchParams)[LOGIN_ERROR_REASON_PARAM])
  )

  return (
    <div className="max-w-xl min-h-lvh mx-auto pt-16 md:pt-16 flex flex-col overflow-y-hidden">
      <div className="px-4">
        <ThemeAwareVideo
          source={VIDEO_SOURCES.sessionExpired}
          containerClassName="mb-4 md:mb-8 flex items-center justify-center h-[min(328px,50vh)] max-h-[328px]"
        />
        <h2 className="text-2xl text-center font-semibold text-foreground mb-1">
          {title}
        </h2>
        <p
          className={`text-muted-foreground text-center text-sm md:text-base ${isBelowBreakpoint ? 'mb-6' : 'mb-10'}`}
        >
          {description}
        </p>
        {/* Gov.br Login Section */}
        <div className="px-4 w-full space-y-1">
          <p className="text-center text-sm text-foreground-light font-normal">
            Entre com a sua conta gov.br
          </p>

          <div className="flex justify-center pb-2">
            {/* Navegação completa: a rota de login responde com redirect ao Keycloak */}
            <a
              href={LOGIN_ROUTE}
              className="flex w-[216px] h-[55px] px-6 py-4 justify-center items-center gap-3 rounded-2xl bg-card transition-colors"
            >
              <Image
                src={govbrLogo}
                alt="Gov.br"
                width={80}
                height={30}
                className="object-contain"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
