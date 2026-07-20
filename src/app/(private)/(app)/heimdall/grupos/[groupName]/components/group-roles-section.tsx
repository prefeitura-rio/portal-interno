'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RoleResponse } from '@/http-heimdall/models'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import {
  useAssignRoleToGroup,
  useGroupRoles,
  useRemoveRoleFromGroup,
} from '../../../hooks/use-heimdall-groups'
import { useAllHeimdallRoles } from '../../../hooks/use-heimdall-roles'
import { SYSTEM_BADGE_CLASS } from '../../../lib/tones'

export function GroupRolesSection({ groupName }: { groupName: string }) {
  const [selectedRole, setSelectedRole] = React.useState('')
  const [roleToRemove, setRoleToRemove] = React.useState<RoleResponse | null>(
    null
  )

  const { data: groupRoles, isLoading, error } = useGroupRoles(groupName)
  const { data: allRoles, isLoading: loadingAllRoles } = useAllHeimdallRoles()
  const assignRole = useAssignRoleToGroup(groupName)
  const removeRole = useRemoveRoleFromGroup(groupName)

  const availableRoles = React.useMemo(() => {
    if (!allRoles) return []
    const assigned = new Set(groupRoles?.map(role => role.name) ?? [])
    return allRoles.filter(role => !assigned.has(role.name))
  }, [allRoles, groupRoles])

  const handleAssign = () => {
    if (!selectedRole) return
    assignRole.mutate(selectedRole, {
      onSuccess: () => setSelectedRole(''),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Papéis do grupo</CardTitle>
        <CardDescription>
          Papéis atribuídos a este grupo. Todos os membros herdam estes papéis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={loadingAllRoles || availableRoles.length === 0}
          >
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue
                placeholder={
                  loadingAllRoles
                    ? 'Carregando papéis...'
                    : availableRoles.length === 0
                      ? 'Nenhum papel disponível'
                      : 'Selecione um papel'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map(role => (
                <SelectItem key={role.name} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={!selectedRole || assignRole.isPending}
          >
            {assignRole.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Atribuir papel
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Erro ao carregar papéis: {error.message}
          </p>
        ) : groupRoles?.length ? (
          <ul className="divide-y rounded-md border">
            {groupRoles.map(role => (
              <li
                key={role.name}
                className="flex items-center justify-between gap-4 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{role.name}</span>
                    {!role.created_at && (
                      <Badge variant="outline" className={SYSTEM_BADGE_CLASS}>
                        Sistema
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {role.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover papel do grupo"
                  className="text-destructive hover:text-destructive shrink-0"
                  disabled={removeRole.isPending}
                  onClick={() => setRoleToRemove(role)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            Este grupo ainda não possui papéis atribuídos.
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!roleToRemove}
        onOpenChange={open => {
          if (!open) setRoleToRemove(null)
        }}
        title="Remover papel do grupo?"
        description={`Tem certeza que deseja remover o papel "${roleToRemove?.name ?? ''}" do grupo? Os membros perderão as permissões deste papel.`}
        confirmText="Remover"
        variant="destructive"
        onConfirm={() => {
          if (roleToRemove) {
            removeRole.mutate(roleToRemove.name)
          }
          setRoleToRemove(null)
        }}
      />
    </Card>
  )
}
