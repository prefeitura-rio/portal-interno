import type { CandidatoStatus } from '@/hooks/use-candidatos'
import {
  Ban,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type VagaStatus =
  | 'em_edicao'
  | 'em_aprovacao'
  | 'publicado_ativo'
  | 'publicado_expirado'

interface VagaStatusConfig {
  icon: LucideIcon
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}

export const vagaStatusConfig: Record<VagaStatus, VagaStatusConfig> = {
  em_edicao: {
    icon: FileText,
    label: 'Rascunho',
    variant: 'outline',
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50',
  },
  em_aprovacao: {
    icon: Clock,
    label: 'Aguardando Aprovação',
    variant: 'secondary',
    className: 'text-blue-600 border-blue-200 bg-blue-50',
  },
  publicado_ativo: {
    icon: ClipboardList,
    label: 'Ativa',
    variant: 'default',
    className: 'text-green-600 border-green-200 bg-green-50',
  },
  publicado_expirado: {
    icon: XCircle,
    label: 'Expirada',
    variant: 'destructive',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
}

// Candidatura Status Types
export type CandidaturaStatus =
  | 'candidatura_enviada'
  | 'aprovada'
  | 'reprovada'
  | 'vaga_congelada'
  | 'vaga_descontinuada'

interface CandidaturaStatusConfig {
  icon: LucideIcon
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}

export const candidaturaStatusConfig: Record<
  CandidaturaStatus,
  CandidaturaStatusConfig
> = {
  candidatura_enviada: {
    icon: Clock,
    label: 'Candidatura Enviada',
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-800',
  },
  aprovada: {
    icon: CheckCircle,
    label: 'Aprovada',
    variant: 'default',
    className: 'bg-green-100 text-green-800',
  },
  reprovada: {
    icon: XCircle,
    label: 'Reprovada',
    variant: 'destructive',
    className: 'text-red-600 border-red-200 bg-red-50',
  },
  vaga_congelada: {
    icon: Ban,
    label: 'Vaga Congelada',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800',
  },
  vaga_descontinuada: {
    icon: Ban,
    label: 'Vaga Descontinuada',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800',
  },
}

// Status Mapping Helpers (Backend ↔ Frontend)
export function mapBackendStatusToFrontend(
  backendStatus: string
): CandidatoStatus {
  const mapping: Record<string, CandidatoStatus> = {
    candidatura_enviada: 'pending',
    aprovada: 'approved',
    reprovada: 'rejected',
    vaga_congelada: 'cancelled',
    vaga_descontinuada: 'cancelled',
  }
  return mapping[backendStatus] || 'pending'
}

export function mapFrontendStatusToBackend(
  frontendStatus: CandidatoStatus
): string {
  const mapping: Record<CandidatoStatus, string> = {
    pending: 'candidatura_enviada',
    approved: 'aprovada',
    rejected: 'reprovada',
    cancelled: 'vaga_congelada',
  }
  return mapping[frontendStatus] || 'candidatura_enviada'
}
