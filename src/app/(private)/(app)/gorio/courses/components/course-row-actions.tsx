'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CourseListItem } from '@/types/course'
import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useCourseListActions } from '../hooks/use-course-list-actions'

type DialogType =
  | 'send_to_review'
  | 'publish_directly'
  | 'approve_publish'
  | 'request_changes'
  | 'agree_with_edit'
  | 'propose_edit'
  | 'propose_deletion'
  | 'agree_deletion'
  | 'delete_draft'

const DIALOG_CONFIG: Record<
  DialogType,
  {
    title: string
    description: string
    confirmText: string
    variant: 'default' | 'destructive'
  }
> = {
  send_to_review: {
    title: 'Enviar para aprovação?',
    description: 'O curso será enviado para revisão da Casa Civil.',
    confirmText: 'Enviar',
    variant: 'default',
  },
  publish_directly: {
    title: 'Publicar curso?',
    description: 'O curso será publicado imediatamente.',
    confirmText: 'Publicar',
    variant: 'default',
  },
  approve_publish: {
    title: 'Aprovar e publicar?',
    description: 'O curso será aprovado e publicado imediatamente.',
    confirmText: 'Aprovar e publicar',
    variant: 'default',
  },
  request_changes: {
    title: 'Enviar para edição?',
    description: 'O curso será devolvido para o editor realizar ajustes.',
    confirmText: 'Enviar para edição',
    variant: 'default',
  },
  agree_with_edit: {
    title: 'Concordar com a edição?',
    description: 'O curso será aprovado com as edições propostas e publicado.',
    confirmText: 'Concordar',
    variant: 'default',
  },
  propose_edit: {
    title: 'Propor edição?',
    description: 'O curso será marcado para edição.',
    confirmText: 'Propor edição',
    variant: 'default',
  },
  propose_deletion: {
    title: 'Propor exclusão?',
    description:
      'O curso será enviado para aprovação de exclusão pela Casa Civil.',
    confirmText: 'Propor exclusão',
    variant: 'destructive',
  },
  agree_deletion: {
    title: 'Excluir curso?',
    description:
      'O curso será excluído permanentemente. Essa ação não pode ser desfeita.',
    confirmText: 'Excluir',
    variant: 'destructive',
  },
  delete_draft: {
    title: 'Excluir rascunho?',
    description: 'O rascunho será excluído permanentemente.',
    confirmText: 'Excluir',
    variant: 'destructive',
  },
}

interface CourseRowActionsProps {
  course: CourseListItem
  canApproveCourses: boolean
  canPublishCourses: boolean
  onSuccess: () => void
}

