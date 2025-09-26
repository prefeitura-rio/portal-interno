import type { ModelsCurso } from '@/http-gorio/models'
import { transformApiCourseToCourse } from '@/lib/utils'
import type { Course } from '@/types/course'
import { useCallback, useEffect, useState } from 'react'

interface UseCourseReturn {
  course: Course | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCourse(courseId: string | null): UseCourseReturn {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setLoading(true)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/courses/${courseId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Course not found')
        }
        throw new Error('Failed to fetch course')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch course')
      }

      // Extract the course from the response structure
      const courseData = data.course

      // Transform API course data to frontend Course type (this already handles date conversion)
      const transformedCourse = transformApiCourseToCourse(courseData)
      setCourse(transformedCourse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCourse(null)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchCourse()
  }, [fetchCourse])

  return { course, loading, error, refetch: fetchCourse }
}
