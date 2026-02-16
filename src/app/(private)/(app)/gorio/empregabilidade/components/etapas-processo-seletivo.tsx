'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/ui/sortable'
import { Textarea } from '@/components/ui/textarea'
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface EtapaProcessoSeletivo {
  id: string
  titulo: string
  descricao: string
  ordem: number
}

interface EtapasProcessoSeletivoProps {
  etapas: EtapaProcessoSeletivo[]
  onEtapasChange: (etapas: EtapaProcessoSeletivo[]) => void
  disabled?: boolean
}

export function EtapasProcessoSeletivo({
  etapas,
  onEtapasChange,
  disabled = false,
}: EtapasProcessoSeletivoProps) {
  const [newEtapaTitulo, setNewEtapaTitulo] = useState('')
  const [newEtapaDescricao, setNewEtapaDescricao] = useState('')
  const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null)
  const [originalEtapa, setOriginalEtapa] =
    useState<EtapaProcessoSeletivo | null>(null)

  const resetForm = () => {
    setNewEtapaTitulo('')
    setNewEtapaDescricao('')
  }

  const addEtapa = () => {
    if (!newEtapaTitulo.trim()) return

    const newEtapa: EtapaProcessoSeletivo = {
      id: uuidv4(),
      titulo: newEtapaTitulo.trim(),
      descricao: newEtapaDescricao.trim(),
      ordem: etapas.length + 1,
    }

    onEtapasChange([...etapas, newEtapa])
    resetForm()
  }

  const removeEtapa = (etapaId: string) => {
    const updatedEtapas = etapas
      .filter(etapa => etapa.id !== etapaId)
      .map((etapa, index) => ({
        ...etapa,
        ordem: index + 1,
      }))
    onEtapasChange(updatedEtapas)
  }

  const updateEtapa = (
    etapaId: string,
    updates: Partial<EtapaProcessoSeletivo>
  ) => {
    onEtapasChange(
      etapas.map(etapa =>
        etapa.id === etapaId ? { ...etapa, ...updates } : etapa
      )
    )
  }

  const startEditing = (etapa: EtapaProcessoSeletivo) => {
    setOriginalEtapa(JSON.parse(JSON.stringify(etapa)))
    setEditingEtapaId(etapa.id)
  }

  const cancelEditing = () => {
    if (originalEtapa) {
      onEtapasChange(
        etapas.map(etapa =>
          etapa.id === originalEtapa.id ? originalEtapa : etapa
        )
      )
    }
    setEditingEtapaId(null)
    setOriginalEtapa(null)
  }

  const finishEditing = () => {
    setEditingEtapaId(null)
    setOriginalEtapa(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      addEtapa()
    }
  }

  const handleSortChange = (sortedEtapas: EtapaProcessoSeletivo[]) => {
    // Atualiza a ordem das etapas após o drag and drop
    const updatedEtapas = sortedEtapas.map((etapa, index) => ({
      ...etapa,
      ordem: index + 1,
    }))
    onEtapasChange(updatedEtapas)
  }

  const renderEtapaPreview = (
    etapa: EtapaProcessoSeletivo,
    showDragHandle = true
  ) => {
    const isEditing = editingEtapaId === etapa.id

    // Modo de edição da etapa
    if (isEditing && !disabled) {
      return (
        <div className="space-y-4 p-4 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Editando etapa
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  finishEditing()
                }}
                className="cursor-pointer"
              >
                <Check className="h-4 w-4 mr-1" />
                Concluir edição
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  cancelEditing()
                }}
                className="cursor-pointer"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Título da etapa*
            </Label>
            <Input
              value={etapa.titulo}
              onChange={e => updateEtapa(etapa.id, { titulo: e.target.value })}
              className="mt-1"
              placeholder="Ex: Análise de currículo"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Descrição
            </Label>
            <Textarea
              value={etapa.descricao}
              onChange={e =>
                updateEtapa(etapa.id, { descricao: e.target.value })
              }
              className="mt-1 min-h-[80px]"
              placeholder="Descreva os detalhes desta etapa..."
            />
          </div>
        </div>
      )
    }

    // Modo de visualização da etapa
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-muted/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 flex-1">
            {showDragHandle && !disabled && (
              <SortableItemHandle asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-grab hover:bg-muted/50 p-1 h-8 w-8 mt-1 shrink-0"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </SortableItemHandle>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                  Etapa {etapa.ordem}
                </span>
                <span className="font-medium">{etapa.titulo}</span>
              </div>
              {etapa.descricao && (
                <p className="text-sm text-muted-foreground">
                  {etapa.descricao}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  startEditing(etapa)
                }}
                className="h-8 w-8 p-1 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEtapa(etapa.id)}
                className="text-destructive hover:text-destructive h-8 w-8 p-1 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      {/* Formulário para adicionar nova etapa */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Título da etapa*
          </Label>
          <Input
            placeholder="Ex: Análise de currículo"
            value={newEtapaTitulo}
            onChange={e => setNewEtapaTitulo(e.target.value)}
            onKeyPress={handleKeyPress}
            className="mt-1"
            disabled={disabled}
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Descrição
          </Label>
          <Textarea
            placeholder="Descreva os detalhes desta etapa..."
            value={newEtapaDescricao}
            onChange={e => setNewEtapaDescricao(e.target.value)}
            className="mt-1 min-h-[80px]"
            disabled={disabled}
          />
        </div>

        <Button
          onClick={addEtapa}
          disabled={!newEtapaTitulo.trim() || disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar etapa
        </Button>
      </div>

      {/* Lista de etapas com ordenação */}
      {etapas.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">
            Etapas adicionadas ({etapas.length})
          </h4>
          <Sortable
            value={etapas}
            onValueChange={handleSortChange}
            getItemValue={etapa => etapa.id}
          >
            <SortableContent withoutSlot>
              <div className="space-y-3">
                {etapas.map(etapa => (
                  <SortableItem key={etapa.id} value={etapa.id} asChild>
                    <div>{renderEtapaPreview(etapa)}</div>
                  </SortableItem>
                ))}
              </div>
            </SortableContent>
            <SortableOverlay>
              {({ value }) => {
                const etapa = etapas.find(e => e.id === value)
                return etapa ? (
                  <div className="opacity-90">
                    {renderEtapaPreview(etapa, false)}
                  </div>
                ) : null
              }}
            </SortableOverlay>
          </Sortable>
        </div>
      )}
    </div>
  )
}
