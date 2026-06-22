'use client'

import { transformApiCourseToCourse } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface PendingDuplicate {
  id: string
  title: string
  // When the full course object is already available (e.g. detail page), skip the GET
  courseData?: any
}

export function useDuplicateCourse(onSuccess?: () => void) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pending, setPending] = useState<PendingDuplicate | null>(null)

  function openConfirm(id: string, title: string, courseData?: any) {
    setPending({ id, title, courseData })
  }

  function closeConfirm() {
    setPending(null)
  }

  async function handleConfirm() {
    if (!pending) return
    const { id: courseId, courseData: preloadedCourse } = pending
    try {
      setIsLoading(true)

      let course: any
      if (preloadedCourse) {
        course = preloadedCourse
      } else {
        const fetchRes = await fetch(`/api/courses/${courseId}`)
        if (!fetchRes.ok) {
          const err = await fetchRes.json().catch(() => ({}))
          throw new Error(err.error || 'Erro ao buscar curso')
        }
        const json = await fetchRes.json()
        // Normalize to frontend Course shape (camelCase + snake_case fallbacks)
        // so the transformation below works identically regardless of source
        course = transformApiCourseToCourse(json.course)
      }

      const instituicaoId = Number(
        process.env.NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT ?? ''
      )

      const transformedLocations = course.locations
        ? course.locations.map((location: any) => ({
            address: location.address,
            neighborhood: location.neighborhood,
            schedules: location.schedules
              ? location.schedules.map((schedule: any) => ({
                  vacancies: schedule.vacancies,
                  class_start_date: schedule.classStartDate
                    ? new Date(schedule.classStartDate).toISOString()
                    : undefined,
                  class_end_date: schedule.classEndDate
                    ? new Date(schedule.classEndDate).toISOString()
                    : undefined,
                  class_time: schedule.classTime,
                  class_days: schedule.classDays,
                }))
              : [
                  {
                    vacancies: location.vacancies || 1,
                    class_start_date: location.classStartDate
                      ? new Date(location.classStartDate).toISOString()
                      : undefined,
                    class_end_date: location.classEndDate
                      ? new Date(location.classEndDate).toISOString()
                      : undefined,
                    class_time: location.classTime || '',
                    class_days: location.classDays || '',
                  },
                ],
          }))
        : []

      const transformedRemoteClass = course.remote_class
        ? (() => {
            if (
              (course.remote_class as any).schedules &&
              Array.isArray((course.remote_class as any).schedules)
            ) {
              return {
                schedules: (course.remote_class as any).schedules.map(
                  (schedule: any) => ({
                    vacancies: schedule.vacancies,
                    class_start_date:
                      schedule.class_start_date ||
                      (schedule.classStartDate
                        ? new Date(schedule.classStartDate).toISOString()
                        : undefined),
                    class_end_date:
                      schedule.class_end_date ||
                      (schedule.classEndDate
                        ? new Date(schedule.classEndDate).toISOString()
                        : undefined),
                    class_time: schedule.class_time || schedule.classTime || '',
                    class_days: schedule.class_days || schedule.classDays || '',
                  })
                ),
              }
            }
            return {
              schedules: [
                {
                  vacancies: (course.remote_class as any).vacancies,
                  class_start_date: (course.remote_class as any)
                    .class_start_date,
                  class_end_date: (course.remote_class as any).class_end_date,
                  class_time: (course.remote_class as any).class_time,
                  class_days: (course.remote_class as any).class_days,
                },
              ],
            }
          })()
        : undefined

      const transformedCustomFields = course.custom_fields
        ? course.custom_fields.map((field: any) => ({
            title: field.title,
            field_type: field.field_type,
            required: field.required,
            options: field.options,
            format_type: field.format_type,
          }))
        : []

      const draftData = {
        title: `${course.title} - Cópia`,
        description: course.description,
        categorias: course.categorias || [],
        enrollment_start_date:
          course.enrollment_start_date ||
          (course.enrollmentStartDate
            ? new Date(course.enrollmentStartDate).toISOString()
            : undefined),
        enrollment_end_date:
          course.enrollment_end_date ||
          (course.enrollmentEndDate
            ? new Date(course.enrollmentEndDate).toISOString()
            : undefined),
        orgao_id: course.orgao_id,
        instituicao_id: instituicaoId,
        modalidade: course.modalidade,
        theme: course.theme,
        workload: course.workload,
        target_audience: course.target_audience || course.targetAudience,
        institutional_logo:
          course.institutional_logo || course.institutionalLogo,
        cover_image: course.cover_image || course.coverImage,
        pre_requisitos: course.pre_requisitos || course.prerequisites,
        has_certificate: course.has_certificate || course.hasCertificate,
        is_external_partner: course.is_external_partner,
        external_partner_name: course.external_partner_name,
        external_partner_url: course.external_partner_url,
        external_partner_logo_url: course.external_partner_logo_url,
        external_partner_contact: course.external_partner_contact,
        facilitator: course.facilitator,
        objectives: course.objectives,
        expected_results: course.expectedResults || course.expected_results,
        program_content: course.programContent || course.program_content,
        methodology: course.methodology,
        resources_used: course.resources_used || course.resourcesUsed,
        material_used: course.material_used || course.materialUsed,
        teaching_material: course.teaching_material || course.teachingMaterial,
        custom_fields: transformedCustomFields,
        locations: transformedLocations,
        remote_class: transformedRemoteClass,
        turno: 'LIVRE',
        formato_aula:
          course.modalidade === 'ONLINE' ||
          course.modalidade === 'LIVRE_FORMACAO_ONLINE'
            ? 'GRAVADO'
            : 'PRESENCIAL',
        status: 'draft',
      }

      const draftRes = await fetch('/api/courses/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      })

      if (!draftRes.ok) {
        const err = await draftRes.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao criar rascunho')
      }

      toast.success('Curso duplicado com sucesso!')
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/gorio/courses?tab=draft')
        router.refresh()
      }
    } catch (error) {
      toast.error('Erro ao duplicar curso', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      })
    } finally {
      setIsLoading(false)
      setPending(null)
      // Defer cleanup so Radix finishes its dialog close animation before we reset
      setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 300)
    }
  }

  return {
    isLoading,
    pending,
    openConfirm,
    closeConfirm,
    handleConfirm,
  }
}
