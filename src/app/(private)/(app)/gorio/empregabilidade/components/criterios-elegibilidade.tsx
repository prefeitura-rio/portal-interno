'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import type { EmpregabilidadeTipoPCD } from '@/http-gorio/models/empregabilidadeTipoPCD'
import {
  type CriterioAceitacaoId,
  ordenarCriteriosAceitacao,
} from '@/lib/criterios-aceitacao'
import { cn } from '@/lib/utils'
import {
  ATIVAR_BLOQUEIO_PCD_LABEL,
  BLOQUEIO_PCD_AVISO_TITULO,
  OPCAO_PCD_LABEL,
  OPCAO_PCD_PADRAO,
  OPCOES_PCD,
  type OpcaoPcd,
  PCD_PERGUNTA_LABEL,
  TIPO_PCD_OBRIGATORIO_MENSAGEM,
  TODOS_OS_TIPOS_PCD_LABEL,
  aceitaTiposPcd,
  alternarTipoPcd,
  alternarTodosTiposPcd,
  faltaTipoPcd,
  isBloqueioPcdAtivo,
  isOpcaoPcd,
  isTodosTiposPcdSelecionados,
  mostraAvisoBloqueioPcd,
} from '@/lib/vaga-pcd'
import { Check, TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { BloqueioTag } from './bloqueio-tag'

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
  /** DEV-408: critério PcD (opção, tipos de deficiência e bloqueio). */
  opcaoPcd: OpcaoPcd
  onOpcaoPcdChange: (opcao: OpcaoPcd) => void
  tiposPcdSelecionados: string[]
  onTiposPcdChange: (ids: string[]) => void
  bloqueioPcd: boolean
  onBloqueioPcdChange: (ativo: boolean) => void
  tiposPcd: EmpregabilidadeTipoPCD[]
  loadingTiposPcd: boolean
  disabled?: boolean
  /**
   * Valores originais salvos no backend (usado para restaurar ao religar o master).
   * Passado pela página de edição; undefined em criação nova.
   */
  savedValues?: {
    idadeMinima: boolean
    idEscolaridadeMinima: string | undefined
    idiomasRequisito: IdiomaRequisito[]
    opcaoPcd: OpcaoPcd
    tiposPcd: string[]
    bloqueioPcd: boolean
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
  opcaoPcd,
  onOpcaoPcdChange,
  tiposPcdSelecionados,
  onTiposPcdChange,
  bloqueioPcd,
  onBloqueioPcdChange,
  tiposPcd,
  loadingTiposPcd,
  disabled = false,
  savedValues,
}: CriteriosElegibilidadeProps) {
  const algumCriterioAtivo =
    idadeMinima ||
    !!idEscolaridadeMinima ||
    idiomasRequisito.length > 0 ||
    opcaoPcd !== OPCAO_PCD_PADRAO

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

  const handleMasterToggle = (checked: boolean) => {
    setMasterEnabled(checked)
    if (!checked) {
      // Desligar: limpa tudo
      onIdadeMinimaChange(false)
      onEscolaridadeChange(undefined)
      onIdiomasChange([])
      setIdiomasToggle(false)
      onOpcaoPcdChange(OPCAO_PCD_PADRAO)
      onTiposPcdChange([])
      onBloqueioPcdChange(false)
    } else if (savedValues) {
      // Religar em modo edição: restaura valores do backend
      onIdadeMinimaChange(savedValues.idadeMinima)
      onEscolaridadeChange(savedValues.idEscolaridadeMinima)
      onIdiomasChange(savedValues.idiomasRequisito)
      setIdiomasToggle(savedValues.idiomasRequisito.length > 0)
      onOpcaoPcdChange(savedValues.opcaoPcd)
      onTiposPcdChange(savedValues.tiposPcd)
      onBloqueioPcdChange(savedValues.bloqueioPcd)
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

  // DEV-408: o bloqueio PcD só vale na vaga exclusiva. Sair da exclusiva
  // desliga o bloqueio; aberta não tem tipos de deficiência.
  const handleOpcaoPcdChange = (opcao: OpcaoPcd) => {
    onOpcaoPcdChange(opcao)
    if (opcao !== 'exclusiva') onBloqueioPcdChange(false)
    if (!aceitaTiposPcd(opcao)) onTiposPcdChange([])
  }

  const idsTiposPcd = tiposPcd
    .map(tipo => tipo.id)
    .filter((id): id is string => typeof id === 'string' && id !== '')
  const todosTiposPcd = isTodosTiposPcdSelecionados(
    tiposPcdSelecionados,
    idsTiposPcd
  )
  const tipoPcdObrigatorio = faltaTipoPcd(opcaoPcd, tiposPcdSelecionados)

  // Critérios na ordem canônica do bloco (DEV-394): PcD, Idade, Experiência
  // em carteira, Escolaridade mínima, Idioma. Experiência ainda não existe no
  // formulário e entra na posição reservada quando for criada.
  const criterios: { id: CriterioAceitacaoId; content: ReactNode }[] = [
    {
      id: 'pcd',
      content: (
        <div className="space-y-3">
          <Label
            id="criterio-pcd-label"
            className="flex flex-wrap items-center gap-1.5 text-sm font-normal"
          >
            {PCD_PERGUNTA_LABEL}
            <BloqueioTag ativo={isBloqueioPcdAtivo(opcaoPcd, bloqueioPcd)} />
          </Label>

          <RadioGroup
            value={opcaoPcd}
            onValueChange={value => {
              if (isOpcaoPcd(value)) handleOpcaoPcdChange(value)
            }}
            disabled={disabled}
            aria-labelledby="criterio-pcd-label"
            className="gap-2"
          >
            {OPCOES_PCD.map(opcao => (
              <div key={opcao} className="flex items-center gap-2">
                <RadioGroupItem value={opcao} id={`opcao-pcd-${opcao}`} />
                <Label
                  htmlFor={`opcao-pcd-${opcao}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {OPCAO_PCD_LABEL[opcao]}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {aceitaTiposPcd(opcaoPcd) && (
            <div className="space-y-1.5">
              <p className="text-sm">Tipos de deficiência</p>
              <div
                className={cn(
                  'rounded-md border p-3 space-y-2',
                  tipoPcdObrigatorio && 'border-destructive'
                )}
              >
                {loadingTiposPcd ? (
                  <p className="text-xs text-muted-foreground">
                    Carregando tipos de deficiência...
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tipo-pcd-todos"
                        checked={todosTiposPcd}
                        onCheckedChange={checked =>
                          onTiposPcdChange(
                            alternarTodosTiposPcd(checked === true, idsTiposPcd)
                          )
                        }
                        disabled={disabled || idsTiposPcd.length === 0}
                      />
                      <Label
                        htmlFor="tipo-pcd-todos"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {TODOS_OS_TIPOS_PCD_LABEL}
                      </Label>
                    </div>
                    {idsTiposPcd.map(id => {
                      const tipo = tiposPcd.find(t => t.id === id)
                      return (
                        <div key={id} className="flex items-center gap-2 ml-6">
                          <Checkbox
                            id={`tipo-pcd-${id}`}
                            checked={tiposPcdSelecionados.includes(id)}
                            onCheckedChange={checked =>
                              onTiposPcdChange(
                                alternarTipoPcd(
                                  tiposPcdSelecionados,
                                  id,
                                  checked === true
                                )
                              )
                            }
                            disabled={disabled}
                          />
                          <Label
                            htmlFor={`tipo-pcd-${id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {tipo?.descricao ?? id}
                          </Label>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
              {tipoPcdObrigatorio && (
                <p role="alert" className="text-sm text-destructive">
                  {TIPO_PCD_OBRIGATORIO_MENSAGEM}
                </p>
              )}
            </div>
          )}

          {mostraAvisoBloqueioPcd(opcaoPcd, bloqueioPcd) && (
            <div
              role="status"
              className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
            >
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {BLOQUEIO_PCD_AVISO_TITULO}
                  </p>
                  <p className="text-xs">
                    Enquanto o bloqueio estiver desligado, a candidatura não
                    fica restrita às pessoas com deficiência.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onBloqueioPcdChange(true)}
                disabled={disabled}
              >
                {ATIVAR_BLOQUEIO_PCD_LABEL}
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'idade',
      content: (
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
      ),
    },
    {
      id: 'escolaridade',
      content: (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              className="flex items-center gap-1.5 text-sm font-normal"
              htmlFor="criterio-escolaridade"
            >
              Possuir escolaridade mínima
              <BloqueioTag ativo={escolaridadeAtiva} />
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
      ),
    },
    {
      id: 'idioma',
      content: (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              className="flex items-center gap-1.5 text-sm font-normal"
              htmlFor="criterio-idioma"
            >
              Dominar idioma estrangeiro
              <BloqueioTag ativo={idiomasToggle} />
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
      ),
    },
  ]

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
          {ordenarCriteriosAceitacao(criterios).map(criterio => (
            <div key={criterio.id} data-criterio={criterio.id}>
              {criterio.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
