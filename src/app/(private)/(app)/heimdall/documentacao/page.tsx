import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import { HeimdallPageHeader } from '../components/heimdall-page-header'
import { MarkdownDoc } from '../components/markdown-doc'

async function loadDocumentation() {
  const filePath = path.join(
    process.cwd(),
    'src/app/(private)/(app)/heimdall/documentacao/content.md'
  )
  return readFile(filePath, 'utf8')
}

export default async function HeimdallDocumentacaoPage() {
  const source = await loadDocumentation()

  return (
    <ContentLayout title="Documentação">
      <div className="space-y-6">
        <HeimdallPageHeader
          title="Documentação"
          description="Como o Heimdall modela permissões, sincroniza o Cerbos e autoriza requisições no mesh."
          breadcrumbs={[{ label: 'Documentação' }]}
        />
        <MarkdownDoc source={source} />
      </div>
    </ContentLayout>
  )
}
