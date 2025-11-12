'use client'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Course } from '@/types/course'
import { Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface DuplicateCourseButtonProps {
  course: Course
  disabled?: boolean
}

export function DuplicateCourseButton({
  course,
  disabled = false,
}: DuplicateCourseButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(false)

  const handleDuplicateCourse = async () => {
    try {
      setIsLoading(true)

      // Prepare course data for duplication
      const instituicaoId = Number(
        process.env.NEXT_PUBLIC_INSTITUICAO_ID_DEFAULT ?? ''
      )

      // Transform locations to API format with schedules (turmas)
      const transformedLocations = course.locations
        ? course.locations.map(location => ({
            address: location.address,
            neighborhood: location.neighborhood,
            schedules: location.schedules
              ? location.schedules.map(schedule => ({
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
              : // Fallback for old format without schedules
                [
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

      // Transform remote class to API format
      const transformedRemoteClass = course.remote_class
        ? {
            vacancies: course.remote_class.vacancies,
            class_start_date: course.remote_class.class_start_date,
            class_end_date: course.remote_class.class_end_date,
            class_time: course.remote_class.class_time,
            class_days: course.remote_class.class_days,
          }
        : undefined

      // Transform custom fields to API format (remove IDs for new course)
      const transformedCustomFields = course.custom_fields
        ? course.custom_fields.map(field => ({
            title: field.title,
            field_type: field.field_type,
            required: field.required,
            options: field.options,
          }))
        : []

      // Build the draft data
      const draftData = {
        title: `${course.title} - Cópia`,
        description: course.description,
        categorias: course.categorias || [],
        enrollment_start_date:
          (course as any).enrollment_start_date ||
          (course.enrollmentStartDate
            ? new Date(course.enrollmentStartDate).toISOString()
            : undefined),
        enrollment_end_date:
          (course as any).enrollment_end_date ||
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
        // External partner fields
        is_external_partner: course.is_external_partner,
        external_partner_name: course.external_partner_name,
        external_partner_url: course.external_partner_url,
        external_partner_logo_url: course.external_partner_logo_url,
        external_partner_contact: course.external_partner_contact,
        facilitator: course.facilitator,
        objectives: course.objectives,
        expected_results: course.expectedResults,
        program_content: course.programContent,
        methodology: course.methodology,
        resources_used: course.resources_used || course.resourcesUsed,
        material_used: course.material_used || course.materialUsed,
        teaching_material: course.teaching_material || course.teachingMaterial,
        custom_fields: transformedCustomFields,
        locations: transformedLocations,
        remote_class: transformedRemoteClass,
        turno: 'LIVRE',
        formato_aula: course.modalidade === 'ONLINE' ? 'GRAVADO' : 'PRESENCIAL',
        status: 'draft',
      }

      // Call the draft API endpoint
      const response = await fetch('/api/courses/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to duplicate course')
      }

      const _result = await response.json()

      toast.success('Curso duplicado com sucesso!')

      // Fallback to courses list with draft tab
      router.push('/gorio/courses?tab=draft')
      router.refresh()
    } catch (error) {
      console.error('Error duplicating course:', error)
      toast.error('Erro ao duplicar curso', {
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
        Duplicar Curso
      </Button>

      <ConfirmDialog
        open={confirmDialog}
        onOpenChange={setConfirmDialog}
        title="Duplicar Curso"
        description={`Tem certeza que deseja duplicar o curso "${course.title}"? Uma cópia será criada como rascunho com o nome "${course.title} - Cópia".`}
        confirmText="Duplicar Curso"
        variant="default"
        onConfirm={handleDuplicateCourse}
      />
    </>
  )
}
