'use client'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  type HabilidadeChip,
  type HabilidadesSnapshot,
  extractHabilidadesCompetencias,
  getToggleChipsLabel,
  getVisibleChips,
} from '@/lib/curriculo-habilidades'
import { Brain, HeartHandshake, Target } from 'lucide-react'
import * as React from 'react'

interface HabilidadesCompetenciasItemProps {
  snapshot: HabilidadesSnapshot | null | undefined
}

/**
 * Item de acordeão "Habilidades e competências" da gaveta de candidatura.
 * Não renderiza nada quando a seção está vazia. O estado "Ver todos" de cada
 * grupo é local: monte com `key` do candidato para reiniciá-lo ao trocar.
 */
export function HabilidadesCompetenciasItem({
  snapshot,
}: HabilidadesCompetenciasItemProps) {
  const habilidades = extractHabilidadesCompetencias(snapshot)
  if (!habilidades) return null

  return (
    <AccordionItem value="habilidades">
      <AccordionTrigger className="text-sm font-medium">
        Habilidades e competências
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-5">
          {habilidades.areaAtuacao && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
                <Target className="w-3.5 h-3.5" />
                Área de atuação
              </h5>
              <p className="text-sm font-medium">{habilidades.areaAtuacao}</p>
            </div>
          )}

          <ChipsGroup
            title="Conhecimentos"
            icon={<Brain className="w-3.5 h-3.5" />}
            chips={habilidades.conhecimentos}
          />

          <ChipsGroup
            title="Comportamentos e atitudes"
            icon={<HeartHandshake className="w-3.5 h-3.5" />}
            chips={habilidades.comportamentos}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

interface ChipsGroupProps {
  title: string
  icon: React.ReactNode
  chips: HabilidadeChip[]
}

function ChipsGroup({ title, icon, chips }: ChipsGroupProps) {
  const [expanded, setExpanded] = React.useState(false)
  if (chips.length === 0) return null

  const { visible, hiddenCount } = getVisibleChips(chips, expanded)
  const toggleLabel = getToggleChipsLabel(hiddenCount, expanded)

  return (
    <div>
      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
        {icon}
        {title} ({chips.length})
      </h5>
      <ul className="flex flex-wrap gap-2">
        {visible.map(chip => (
          <li key={chip.key} className="max-w-full">
            <Badge
              variant="secondary"
              className="max-w-full whitespace-normal text-left"
            >
              {chip.nome}
            </Badge>
          </li>
        ))}
      </ul>
      {toggleLabel && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 mt-2 text-xs"
          aria-expanded={expanded}
          onClick={() => setExpanded(prev => !prev)}
        >
          {toggleLabel}
        </Button>
      )}
    </div>
  )
}
