'use client'

import { PageClientWrapper } from '@/components/preview/page-client-wrapper'
import { Button } from '@/components/ui/button'
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import type { ModelsPrefRioService } from '@/http-busca-search/models/modelsPrefRioService'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ServicePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceData: ModelsPrefRioService
  orgaoGestorName: string | null
}

export function ServicePreviewModal({
  open,
  onOpenChange,
  serviceData,
  orgaoGestorName,
}: ServicePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute -top-12 right-0 h-9 w-9 rounded-full bg-background border cursor-pointer z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
          <div className="bg-background w-[90vw] sm:max-w-[1268px] max-h-[85vh] p-0 overflow-y-auto overflow-x-hidden rounded-lg border shadow-lg">
            <PageClientWrapper
              serviceData={serviceData}
              orgaoGestorName={orgaoGestorName}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
