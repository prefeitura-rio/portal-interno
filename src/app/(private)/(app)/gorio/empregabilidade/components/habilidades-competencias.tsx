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
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAreasAtuacaoCompleto,
  useComportamentosAtitudesCompleto,
  useConhecimentosDaAreaCompleto,
} from '@/hooks/use-vaga-habilidades-catalogos'
import { cn } from '@/lib/utils'
import type {
  CatalogoHabilidadeItem,
  VagaAreaAtuacaoSelecionada,
} from '@/lib/vaga-habilidades'
import {
  ADICIONAR_AREA_LABEL,
  AREAS_SECAO_TITULO,
  AREA_LABEL,
  AREA_PLACEHOLDER,
  AREA_SEM_CONHECIMENTOS,
  BUSCAR_PLACEHOLDER,
  CARREGANDO_AREAS,
  CARREGANDO_COMPORTAMENTOS,
  CARREGANDO_CONHECIMENTOS,
  COMPORTAMENTOS_LABEL,
  COMPORTAMENTOS_PLACEHOLDER,
  CONHECIMENTOS_LABEL,
  CONHECIMENTOS_PLACEHOLDER,
  CONHECIMENTOS_SEM_AREA,
  ERRO_LISTA_AREAS,
  ERRO_LISTA_COMPORTAMENTOS,
  ERRO_LISTA_CONHECIMENTOS,
  type ErrosHabilidades,
  HABILIDADES_DESCRICAO,
  HABILIDADES_MAX_DISPLAY,
  HABILIDADES_TITULO,
  NENHUMA_AREA,
  NENHUM_RESULTADO,
  REMOVER_AREA_LABEL,
  TENTAR_NOVAMENTE_LABEL,
  alternarId,
  getAreasUsadasEmOutrosGrupos,
  getBadgesVisiveis,
  getItensSelecionados,
  getMaisItensLabel,
  getRemoverItemLabel,
  ordenarPorNome,
  podeAdicionarArea,
  removerGrupo,
  removerId,
  setConhecimentosDoGrupo,
  trocarAreaDoGrupo,
} from '@/lib/vaga-habilidades-bloco'
import {
  BriefcaseBusiness,
  CheckIcon,
  ChevronsUpDown,
  HeartHandshake,
  type LucideIcon,
  Plus,
  Trash2,
  XIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export interface HabilidadesCompetenciasProps {
  /** Áreas da vaga, cada uma com os conhecimentos marcados nela. */
  areas: VagaAreaAtuacaoSelecionada[]
  onAreasChange: (areas: VagaAreaAtuacaoSelecionada[]) => void
  comportamentoIds: number[]
  onComportamentosChange: (ids: number[]) => void
  /** Nomes gravados na vaga, usados enquanto o catálogo não chega. */
  comportamentosSalvos?: CatalogoHabilidadeItem[]
  /** Somente leitura: mostra o que está marcado, sem ações. */
  isReadOnly?: boolean
  /** Erros de validação do formulário, mostrados em cada campo. */
  erros?: ErrosHabilidades
}

/**
 * Bloco "Habilidades e competências" da vaga (DEV-526): grupos de área (um
 * Select de área e o multi-select dos conhecimentos dela) e a seção de
 * comportamentos/atitudes, fora dos grupos. Sem área na vaga, mostra um grupo
 * vazio para escolher a primeira.
 */
export function HabilidadesCompetencias({
  areas,
  onAreasChange,
  comportamentoIds,
  onComportamentosChange,
  comportamentosSalvos = [],
  isReadOnly = false,
  erros,
}: HabilidadesCompetenciasProps) {
  const areasQuery = useAreasAtuacaoCompleto()
  const comportamentosQuery = useComportamentosAtitudesCompleto()
  const catalogoAreas = areasQuery.data?.data ?? []
  const catalogoComportamentos = comportamentosQuery.data?.data ?? []

  const [grupoNovoAberto, setGrupoNovoAberto] = useState(false)
  const temGrupoVazio = !isReadOnly && (areas.length === 0 || grupoNovoAberto)
  const totalGrupos = areas.length + (temGrupoVazio ? 1 : 0)

  const triggersArea = useRef<(HTMLButtonElement | null)[]>([])
  // Teclado: ao abrir ou remover um grupo, o foco vai para o Select de área
  // do grupo novo ou do grupo anterior, em vez de se perder na página.
  const [focoPendente, setFocoPendente] = useState<number | null>(null)

  useEffect(() => {
    if (focoPendente === null) return
    triggersArea.current[focoPendente]?.focus()
    setFocoPendente(null)
  }, [focoPendente])

  const adicionarHabilitado = podeAdicionarArea({
    areas,
    grupoNovoAberto: temGrupoVazio,
    totalAreasCatalogo: areasQuery.isSuccess ? catalogoAreas.length : undefined,
  })

  const handleAreaChange = (indice: number, idArea: number) => {
    if (indice >= areas.length) setGrupoNovoAberto(false)
    onAreasChange(trocarAreaDoGrupo(areas, indice, idArea))
  }

  const handleRemoverGrupo = (indice: number) => {
    if (indice >= areas.length) {
      setGrupoNovoAberto(false)
    } else {
      onAreasChange(removerGrupo(areas, indice))
    }
    setFocoPendente(indice > 0 ? indice - 1 : 0)
  }

  const handleAdicionar = () => {
    setGrupoNovoAberto(true)
    setFocoPendente(areas.length)
  }

  const comportamentosSelecionados = getItensSelecionados(
    comportamentoIds,
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

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SecaoIcone icone={BriefcaseBusiness} />
          <p className="text-sm font-medium">{AREAS_SECAO_TITULO}</p>
        </div>

        {Array.from({ length: totalGrupos }, (_, indice) => (
          <GrupoArea
            key={indice}
            indice={indice}
            area={areas[indice]}
            areas={areas}
            catalogoAreas={catalogoAreas}
            areasCarregando={areasQuery.isPending}
            areasComErro={areasQuery.isError}
            onTentarAreasNovamente={() => areasQuery.refetch()}
            onAreaChange={idArea => handleAreaChange(indice, idArea)}
            onConhecimentosChange={ids =>
              onAreasChange(setConhecimentosDoGrupo(areas, indice, ids))
            }
            onRemover={() => handleRemoverGrupo(indice)}
            podeRemover={areas.length > 0}
            isReadOnly={isReadOnly}
            erro={erros?.grupos?.[indice]}
            triggerRef={elemento => {
              triggersArea.current[indice] = elemento
            }}
          />
        ))}

        {isReadOnly && areas.length === 0 && (
          <p className="text-sm text-muted-foreground">{NENHUMA_AREA}</p>
        )}

        {erros?.areas && <ErroCampo mensagem={erros.areas} />}

        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdicionar}
            disabled={!adicionarHabilitado}
          >
            <Plus aria-hidden="true" />
            {ADICIONAR_AREA_LABEL}
          </Button>
        )}
      </div>

      <div data-secao-comportamentos="" className="space-y-3">
        <CampoMultiSelect
          titulo={COMPORTAMENTOS_LABEL}
          icone={HeartHandshake}
          placeholder={COMPORTAMENTOS_PLACEHOLDER}
          opcoes={catalogoComportamentos}
          selecionados={comportamentosSelecionados}
          onAlternar={id =>
            onComportamentosChange(alternarId(comportamentoIds, id))
          }
          onRemover={id =>
            onComportamentosChange(removerId(comportamentoIds, id))
          }
          carregando={comportamentosQuery.isPending}
          mensagemCarregando={CARREGANDO_COMPORTAMENTOS}
          erroLista={
            comportamentosQuery.isError ? ERRO_LISTA_COMPORTAMENTOS : undefined
          }
          onTentarNovamente={() => comportamentosQuery.refetch()}
          erro={erros?.comportamentos}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  )
}

