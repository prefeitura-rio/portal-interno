'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { EmpregabilidadeVaga } from '@/http-gorio/models/empregabilidadeVaga'
import { getCriteriosBloqueio } from '@/lib/criterios-aceitacao'
import {
  getIdiomasRequisitoFalhaAviso,
  getVagaEdicaoHref,
  isIdiomasRequisitoError,
  salvarIdiomasRequisito,
} from '@/lib/idiomas-requisito'
import {
  getBloqueioPcdDaVaga,
  getOpcaoPcdDaVaga,
  getTiposPcdParaApi,
  isBloqueioPcdAtivo,
} from '@/lib/vaga-pcd'
import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface DuplicateJobButtonProps {
  vaga: EmpregabilidadeVaga
  disabled?: boolean
}

export function DuplicateJobButton({
  vaga,
  disabled = false,
}: DuplicateJobButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(false)

  const handleDuplicateJob = async () => {
    try {
      setIsLoading(true)

      // Transform etapas array (remove IDs and timestamps)
      const transformedEtapas = vaga.etapas
        ? vaga.etapas.map(etapa => ({
            titulo: etapa.titulo,
            descricao: etapa.descricao,
            ordem: etapa.ordem,
          }))
        : []

      // Transform informacoes_complementares array (remove IDs and timestamps)
      const transformedInformacoesComplementares =
        vaga.informacoes_complementares
          ? vaga.informacoes_complementares.map(info => ({
              titulo: info.titulo,
              tipo_campo: info.tipo_campo,
              obrigatorio: info.obrigatorio,
              opcoes: info.opcoes,
              valor_minimo: info.valor_minimo,
              valor_maximo: info.valor_maximo,
            }))
          : []

      // Build the draft data
      const draftData = {
        titulo: `${vaga.titulo} - Cópia`,
        descricao: vaga.descricao,
        id_contratante: vaga.id_contratante,
        id_regime_contratacao: vaga.id_regime_contratacao,
        id_modelo_trabalho: vaga.id_modelo_trabalho,
        id_orgao_parceiro: vaga.id_orgao_parceiro,
        valor_vaga: vaga.valor_vaga,
        quantidade_estimada_contratacoes: vaga.quantidade_estimada_contratacoes,
        bairro: vaga.bairro,
        data_limite: vaga.data_limite,
        requisitos: vaga.requisitos,
        diferenciais: vaga.diferenciais,
        responsabilidades: vaga.responsabilidades,
        beneficios: vaga.beneficios,
        // DEV-408: copia a opção PcD, os tipos e o bloqueio "pcd"
        opcao_pcd: getOpcaoPcdDaVaga(vaga),
        tipos_pcd: getTiposPcdParaApi(
          getOpcaoPcdDaVaga(vaga),
          (vaga.tipos_pcd ?? []).map(tipo => tipo.id ?? '')
        ),
        etapas: transformedEtapas,
        informacoes_complementares: transformedInformacoesComplementares,
        idade_minima: (vaga as any).idade_minima ?? null,
        id_escolaridade_minima: (vaga as any).id_escolaridade_minima ?? null,
        criterios_bloqueio: getCriteriosBloqueio({
          idEscolaridadeMinima: vaga.id_escolaridade_minima,
          idiomasRequisito: vaga.idiomas_requisito,
          bloqueioPcd: isBloqueioPcdAtivo(
            getOpcaoPcdDaVaga(vaga),
            getBloqueioPcdDaVaga(vaga)
          ),
        }),
        status: 'em_edicao',
      }

      // Call the draft API endpoint
      const response = await fetch('/api/empregabilidade/vagas/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to duplicate vaga')
      }

      const result = await response.json()

      const novaVagaId = result?.vaga?.id
      const idiomasRequisito = (vaga as any).idiomas_requisito as
        | { id_idioma: string; id_nivel_minimo: string }[]
        | undefined

      if (novaVagaId && idiomasRequisito && idiomasRequisito.length > 0) {
        try {
          await salvarIdiomasRequisito(novaVagaId, idiomasRequisito)
        } catch (error) {
          if (!isIdiomasRequisitoError(error)) throw error
          // DEV-405: a cópia já existe com o bloqueio de idioma ativo; avisa
          // e leva à edição dela em vez de mostrar sucesso.
          console.error('Error saving idiomas_requisito:', error)
          const { title, description } = getIdiomasRequisitoFalhaAviso(
            'duplicada',
            error
          )
          toast.error(title, { description, duration: 15000 })
          router.push(getVagaEdicaoHref(novaVagaId))
          router.refresh()
          return
        }
      }

      toast.success('Vaga duplicada com sucesso!')

      // Redirect to draft tab
      router.push('/gorio/empregabilidade?tab=draft')
      router.refresh()
    } catch (error) {
      console.error('Error duplicating vaga:', error)
      toast.error('Erro ao duplicar vaga', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
      setConfirmDialog(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setConfirmDialog(true)}
        disabled={disabled || isLoading}
        className="w-full md:w-auto"
      >
        <Copy className="mr-2 h-4 w-4" />
        Duplicar Vaga
      </Button>

      <ConfirmDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        title="Duplicar Vaga"
        description={`Tem certeza que deseja duplicar a vaga "${vaga.titulo}"? Uma cópia será criada como rascunho com o nome "${vaga.titulo} - Cópia".`}
        confirmText="Duplicar Vaga"
        variant="default"
        onConfirm={handleDuplicateJob}
      />
    </>
  )
}
