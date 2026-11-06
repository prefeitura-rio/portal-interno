'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { EmpregabilidadeTipoPCD } from '@/http-gorio/models/empregabilidadeTipoPCD'
import { cn } from '@/lib/utils'
import {
  TIPOS_PCD_PLACEHOLDER,
  TODOS_OS_TIPOS_PCD_LABEL,
  alternarTipoPcd,
  alternarTodosTiposPcd,
  getChipsTiposPcd,
  isTodosTiposPcdSelecionados,
} from '@/lib/vaga-pcd'
import { ChevronsUpDown } from 'lucide-react'
import { useId, useState } from 'react'

interface TiposPcdSelectProps {
  /** id do rótulo visível do campo, para o nome acessível. */
  labelId: string
  tiposPcd: EmpregabilidadeTipoPCD[]
  tiposSelecionados: string[]
  onTiposChange: (ids: string[]) => void
  loading: boolean
  disabled?: boolean
  /** Erro de validação do formulário (exclusiva sem tipo ao salvar). */
  erro?: string
}

/**
 * Campo "Selecione os tipos" do critério PcD (DEV-422): multi-select compacto
 * que mostra os tipos marcados como chips. Sem nenhum tipo marcado, a lista
 * de opções já aparece aberta abaixo do campo; com tipos marcados, fica
 * fechada e abre ao clicar no campo.
 */
export function TiposPcdSelect({
  labelId,
  tiposPcd,
  tiposSelecionados,
  onTiposChange,
  loading,
  disabled = false,
  erro,
}: TiposPcdSelectProps) {
  const listaId = useId()
  const [aberto, setAberto] = useState(tiposSelecionados.length === 0)

  const tiposDisponiveis = tiposPcd
    .filter(
      (tipo): tipo is EmpregabilidadeTipoPCD & { id: string } =>
        typeof tipo.id === 'string' && tipo.id !== ''
    )
    .map(tipo => ({ id: tipo.id, label: tipo.descricao ?? tipo.id }))
  const idsDisponiveis = tiposDisponiveis.map(tipo => tipo.id)
  const todosTipos = isTodosTiposPcdSelecionados(
    tiposSelecionados,
    idsDisponiveis
  )
  const chips = getChipsTiposPcd(tiposSelecionados, tiposDisponiveis)

  return (
    <div className="space-y-2">
      <button
        type="button"
        role="combobox"
        aria-labelledby={labelId}
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-invalid={erro ? true : undefined}
        onClick={() => setAberto(atual => !atual)}
        disabled={disabled || loading}
        className={cn(
          'flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-left text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
          erro && 'border-destructive'
        )}
      >
        {loading ? (
          <span className="text-muted-foreground">
            Carregando tipos de deficiência...
          </span>
        ) : chips.length === 0 ? (
          <span className="text-muted-foreground">{TIPOS_PCD_PLACEHOLDER}</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {chips.map(chip => (
              <Badge key={chip} variant="secondary" className="font-normal">
                {chip}
              </Badge>
            ))}
          </span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>

      {aberto && !loading && (
        <fieldset
          id={listaId}
          aria-labelledby={labelId}
          className="space-y-2 rounded-md border p-3"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id="tipo-pcd-todos"
              checked={todosTipos}
              onCheckedChange={checked =>
                onTiposChange(
                  alternarTodosTiposPcd(checked === true, idsDisponiveis)
                )
              }
              disabled={disabled || idsDisponiveis.length === 0}
            />
            <Label
              htmlFor="tipo-pcd-todos"
              className="cursor-pointer text-sm font-medium"
            >
              {TODOS_OS_TIPOS_PCD_LABEL}
            </Label>
          </div>
          {tiposDisponiveis.map(tipo => (
            <div key={tipo.id} className="ml-6 flex items-center gap-2">
              <Checkbox
                id={`tipo-pcd-${tipo.id}`}
                checked={tiposSelecionados.includes(tipo.id)}
                onCheckedChange={checked =>
                  onTiposChange(
                    alternarTipoPcd(
                      tiposSelecionados,
                      tipo.id,
                      checked === true
                    )
                  )
                }
                disabled={disabled}
              />
              <Label
                htmlFor={`tipo-pcd-${tipo.id}`}
                className="cursor-pointer text-sm font-normal"
              >
                {tipo.label}
              </Label>
            </div>
          ))}
        </fieldset>
      )}

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}