interface GrupoAreaProps {
  indice: number
  /** `undefined` no grupo novo, ainda sem área. */
  area: VagaAreaAtuacaoSelecionada | undefined
  areas: VagaAreaAtuacaoSelecionada[]
  catalogoAreas: CatalogoHabilidadeItem[]
  areasCarregando: boolean
  areasComErro: boolean
  onTentarAreasNovamente: () => void
  onAreaChange: (idArea: number) => void
  onConhecimentosChange: (ids: number[]) => void
  onRemover: () => void
  podeRemover: boolean
  isReadOnly: boolean
  erro?: { area?: string; conhecimentos?: string }
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
  const areaLabelId = useId()
  const erroAreaId = useId()
  const idArea = area?.id_area_atuacao
  const conhecimentosQuery = useConhecimentosDaAreaCompleto(idArea)
  const catalogoConhecimentos = conhecimentosQuery.data?.data ?? []

  const usadas = getAreasUsadasEmOutrosGrupos(areas, indice)
  const opcoesArea = ordenarPorNome(
    idArea !== undefined && !catalogoAreas.some(item => item.id === idArea)
      ? [...catalogoAreas, { id: idArea, nome: area?.nome || `#${idArea}` }]
      : catalogoAreas
  )

  const conhecimentosSelecionados = getItensSelecionados(
    area?.conhecimento_ids ?? [],
    catalogoConhecimentos,
    area?.conhecimentos
  )
  const areaSemConhecimentos =
    idArea !== undefined &&
    conhecimentosQuery.isSuccess &&
    catalogoConhecimentos.length === 0

  const mensagemErroArea = areasComErro ? ERRO_LISTA_AREAS : erro?.area

