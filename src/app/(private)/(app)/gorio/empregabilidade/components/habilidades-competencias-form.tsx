'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  useAreasAtuacaoCompleto,
  useComportamentosAtitudesCompleto,
  useConhecimentosDaAreaCompleto,
} from '@/hooks/use-vaga-habilidades-catalogos'
import { cn } from '@/lib/utils'
import {
  type CatalogoHabilidadeItem,
  MAX_COMPORTAMENTOS,
  MAX_CONHECIMENTOS_POR_AREA,
  type VagaAreaAtuacaoSelecionada,
} from '@/lib/vaga-habilidades'
import {
  AREAS_SECAO_DESCRICAO,
  AREAS_SECAO_TITULO,
  AREA_BUSCA_PLACEHOLDER,
  AREA_JA_ADICIONADA,
  AREA_LABEL,
  AREA_PLACEHOLDER,
  AREA_SEM_CONHECIMENTOS,
  CARREGANDO_AREAS,
  CARREGANDO_COMPORTAMENTOS,
  CARREGANDO_CONHECIMENTOS,
  COMPORTAMENTOS_BUSCA_PLACEHOLDER,
  COMPORTAMENTOS_DESCRICAO,
  COMPORTAMENTOS_LABEL,
  COMPORTAMENTOS_PLACEHOLDER,
  CONHECIMENTOS_BUSCA_PLACEHOLDER,
  CONHECIMENTOS_LABEL,
  CONHECIMENTOS_PLACEHOLDER,
  CONHECIMENTOS_SEM_AREA,
  ERRO_COMPORTAMENTO_OBRIGATORIO,
  ERRO_LISTA_AREAS,
  ERRO_LISTA_COMPORTAMENTOS,
  ERRO_LISTA_CONHECIMENTOS,
  type ErroGrupoHabilidades,
  HABILIDADES_DESCRICAO,
  HABILIDADES_MAX_DISPLAY,
  HABILIDADES_TITULO,
  NENHUM_RESULTADO,
  REMOVER_AREA_LABEL,
  TENTAR_NOVAMENTE_LABEL,
  adicionarGrupo,
  alternarId,
  getAdicionarAreaLabel,
  getBadgesVisiveis,
  getErrosAreasHabilidades,
  getItensSelecionados,
  getMaisItensLabel,
  getNomeAreaDoGrupo,
  getOpcoesAreaDoGrupo,
  getRemoverItemLabel,
  getRotuloComContagem,
  getTituloGrupo,
  isOpcaoNoLimite,
  ordenarPorNome,
  podeAdicionarArea,
  podeRemoverGrupo,
  removerGrupo,
  removerId,
  setConhecimentosDoGrupo,
  trocarAreaDoGrupo,
} from '@/lib/vaga-habilidades-bloco'
import {
  CheckIcon,
  ChevronDown,
  HeartHandshake,
  type LucideIcon,
  Plus,
  Target,
  Trash2,
  XIcon,
} from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

interface HabilidadesCompetenciasFormProps {
  /** Grupos de área da vaga; um grupo sem área tem `id_area_atuacao: null`. */
  areasAtuacao: VagaAreaAtuacaoSelecionada[]
  onAreasAtuacaoChange: (areas: VagaAreaAtuacaoSelecionada[]) => void
  comportamentoAtitudesIds: number[]
  onComportamentoAtitudesChange: (ids: number[]) => void
  /** Nomes gravados na vaga, usados enquanto o catálogo não chega. */
  comportamentosSalvos?: CatalogoHabilidadeItem[]
  isReadOnly?: boolean
  /**
   * Erro da publicação nas áreas. Com ele, cada grupo mostra o seu erro,
   * recalculado a cada mudança.
   */
  erroAreasAtuacao?: string
  /** Erro da publicação nos comportamentos e atitudes. */
  erroComportamentos?: string
}

