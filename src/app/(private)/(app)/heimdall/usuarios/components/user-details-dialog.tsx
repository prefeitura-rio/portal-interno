'use client'

import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserResponse } from '@/http-heimdall/models'
import { Crown } from 'lucide-react'
import Link from 'next/link'
import { isAdminUser } from './users-data-table'

interface UserDetailsDialogProps {
  user: UserResponse | null
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({
  user,
  onOpenChange,
}: UserDetailsDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user?.display_name || 'Detalhes do usuário'}
            {user && isAdminUser(user) && (
              <Crown
                className="h-5 w-5 text-amber-500 shrink-0"
                aria-label="Administrador"
              />
            )}
          </DialogTitle>
          <DialogDescription className="font-mono">
            CPF: {user?.cpf}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Grupos</h4>
            {user?.groups?.length ? (
              <div className="flex flex-wrap gap-1">
                {user.groups.map(group => (
                  <Link key={group} href={`/heimdall/grupos/${group}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                    >
                      {group}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum grupo atribuído.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Papéis</h4>
            {user?.roles?.length ? (
              <div className="flex flex-wrap gap-1">
                {user.roles.map(role => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum papel atribuído.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
