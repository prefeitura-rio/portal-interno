'use client'

import { PageClientWrapper } from '@/components/preview/page-client-wrapper'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { ModelsPrefRioService } from '@/http-busca-search/models/modelsPrefRioService'

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
      <DialogContent className="w-[90%] sm:max-w-[1268px] max-h-[95vh] p-0 overflow-y-auto overflow-x-hidden">
        <PageClientWrapper
          serviceData={serviceData}
          orgaoGestorName={orgaoGestorName}
        />
      </DialogContent>
    </Dialog>
  )
}