export function CourseRowActions({
  course,
  canApproveCourses,
  canPublishCourses,
  onSuccess,
}: CourseRowActionsProps) {
  const [dialog, setDialog] = useState<{
    open: boolean
    type: DialogType | null
  }>({
    open: false,
    type: null,
  })

  const actions = useCourseListActions(onSuccess)

  const { status } = course

  const isDraft = status === 'draft'
  const isInReview = status === 'in_review'
  const isNeedsChanges = status === 'needs_changes'
  const isPublished = [
    'published',
    'opened',
    'ABERTO',
    'CRIADO',
    'scheduled',
    'accepting_enrollments',
    'in_progress',
  ].includes(status)
  const isFinished = ['finished', 'closed', 'canceled', 'ENCERRADO'].includes(
    status
  )
  const isPendingDeletion = status === 'pending_deletion'

  const canEdit = canPublishCourses || isDraft || isNeedsChanges
  const showSendToReview = !canPublishCourses && (isDraft || isNeedsChanges)
  const showPublishDirectly = canPublishCourses && isDraft
  const showApproveAndPublish = canApproveCourses && isInReview
  const showRequestChanges = canApproveCourses && isInReview
  const showAgreeWithEdit = canApproveCourses && isNeedsChanges
  const showProposeEdit = isPublished
  const showProposeDeletion = isPublished
  const showAgreeDeletion = canApproveCourses && isPendingDeletion
  const showDeleteDraft = isDraft
  const showDuplicate = !isPendingDeletion || canApproveCourses

  // Primary workflow action (slot 2 in menu)
  const hasPrimaryAction =
    showSendToReview ||
    showPublishDirectly ||
    showApproveAndPublish ||
    showAgreeWithEdit

  // Secondary/destructive actions (slot 4 in menu, separated)
  const hasSecondaryAction =
    showRequestChanges ||
    showProposeEdit ||
    showProposeDeletion ||
    showAgreeDeletion ||
    showDeleteDraft

  function open(type: DialogType) {
    setDialog({ open: true, type })
  }

  function handleConfirm() {
    if (!dialog.type) return
    switch (dialog.type) {
      case 'send_to_review':
        actions.sendToReview(course.id)
        break
      case 'publish_directly':
        actions.publishDirectly(course.id)
        break
      case 'approve_publish':
        actions.approveAndPublish(course.id)
        break
      case 'request_changes':
        actions.requestChanges(course.id)
        break
      case 'agree_with_edit':
        actions.agreeWithEdit(course.id)
        break
      case 'propose_edit':
        actions.requestChanges(course.id)
        break
      case 'propose_deletion':
        actions.requestDeletion(course.id)
        break
      case 'agree_deletion':
        actions.confirmDeletion(course.id)
        break
      case 'delete_draft':
        actions.deleteDraft(course.id)
        break
    }
  }

  const activeConfig = dialog.type ? DIALOG_CONFIG[dialog.type] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={actions.isLoading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* 1. Editar */}
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/gorio/courses/course/${course.id}?edit=true`}>
                Editar
              </Link>
            </DropdownMenuItem>
          )}

          {/* 2. Primary workflow action */}
          {showSendToReview && (
            <DropdownMenuItem onSelect={() => open('send_to_review')}>
              Enviar para aprovação
            </DropdownMenuItem>
          )}
          {showPublishDirectly && (
            <DropdownMenuItem onSelect={() => open('publish_directly')}>
              Publicar
            </DropdownMenuItem>
          )}
          {showApproveAndPublish && (
            <DropdownMenuItem onSelect={() => open('approve_publish')}>
              Aprovar e publicar
            </DropdownMenuItem>
          )}
          {showAgreeWithEdit && (
            <DropdownMenuItem onSelect={() => open('agree_with_edit')}>
              Concordar com edição
            </DropdownMenuItem>
          )}

          {/* 3. Duplicar */}
          {showDuplicate && (
            <DropdownMenuItem asChild>
              <Link href={`/gorio/courses/course/${course.id}?duplicate=true`}>
                Duplicar curso
              </Link>
            </DropdownMenuItem>
          )}

          {/* 4. Secondary/destructive actions — separadas visualmente */}
          {(canEdit || hasPrimaryAction || showDuplicate) &&
            hasSecondaryAction && <DropdownMenuSeparator />}
          {showRequestChanges && (
            <DropdownMenuItem onSelect={() => open('request_changes')}>
              Enviar para edição
            </DropdownMenuItem>
          )}
          {showProposeEdit && (
            <DropdownMenuItem onSelect={() => open('propose_edit')}>
              Propor edição
            </DropdownMenuItem>
          )}
          {showProposeDeletion && (
            <DropdownMenuItem
              onSelect={() => open('propose_deletion')}
              className="text-destructive focus:text-destructive"
            >
              Propor exclusão
            </DropdownMenuItem>
          )}
          {showAgreeDeletion && (
            <DropdownMenuItem
              onSelect={() => open('agree_deletion')}
              className="text-destructive focus:text-destructive"
            >
              Concordar com exclusão
            </DropdownMenuItem>
          )}
          {showDeleteDraft && (
            <DropdownMenuItem
              onSelect={() => open('delete_draft')}
              className="text-destructive focus:text-destructive"
            >
              Excluir rascunho
            </DropdownMenuItem>
          )}

          {/* Fallback: cursos sem ação disponível (ex: finished/closed para editor) */}
          {!canEdit &&
            !hasPrimaryAction &&
            !showDuplicate &&
            !hasSecondaryAction && (
              <DropdownMenuItem asChild>
                <Link href={`/gorio/courses/course/${course.id}`}>
                  Visualizar
                </Link>
              </DropdownMenuItem>
            )}

          {/* Visualizar sempre acessível via clique na linha, mas também aqui quando há outras ações */}
          {isFinished && !canEdit && showDuplicate && (
            <DropdownMenuItem asChild>
              <Link href={`/gorio/courses/course/${course.id}`}>
                Visualizar
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeConfig && (
        <ConfirmDialog
          open={dialog.open}
          onOpenChange={open => setDialog(prev => ({ ...prev, open }))}
          title={activeConfig.title}
          description={activeConfig.description}
          confirmText={activeConfig.confirmText}
          variant={activeConfig.variant}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
