'use client'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAreasAtuacao,
  useComportamentosAtitudes,
  useConhecimentosDaArea,
} from '@/hooks/use-vaga-habilidades-catalogos'
import { cn } from '@/lib/utils'
import type { VagaAreaAtuacaoSelecionada } from '@/lib/vaga-habilidades'
import { X } from 'lucide-react'
import { useMemo } from 'react'

// ─── Pill toggleável ──────────────────────────────────────────────────────────

interface VagaTagPillProps {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

function VagaTagPill({
  selected,
  onClick,
  disabled = false,
  children,
}: VagaTagPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-1.5',
        'text-sm font-normal transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'bg-primary text-primary-foreground border border-primary'
          : 'border border-input bg-background text-foreground hover:bg-accent'
      )}
    >
      {children}
    </button>
  )
}

// ─── Skeleton de pills ────────────────────────────────────────────────────────

const PILL_WIDTHS = [
  'w-24',
  'w-32',
  'w-20',
  'w-28',
  'w-16',
  'w-24',
  'w-20',
  'w-28',
]

function TagSkeletons() {
  return (
    <div
      className="flex flex-wrap gap-2"
      aria-busy="true"
      aria-label="Carregando opções"
    >
      {PILL_WIDTHS.map((w, i) => (
        <Skeleton key={i} className={cn('h-8 rounded-full', w)} />
      ))}
    </div>
  )
}

// ─── Área selecionada com seus conhecimentos ──────────────────────────────────

interface AreaItemProps {
  area: VagaAreaAtuacaoSelecionada
  onRemove: () => void
  onConhecimentosChange: (ids: number[]) => void
  disabled?: boolean
}

