'use client'

import { cn } from '@/lib/utils'
import { ImagePlus, X } from 'lucide-react'
import React from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from './button'

interface ImageUploadProps {
  value?: File | null
  onChange: (file: File | undefined) => void
  label: string
  className?: string
  previewClassName?: string
  maxSize?: number
  accept?: Record<string, string[]>
  error?: boolean
  errorMessage?: string
}

export function ImageUpload({
  value,
  onChange,
  label,
  className,
  previewClassName = 'max-h-[200px] max-w-full rounded-lg object-contain',
  maxSize = 1000000, // 1MB default
  accept = {
    'image/png': [],
    'image/jpg': [],
    'image/jpeg': [],
    'image/svg+xml': [],
  },
  error = false,
  errorMessage,
}: ImageUploadProps) {
  const id = React.useId()
  const [preview, setPreview] = React.useState<string | ArrayBuffer | null>('')

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const reader = new FileReader()
      try {
        reader.onload = () => setPreview(reader.result)
        reader.readAsDataURL(acceptedFiles[0])
        onChange(acceptedFiles[0])
      } catch (error) {
        setPreview(null)
        onChange(undefined)
      }
    },
    [onChange]
  )

  const handleRemove = () => {
    setPreview(null)
    onChange(undefined)
  }

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      maxFiles: 1,
      maxSize,
      accept,
    })

  const hasError = error || fileRejections.length > 0
  const displayError =
    errorMessage ||
    (fileRejections.length > 0 &&
      `A imagem deve ter menos de ${Math.round(maxSize / 1000000)}MB e ser do tipo PNG, JPG, JPEG ou SVG`)

  return (
    <div className={cn('space-y-4', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          hasError && 'text-destructive'
        )}
      >
        {label}
      </label>

      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-y-2 rounded-lg border p-6 shadow-sm hover:bg-muted/50 transition-colors',
          hasError ? 'border-destructive' : 'border-muted-foreground/25',
          preview && 'relative'
        )}
      >
        {preview && (
          <>
            <img
              src={preview as string}
              alt="Preview"
              className={previewClassName}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleRemove()
              }}
              className="absolute top-2 right-2 h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}

        <ImagePlus
          className={cn(
            'text-muted-foreground',
            preview ? 'hidden' : 'block',
            previewClassName.includes('max-h-[300px]') ? 'size-16' : 'size-12'
          )}
        />

        <input {...getInputProps()} id={id} type="file" />

        {isDragActive ? (
          <p className="text-sm text-muted-foreground">Solte a imagem aqui!</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Clique aqui ou arraste uma imagem para fazer upload
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          PNG, JPG, JPEG ou SVG (MAX. {Math.round(maxSize / 1000000)}MB)
        </p>
      </div>

      {displayError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}
    </div>
  )
}