/**
 * Bloco "Habilidades e competências" da vaga (DEV-684): grupos de área (a
 * área de atuação e o multi-select dos conhecimentos dela) e a seção de
 * comportamentos e atitudes. Ambos são obrigatórios para enviar para
 * aprovação ou publicar; o cidadão não vê esses dados.
 */
export function HabilidadesCompetenciasForm({
  areasAtuacao,
  onAreasAtuacaoChange,
  comportamentoAtitudesIds,
  onComportamentoAtitudesChange,
  comportamentosSalvos = [],
  isReadOnly = false,
  erroAreasAtuacao,
  erroComportamentos,
}: HabilidadesCompetenciasFormProps) {
  const areasQuery = useAreasAtuacaoCompleto()
  const comportamentosQuery = useComportamentosAtitudesCompleto()
  const catalogoAreas = areasQuery.data?.data ?? []
  const catalogoComportamentos = comportamentosQuery.data?.data ?? []

  const errosAreas = erroAreasAtuacao
    ? getErrosAreasHabilidades(areasAtuacao)
    : {}
  const erroComportamentosVisivel =
    erroComportamentos && comportamentoAtitudesIds.length === 0
      ? ERRO_COMPORTAMENTO_OBRIGATORIO
      : undefined

  const triggersArea = useRef<(HTMLButtonElement | null)[]>([])
  const botaoAdicionar = useRef<HTMLButtonElement | null>(null)
  // Teclado: ao abrir um grupo, o foco vai para a área dele; ao remover, para
  // a área do grupo anterior (ou para o botão de adicionar, sem grupos).
  const [focoPendente, setFocoPendente] = useState<number | null>(null)

  useEffect(() => {
    if (focoPendente === null) return
    const alvo =
      focoPendente >= 0
        ? triggersArea.current[focoPendente]
        : botaoAdicionar.current
    alvo?.focus()
    setFocoPendente(null)
  }, [focoPendente])

  const adicionarHabilitado =
    !isReadOnly &&
    podeAdicionarArea({
      areas: areasAtuacao,
      totalAreasCatalogo: areasQuery.isSuccess
        ? catalogoAreas.length
        : undefined,
    })

  const handleAdicionar = () => {
    onAreasAtuacaoChange(adicionarGrupo(areasAtuacao))
    setFocoPendente(areasAtuacao.length)
  }

  const handleRemover = (indice: number) => {
    onAreasAtuacaoChange(removerGrupo(areasAtuacao, indice))
    setFocoPendente(areasAtuacao.length > 1 ? Math.max(0, indice - 1) : -1)
  }

  const comportamentosSelecionados = getItensSelecionados(
    comportamentoAtitudesIds,
    catalogoComportamentos,
    comportamentosSalvos
  )

  return (
    <div
      data-habilidades-competencias=""
      data-somente-leitura={isReadOnly ? 'true' : 'false'}
      className="rounded-lg border p-4 space-y-4"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{HABILIDADES_TITULO}</h3>
        <p className="text-xs text-muted-foreground">{HABILIDADES_DESCRICAO}</p>
      </div>

      <Secao
        dataSecao="areas"
        icone={Target}
        titulo={AREAS_SECAO_TITULO}
        descricao={AREAS_SECAO_DESCRICAO}
      >
        {areasAtuacao.map((area, indice) => (
          <GrupoArea
            key={indice}
            indice={indice}
            area={area}
            areas={areasAtuacao}
            catalogoAreas={catalogoAreas}
            areasCarregando={areasQuery.isPending}
            areasComErro={areasQuery.isError}
            onTentarAreasNovamente={() => areasQuery.refetch()}
            onAreaChange={item =>
              onAreasAtuacaoChange(
                trocarAreaDoGrupo(areasAtuacao, indice, item)
              )
            }
            onConhecimentosChange={ids =>
              onAreasAtuacaoChange(
                setConhecimentosDoGrupo(areasAtuacao, indice, ids)
              )
            }
            onRemover={() => handleRemover(indice)}
            podeRemover={!isReadOnly && podeRemoverGrupo(areasAtuacao, indice)}
            isReadOnly={isReadOnly}
            erro={errosAreas.grupos?.[indice]}
            triggerRef={elemento => {
              triggersArea.current[indice] = elemento
            }}
          />
        ))}

        {errosAreas.areas && <ErroCampo mensagem={errosAreas.areas} />}

        <Button
          ref={botaoAdicionar}
          type="button"
          variant="outline"
          size="sm"
          className="font-normal"
          onClick={handleAdicionar}
          disabled={!adicionarHabilitado}
        >
          <Plus aria-hidden="true" />
          {getAdicionarAreaLabel(areasAtuacao.length)}
        </Button>
      </Secao>

      <Secao
        dataSecao="comportamentos"
        icone={HeartHandshake}
        titulo={getRotuloComContagem(
          COMPORTAMENTOS_LABEL,
          comportamentosSelecionados.length
        )}
        descricao={COMPORTAMENTOS_DESCRICAO}
        rotuloId="habilidades-comportamentos-titulo"
      >
        <CampoMultiSelect
          rotuloId="habilidades-comportamentos-titulo"
          placeholder={COMPORTAMENTOS_PLACEHOLDER}
          buscaPlaceholder={COMPORTAMENTOS_BUSCA_PLACEHOLDER}
          opcoes={catalogoComportamentos}
          selecionados={comportamentosSelecionados}
          onAlternar={id =>
            onComportamentoAtitudesChange(
              alternarId(comportamentoAtitudesIds, id)
            )
          }
          onRemover={id =>
            onComportamentoAtitudesChange(
              removerId(comportamentoAtitudesIds, id)
            )
          }
          carregando={comportamentosQuery.isPending}
          mensagemCarregando={CARREGANDO_COMPORTAMENTOS}
          erroLista={
            comportamentosQuery.isError ? ERRO_LISTA_COMPORTAMENTOS : undefined
          }
          onTentarNovamente={() => comportamentosQuery.refetch()}
          erro={erroComportamentosVisivel}
          isReadOnly={isReadOnly}
          maximo={MAX_COMPORTAMENTOS}
        />
      </Secao>
    </div>
  )
}

