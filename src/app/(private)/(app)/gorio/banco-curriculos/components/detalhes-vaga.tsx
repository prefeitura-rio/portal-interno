'use client'

import { MarkdownViewer } from '@/components/blocks/editor-md/markdown-viewer'
import { Badge } from '@/components/ui/badge'
import type { EmpregabilidadeVaga } from '@/http-gorio/models'
import { formatDateBR } from '@/lib/format'
import {
  type CandidaturaStatus,
  type VagaStatus,
  candidaturaStatusConfig,
  vagaStatusConfig,
} from '@/lib/status-config/empregabilidade'
import type { ReactNode } from 'react'
import { NAO_INFORMADO, valorOuNaoInformado } from '../lib/format'

const ACESSIBILIDADE_PCD: Record<string, string> = {
  para_pcd: 'Para PcD',
  preferencial_pcd: 'Preferencial PcD',
  exclusivo_pcd: 'Exclusivo PcD',
}

/**
 * Dados da vaga mostrados ao operador do banco de currículos: no histórico de
 * candidaturas e na escolha de vagas para associar o candidato.
 */
export function DetalhesVaga({ vaga }: { vaga: EmpregabilidadeVaga }) {
  const tiposPcd = (vaga.tipos_pcd ?? [])
    .map(tipo => tipo.descricao)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Descrição</p>
        {vaga.descricao ? (
          <MarkdownViewer
            content={vaga.descricao}
            className="rounded-md border"
          />
        ) : (
          <p className="text-sm font-medium">{NAO_INFORMADO}</p>
        )}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Contratante">{contratanteDaVaga(vaga)}</Campo>
        <Campo rotulo="Órgão parceiro">{orgaoDaVaga(vaga)}</Campo>
        <Campo rotulo="Regime de contratação">
          {valorOuNaoInformado(vaga.regime_contratacao?.descricao)}
        </Campo>
        <Campo rotulo="Modelo de trabalho">
          {valorOuNaoInformado(vaga.modelo_trabalho?.descricao)}
        </Campo>
        <Campo rotulo="Vaga PcD">
          {vaga.acessibilidade_pcd
            ? (ACESSIBILIDADE_PCD[vaga.acessibilidade_pcd] ??
              vaga.acessibilidade_pcd)
            : 'Não'}
        </Campo>
        <Campo rotulo="Tipo de deficiência">{tiposPcd || NAO_INFORMADO}</Campo>
        <Campo rotulo="Valor da vaga">{formatarValor(vaga.valor_vaga)}</Campo>
        <Campo rotulo="Quantidade estimada de contratações">
          {vaga.quantidade_estimada_contratacoes ?? NAO_INFORMADO}
        </Campo>
        <Campo rotulo="Bairro">{valorOuNaoInformado(vaga.bairro)}</Campo>
        <Campo rotulo="Data limite">
          {formatDateBR(vaga.data_limite, {
            dateStyle: 'short',
            timeStyle: 'short',
          }) || NAO_INFORMADO}
        </Campo>
      </dl>
    </div>
  )
}

export function StatusVaga({ status }: { status?: string }) {
  const config = status ? vagaStatusConfig[status as VagaStatus] : undefined
  if (!config) return <span>{status || NAO_INFORMADO}</span>

  return (
    <Badge variant={config.variant} className={config.className}>
      <config.icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function StatusCandidato({ status }: { status?: string }) {
  const config = status
    ? candidaturaStatusConfig[status as CandidaturaStatus]
    : undefined
  if (!config) return <span>{status || NAO_INFORMADO}</span>

  return (
    <Badge variant={config.variant} className={config.className}>
      <config.icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function Campo({
  rotulo,
  children,
}: {
  rotulo: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

/** O órgão parceiro vem do cadastro de órgãos; a sigla é a forma mais curta. */
export function orgaoDaVaga(vaga: EmpregabilidadeVaga | undefined): string {
  return valorOuNaoInformado(
    vaga?.orgao_parceiro?.sigla || vaga?.orgao_parceiro?.name
  )
}

export function contratanteDaVaga(
  vaga: EmpregabilidadeVaga | undefined
): string {
  return valorOuNaoInformado(
    vaga?.contratante?.nome_fantasia ||
      vaga?.contratante?.razao_social ||
      vaga?.id_contratante
  )
}

function formatarValor(valor: number | undefined): string {
  if (valor == null) return NAO_INFORMADO
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
