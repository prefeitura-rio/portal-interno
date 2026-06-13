'use client'

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Slider } from './slider'

interface ImageCropDialogProps {
  open: boolean
  imageSrc: string
  aspect: number
  onConfirm: (croppedBlob: Blob) => void
  onCancel: () => void
  title?: string
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

async function cropImageToBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputType: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas indisponível'))
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      )
      canvas.toBlob(
        blob =>
          blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem')),
        outputType
      )
    }
    image.onerror = () =>
      reject(new Error('Não foi possível carregar a imagem'))
    image.src = imageSrc
  })
}

export function ImageCropDialog({
  open,
  imageSrc,
  aspect,
  onConfirm,
  onCancel,
  title = 'Ajustar imagem',
  outputType = 'image/jpeg',
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const blob = await cropImageToBlob(
        imageSrc,
        croppedAreaPixels,
        outputType
      )
      onConfirm(blob)
    } catch {
      // error handled by parent
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full" style={{ height: 300 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-1 px-1">
          <p className="text-xs text-muted-foreground">Zoom</p>
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
