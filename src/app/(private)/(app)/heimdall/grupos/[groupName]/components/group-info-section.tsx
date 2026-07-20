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
  useGroupMembers,
  useGroupRoles,
  useHeimdallGroup,
} from '../../../hooks/use-heimdall-groups'

export function GroupInfoSection({ groupName }: { groupName: string }) {
  const { data: group, isLoading: loadingGroup } = useHeimdallGroup(groupName)
  const { data: members, isLoading: loadingMembers } =
    useGroupMembers(groupName)
  const { data: roles, isLoading: loadingRoles } = useGroupRoles(groupName)

  const loading = loadingGroup || loadingMembers || loadingRoles

  const infos: { label: string; value: React.ReactNode }[] = [
    { label: 'ID do grupo', value: group?.id ?? '—' },
    {
      label: 'Criado em',
      value: group?.created_at
        ? new Date(group.created_at).toLocaleDateString('pt-BR')
        : '—',
    },
    { label: 'Criado por', value: group?.created_by || '—' },
    { label: 'Total de membros', value: members?.length ?? 0 },
    { label: 'Total de papéis', value: roles?.length ?? 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do grupo</CardTitle>
        <CardDescription>{group?.description ?? ''}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
