import { ContentLayout } from '@/components/admin-panel/content-layout'

export default function Dashboard() {
  return (
    <ContentLayout title="Dashboard">
      <div className="w-full pt-[6vh] text-lg flex items-center justify-center">
        Quando o sistema estiver populado, aqui serão exibidos alertas, novas
        candidaturas, estatísticas úteis, resumos de processos, etc.
      </div>
    </ContentLayout>
  )
}
