'use client'

import { cn } from '@/lib/utils'
import { ImagePlus, X } from 'lucide-react'
import React from 'react'
import { Button } from './button'
import { Input } from './input'

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
}

export function ImageUpload({
  value,
  onChange,
  label,
  className,
  previewClassName = 'max-h-[200px] max-w-full rounded-lg object-contain',
  placeholder = 'https://exemplo.com/imagem.jpg',
  error = false,
  errorMessage,
  disabled = false,
}: ImageUploadProps) {
  const id = React.useId()
  const [inputValue, setInputValue] = React.useState(value || '')

  // Sync local state with prop value
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '')
    }
  }, [value, inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setInputValue(url)
    onChange(url || undefined)
  }

  const handleRemove = () => {
    setInputValue('')
    onChange(undefined)
  }

  const hasError = error

  return (
    <div className={cn('space-y-4 bg-card', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          hasError && 'text-destructive'
        )}
      >
        {label}
      </label>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            id={id}
            type="url"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            className={cn(
              'flex-1',
              hasError && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          {inputValue && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="h-10 w-10 p-0 text-destructive hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {inputValue && (
          <div className="relative rounded-lg border p-4">
            <img
              src={inputValue}
              alt="Preview"
              className={cn(previewClassName, 'w-full h-auto')}
            />
          </div>
        )}

        {!inputValue && (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed border-muted-foreground/25 p-6 text-center',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default'
            )}
          >
            <ImagePlus className="size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Digite uma URL de imagem para visualizar a prévia
            </p>
            <p className="text-xs text-muted-foreground">
              Suporte para PNG, JPG, JPEG ou SVG
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
