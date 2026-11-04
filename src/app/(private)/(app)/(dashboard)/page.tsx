import { ContentLayout } from '@/components/admin-panel/content-layout'
import { LOGIN_ROUTE } from '@/constants/url'
import { getUserInfoFromToken } from '@/lib/user-info'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const userInfo = await getUserInfoFromToken()
  if (!userInfo.cpf) {
    // Server Component não grava cookie: a rota de login grava o state
    redirect(LOGIN_ROUTE)
  }
  return (
    <ContentLayout title="Dashboard">
      <div className="w-full pt-[6vh] text-lg flex items-center justify-center text-center text-muted-foreground max-w-xl mx-auto">
        Este painel apresentará alertas, indicadores de desempenho, candidaturas
        recentes, estatísticas operacionais e acompanhamento de processos em
        andamento.
      </div>
    </ContentLayout>
  )
}
