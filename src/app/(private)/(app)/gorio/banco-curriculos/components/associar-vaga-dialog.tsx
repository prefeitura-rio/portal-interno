'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getBancoCurriculosErrorStatus,
  getPendenciasDoCurriculo,
  useAssociarVagas,
  useBancoCurriculoCandidaturas,
} from '@/hooks/use-banco-curriculos'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { useEmpregabilidadeVagas } from '@/hooks/use-empregabilidade-vagas'
import { useVaga } from '@/hooks/use-vaga'
import type {
  EmpregabilidadeAssociacaoVaga,
  EmpregabilidadeVaga,
} from '@/http-gorio/models'
import { formatDateBR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { NAO_INFORMADO, valorOuNaoInformado } from '../lib/format'
import { DetalhesVaga, StatusVaga, contratanteDaVaga } from './detalhes-vaga'

const POR_PAGINA = 10
const ATRASO_BUSCA_MS = 500
// O histórico de um candidato cabe numa página só; serve para marcar as vagas
// em que ele já participa.
const LIMITE_HISTORICO = 100

const RESULTADO_LABEL: Record<string, string> = {
  associado: 'Associado',
  ja_participa: 'Já participava',
  vaga_indisponivel: 'Vaga indisponível',
  fora_do_escopo: 'Fora da sua secretaria',
  nao_elegivel: 'Não atende aos requisitos',
  erro: 'Não foi possível associar',
}

type Confirmacao = 'todas-ja-participam' | 'algumas-ja-participam' | 'incluir'

interface AssociarVagaDialogProps {
  cpf: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal "Associar à uma vaga" da ficha do banco de currículos: o operador
 * busca vagas recebendo candidaturas, escolhe uma ou mais e o candidato entra
 * no processo seletivo de cada uma, como se tivesse se candidatado.
 */
export function AssociarVagaDialog({
  cpf,
  open,
  onOpenChange,
}: AssociarVagaDialogProps) {
  const [termo, setTermo] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [selecionadas, setSelecionadas] = useState<
    Map<string, EmpregabilidadeVaga>
  >(new Map())
  const [vagaEmDetalhe, setVagaEmDetalhe] = useState<string | null>(null)
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)
  const [resultados, setResultados] = useState<
    EmpregabilidadeAssociacaoVaga[] | null
  >(null)
  const [pendencias, setPendencias] = useState<string[] | null>(null)

  // A listagem de vagas já vem limitada à secretaria do operador pela API.
  const { vagas, loading, error, pageCount } = useEmpregabilidadeVagas({
    page: pagina,
    pageSize: POR_PAGINA,
    status: 'publicado_ativo',
    search: busca || undefined,
  })
  const { data: historico } = useBancoCurriculoCandidaturas(cpf, {
    page: 1,
    pageSize: LIMITE_HISTORICO,
  })
  const vagasEmQueParticipa = useMemo(
    () =>
      new Set(
        (historico?.data ?? [])
          .map(candidatura => candidatura.vaga?.id)
          .filter((id): id is string => !!id)
      ),
    [historico]
  )
  const associar = useAssociarVagas(cpf)

  const aplicarBusca = useDebouncedCallback((valor: string) => {
    setBusca(valor.trim())
    setPagina(1)
  }, ATRASO_BUSCA_MS)

  // A página só monta o modal enquanto está aberto, então fechar já descarta a
  // busca, a seleção e o resultado.
  function fechar() {
    onOpenChange(false)
  }

  function alternar(vaga: EmpregabilidadeVaga) {
    if (!vaga.id) return
    const id = vaga.id
    setSelecionadas(atuais => {
      const proximas = new Map(atuais)
      if (proximas.has(id)) proximas.delete(id)
      else proximas.set(id, vaga)
      return proximas
    })
  }

  function pedirConfirmacao() {
    const ids = [...selecionadas.keys()]
    const jaParticipa = ids.filter(id => vagasEmQueParticipa.has(id))
    if (jaParticipa.length === ids.length) {
      setConfirmacao('todas-ja-participam')
    } else if (jaParticipa.length > 0) {
      setConfirmacao('algumas-ja-participam')
    } else {
      setConfirmacao('incluir')
    }
  }

  async function enviar() {
    const ids = [...selecionadas.keys()].filter(
      id => !vagasEmQueParticipa.has(id)
    )
    setPendencias(null)
    try {
      const resposta = await associar.mutateAsync(ids)
      const todos = resposta.resultados ?? []
      const associadas = todos.filter(r => r.resultado === 'associado')
      const naoAssociadas = todos.filter(
        r => r.resultado !== 'associado' && r.resultado !== 'ja_participa'
      )

      if (naoAssociadas.length === 0) {
        toast.success(
          associadas.length === 1
            ? 'Candidato associado à vaga.'
            : `Candidato associado a ${associadas.length} vagas.`
        )
        fechar()
        return
      }
      setResultados(todos)
    } catch (erro) {
      if (getBancoCurriculosErrorStatus(erro) === 422) {
        setPendencias(getPendenciasDoCurriculo(erro))
        return
      }
      toast.error(
        erro instanceof Error ? erro.message : 'Erro ao associar candidato'
      )
    }
  }

  const quantidadeSelecionada = selecionadas.size

  return (
    <>
      <Dialog open={open} onOpenChange={aberto => !aberto && fechar()}>
        <DialogContent
          className={cn(
            'flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl',
            // Abre espaço para o painel da vaga sem espremer a tabela; o
            // resultado é uma lista curta e cabe num modal estreito.
            resultados
              ? 'sm:max-w-2xl'
              : vagaEmDetalhe && 'sm:max-w-[min(96rem,95vw)]'
          )}
        >
          {resultados ? (
            <ResultadoAssociacao resultados={resultados} onFechar={fechar} />
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
                <DialogHeader>
                  <DialogTitle>Selecione uma ou mais vagas</DialogTitle>
                  <DialogDescription>
                    Só aparecem as vagas que estão recebendo candidaturas.
                  </DialogDescription>
                </DialogHeader>

                {pendencias && <AvisoPendencias pendencias={pendencias} />}

                <Input
                  value={termo}
                  onChange={event => {
                    setTermo(event.target.value)
                    aplicarBusca(event.target.value)
                  }}
                  placeholder="Pesquisar pelo título da vaga"
                  aria-label="Pesquisar pelo título da vaga"
                  className="sm:max-w-sm"
                />

                <TabelaVagas
                  vagas={vagas}
                  loading={loading}
                  erro={!!error}
                  selecionadas={selecionadas}
                  vagasEmQueParticipa={vagasEmQueParticipa}
                  onAlternar={alternar}
                  onDetalhar={setVagaEmDetalhe}
                />

                {pageCount > 1 && (
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Página {pagina} de {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Página anterior"
                      disabled={pagina <= 1}
                      onClick={() => setPagina(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Próxima página"
                      disabled={pagina >= pageCount}
                      onClick={() => setPagina(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {quantidadeSelecionada > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Vagas selecionadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...selecionadas.values()].map(vaga => (
                        <Badge
                          key={vaga.id}
                          variant="secondary"
                          className="gap-1"
                        >
                          {valorOuNaoInformado(vaga.titulo)}
                          <button
                            type="button"
                            onClick={() => alternar(vaga)}
                            aria-label={`Remover ${vaga.titulo}`}
                            className="rounded-sm hover:bg-muted"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-auto">
                  <Button variant="outline" onClick={fechar}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={pedirConfirmacao}
                    disabled={quantidadeSelecionada === 0 || associar.isPending}
                  >
                    {associar.isPending
                      ? 'Associando...'
                      : 'Associar candidato'}
                  </Button>
                </DialogFooter>
              </div>

              {vagaEmDetalhe && (
                <PainelVaga
                  id={vagaEmDetalhe}
                  onFechar={() => setVagaEmDetalhe(null)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmacao === 'todas-ja-participam'}
        onOpenChange={aberto => !aberto && setConfirmacao(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atenção!</DialogTitle>
            <DialogDescription>
              {quantidadeSelecionada === 1
                ? 'O candidato já está participando do processo seletivo desta vaga.'
                : 'O candidato já está participando do processo seletivo de todas as vagas selecionadas.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmacao(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmacao === 'algumas-ja-participam'}
        onOpenChange={aberto => !aberto && setConfirmacao(null)}
        title="Atenção!"
        description="Você selecionou uma ou mais vagas em que o candidato já está participando do processo seletivo. Se continuar, ele será incluído apenas nos processos seletivos de que ainda não participa. Continuar?"
        cancelText="Não"
        confirmText="Sim"
        onConfirm={enviar}
      />

      <ConfirmDialog
        open={confirmacao === 'incluir'}
        onOpenChange={aberto => !aberto && setConfirmacao(null)}
        title="Atenção!"
        description="Você está prestes a incluir o candidato em um ou mais processos seletivos. Continuar?"
        cancelText="Não"
        confirmText="Sim"
        onConfirm={enviar}
      />
    </>
  )
}

function TabelaVagas({
  vagas,
  loading,
  erro,
  selecionadas,
  vagasEmQueParticipa,
  onAlternar,
  onDetalhar,
}: {
  vagas: EmpregabilidadeVaga[]
  loading: boolean
  erro: boolean
  selecionadas: Map<string, EmpregabilidadeVaga>
  vagasEmQueParticipa: Set<string>
  onAlternar: (vaga: EmpregabilidadeVaga) => void
  onDetalhar: (id: string) => void
}) {
  if (erro) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar as vagas. Tente novamente em instantes.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Nome da vaga</TableHead>
            <TableHead>Quem oferece</TableHead>
            <TableHead>Publicado em</TableHead>
            <TableHead>Modalidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 3 }, (_, i) => (
              <TableRow key={`carregando-${i}`}>
                <TableCell colSpan={7}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {!loading && vagas.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-16 text-center text-muted-foreground"
              >
                Nenhuma vaga encontrada.
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            vagas.map(vaga => {
              const id = vaga.id ?? ''
              const marcada = selecionadas.has(id)
              return (
                <TableRow
                  key={id}
                  data-state={marcada ? 'selected' : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={marcada}
                      onCheckedChange={() => onAlternar(vaga)}
                      aria-label={`Selecionar ${vaga.titulo}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      {valorOuNaoInformado(vaga.titulo)}
                      {vagasEmQueParticipa.has(id) && (
                        <Badge variant="outline">Já participa</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{contratanteDaVaga(vaga)}</TableCell>
                  <TableCell>
                    {formatDateBR(vaga.created_at) || NAO_INFORMADO}
                  </TableCell>
                  <TableCell>
                    {valorOuNaoInformado(vaga.modelo_trabalho?.descricao)}
                  </TableCell>
                  <TableCell>
                    <StatusVaga status={vaga.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDetalhar(id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Detalhar
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
    </div>
  )
}

function PainelVaga({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { vaga, loading, error } = useVaga(id)

  return (
    <aside className="flex w-full max-w-sm flex-col border-l bg-muted/30">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {vaga && (
          <>
            <h3 className="text-lg font-semibold">
              {valorOuNaoInformado(vaga.titulo)}
            </h3>
            <DetalhesVaga vaga={vaga} />
          </>
        )}
      </div>
      <div className="flex justify-end border-t p-4">
        <Button variant="outline" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </aside>
  )
}

function AvisoPendencias({ pendencias }: { pendencias: string[] }) {
  return (
    <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">
        Este currículo ainda não tem o mínimo para se candidatar:
      </p>
      <ul className="list-disc pl-5">
        {pendencias.map(pendencia => (
          <li key={pendencia}>{pendencia}</li>
        ))}
      </ul>
      <p>O cidadão precisa completar o currículo no app.</p>
    </div>
  )
}

function ResultadoAssociacao({
  resultados,
  onFechar,
}: {
  resultados: EmpregabilidadeAssociacaoVaga[]
  onFechar: () => void
}) {
  const associadas = resultados.filter(r => r.resultado === 'associado').length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <DialogHeader>
        <DialogTitle>Resultado da associação</DialogTitle>
        <DialogDescription>
          {associadas === 0
            ? 'O candidato não foi associado a nenhuma vaga.'
            : `O candidato foi associado a ${associadas} de ${resultados.length} vagas.`}
        </DialogDescription>
      </DialogHeader>
      <ul className="space-y-3 overflow-y-auto">
        {resultados.map(resultado => (
          <li key={resultado.id_vaga} className="rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {resultado.titulo || 'Vaga não encontrada'}
              </span>
              <Badge
                variant={
                  resultado.resultado === 'associado' ? 'default' : 'outline'
                }
              >
                {RESULTADO_LABEL[resultado.resultado ?? ''] ??
                  resultado.resultado}
              </Badge>
            </div>
            {(resultado.motivos ?? []).length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {resultado.motivos?.map(motivo => (
                  <li key={motivo}>{motivo}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <DialogFooter className="mt-auto">
        <Button onClick={onFechar}>Fechar</Button>
      </DialogFooter>
    </div>
  )
}
