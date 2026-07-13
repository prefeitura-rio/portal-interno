'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { EmpregabilidadeEscolaridade } from '@/http-gorio/models/empregabilidadeEscolaridade'
import type { EmpregabilidadeIdioma } from '@/http-gorio/models/empregabilidadeIdioma'
import type { EmpregabilidadeNivelIdioma } from '@/http-gorio/models/empregabilidadeNivelIdioma'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface IdiomaRequisito {
  id_idioma: string
  id_nivel_minimo: string
}

interface CriteriosElegibilidadeProps {
  idadeMinima: boolean
  onIdadeMinimaChange: (v: boolean) => void
  idEscolaridadeMinima: string | undefined
  onEscolaridadeChange: (id: string | undefined) => void
  idiomasRequisito: IdiomaRequisito[]
  onIdiomasChange: (items: IdiomaRequisito[]) => void
  escolaridades: EmpregabilidadeEscolaridade[]
  idiomas: EmpregabilidadeIdioma[]
  niveisIdioma: EmpregabilidadeNivelIdioma[]
  loadingEscolaridades: boolean
  loadingIdiomas: boolean
  loadingNiveis: boolean
  disabled?: boolean
  /**
   * Valores originais salvos no backend (usado para restaurar ao religar o master).
   * Passado pela página de edição; undefined em criação nova.
   */
  savedValues?: {
    idadeMinima: boolean
    idEscolaridadeMinima: string | undefined
    idiomasRequisito: IdiomaRequisito[]
  }
}

