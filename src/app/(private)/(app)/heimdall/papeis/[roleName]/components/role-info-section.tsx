'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAllHeimdallRoles,
  useRoleActions,
} from '../../../hooks/use-heimdall-roles'

export function RoleInfoSection({ roleName }: { roleName: string }) {
  const { data: allRoles, isLoading: loadingRoles } = useAllHeimdallRoles()
  const { data: roleActions, isLoading: loadingActions } =
    useRoleActions(roleName)

  const role = allRoles?.find(item => item.name === roleName)
  const loading = loadingRoles || loadingActions

  const infos: { label: string; value: React.ReactNode }[] = [
    { label: 'ID do papel', value: role?.id ?? '—' },
    { label: 'Criado por', value: role?.created_by || '—' },
    {
      label: 'Criado em',
      value: role?.created_at
        ? new Date(role.created_at).toLocaleDateString('pt-BR')
        : 'Sistema',
    },
    { label: 'Total de ações', value: roleActions?.length ?? 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do papel</CardTitle>
        <CardDescription>{role?.description ?? ''}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {infos.map(info => (
            <div key={info.label}>
              <dt className="text-sm font-medium text-muted-foreground mb-1">
                {info.label}
              </dt>
              <dd className="font-semibold">
                {loading ? <Skeleton className="h-6 w-16" /> : info.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
