'use client'

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
  ESCOLARIDADE_PLACEHOLDER,
  ESCOLARIDADE_TITULO,
  IDIOMA_TITULO,
  ordenarCriteriosAceitacao,
} from '@/lib/criterios-aceitacao'
import { cn } from '@/lib/utils'
import {
  EXPERIENCIA_CARTEIRA_DESCRICAO,
  EXPERIENCIA_CARTEIRA_LABEL,
  EXPERIENCIA_CARTEIRA_PADRAO,
  EXPERIENCIA_CARTEIRA_TITULO,
  type ExperienciaCarteira,
  OPCOES_EXPERIENCIA_CARTEIRA,
  isExperienciaCarteira,
} from '@/lib/vaga-experiencia-carteira'
import {
  IDADE_TITULO,
  OPCAO_IDADE_DESCRICAO,
  OPCAO_IDADE_LABEL,
  OPCAO_IDADE_PADRAO,
  OPCOES_IDADE,
  type OpcaoIdade,
  getIdadeDaOpcao,
  getOpcaoIdade,
  isOpcaoIdade,
} from '@/lib/vaga-jovem-aprendiz'
import {
  OPCAO_PCD_DESCRICAO,
  OPCAO_PCD_LABEL,
  OPCAO_PCD_PADRAO,
  OPCOES_PCD,
  type OpcaoPcd,
  PCD_EXCLUSIVA_AVISO,
  PCD_PERGUNTA_LABEL,
  PCD_TITULO,
  TIPOS_PCD_APOIO,
  TIPOS_PCD_LABEL,
  aceitaTiposPcd,
  isBloqueioPcdAtivo,
  isOpcaoPcd,
} from '@/lib/vaga-pcd'
import {
  Accessibility,
  BriefcaseBusiness,
  Cake,
  GraduationCap,
  Languages,
  type LucideIcon,
  TriangleAlert,
} from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { BloqueioTag } from './bloqueio-tag'
import { TiposPcdSelect } from './tipos-pcd-select'

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
  /**
   * DEV-408: critério PcD (opção e tipos de deficiência). O bloqueio vem da
   * opção (DEV-422).
   */
  opcaoPcd: OpcaoPcd
  onOpcaoPcdChange: (opcao: OpcaoPcd) => void
  tiposPcdSelecionados: string[]
  onTiposPcdChange: (ids: string[]) => void
  /** Erro de validação dos tipos (exclusiva sem tipo ao salvar). */
  erroTiposPcd?: string
  tiposPcd: EmpregabilidadeTipoPCD[]
  loadingTiposPcd: boolean
  /**
   * DEV-425: critério Experiência em carteira. `null` = desligado; ligado com
   * o tempo exigido (o bloqueio da API vem daí).
   */
  experienciaCarteira: ExperienciaCarteira | null
  onExperienciaCarteiraChange: (opcao: ExperienciaCarteira | null) => void
  /**
   * DEV-429: opção Jovem Aprendiz da seção Idade (faixa fixa de 14 a 24 anos),
   * bloqueio da API `jovem_aprendiz`. DEV-442: escolha única com Maiores de 18.
   */
  jovemAprendiz: boolean
  onJovemAprendizChange: (v: boolean) => void
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
    experienciaCarteira: ExperienciaCarteira | null
    jovemAprendiz: boolean
  }
}

function CriterioIcone({
  icone: Icone,
  ativo,
}: {
  icone: LucideIcon
  ativo: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md',
        ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}
    >
      <Icone className="size-4" />
    </span>
  )
}

function CriterioCabecalho({
  icone,
  titulo,
  switchId,
  ativo,
  onAtivoChange,
  disabled,
}: {
  icone: LucideIcon
  titulo: string
  switchId: string
  ativo: boolean
  onAtivoChange: (checked: boolean) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <CriterioIcone icone={icone} ativo={ativo} />
        <Label htmlFor={switchId} className="text-sm font-medium">
          {titulo}
        </Label>
        <BloqueioTag ativo={ativo} />
      </div>
      <Switch
        id={switchId}
        checked={ativo}
        onCheckedChange={onAtivoChange}
        disabled={disabled}
      />
    </div>
  )
}

