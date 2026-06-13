'use client'

import { cn } from '@/lib/utils'
import { ImagePlus, Loader2, RotateCcw, X } from 'lucide-react'
import React, { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from './button'
import { ImageCropDialog } from './image-crop-dialog'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]

const DEFAULT_MAX_SIZE = 1 * 1024 * 1024 // 1MB

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(0)}MB`
    : `${(bytes / 1024).toFixed(0)}KB`
}

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler as dimensões da imagem'))
    }
    img.src = url
  })
}

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | undefined) => void
  label: string
  className?: string
  previewClassName?: string
  placeholder?: string
  error?: boolean
  errorMessage?: string
  disabled?: boolean
  /** Max file size in bytes. Defaults to 1MB. */
  maxSize?: number
  /** If provided, shows a "Restaurar padrão" button when the field is empty. */
  defaultValue?: string
  /** If true, only square images (width === height) are accepted. */
  requireSquare?: boolean
  /**
   * If set, opens a crop dialog after file selection locked to this aspect ratio.
   * Example: 16/9 for widescreen, 1 for square.
   */
  cropAspectRatio?: number
}

export function ImageUpload({
  value,
  onChange,
  label,
  className,
  previewClassName = 'max-h-[200px] max-w-full rounded-lg object-contain',
  error = false,
  errorMessage,
  disabled = false,
  maxSize = DEFAULT_MAX_SIZE,
  defaultValue,
  requireSquare = false,
  cropAspectRatio,
}: ImageUploadProps) {
  const id = React.useId()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)

  // Crop dialog state
  const [cropSrc, setCropSrc] = React.useState<string | null>(null)
  const [pendingFileType, setPendingFileType] = React.useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg')

  // Revoke object URL when it changes or on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc)
    }
  }, [cropSrc])

  const uploadBlob = async (blob: Blob, contentType: string) => {
    setUploading(true)
    try {
      const res = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erro ao obter URL de upload')
      }

      const { signedUrl, publicUrl } = await res.json()

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-goog-acl': 'public-read',
        },
        body: blob,
      })

      if (!uploadRes.ok) {
        throw new Error('Falha ao enviar o arquivo para o servidor')
      }

      onChange(publicUrl)
    } catch (err) {
      toast.error('Erro no upload', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado', {
        description: 'Use PNG, JPG, WebP ou SVG.',
      })
      return
    }
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande', {
        description: `O tamanho máximo permitido é ${formatSize(maxSize)}.`,
      })
      return
    }

    if (requireSquare) {
      try {
        const { width, height } = await getImageDimensions(file)
        if (width !== height) {
          toast.error('Imagem deve ser quadrada', {
            description: `A imagem selecionada tem ${width}×${height}px. Use uma imagem quadrada.`,
          })
          return
        }
      } catch {
        toast.error('Não foi possível verificar as dimensões da imagem')
        return
      }
    }

    // If crop is requested, open the crop dialog instead of uploading directly
    if (cropAspectRatio !== undefined) {
      const objectUrl = URL.createObjectURL(file)
      setPendingFileType(file.type === 'image/svg+xml' ? 'image/png' : (file.type as 'image/jpeg' | 'image/png' | 'image/webp'))
      setCropSrc(objectUrl)
      return
    }

    await uploadBlob(file, file.type)
  }

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null)
    await uploadBlob(blob, pendingFileType)
  }

  const handleCropCancel = () => {
    setCropSrc(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRestoreDefault = () => {
    if (defaultValue) onChange(defaultValue)
  }

  const isEmpty = !value

  return (
    <>
      {cropSrc && cropAspectRatio !== undefined && (
        <ImageCropDialog
          open
          imageSrc={cropSrc}
          aspect={cropAspectRatio}
          title={`Ajustar ${label.replace(/\*$/, '').trim().toLowerCase()}`}
          outputType={pendingFileType}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <div className={cn('space-y-4 bg-card', className)}>
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            error && 'text-destructive'
          )}
        >
          {label}
        </label>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled || uploading}
        />

        {!isEmpty ? (
          <div className="relative rounded-lg border p-4">
            <img
              src={value}
              alt="Preview"
              className={cn(previewClassName, 'w-full h-auto')}
            />
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="absolute top-2 right-2 h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault()
                if (!disabled && !uploading) setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={disabled || uploading}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed p-6 text-center transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25',
                disabled || uploading
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:border-muted-foreground/50',
                error && 'border-destructive'
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-10 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Enviando...</p>
                </>
              ) : (
                <>
                  <ImagePlus className="size-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Clique para selecionar ou arraste uma imagem
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP ou SVG — máx. {formatSize(maxSize)}
                  </p>
                </>
              )}
            </button>

            {defaultValue && !disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestoreDefault}
                className="w-full gap-2 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Usar logo padrão
              </Button>
            )}
          </div>
        )}

        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    </>
  )
}