  return (
    <fieldset
      data-grupo-area={indice}
      className="space-y-3 rounded-md border p-3"
    >
      <legend className="sr-only">{`${AREA_LABEL} ${indice + 1}`}</legend>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label id={areaLabelId} className="text-sm font-medium">
            {AREA_LABEL}
          </Label>
          {!isReadOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              aria-label={REMOVER_AREA_LABEL}
              onClick={onRemover}
              disabled={!podeRemover}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>

        <Select
          value={idArea !== undefined ? String(idArea) : ''}
          onValueChange={valor => {
            const id = Number(valor)
            if (Number.isSafeInteger(id) && id > 0) onAreaChange(id)
          }}
          disabled={isReadOnly || areasCarregando}
        >
          <SelectTrigger
            ref={triggerRef}
            aria-labelledby={areaLabelId}
            aria-busy={areasCarregando || undefined}
            aria-invalid={mensagemErroArea ? true : undefined}
            aria-describedby={mensagemErroArea ? erroAreaId : undefined}
            className="w-full"
          >
            <SelectValue
              placeholder={
                areasCarregando ? CARREGANDO_AREAS : AREA_PLACEHOLDER
              }
            />
          </SelectTrigger>
          <SelectContent>
            {opcoesArea.map(opcao => (
              <SelectItem
                key={opcao.id}
                value={String(opcao.id)}
                disabled={usadas.has(opcao.id)}
              >
                {opcao.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <CampoMultiSelect
        titulo={CONHECIMENTOS_LABEL}
        placeholder={
          idArea === undefined
            ? CONHECIMENTOS_SEM_AREA
            : CONHECIMENTOS_PLACEHOLDER
        }
        opcoes={catalogoConhecimentos}
        selecionados={conhecimentosSelecionados}
        onAlternar={id =>
          onConhecimentosChange(alternarId(area?.conhecimento_ids ?? [], id))
        }
        onRemover={id =>
          onConhecimentosChange(removerId(area?.conhecimento_ids ?? [], id))
        }
        carregando={idArea !== undefined && conhecimentosQuery.isPending}
        mensagemCarregando={CARREGANDO_CONHECIMENTOS}
        erroLista={
          conhecimentosQuery.isError ? ERRO_LISTA_CONHECIMENTOS : undefined
        }
        onTentarNovamente={() => conhecimentosQuery.refetch()}
        aviso={areaSemConhecimentos ? AREA_SEM_CONHECIMENTOS : undefined}
        erro={erro?.conhecimentos}
        isReadOnly={isReadOnly}
        desabilitado={idArea === undefined || areaSemConhecimentos}
      />
    </fieldset>
  )
}

interface CampoMultiSelectProps {
  titulo: string
  icone?: LucideIcon
  placeholder: string
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
}

/**
 * Multi-select de um catálogo: a lista em ordem A–Z com busca e, abaixo do
 * campo, os marcados como badges removíveis (até 9, depois "+N mais"). Os
 * que ficam no "+N mais" saem desmarcando na lista. Sem "Cadastrar novo".
 */
function CampoMultiSelect({
  titulo,
  icone,
  placeholder,
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
}: CampoMultiSelectProps) {
  const [aberto, setAberto] = useState(false)
  const labelId = useId()
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

  const textoCampo = carregando
    ? mensagemCarregando
    : selecionados.length > 0
      ? `${selecionados.length} ${selecionados.length === 1 ? 'selecionado' : 'selecionados'}`
      : placeholder

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icone && <SecaoIcone icone={icone} />}
        <Label id={labelId} className="text-sm font-medium">
          {titulo}
        </Label>
      </div>

      <Popover open={aberto && !bloqueado} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-labelledby={labelId}
            aria-expanded={aberto && !bloqueado}
            aria-invalid={mensagemErro ? true : undefined}
            aria-describedby={descricaoId}
            disabled={bloqueado}
            className={cn(
              'w-full justify-between font-normal',
              selecionados.length === 0 && 'text-muted-foreground',
              mensagemErro && 'border-destructive'
            )}
          >
            <span className="truncate">{textoCampo}</span>
            <ChevronsUpDown aria-hidden="true" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
        >
          <Command filter={filtrarSemAcento}>
            <CommandInput placeholder={BUSCAR_PLACEHOLDER} />
            <CommandList aria-labelledby={labelId}>
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
                      data-marcado={marcado ? 'true' : 'false'}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 items-center justify-center rounded-sm border border-primary',
                          marcado
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
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

      {selecionados.length > 0 && (
        <ul aria-label={titulo} className="flex flex-wrap gap-1.5">
          {visiveis.map(item => (
            <li key={item.id}>
              <Badge
                variant="secondary"
                className="max-w-full gap-1 font-normal"
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
      )}

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
      <p id={id} role="alert" className="text-sm text-destructive">
        {mensagem}
      </p>
      {onTentarNovamente && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={onTentarNovamente}
        >
          {TENTAR_NOVAMENTE_LABEL}
        </Button>
      )}
    </div>
  )
}

function SecaoIcone({ icone: Icone }: { icone: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
    >
      <Icone className="size-4" />
    </span>
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