function Secao({
  dataSecao,
  icone: Icone,
  titulo,
  descricao,
  rotuloId,
  children,
}: {
  dataSecao: string
  icone: LucideIcon
  titulo: string
  descricao: string
  rotuloId?: string
  children: ReactNode
}) {
  return (
    <section
      data-secao-habilidades={dataSecao}
      aria-labelledby={rotuloId}
      className="rounded-md border p-3 space-y-3"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground"
          >
            <Icone className="size-4" />
          </span>
          <p id={rotuloId} className="text-sm font-medium">
            {titulo}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      {children}
    </section>
  )
}

interface GrupoAreaProps {
  indice: number
  area: VagaAreaAtuacaoSelecionada
  areas: VagaAreaAtuacaoSelecionada[]
  catalogoAreas: CatalogoHabilidadeItem[]
  areasCarregando: boolean
  areasComErro: boolean
  onTentarAreasNovamente: () => void
  onAreaChange: (area: CatalogoHabilidadeItem) => void
  onConhecimentosChange: (ids: number[]) => void
  onRemover: () => void
  podeRemover: boolean
  isReadOnly: boolean
  erro?: ErroGrupoHabilidades
  triggerRef: (elemento: HTMLButtonElement | null) => void
}

function GrupoArea({
  indice,
  area,
  areas,
  catalogoAreas,
  areasCarregando,
  areasComErro,
  onTentarAreasNovamente,
  onAreaChange,
  onConhecimentosChange,
  onRemover,
  podeRemover,
  isReadOnly,
  erro,
  triggerRef,
}: GrupoAreaProps) {
  const tituloId = useId()
  const areaLabelId = useId()
  const conhecimentosLabelId = useId()
  const erroAreaId = useId()
  const [listaAberta, setListaAberta] = useState(false)

  const idArea = area.id_area_atuacao ?? undefined
  const conhecimentosQuery = useConhecimentosDaAreaCompleto(idArea)
  const catalogoConhecimentos = conhecimentosQuery.data?.data ?? []

  const opcoesArea = getOpcoesAreaDoGrupo(catalogoAreas, areas, indice)
  const nomeArea = getNomeAreaDoGrupo(area, catalogoAreas)

  const conhecimentosSelecionados = getItensSelecionados(
    area.conhecimento_ids,
    catalogoConhecimentos,
    area.conhecimentos
  )
  const areaSemConhecimentos =
    idArea !== undefined &&
    conhecimentosQuery.isSuccess &&
    catalogoConhecimentos.length === 0

  const mensagemErroArea = areasComErro ? ERRO_LISTA_AREAS : erro?.area
  const areaBloqueada = isReadOnly || areasCarregando || areasComErro
  const listaAreasAberta = listaAberta && !areaBloqueada

  return (
    <fieldset
      data-grupo-area={indice}
      aria-labelledby={tituloId}
      className="space-y-3 rounded-md border bg-muted/50 p-3"
    >
      <div className="flex min-h-8 items-center justify-between gap-2">
        <p
          id={tituloId}
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {getTituloGrupo(indice)}
        </p>
        {podeRemover && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`${REMOVER_AREA_LABEL} ${indice + 1}`}
            onClick={onRemover}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label id={areaLabelId} className="text-xs font-medium">
          {AREA_LABEL}
        </Label>
        <Popover open={listaAreasAberta} onOpenChange={setListaAberta}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              role="combobox"
              aria-labelledby={`${areaLabelId} ${tituloId}`}
              aria-expanded={listaAreasAberta}
              aria-invalid={mensagemErroArea ? true : undefined}
              aria-describedby={mensagemErroArea ? erroAreaId : undefined}
              aria-busy={areasCarregando || undefined}
              disabled={areaBloqueada}
              className={cn(
                'w-full justify-between bg-background font-normal',
                !nomeArea && 'text-muted-foreground',
                mensagemErroArea && 'border-destructive'
              )}
            >
              <span className="truncate">
                {nomeArea ??
                  (areasCarregando ? CARREGANDO_AREAS : AREA_PLACEHOLDER)}
              </span>
              <ChevronDown aria-hidden="true" className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
          >
            <Command filter={filtrarSemAcento}>
              <CommandInput placeholder={AREA_BUSCA_PLACEHOLDER} />
              <CommandList aria-labelledby={areaLabelId}>
                <CommandEmpty>{NENHUM_RESULTADO}</CommandEmpty>
                <CommandGroup>
                  {opcoesArea.map(opcao => (
                    <CommandItem
                      key={opcao.id}
                      value={String(opcao.id)}
                      keywords={[opcao.nome]}
                      disabled={opcao.desabilitada}
                      data-ja-adicionada={opcao.desabilitada ? 'true' : 'false'}
                      onSelect={() => {
                        onAreaChange(opcao)
                        setListaAberta(false)
                      }}
                    >
                      <span className="flex-1 truncate">{opcao.nome}</span>
                      {opcao.desabilitada ? (
                        <span className="text-xs text-muted-foreground">
                          {AREA_JA_ADICIONADA}
                        </span>
                      ) : (
                        opcao.id === idArea && (
                          <CheckIcon aria-hidden="true" className="size-4" />
                        )
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {mensagemErroArea && (
          <ErroCampo
            id={erroAreaId}
            mensagem={mensagemErroArea}
            onTentarNovamente={
              areasComErro ? onTentarAreasNovamente : undefined
            }
          />
        )}
      </div>

      <div className="space-y-2">
        <Label id={conhecimentosLabelId} className="text-xs font-medium">
          {getRotuloComContagem(
            CONHECIMENTOS_LABEL,
            conhecimentosSelecionados.length
          )}
        </Label>
        <CampoMultiSelect
          rotuloId={`${conhecimentosLabelId} ${tituloId}`}
          placeholder={
            idArea === undefined
              ? CONHECIMENTOS_SEM_AREA
              : CONHECIMENTOS_PLACEHOLDER
          }
          buscaPlaceholder={CONHECIMENTOS_BUSCA_PLACEHOLDER}
          opcoes={catalogoConhecimentos}
          selecionados={conhecimentosSelecionados}
          onAlternar={id =>
            onConhecimentosChange(alternarId(area.conhecimento_ids, id))
          }
          onRemover={id =>
            onConhecimentosChange(removerId(area.conhecimento_ids, id))
          }
          carregando={idArea !== undefined && conhecimentosQuery.isPending}
          mensagemCarregando={CARREGANDO_CONHECIMENTOS}
          erroLista={
            conhecimentosQuery.isError ? ERRO_LISTA_CONHECIMENTOS : undefined
          }
          onTentarNovamente={() => conhecimentosQuery.refetch()}
          aviso={areaSemConhecimentos ? AREA_SEM_CONHECIMENTOS : undefined}
          maximo={MAX_CONHECIMENTOS_POR_AREA}
          erro={erro?.conhecimentos}
          isReadOnly={isReadOnly}
          desabilitado={idArea === undefined || areaSemConhecimentos}
        />
      </div>
    </fieldset>
  )
}

interface CampoMultiSelectProps {
  /** Id(s) do rótulo que nomeia o campo e a lista. */
  rotuloId: string
  placeholder: string
  buscaPlaceholder: string
  opcoes: CatalogoHabilidadeItem[]
  /** Já em ordem A–Z. */
  selecionados: CatalogoHabilidadeItem[]
  onAlternar: (id: number) => void
  onRemover: (id: number) => void
  carregando: boolean
  mensagemCarregando: string
  erroLista?: string
  onTentarNovamente: () => void
  aviso?: string
  erro?: string
  isReadOnly: boolean
  desabilitado?: boolean
  /** Limite da API para o campo; acima dele, as outras opções desabilitam. */
  maximo?: number
}

/**
 * Multi-select de um catálogo: os marcados ficam no próprio campo como badges
 * removíveis, em ordem A–Z (até 9, depois "+N mais"), e a lista abre com
 * busca e caixas de marcar; marcar não fecha a lista.
 */
function CampoMultiSelect({
  rotuloId,
  placeholder,
  buscaPlaceholder,
  opcoes,
  selecionados,
  onAlternar,
  onRemover,
  carregando,
  mensagemCarregando,
  erroLista,
  onTentarNovamente,
  aviso,
  erro,
  isReadOnly,
  desabilitado = false,
  maximo,
}: CampoMultiSelectProps) {
  const [aberto, setAberto] = useState(false)
  const mensagemId = useId()
  const mensagemErro = erroLista ?? erro
  const descricaoId = mensagemErro || aviso ? mensagemId : undefined

  const opcoesOrdenadas = ordenarPorNome(opcoes)
  const idsSelecionados = new Set(selecionados.map(item => item.id))
  const { visiveis, restantes } = getBadgesVisiveis(
    selecionados,
    HABILIDADES_MAX_DISPLAY
  )
  const bloqueado =
    isReadOnly || desabilitado || carregando || erroLista !== undefined
  const listaAberta = aberto && !bloqueado

  return (
    <div className="space-y-2">
      <Popover open={listaAberta} onOpenChange={setAberto}>
        <PopoverAnchor asChild>
          <div
            data-campo-multiselect=""
            data-desabilitado={bloqueado ? 'true' : 'false'}
            className={cn(
              'relative flex min-h-9 w-full items-center gap-2 rounded-md border bg-background py-1 pr-2 pl-3 text-sm shadow-xs transition-[color,box-shadow]',
              'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
              bloqueado && 'bg-muted/50',
              mensagemErro && 'border-destructive'
            )}
          >
            {selecionados.length > 0 ? (
              <ul className="flex flex-1 flex-wrap gap-1.5">
                {visiveis.map(item => (
                  <li key={item.id} className="max-w-full">
                    <Badge
                      variant="secondary"
                      className="relative z-10 max-w-full gap-1 font-normal"
                    >
                      <span className="truncate">{item.nome}</span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          aria-label={getRemoverItemLabel(item.nome)}
                          onClick={() => onRemover(item.id)}
                          className="rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <XIcon aria-hidden="true" className="size-3" />
                        </button>
                      )}
                    </Badge>
                  </li>
                ))}
                {restantes > 0 && (
                  <li>
                    <Badge variant="outline" className="font-normal">
                      {getMaisItensLabel(restantes)}
                    </Badge>
                  </li>
                )}
              </ul>
            ) : (
              <span
                className={cn(
                  'flex-1 truncate text-muted-foreground',
                  bloqueado && 'opacity-70'
                )}
              >
                {carregando ? mensagemCarregando : placeholder}
              </span>
            )}
            {/* O ::after estica o botão sobre o campo inteiro: clicar em
                qualquer ponto abre a lista; os × dos badges ficam por cima. */}
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                role="combobox"
                aria-labelledby={rotuloId}
                aria-expanded={listaAberta}
                aria-invalid={mensagemErro ? true : undefined}
                aria-describedby={descricaoId}
                aria-busy={carregando || undefined}
                disabled={bloqueado}
                className="size-6 shrink-0 text-muted-foreground after:absolute after:inset-0 after:rounded-md hover:bg-transparent focus-visible:ring-0"
              >
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
        >
          <Command filter={filtrarSemAcento}>
            <CommandInput placeholder={buscaPlaceholder} />
            <CommandList aria-labelledby={rotuloId}>
              <CommandEmpty>{NENHUM_RESULTADO}</CommandEmpty>
              <CommandGroup>
                {opcoesOrdenadas.map(opcao => {
                  const marcado = idsSelecionados.has(opcao.id)
                  return (
                    <CommandItem
                      key={opcao.id}
                      value={String(opcao.id)}
                      keywords={[opcao.nome]}
                      onSelect={() => onAlternar(opcao.id)}
                      disabled={isOpcaoNoLimite(
                        marcado,
                        selecionados.length,
                        maximo
                      )}
                      data-marcado={marcado ? 'true' : 'false'}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 items-center justify-center rounded-sm border',
                          marcado
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input [&_svg]:invisible'
                        )}
                      >
                        <CheckIcon className="size-3.5 text-primary-foreground" />
                      </span>
                      <span className="flex-1 truncate">{opcao.nome}</span>
                      {marcado && (
                        <span className="sr-only">(selecionado)</span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {mensagemErro ? (
        <ErroCampo
          id={mensagemId}
          mensagem={mensagemErro}
          onTentarNovamente={erroLista ? onTentarNovamente : undefined}
        />
      ) : (
        aviso && (
          <p id={mensagemId} className="text-xs text-muted-foreground">
            {aviso}
          </p>
        )
      )}
    </div>
  )
}

function ErroCampo({
  id,
  mensagem,
  onTentarNovamente,
}: {
  id?: string
  mensagem: string
  onTentarNovamente?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p id={id} role="alert" className="text-xs text-destructive">
        {mensagem}
      </p>
      {onTentarNovamente && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={onTentarNovamente}
        >
          {TENTAR_NOVAMENTE_LABEL}
        </Button>
      )}
    </div>
  )
}

function semAcento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Busca da lista pelo nome, sem diferenciar acento nem caixa. */
function filtrarSemAcento(
  _valor: string,
  busca: string,
  palavras?: string[]
): number {
  const termo = semAcento(busca.trim())
  if (!termo) return 1
  return semAcento((palavras ?? []).join(' ')).includes(termo) ? 1 : 0
}
