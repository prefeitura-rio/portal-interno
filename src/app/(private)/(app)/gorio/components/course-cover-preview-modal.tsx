'use client'

import oportunidadesLogo from '@/../public/oportunidades-cariocas-rio-dark.png'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

type Accessibility = 'ACESSIVEL' | 'EXCLUSIVO'

interface CourseCoverPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coverImage: string
  title?: string
  accessibility?: Accessibility | null | undefined | ''
}

const accessibilityPreviewLabel: Record<Accessibility, string> = {
  ACESSIVEL: 'Acessível',
  EXCLUSIVO: 'Exclusivo PCD',
}

interface CourseCoverHeaderPreviewProps {
  coverImage: string
  title: string
  accessibility?: Accessibility | null | undefined | ''
  variant: 'mobile' | 'desktop'
}

function CourseCoverHeaderPreview({
  coverImage,
  title,
  accessibility,
  variant,
}: CourseCoverHeaderPreviewProps) {
  const isMobile = variant === 'mobile'

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-zinc-900',
        isMobile ? 'h-[320px]' : 'h-[380px]'
      )}
    >
      <div className="absolute top-0 inset-x-0 z-10 flex items-center px-4 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
          aria-hidden
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </div>
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <img
            src={oportunidadesLogo.src}
            alt="Oportunidades Cariocas"
            className={cn('object-contain w-auto', isMobile ? 'h-5' : 'h-6')}
          />
        </div>
      </div>

      <img
        src={coverImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 sm:p-6">
        <div className="mb-3 flex flex-col gap-1">
          {accessibility && (
            <span className="inline-flex w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm sm:text-xs">
              {accessibilityPreviewLabel[accessibility]}
            </span>
          )}
        </div>
        <h2
          className={cn(
            'font-bold leading-snug text-white',
            isMobile ? 'text-2xl' : 'text-3xl'
          )}
        >
          {title || 'Título do curso'}
        </h2>
      </div>
    </div>
  )
}

export function CourseCoverPreviewModal({
  open,
  onOpenChange,
  coverImage,
  title,
  accessibility,
}: CourseCoverPreviewModalProps) {
  const displayTitle = title?.trim() || 'Título do curso'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle>Pré-visualização da capa</DialogTitle>
            <DialogDescription>
              Veja como a capa do curso aparecerá no portal Oportunidades
              Cariocas.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="desktop" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-6 pb-4 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="desktop" className="flex-1">
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex-1">
                Mobile
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="desktop"
            className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
          >
            <CourseCoverHeaderPreview
              coverImage={coverImage}
              title={displayTitle}
              accessibility={accessibility}
              variant="desktop"
            />
            <p className="px-6 py-3 text-xs text-muted-foreground">
              Largura máxima de Desktop, igual à página de detalhes do curso no
              Oportunidades Cariocas.
            </p>
          </TabsContent>

          <TabsContent
            value="mobile"
            className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
          >
            <div className="flex flex-col items-center py-6">
              <div className="w-[375px] shrink-0 overflow-hidden rounded-[2rem] border-[6px] border-zinc-800 bg-zinc-950 shadow-xl">
                <div className="flex h-6 items-center justify-center bg-zinc-900">
                  <div className="h-1.5 w-16 rounded-full bg-zinc-700" />
                </div>
                <CourseCoverHeaderPreview
                  coverImage={coverImage}
                  title={displayTitle}
                  accessibility={accessibility}
                  variant="mobile"
                />
              </div>
              <p className="mt-4 px-6 text-center text-xs text-muted-foreground">
                Simulação em 375px de largura, tamanho padrão de celular.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