function AreaItem({
  area,
  onRemove,
  onConhecimentosChange,
  disabled = false,
}: AreaItemProps) {
  const { data: conhecimentosPage, isLoading } = useConhecimentosDaArea(
    area.id_area_atuacao,
    { pageSize: 100 }
  )

  const conhecimentos = conhecimentosPage?.data ?? []

  const handleToggle = (id: number) => {
    const ids = area.conhecimento_ids.includes(id)
      ? area.conhecimento_ids.filter(x => x !== id)
      : [...area.conhecimento_ids, id]
    onConhecimentosChange(ids)
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium pt-0.5">
          {area.nome ?? `Área ${area.id_area_atuacao}`}
        </span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="size-4" />
            <span className="sr-only">Remover área</span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">
          Conhecimentos <span className="text-destructive">*</span>
        </span>
        {isLoading ? (
          <TagSkeletons />
        ) : (
          <div className="flex flex-wrap gap-2">
            {conhecimentos.map(item => (
              <VagaTagPill
                key={item.id}
                selected={area.conhecimento_ids.includes(item.id)}
                onClick={() => handleToggle(item.id)}
                disabled={disabled}
              >
                {item.nome}
              </VagaTagPill>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface HabilidadesCompetenciasFormProps {
  areasAtuacao: VagaAreaAtuacaoSelecionada[]
  onAreasAtuacaoChange: (areas: VagaAreaAtuacaoSelecionada[]) => void
  comportamentoAtitudesIds: number[]
  onComportamentoAtitudesChange: (ids: number[]) => void
  isReadOnly?: boolean
  /** Mensagem de erro de validação para áreas de atuação. */
  erroAreasAtuacao?: string
  /** Mensagem de erro de validação para comportamentos e atitudes. */
  erroComportamentos?: string
}

/**
 * Seção de habilidades e competências da vaga (DEV-525): uma área de atuação
 * com seus conhecimentos e comportamentos/atitudes. Ambos os campos são
 * obrigatórios para enviar para aprovação ou publicar (exigirHabilidadesCompetencias
 * no app-go-api retorna 400 se ausentes).
 */
export function HabilidadesCompetenciasForm({
  areasAtuacao,
  onAreasAtuacaoChange,
  comportamentoAtitudesIds,
  onComportamentoAtitudesChange,
  isReadOnly = false,
  erroAreasAtuacao,
  erroComportamentos,
}: HabilidadesCompetenciasFormProps) {
  // Carrega as 197+ áreas em duas páginas (limite da API: 100 por página)
  const { data: areasP1, isLoading: loadingP1 } = useAreasAtuacao({
    page: 1,
    pageSize: 100,
  })
  const { data: areasP2, isLoading: loadingP2 } = useAreasAtuacao({
    page: 2,
    pageSize: 100,
  })
  const loadingAreas = loadingP1 || loadingP2

  const { data: comportamentosPage, isLoading: loadingComportamentos } =
    useComportamentosAtitudes({ pageSize: 50 })

  const allAreas = useMemo(
    () => [...(areasP1?.data ?? []), ...(areasP2?.data ?? [])],
    [areasP1, areasP2]
  )

  // Apenas a primeira área é usada (UI de seleção única)
  const selectedArea = areasAtuacao[0] ?? null

  const areasOptions = useMemo(
    () => allAreas.map(a => ({ value: String(a.id), label: a.nome })),
    [allAreas]
  )

  const handleSelectArea = (areaIdStr: string) => {
    const areaId = Number(areaIdStr)
    if (!areaId) return
    const catalogArea = allAreas.find(a => a.id === areaId)
    onAreasAtuacaoChange([
      {
        id_area_atuacao: areaId,
        conhecimento_ids: [],
        nome: catalogArea?.nome,
      },
    ])
  }

  const handleClearArea = () => {
    onAreasAtuacaoChange([])
  }

  const handleConhecimentosChange = (ids: number[]) => {
    if (!selectedArea) return
    onAreasAtuacaoChange([{ ...selectedArea, conhecimento_ids: ids }])
  }

  const handleToggleComportamento = (id: number) => {
    const ids = comportamentoAtitudesIds.includes(id)
      ? comportamentoAtitudesIds.filter(x => x !== id)
      : [...comportamentoAtitudesIds, id]
    onComportamentoAtitudesChange(ids)
  }

  return (
    <div className="space-y-6">
      {/* ── Área de Atuação ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">
            Área de Atuação <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione a área de atuação e seus conhecimentos.
          </p>
        </div>

        {selectedArea ? (
          <AreaItem
            area={selectedArea}
            onRemove={handleClearArea}
            onConhecimentosChange={handleConhecimentosChange}
            disabled={isReadOnly}
          />
        ) : (
          !isReadOnly && (
            <Combobox
              options={loadingAreas ? [] : areasOptions}
              value=""
              onValueChange={handleSelectArea}
              placeholder={
                loadingAreas
                  ? 'Carregando áreas...'
                  : 'Selecionar área de atuação...'
              }
              searchPlaceholder="Buscar área..."
              emptyMessage="Nenhuma área encontrada."
              disabled={loadingAreas}
            />
          )
        )}

        {erroAreasAtuacao && (
          <p role="alert" className="text-sm text-destructive">
            {erroAreasAtuacao}
          </p>
        )}
      </div>

      {/* ── Comportamentos e Atitudes ──────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">
            Comportamentos e Atitudes{' '}
            <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione ao menos um comportamento ou atitude esperado para a vaga.
          </p>
        </div>

        {loadingComportamentos ? (
          <TagSkeletons />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(comportamentosPage?.data ?? []).map(c => (
              <VagaTagPill
                key={c.id}
                selected={comportamentoAtitudesIds.includes(c.id)}
                onClick={() => handleToggleComportamento(c.id)}
                disabled={isReadOnly}
              >
                {c.nome}
              </VagaTagPill>
            ))}
          </div>
        )}

        {erroComportamentos && (
          <p role="alert" className="text-sm text-destructive">
            {erroComportamentos}
          </p>
        )}
      </div>
    </div>
  )
}
