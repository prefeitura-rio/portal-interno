'use client'

import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookPlus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('published')

  // Mock da role do usuário - true = admin, false = usuário comum
  const isAdmin = false

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Se for admin e estiver tentando acessar a tab de aprovação, redireciona para published
  useEffect(() => {
    if (isAdmin && activeTab === 'waiting_approval') {
      setActiveTab('published')
    }
  }, [activeTab])

  return (
    <ContentLayout title="Gestão de Serviços Municipais">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Serviços Municipais</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Serviços</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Serviços Municipais
              </h2>
              <p className="text-muted-foreground">
                Listagem dos serviços municipais
              </p>
            </div>
            <Link href="/servicos-municipais/servicos/new">
              <Button className="cursor-pointer">
                <BookPlus className="mr-2 h-4 w-4" />
                Novo serviço
              </Button>
            </Link>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList
            className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-3'}`}
          >
            <TabsTrigger value="published">Publicados</TabsTrigger>
            <TabsTrigger value="draft">Em edição</TabsTrigger>
            {!isAdmin && (
              <TabsTrigger value="waiting_approval">Em aprovação</TabsTrigger>
            )}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="published" className="space-y-4">
              <div className="rounded-md border p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Serviços Publicados
                </h3>
                <p className="text-muted-foreground">
                  Aqui serão exibidos os serviços municipais que já estão
                  publicados e disponíveis para o público.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="draft" className="space-y-4">
              <div className="rounded-md border p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Serviços em Edição
                </h3>
                <p className="text-muted-foreground">
                  Aqui serão exibidos os serviços municipais que estão sendo
                  editados ou em desenvolvimento.
                </p>
              </div>
            </TabsContent>

            {!isAdmin && (
              <TabsContent value="waiting_approval" className="space-y-4">
                <div className="rounded-md border p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Serviços em Aprovação
                  </h3>
                  <p className="text-muted-foreground">
                    Aqui serão exibidos os serviços municipais que estão
                    aguardando aprovação para serem publicados.
                  </p>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </ContentLayout>
  )
}