/**
 * DEV-442: as opções do critério ficam sempre à mostra; com o critério
 * desligado, esmaecidas e sem ação (os controles chegam desabilitados).
 * Com o master desligado o bloco inteiro já vem esmaecido, então aqui não
 * esmaece de novo.
 */
function CriterioOpcoes({
  criterio,
  esmaecidas,
  children,
}: {
  criterio: string
  esmaecidas: boolean
  children: ReactNode
}) {
  return (
    <div
      data-opcoes-criterio={criterio}
      data-esmaecidas={esmaecidas ? 'true' : 'false'}
      className={cn('space-y-3', esmaecidas && 'opacity-50')}
    >
      {children}
    </div>
  )
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
  erroTiposPcd,
  tiposPcd,
  loadingTiposPcd,
  experienciaCarteira,
  onExperienciaCarteiraChange,
  jovemAprendiz,
  onJovemAprendizChange,
  disabled = false,
  savedValues,
}: CriteriosElegibilidadeProps) {
  const algumCriterioAtivo =
    idadeMinima ||
    !!idEscolaridadeMinima ||
    idiomasRequisito.length > 0 ||
    opcaoPcd !== OPCAO_PCD_PADRAO ||
    experienciaCarteira != null ||
    jovemAprendiz

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
      onExperienciaCarteiraChange(null)
      onJovemAprendizChange(false)
    } else if (savedValues) {
      // Religar em modo edição: restaura valores do backend
      onIdadeMinimaChange(savedValues.idadeMinima)
      onEscolaridadeChange(savedValues.idEscolaridadeMinima)
      onIdiomasChange(savedValues.idiomasRequisito)
      setIdiomasToggle(savedValues.idiomasRequisito.length > 0)
      onOpcaoPcdChange(savedValues.opcaoPcd)
      onTiposPcdChange(savedValues.tiposPcd)
      onExperienciaCarteiraChange(savedValues.experienciaCarteira)
      onJovemAprendizChange(savedValues.jovemAprendiz)
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

  // DEV-408: aberta não tem tipos de deficiência. DEV-422: o bloqueio PcD vem
  // da opção (a exclusiva bloqueia), sem botão para ligá-lo.
  const handleOpcaoPcdChange = (opcao: OpcaoPcd) => {
    onOpcaoPcdChange(opcao)
    if (!aceitaTiposPcd(opcao)) onTiposPcdChange([])
  }

  const bloqueioPcdAtivo = isBloqueioPcdAtivo(opcaoPcd)

  // DEV-425: o switch da Experiência em carteira é o bloqueio; ligar marca
  // "Qualquer tempo" e desligar limpa a opção.
  const experienciaCarteiraAtiva = experienciaCarteira != null

  // DEV-442: a Idade é um critério só, com switch próprio e escolha única
  // entre Maiores de 18 (`idade_minima` = 18) e Jovem Aprendiz (14 a 24
  // anos): nunca as duas ligadas.
  const idadeAtiva = idadeMinima || jovemAprendiz
  const opcaoIdade = getOpcaoIdade({ idadeMinima, jovemAprendiz })

  const handleOpcaoIdadeChange = (opcao: OpcaoIdade | null) => {
    const campos = getIdadeDaOpcao(opcao)
    onIdadeMinimaChange(campos.idadeMinima)
    onJovemAprendizChange(campos.jovemAprendiz)
  }

  // DEV-442: com o master desligado, os critérios aparecem esmaecidos e sem
  // ação; com um critério desligado, as opções dele também.
  const bloqueado = disabled || !masterEnabled
  const esmaecer = (criterioAtivo: boolean) => masterEnabled && !criterioAtivo

  // Critérios na ordem canônica do bloco (DEV-394): PcD, Idade, Experiência
  // em carteira (DEV-425), Escolaridade mínima, Idioma.
  const criterios: { id: CriterioAceitacaoId; content: ReactNode }[] = [
    {
      id: 'pcd',
      content: (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <CriterioIcone icone={Accessibility} ativo={bloqueioPcdAtivo} />
            <p className="text-sm font-medium">{PCD_TITULO}</p>
            <BloqueioTag ativo={bloqueioPcdAtivo} />
          </div>

          <p id="criterio-pcd-label" className="text-sm">
            {PCD_PERGUNTA_LABEL}
          </p>

          <RadioGroup
            value={opcaoPcd}
            onValueChange={value => {
              if (isOpcaoPcd(value)) handleOpcaoPcdChange(value)
            }}
            disabled={bloqueado}
            aria-labelledby="criterio-pcd-label"
            className="gap-3"
          >
            {OPCOES_PCD.map(opcao => (
              <div key={opcao} data-opcao-pcd={opcao} className="space-y-2">
                <div className="flex items-start gap-2">
                  <RadioGroupItem
                    value={opcao}
                    id={`opcao-pcd-${opcao}`}
                    aria-describedby={`opcao-pcd-${opcao}-descricao`}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`opcao-pcd-${opcao}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {OPCAO_PCD_LABEL[opcao]}
                    </Label>
                    <p
                      id={`opcao-pcd-${opcao}-descricao`}
                      className="text-xs text-muted-foreground"
                    >
                      {OPCAO_PCD_DESCRICAO[opcao]}
                    </p>
                  </div>
                </div>

                {opcao === opcaoPcd &&
                  (opcao === 'preferencial' || opcao === 'exclusiva') && (
                    <div data-tipos-pcd={opcao} className="ml-6 space-y-2">
                      {opcao === 'exclusiva' && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                          <TriangleAlert className="mt-px size-3.5 shrink-0" />
                          {PCD_EXCLUSIVA_AVISO}
                        </p>
                      )}
                      <p id="tipos-pcd-label" className="text-sm font-medium">
                        {TIPOS_PCD_LABEL[opcao]}
                      </p>
                      <TiposPcdSelect
                        labelId="tipos-pcd-label"
                        tiposPcd={tiposPcd}
                        tiposSelecionados={tiposPcdSelecionados}
                        onTiposChange={onTiposPcdChange}
                        loading={loadingTiposPcd}
                        disabled={bloqueado}
                        erro={erroTiposPcd}
                      />
                      <p className="text-xs text-muted-foreground">
                        {TIPOS_PCD_APOIO[opcao]}
                      </p>
                    </div>
                  )}
              </div>
            ))}
          </RadioGroup>
        </div>
      ),
    },
    {
      id: 'idade',
      content: (
        <div className="space-y-3 rounded-md border p-3">
          <CriterioCabecalho
            icone={Cake}
            titulo={IDADE_TITULO}
            switchId="criterio-idade"
            ativo={idadeAtiva}
            onAtivoChange={checked =>
              handleOpcaoIdadeChange(checked ? OPCAO_IDADE_PADRAO : null)
            }
            disabled={bloqueado}
          />

          <CriterioOpcoes criterio="idade" esmaecidas={esmaecer(idadeAtiva)}>
            <RadioGroup
              value={opcaoIdade ?? ''}
              onValueChange={value => {
                if (isOpcaoIdade(value)) handleOpcaoIdadeChange(value)
              }}
              disabled={bloqueado || !idadeAtiva}
              aria-label={IDADE_TITULO}
              className="gap-3"
            >
              {OPCOES_IDADE.map(opcao => (
                <div
                  key={opcao}
                  data-opcao-idade={opcao}
                  className="flex items-start gap-2"
                >
                  <RadioGroupItem
                    value={opcao}
                    id={`criterio-idade-${opcao}`}
                    aria-describedby={`criterio-idade-${opcao}-descricao`}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`criterio-idade-${opcao}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {OPCAO_IDADE_LABEL[opcao]}
                    </Label>
                    <p
                      id={`criterio-idade-${opcao}-descricao`}
                      className="text-xs text-muted-foreground"
                    >
                      {OPCAO_IDADE_DESCRICAO[opcao]}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CriterioOpcoes>
        </div>
      ),
    },
    {
      id: 'experiencia',
      content: (
        <div className="space-y-3 rounded-md border p-3">
          <CriterioCabecalho
            icone={BriefcaseBusiness}
            titulo={EXPERIENCIA_CARTEIRA_TITULO}
            switchId="criterio-experiencia-carteira"
            ativo={experienciaCarteiraAtiva}
            onAtivoChange={checked =>
              onExperienciaCarteiraChange(
                checked ? EXPERIENCIA_CARTEIRA_PADRAO : null
              )
            }
            disabled={bloqueado}
          />

          <CriterioOpcoes
            criterio="experiencia"
            esmaecidas={esmaecer(experienciaCarteiraAtiva)}
          >
            <RadioGroup
              value={experienciaCarteira ?? ''}
              onValueChange={value => {
                if (isExperienciaCarteira(value)) {
                  onExperienciaCarteiraChange(value)
                }
              }}
              disabled={bloqueado || !experienciaCarteiraAtiva}
              aria-label={EXPERIENCIA_CARTEIRA_TITULO}
              className="gap-3"
            >
              {OPCOES_EXPERIENCIA_CARTEIRA.map(opcao => (
                <div
                  key={opcao}
                  data-opcao-experiencia-carteira={opcao}
                  className="flex items-start gap-2"
                >
                  <RadioGroupItem
                    value={opcao}
                    id={`experiencia-carteira-${opcao}`}
                    aria-describedby={`experiencia-carteira-${opcao}-descricao`}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`experiencia-carteira-${opcao}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {EXPERIENCIA_CARTEIRA_LABEL[opcao]}
                    </Label>
                    <p
                      id={`experiencia-carteira-${opcao}-descricao`}
                      className="text-xs text-muted-foreground"
                    >
                      {EXPERIENCIA_CARTEIRA_DESCRICAO[opcao]}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CriterioOpcoes>
        </div>
      ),
    },
    {
      id: 'escolaridade',
      content: (
        <div className="space-y-3 rounded-md border p-3">
          <CriterioCabecalho
            icone={GraduationCap}
            titulo={ESCOLARIDADE_TITULO}
            switchId="criterio-escolaridade"
            ativo={escolaridadeAtiva}
            onAtivoChange={checked => {
              if (!checked) {
                onEscolaridadeChange(undefined)
              } else if (escolaridades[0]?.id) {
                onEscolaridadeChange(escolaridades[0].id)
              }
            }}
            disabled={bloqueado}
          />

          <CriterioOpcoes
            criterio="escolaridade"
            esmaecidas={esmaecer(escolaridadeAtiva)}
          >
            <Select
              value={idEscolaridadeMinima ?? ''}
              onValueChange={value => {
                if (value) onEscolaridadeChange(value)
              }}
              disabled={loadingEscolaridades || bloqueado || !escolaridadeAtiva}
            >
              <SelectTrigger
                id="criterio-escolaridade-opcao"
                aria-label={ESCOLARIDADE_TITULO}
                className="w-full"
              >
                <SelectValue
                  placeholder={
                    loadingEscolaridades
                      ? 'Carregando...'
                      : ESCOLARIDADE_PLACEHOLDER
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
          </CriterioOpcoes>
        </div>
      ),
    },
    {
      id: 'idioma',
      content: (
        <div className="space-y-3 rounded-md border p-3">
          <CriterioCabecalho
            icone={Languages}
            titulo={IDIOMA_TITULO}
            switchId="criterio-idioma"
            ativo={idiomasToggle}
            onAtivoChange={checked => {
              setIdiomasToggle(checked)
              if (!checked) onIdiomasChange([])
            }}
            disabled={bloqueado}
          />

          <CriterioOpcoes
            criterio="idioma"
            esmaecidas={esmaecer(idiomasToggle)}
          >
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
                          disabled={bloqueado || !idiomasToggle}
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
                            disabled={
                              loadingNiveis || bloqueado || !idiomasToggle
                            }
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
          </CriterioOpcoes>
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

      <div
        data-criterios-master={masterEnabled ? 'ligado' : 'desligado'}
        aria-disabled={!masterEnabled || undefined}
        className={cn('space-y-4', !masterEnabled && 'opacity-50')}
      >
        {ordenarCriteriosAceitacao(criterios).map(criterio => (
          <div key={criterio.id} data-criterio={criterio.id}>
            {criterio.content}
          </div>
        ))}
      </div>
    </div>
  )
}
