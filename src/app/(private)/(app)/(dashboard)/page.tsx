import { ContentLayout } from '@/components/admin-panel/content-layout'
import { getUserInfoFromToken } from '@/lib/user-info'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const userInfo = await getUserInfoFromToken()
  if (!userInfo.cpf) {
    redirect(
      `${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_BASE_URL}/auth?client_id=${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_IDENTIDADE_CARIOCA_REDIRECT_URI}&response_type=code`
    )
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
