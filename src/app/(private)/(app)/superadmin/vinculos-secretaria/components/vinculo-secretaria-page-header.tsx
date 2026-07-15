'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CircleHelp } from 'lucide-react'
import { useState } from 'react'

interface VinculoSecretariaPageHeaderProps {
  title: string
  description: string
}

export function VinculoSecretariaPageHeader({
  title,
  description,
}: VinculoSecretariaPageHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setOpen(true)}
            aria-label="Entenda o vínculo de Secretaria e CPF"
          >
            <CircleHelp className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Entenda o vínculo de Secretaria e CPF</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-2">
                <p>
                  Ao vincular um CPF a uma secretaria, esse CPF passa a ter
                  acesso restrito aos artefatos da plataforma associados a essa
                  secretaria, por exemplo, cursos e vagas de emprego.
                </p>
                <p>
                  Em produção, essa relação é populada com os vínculos já
                  existentes no Ergon. Assim, CPFs previamente cadastrados no
                  Ergon entram automaticamente na base de vínculos.
                </p>
                <p>
                  Essa ingestão será feita uma única vez. Depois disso, o
                  gerenciamento fica manual aqui no portal interno, tanto para
                  adicionar novos vínculos quanto para excluir os existentes.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
