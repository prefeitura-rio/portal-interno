import type {
  Enrollment,
  EnrollmentFilters,
  EnrollmentResponse,
  EnrollmentStatus,
  EnrollmentSummary,
} from '@/types/course'
import { useCallback, useEffect, useState } from 'react'

interface UseEnrollmentsOptions {
  courseId: string
  page?: number
  perPage?: number
  filters?: EnrollmentFilters
  autoFetch?: boolean
}

interface UseEnrollmentsReturn {
  enrollments: Enrollment[]
  summary: EnrollmentSummary | null
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateEnrollmentStatus: (
    enrollmentId: string,
    status: EnrollmentStatus,
    notes?: string
  ) => Promise<Enrollment | null>
  updateMultipleEnrollmentStatuses: (
    enrollmentIds: string[],
    status: EnrollmentStatus,
    notes?: string
  ) => Promise<boolean>
  updateEnrollmentCertificate: (
    enrollmentId: string,
    certificateUrl: string
  ) => Promise<Enrollment | null>
}

export function useEnrollments({
  courseId,
  page = 1,
  perPage = 10,
  filters,
  autoFetch = true,
}: UseEnrollmentsOptions): UseEnrollmentsReturn {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    perPage: number
    total: number
    totalPages: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEnrollments = useCallback(async () => {
    if (!courseId) return

    setLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
      })

      if (filters?.status && filters.status.length > 0) {
        // Since we now expect only one status, take the first one
        params.append('status', filters.status[0])
      }

      if (filters?.search) {
        params.append('search', filters.search)
      }

      if (filters?.dateRange) {
        params.append('dateStart', filters.dateRange.start.toISOString())
        params.append('dateEnd', filters.dateRange.end.toISOString())
      }

      if (filters?.ageRange) {
        params.append('ageMin', filters.ageRange.min.toString())
        params.append('ageMax', filters.ageRange.max.toString())
      }

      const response = await fetch(
        `/api/enrollments/${courseId}?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch enrollments: ${response.statusText}`)
      }

      const data: EnrollmentResponse = await response.json()

      setEnrollments(data.enrollments)
      setSummary(data.summary)
      setPagination(data.pagination)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch enrollments'
      )
      console.error('Error fetching enrollments:', err)
    } finally {
      setLoading(false)
    }
  }, [courseId, page, perPage, filters])

  const updateEnrollmentStatus = useCallback(
    async (
      enrollmentId: string,
      status: EnrollmentStatus,
      notes?: string
    ): Promise<Enrollment | null> => {
      try {
        const response = await fetch(
          `/api/enrollments/${courseId}?enrollmentId=${enrollmentId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status, notes }),
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to update enrollment: ${response.statusText}`)
        }

        const updatedEnrollment: Enrollment = await response.json()

        // Update local state
        setEnrollments(prev =>
          prev.map(enrollment =>
            enrollment.id === enrollmentId ? updatedEnrollment : enrollment
          )
        )

        // Refetch to update summary
        await fetchEnrollments()

        return updatedEnrollment
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update enrollment'
        )
        console.error('Error updating enrollment:', err)
        return null
      }
    },
    [courseId, fetchEnrollments]
  )

  const updateMultipleEnrollmentStatuses = useCallback(
    async (
      enrollmentIds: string[],
      status: EnrollmentStatus,
      notes?: string
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/enrollments/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enrollmentIds, status, notes }),
        })

        if (!response.ok) {
          throw new Error(
            `Failed to update enrollments: ${response.statusText}`
          )
        }

        // Refetch to update local state and summary
        await fetchEnrollments()

        return true
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update enrollments'
        )
        console.error('Error updating enrollments:', err)
        return false
      }
    },
    [courseId, fetchEnrollments]
  )

  const updateEnrollmentCertificate = useCallback(
    async (
      enrollmentId: string,
      certificateUrl: string
    ): Promise<Enrollment | null> => {
      try {
        const response = await fetch(
          `/api/enrollments/${courseId}/certificate?enrollmentId=${enrollmentId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ certificate_url: certificateUrl }),
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to update certificate: ${response.statusText}`)
        }

        const updatedEnrollment: Enrollment = await response.json()

        // Update local state
        setEnrollments(prev =>
          prev.map(enrollment =>
            enrollment.id === enrollmentId ? updatedEnrollment : enrollment
          )
        )

        return updatedEnrollment
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update certificate'
        )
        console.error('Error updating certificate:', err)
        return null
      }
    },
    [courseId]
  )

  useEffect(() => {
    if (autoFetch) {
      fetchEnrollments()
    }
  }, [fetchEnrollments, autoFetch])

  return {
    enrollments,
    summary,
    pagination,
    loading,
    error,
    refetch: fetchEnrollments,
    updateEnrollmentStatus,
    updateMultipleEnrollmentStatuses,
    updateEnrollmentCertificate,
  }
}
