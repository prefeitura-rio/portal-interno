'use client'
import { ContentLayout } from '@/components/admin-panel/content-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Link from 'next/link'

export default function EmpregabilidadeDetailPage() {
  return (
    <ContentLayout title="Gestão de Vagas de Empregos">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Empregabilidade</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/gorio/empregabilidade">Vagas</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Detalhes</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {vaga.titulo || 'Vaga de Emprego'}
              </h1>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {statusData && (
                  <Badge
                    variant="outline"
                    className={`${statusData.className} capitalize`}
                  >
                    {StatusIcon && <StatusIcon className="mr-1 h-3 w-3" />}
                    {statusData.label}
                  </Badge>
                )}
                {vaga.created_at && (
                  <span className="text-sm text-muted-foreground">
                    Criada em{' '}
                    {format(new Date(vaga.created_at), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                )}
                {vaga.contratante?.nome_fantasia && (
                  <span className="text-sm text-muted-foreground">
                    {vaga.contratante.nome_fantasia}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {canEditVagas && (
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    {!isReadOnlyForEditor && (
                      <>
                        {/* Primary (always visible) buttons by status */}
                        {vaga.status === 'em_edicao' && (
                          <Button
                            onClick={handleSendToApproval}
                            disabled={isLoading}
                            variant="default"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Enviar para aprovação
                          </Button>
                        )}

                        {vaga.status === 'em_aprovacao' &&
                          canPublishVagaAsAtivo && (
                            <Button
                              onClick={handlePublish}
                              disabled={isLoading}
                              variant="default"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Publicar vaga
                            </Button>
                          )}

                        {vaga.status === 'vaga_congelada' &&
                          canFreezeOrDiscontinueVaga && (
                            <Button
                              onClick={handleUnfreeze}
                              disabled={isLoading}
                              variant="default"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Descongelar vaga
                            </Button>
                          )}

                        {vaga.status === 'vaga_descontinuada' &&
                          canFreezeOrDiscontinueVaga && (
                            <Button
                              onClick={handleReactivate}
                              disabled={isLoading}
                              variant="default"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reativar vaga
                            </Button>
                          )}
                      </>
                    )}

                    {/* Duplicate button - available for all roles including editor_com_curadoria */}
                    <DuplicateJobButton
                      vaga={vaga}
                      disabled={isLoading || activeTab === 'candidates'}
                    />

                    {!isReadOnlyForEditor && (
                      <>
                        {/* Edit button */}
                        <Button
                          onClick={() => setIsEditing(true)}
                          disabled={isLoading || activeTab === 'candidates'}
                          variant="outline"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>

                        {/* Secondary actions in dropdown, similar to serviços municipais */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={isLoading}
                            >
                              <EllipsisVertical className="h-4 w-4" />
                              <span className="sr-only">Mais opções</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Vaga rascunho (em_edicao):
                            - visíveis: Enviar para aprovação, Editar
                            - dropdown: Publicar vaga, Excluir */}
                            {vaga.status === 'em_edicao' && (
                              <>
                                {canPublishVagaAsAtivo && (
                                  <DropdownMenuItem
                                    onClick={handlePublish}
                                    disabled={isLoading}
                                    className="cursor-pointer"
                                  >
                                    <Play className="mr-2 h-4 w-4" />
                                    Publicar vaga
                                  </DropdownMenuItem>
                                )}
                                {canDeleteVagaWithStatus(
                                  user?.roles,
                                  vaga.status ?? ''
                                ) && (
                                  <DropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Vaga aguardando aprovação (em_aprovacao):
                            - visíveis: Publicar vaga, Editar
                            - dropdown: Enviar para edição, Excluir */}
                            {vaga.status === 'em_aprovacao' && (
                              <>
                                <DropdownMenuItem
                                  onClick={handleSendToDraft}
                                  disabled={isLoading}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Enviar para edição
                                </DropdownMenuItem>
                                {canDeleteVagaWithStatus(
                                  user?.roles,
                                  vaga.status ?? ''
                                ) && (
                                  <DropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Vaga ativa (publicado_ativo):
                            - visível: Editar
                            - dropdown: Pausar vaga, Encerrar vaga, Excluir */}
                            {vaga.status === 'publicado_ativo' && (
                              <>
                                {canFreezeOrDiscontinueVaga && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={handleFreeze}
                                      disabled={isLoading}
                                      className="cursor-pointer"
                                    >
                                      <Pause className="mr-2 h-4 w-4" />
                                      Pausar vaga
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={handleDiscontinue}
                                      disabled={isLoading}
                                      className="cursor-pointer"
                                    >
                                      <Square className="mr-2 h-4 w-4" />
                                      Encerrar vaga
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canDeleteVagaWithStatus(
                                  user?.roles,
                                  vaga.status ?? ''
                                ) && (
                                  <DropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Vaga expirada (publicado_expirado):
                            - visível: Editar
                            - dropdown: Encerrar vaga, Excluir */}
                            {vaga.status === 'publicado_expirado' && (
                              <>
                                {canFreezeOrDiscontinueVaga && (
                                  <DropdownMenuItem
                                    onClick={handleDiscontinue}
                                    disabled={isLoading}
                                    className="cursor-pointer"
                                  >
                                    <Square className="mr-2 h-4 w-4" />
                                    Encerrar vaga
                                  </DropdownMenuItem>
                                )}
                                {canDeleteVagaWithStatus(
                                  user?.roles,
                                  vaga.status ?? ''
                                ) && (
                                  <DropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Vaga pausada (vaga_congelada):
                            - visíveis: Editar, Descongelar vaga
                            - dropdown: Encerrar vaga, Excluir */}
                            {vaga.status === 'vaga_congelada' && (
                              <>
                                {canFreezeOrDiscontinueVaga && (
                                  <DropdownMenuItem
                                    onClick={handleDiscontinue}
                                    disabled={isLoading}
                                    className="cursor-pointer"
                                  >
                                    <Square className="mr-2 h-4 w-4" />
                                    Encerrar vaga
                                  </DropdownMenuItem>
                                )}
                                {canDeleteVagaWithStatus(
                                  user?.roles,
                                  vaga.status ?? ''
                                ) && (
                                  <DropdownMenuItem
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Vaga encerrada (vaga_descontinuada):
                            - visíveis: Editar, Reativar vaga
                            - dropdown: Excluir */}
                            {vaga.status === 'vaga_descontinuada' &&
                              canDeleteVagaWithStatus(
                                user?.roles,
                                vaga.status
                              ) && (
                                <DropdownMenuItem
                                  onClick={handleDelete}
                                  disabled={isLoading}
                                  variant="destructive"
                                  className="cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </>
                )}

                {isEditing && (
                  <>
                    {vaga.status === 'em_edicao' ? (
                      <>
                        {/* Draft: Show "Salvar Rascunho" and "Salvar e Publicar" (editor_com_curadoria cannot publish) */}
                        <Button
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={isLoading}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isLoading ? 'Salvando...' : 'Salvar Rascunho'}
                        </Button>
                        {canPublishVagaAsAtivo && (
                          <Button
                            onClick={handleSaveAndPublish}
                            disabled={isLoading}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {isLoading ? 'Publicando...' : 'Salvar e Publicar'}
                          </Button>
                        )}
                      </>
                    ) : (
                      /* Published: Show only "Salvar" */
                      <Button onClick={handleSave} disabled={isLoading}>
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <h1>Empregabilidade tela de detalhes</h1>
        </div>
      </div>
    </ContentLayout>
  )
}
