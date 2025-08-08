import { ContentLayout } from '@/components/admin-panel/content-layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserInfoFromToken } from '@/lib/user-info'

export default async function Account() {
  const userInfo = await getUserInfoFromToken()

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
                <p className="text-lg font-semibold">Administrador</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">
                Permissões
              </p>
              <div className="mt-2">
                <Badge variant="secondary" className="text-sm">
                  Leitura e Escrita
                </Badge>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">
                Módulos
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-sm">
                  GO Rio
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  )
}
