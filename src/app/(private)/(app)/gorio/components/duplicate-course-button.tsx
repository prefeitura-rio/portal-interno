'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Course } from '@/types/course'
import { useDuplicateCourse } from '@/app/(private)/(app)/gorio/courses/hooks/use-duplicate-course'
import { Copy } from 'lucide-react'

interface DuplicateCourseButtonProps {
  course: Course
  disabled?: boolean
}

export function DuplicateCourseButton({
  course,
  disabled = false,
}: DuplicateCourseButtonProps) {
  const { isLoading, pending, openConfirm, closeConfirm, handleConfirm } =
    useDuplicateCourse()

  return (
    <>
      <Button
        variant="outline"
        onClick={() => openConfirm(course.id, course.title, course)}
        disabled={disabled || isLoading}
        className="w-full md:w-auto"
      >
        <Copy className="mr-2 h-4 w-4" />
        Duplicar Curso
      </Button>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={open => !open && closeConfirm()}
        title="Duplicar Curso"
        description={`Tem certeza que deseja duplicar o curso "${course.title}"? Uma cópia será criada como rascunho com o nome "${course.title} - Cópia".`}
        confirmText="Duplicar Curso"
        variant="default"
        onConfirm={handleConfirm}
      />
    </>
  )
}
