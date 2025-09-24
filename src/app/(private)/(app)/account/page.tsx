import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserRole } from '@/lib/jwt-utils'
import { getUserInfoFromToken } from '@/lib/user-info'
import { cookies } from 'next/headers'

export default async function Account() {
  const userInfo = await getUserInfoFromToken()

  // Get user role from HTTP-only cookie
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')
  const userRole = accessToken ? getUserRole(accessToken.value) : null

  // Map role to display name
  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'geral':
        return 'Gerente'
      case 'editor':
        return 'Editor'
      default:
        return 'Usuário'
    }
  }

  // Map role to permissions
  const getRolePermissions = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'Acesso Total'
      case 'geral':
        return 'Leitura e Escrita'
      case 'editor':
        return 'Somente Edição'
      default:
        return 'Somente Leitura'
    }
  }

  return (
    <ContentLayout title="Conta">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nome
                </p>
                <p className="text-lg font-semibold">
                  {userInfo.name || 'Não disponível'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-lg font-semibold">
                  {userInfo.email || 'Não disponível'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPF</p>
                <p className="text-lg font-semibold">
                  {userInfo.cpf || 'Não disponível'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Função
                </p>
                <p className="text-lg font-semibold">
                  {getRoleDisplayName(userRole)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">
                Permissões
              </p>
              <div className="mt-2">
                <Badge
                  variant={
                    userRole === 'admin'
                      ? 'default'
                      : userRole === 'geral'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-sm"
                >
                  {getRolePermissions(userRole)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  )
}
