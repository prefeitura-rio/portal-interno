import { Button } from '@/components/ui/button'
import { Play, RefreshCw } from 'lucide-react'

interface VagaAcoesPrimariasProps {
  status: string | null | undefined
  canPublishVagaAsAtivo: boolean
  canFreezeOrDiscontinueVaga: boolean
  disabled: boolean
  onSendToApproval: () => void
  onPublish: () => void
  onUnfreeze: () => void
  onReactivate: () => void
}

/**
 * Ações sempre visíveis (fora do menu "Mais opções") da tela de detalhe da
 * vaga, por status. DEV-755: no rascunho (`em_edicao`), quem pode publicar
 * direto vê "Publicar vaga" ao lado de "Enviar para aprovação", como no
 * formulário de criação e no status `em_aprovacao`.
 */
export function VagaAcoesPrimarias({
  status,
  canPublishVagaAsAtivo,
  canFreezeOrDiscontinueVaga,
  disabled,
  onSendToApproval,
  onPublish,
  onUnfreeze,
  onReactivate,
}: VagaAcoesPrimariasProps) {
  const podePublicar =
    (status === 'em_edicao' || status === 'em_aprovacao') &&
    canPublishVagaAsAtivo

  return (
    <>
      {status === 'em_edicao' && (
        <Button
          onClick={onSendToApproval}
          disabled={disabled}
          variant={podePublicar ? 'outline' : 'default'}
        >
          <Play className="mr-2 h-4 w-4" />
          Enviar para aprovação
        </Button>
      )}

      {podePublicar && (
        <Button onClick={onPublish} disabled={disabled} variant="default">
          <Play className="mr-2 h-4 w-4" />
          Publicar vaga
        </Button>
      )}

      {status === 'vaga_congelada' && canFreezeOrDiscontinueVaga && (
        <Button onClick={onUnfreeze} disabled={disabled} variant="default">
          <Play className="mr-2 h-4 w-4" />
          Descongelar vaga
        </Button>
      )}

      {status === 'vaga_descontinuada' && canFreezeOrDiscontinueVaga && (
        <Button onClick={onReactivate} disabled={disabled} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reativar vaga
        </Button>
      )}
    </>
  )
}
