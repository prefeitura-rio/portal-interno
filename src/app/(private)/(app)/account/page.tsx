import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getCurrentUserInfoApiV1UsersMeGet } from '@/http-heimdall/users/users'
import { getUserInfoFromToken } from '@/lib/user-info'
import { Shield, ShieldCheck, Users } from 'lucide-react'

// Helper function to get role display information
function getRoleInfo(role: string) {
  const roleMap: Record<
    string,
    {
      label: string
      description: string
      variant: 'default' | 'secondary' | 'outline' | 'destructive'
      className: string
    }
  > = {
    admin: {
      label: 'Administrador',
      description: 'Acesso total a todos os módulos e configurações',
      variant: 'default',
      className: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    superadmin: {
      label: 'Super Administrador',
      description: 'Acesso irrestrito a toda a plataforma',
      variant: 'default',
      className: 'bg-red-100 text-red-800 border-red-300',
    },
    'go:admin': {
      label: 'Administrador GO Rio',
      description: 'Gerencia cursos, vagas e capacitações do GO Rio',
      variant: 'secondary',
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    'busca:services:admin': {
      label: 'Administrador de Serviços',
      description: 'Gerencia e aprova serviços municipais',
      variant: 'secondary',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    'busca:services:editor': {
      label: 'Editor de Serviços',
      description: 'Cria e edita serviços municipais',
      variant: 'outline',
      className: 'bg-amber-100 text-amber-800 border-amber-300',
    },
  }

  return (
    roleMap[role] || {
      label: role,
      description: 'Função personalizada',
      variant: 'outline' as const,
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    }
  )
}

// Helper function to determine module access
function getModuleAccess(roles: string[] | undefined) {
  if (!roles || roles.length === 0) {
    return {
      dashboard: false,
      goRio: false,
      servicosMunicipais: false,
    }
  }

  const hasAdminPrivileges =
    roles.includes('admin') || roles.includes('superadmin')

  return {
    dashboard: true, // Everyone with any role has dashboard access
    goRio: hasAdminPrivileges || roles.includes('go:admin'),
    servicosMunicipais:
      hasAdminPrivileges ||
      roles.includes('busca:services:admin') ||
      roles.includes('busca:services:editor'),
  }
}

export default async function Account() {
  const userInfo = await getUserInfoFromToken()

  // Fetch user data from Heimdall
  let heimdallUser = null
  try {
    const response = await getCurrentUserInfoApiV1UsersMeGet()
    if (response.status === 200) {
      heimdallUser = response.data
    }
  } catch (error) {
    console.error('Error fetching user from Heimdall:', error)
  }

  const moduleAccess = getModuleAccess(heimdallUser?.roles)

  return (
    <ContentLayout title="Minha Conta">
      <div className="space-y-6">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Informações do Usuário
            </CardTitle>
            <CardDescription>
              Dados pessoais e informações de autenticação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Nome Completo
                </p>
                <p className="text-lg font-semibold">
                  {heimdallUser?.display_name ||
                    userInfo.name ||
                    'Não disponível'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Email
                </p>
                <p className="text-lg font-semibold">
                  {userInfo.email || 'Não disponível'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  CPF
                </p>
                <p className="text-lg font-semibold font-mono">
                  {heimdallUser?.cpf || userInfo.cpf || 'Não disponível'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  ID do Usuário
                </p>
                <p className="text-lg font-semibold font-mono">
                  {heimdallUser?.id || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles and Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Funções e Permissões
            </CardTitle>
            <CardDescription>
              Funções atribuídas e nível de acesso na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {heimdallUser?.roles && heimdallUser.roles.length > 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Funções Ativas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {heimdallUser.roles.map(role => {
                      const roleInfo = getRoleInfo(role)
                      return (
                        <Badge
                          key={role}
                          variant="secondary"
                          className="px-3 py-1.5 text-sm font-medium"
                        >
                          {roleInfo.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Descrição das Funções
                  </p>
                  <div className="space-y-3">
                    {heimdallUser.roles.map(role => {
                      const roleInfo = getRoleInfo(role)
                      return (
                        <div
                          key={role}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">{roleInfo.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {roleInfo.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhuma função atribuída
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Groups Card */}
        {heimdallUser?.groups && heimdallUser.groups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Grupos
              </CardTitle>
              <CardDescription>
                Grupos aos quais você pertence no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {heimdallUser.groups.map(group => (
                  <Badge
                    key={group}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm"
                  >
                    {group}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ContentLayout>
  )
}
