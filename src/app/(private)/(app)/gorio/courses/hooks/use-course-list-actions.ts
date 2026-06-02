'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { validateCourseForSubmission } from '../lib/validate-course-for-submission'

export function useCourseListActions(onSuccess: () => void) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function runAction(
    fn: () => Promise<Response>,
    successMessage: string
  ) {
    try {
      setIsLoading(true)
      const res = await fn()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro inesperado')
      }
      toast.success(successMessage)
      onSuccess()
    } catch (err) {
      toast.error('Erro ao executar ação', {
        description: err instanceof Error ? err.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetches the full course and runs Zod validation before any state-advancing action.
  // Returns true if valid, false (and shows toast) if not.
  async function validateBeforeAction(courseId: string): Promise<boolean> {
    const res = await fetch(`/api/courses/${courseId}`)
    if (!res.ok) {
      toast.error('Não foi possível verificar os dados do curso.')
      return false
    }
    const apiCourse = await res.json()
    const errors = validateCourseForSubmission(apiCourse)
    if (errors.length === 0) return true

    // Build a compact list of failing fields for the description
    const uniqueMessages = [...new Set(errors.map(e => e.message))].slice(0, 3)
    const description =
      uniqueMessages.join(' • ') +
      (errors.length > 3 ? ` (+${errors.length - 3} outros campos)` : '')

    toast.error('O curso está incompleto.', {
      description,
      action: {
        label: 'Editar agora',
        onClick: () =>
          router.push(`/gorio/courses/course/${courseId}?edit=true`),
      },
    })
    return false
  }

  async function sendToReview(courseId: string) {
    setIsLoading(true)
    try {
      const valid = await validateBeforeAction(courseId)
      if (!valid) return
      await runAction(
        () =>
          fetch(`/api/courses/${courseId}/send-to-review`, { method: 'PUT' }),
        'Curso enviado para aprovação com sucesso!'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function publishDirectly(courseId: string) {
    setIsLoading(true)
    try {
      const valid = await validateBeforeAction(courseId)
      if (!valid) return
      await runAction(
        () =>
          fetch(`/api/courses/${courseId}/publish-directly`, { method: 'PUT' }),
        'Curso publicado com sucesso!'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function approveAndPublish(courseId: string) {
    setIsLoading(true)
    try {
      const valid = await validateBeforeAction(courseId)
      if (!valid) return
      await runAction(
        () => fetch(`/api/courses/${courseId}/approve`, { method: 'PUT' }),
        'Curso aprovado e publicado com sucesso!'
      )
    } finally {
      setIsLoading(false)
    }
  }

  function requestChanges(courseId: string) {
    return runAction(
      () =>
        fetch(`/api/courses/${courseId}/request-changes`, { method: 'PUT' }),
      'Curso enviado para edição com sucesso!'
    )
  }

  async function agreeWithEdit(courseId: string) {
    setIsLoading(true)
    try {
      const valid = await validateBeforeAction(courseId)
      if (!valid) return
      const r1 = await fetch(`/api/courses/${courseId}/send-to-review`, {
        method: 'PUT',
      })
      if (!r1.ok) {
        const data = await r1.json().catch(() => ({}))
        throw new Error(data.error || 'Erro inesperado')
      }
      const r2 = await fetch(`/api/courses/${courseId}/approve`, {
        method: 'PUT',
      })
      if (!r2.ok) {
        const data = await r2.json().catch(() => ({}))
        throw new Error(data.error || 'Erro inesperado')
      }
      toast.success('Edição aprovada e curso publicado com sucesso!')
      onSuccess()
    } catch (err) {
      toast.error('Erro ao aprovar edição', {
        description: err instanceof Error ? err.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function requestDeletion(courseId: string) {
    return runAction(
      () =>
        fetch(`/api/courses/${courseId}/request-deletion`, { method: 'PUT' }),
      'Proposta de exclusão enviada com sucesso!'
    )
  }

  function confirmDeletion(courseId: string) {
    return runAction(
      () => fetch(`/api/courses/${courseId}`, { method: 'DELETE' }),
      'Curso excluído com sucesso!'
    )
  }

  function deleteDraft(courseId: string) {
    return runAction(
      () => fetch(`/api/courses/${courseId}`, { method: 'DELETE' }),
      'Rascunho excluído com sucesso!'
    )
  }

  return {
    sendToReview,
    publishDirectly,
    approveAndPublish,
    requestChanges,
    agreeWithEdit,
    requestDeletion,
    confirmDeletion,
    deleteDraft,
    isLoading,
  }
}
