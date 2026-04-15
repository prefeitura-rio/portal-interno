'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'

interface LinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (url: string) => void
  initialUrl?: string
}

export function LinkDialog({
  open,
  onOpenChange,
  onConfirm,
  initialUrl = '',
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl)

  // Update URL when dialog opens with initial value
  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
    }
  }, [open, initialUrl])

  const handleConfirm = () => {
    onConfirm(url)
    onOpenChange(false)
  }

  const handleRemove = () => {
    onConfirm('')
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialUrl ? 'Editar link' : 'Inserir link'}
          </DialogTitle>
          <DialogDescription>
            Digite a URL do link que deseja inserir no texto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://exemplo.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initialUrl && (
            <Button type="button" variant="destructive" onClick={handleRemove}>
              Remover link
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {initialUrl ? 'Atualizar' : 'Inserir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