export function CriteriosElegibilidade({
  idadeMinima,
  onIdadeMinimaChange,
  idEscolaridadeMinima,
  onEscolaridadeChange,
  idiomasRequisito,
  onIdiomasChange,
  escolaridades,
  idiomas,
  niveisIdioma,
  loadingEscolaridades,
  loadingIdiomas,
  loadingNiveis,
  disabled = false,
  savedValues,
}: CriteriosElegibilidadeProps) {
  const algumCriterioAtivo =
    idadeMinima || !!idEscolaridadeMinima || idiomasRequisito.length > 0

  // masterEnabled: controlado localmente; sincroniza com estado externo
  const [masterEnabled, setMasterEnabled] = useState(algumCriterioAtivo)
  // idiomasToggle: controla visibilidade da lista de idiomas independente de haver selecionados
  const [idiomasToggle, setIdiomasToggle] = useState(
    idiomasRequisito.length > 0
  )

  // Sincroniza master e idiomas na primeira vez que os dados chegam do backend
  // (o RHF pode processar defaultValues assincronamente após o mount)
  const synced = useRef(false)
  useEffect(() => {
    if (!synced.current && algumCriterioAtivo) {
      setMasterEnabled(true)
      synced.current = true
    }
  }, [algumCriterioAtivo])

  useEffect(() => {
    if (idiomasRequisito.length > 0 && !idiomasToggle) {
      setIdiomasToggle(true)
    }
  }, [idiomasRequisito.length, idiomasToggle])

  const escolaridadeAtiva = !!idEscolaridadeMinima
  const idiomasAtivos = idiomasRequisito.length > 0

  const handleMasterToggle = (checked: boolean) => {
    setMasterEnabled(checked)
    if (!checked) {
      // Desligar: limpa tudo
      onIdadeMinimaChange(false)
      onEscolaridadeChange(undefined)
      onIdiomasChange([])
      setIdiomasToggle(false)
    } else if (savedValues) {
      // Religar em modo edição: restaura valores do backend
      onIdadeMinimaChange(savedValues.idadeMinima)
      onEscolaridadeChange(savedValues.idEscolaridadeMinima)
      onIdiomasChange(savedValues.idiomasRequisito)
      setIdiomasToggle(savedValues.idiomasRequisito.length > 0)
    }
    // Em criação nova (sem savedValues): religar apenas abre os toggles filhos, sem restaurar nada
  }

  const toggleIdioma = (idioma: EmpregabilidadeIdioma) => {
    const id = idioma.id!
    const existing = idiomasRequisito.find(r => r.id_idioma === id)
    if (existing) {
      onIdiomasChange(idiomasRequisito.filter(r => r.id_idioma !== id))
    } else {
      const defaultNivel = niveisIdioma[0]?.id ?? ''
      onIdiomasChange([
        ...idiomasRequisito,
        { id_idioma: id, id_nivel_minimo: defaultNivel },
      ])
    }
  }

  const updateNivelIdioma = (id_idioma: string, id_nivel_minimo: string) => {
    onIdiomasChange(
      idiomasRequisito.map(r =>
        r.id_idioma === id_idioma ? { ...r, id_nivel_minimo } : r
      )
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Toggle master */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Ativar critérios de aceitação da vaga
        </span>
        <Switch
          checked={masterEnabled}
          onCheckedChange={handleMasterToggle}
          disabled={disabled}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Critérios que um candidato deve atender para enviar uma candidatura
      </p>

      {masterEnabled && (
        <div className="space-y-4">
          {/* Idade mínima */}
          <div className="flex items-center justify-between">
            <Label
              className="flex items-center gap-1.5 text-sm font-normal"
              htmlFor="criterio-idade-minima"
            >
              Ter idade mínima (18 anos)
              {idadeMinima && (
                <Check className="size-3.5 text-green-500 shrink-0" />
              )}
            </Label>
            <Switch
              id="criterio-idade-minima"
              checked={idadeMinima}
              onCheckedChange={onIdadeMinimaChange}
              disabled={disabled}
            />
          </div>

          {/* Escolaridade mínima */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                className="flex items-center gap-1.5 text-sm font-normal"
                htmlFor="criterio-escolaridade"
              >
                Possuir escolaridade mínima
                {escolaridadeAtiva && (
                  <Check className="size-3.5 text-green-500 shrink-0" />
                )}
              </Label>
              <Switch
                id="criterio-escolaridade"
                checked={escolaridadeAtiva}
                onCheckedChange={checked => {
                  if (!checked) {
                    onEscolaridadeChange(undefined)
                  } else if (escolaridades[0]?.id) {
                    onEscolaridadeChange(escolaridades[0].id)
                  }
                }}
                disabled={disabled}
              />
            </div>

            {escolaridadeAtiva && (
              <Select
                value={idEscolaridadeMinima}
                onValueChange={onEscolaridadeChange}
                disabled={loadingEscolaridades || disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingEscolaridades
                        ? 'Carregando...'
                        : 'Selecionar escolaridade mínima'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {escolaridades.map(e => (
                    <SelectItem key={e.id} value={e.id!}>
                      {e.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Idiomas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                className="flex items-center gap-1.5 text-sm font-normal"
                htmlFor="criterio-idioma"
              >
                Dominar idioma estrangeiro
                {idiomasAtivos && (
                  <Check className="size-3.5 text-green-500 shrink-0" />
                )}
              </Label>
              <Switch
                id="criterio-idioma"
                checked={idiomasToggle}
                onCheckedChange={checked => {
                  setIdiomasToggle(checked)
                  if (!checked) onIdiomasChange([])
                }}
                disabled={disabled}
              />
            </div>

            {/* Lista de idiomas: aparece apenas quando toggle de idiomas está ON */}
            {idiomasToggle && (
              <div className="rounded-md border p-3 space-y-3">
                {loadingIdiomas ? (
                  <p className="text-xs text-muted-foreground">
                    Carregando idiomas...
                  </p>
                ) : (
                  idiomas.map(idioma => {
                    const requisito = idiomasRequisito.find(
                      r => r.id_idioma === idioma.id
                    )
                    const isChecked = !!requisito
                    return (
                      <div key={idioma.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`idioma-${idioma.id}`}
                            checked={isChecked}
                            onCheckedChange={() => toggleIdioma(idioma)}
                            disabled={disabled}
                          />
                          <Label
                            htmlFor={`idioma-${idioma.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {idioma.descricao}
                          </Label>
                        </div>

                        {isChecked && (
                          <div className="ml-6">
                            <Select
                              value={requisito.id_nivel_minimo}
                              onValueChange={val =>
                                updateNivelIdioma(idioma.id!, val)
                              }
                              disabled={loadingNiveis || disabled}
                            >
                              <SelectTrigger className="h-8 text-xs w-48">
                                <SelectValue
                                  placeholder={
                                    loadingNiveis
                                      ? 'Carregando...'
                                      : 'Nível mínimo'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {niveisIdioma.map(nivel => (
                                  <SelectItem key={nivel.id} value={nivel.id!}>
                                    {nivel.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {!idiomasToggle && !disabled && (
              <p className="text-xs text-muted-foreground ml-1">
                Ative o toggle acima para selecionar idiomas requeridos.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
