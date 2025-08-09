import type { Course } from '@/types/course'
import { convertDatesToObjects } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface UseCourseReturn {
  course: Course | null
  loading: boolean
  error: string | null
}

export function useCourse(courseId: string | null): UseCourseReturn {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) {
      setLoading(true)
      setError(null)
      return
    }

    const fetchCourse = async () => {
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
        // Convert string dates back to Date objects
        const courseWithDates = convertDatesToObjects(data)
        setCourse(courseWithDates)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setCourse(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

  return { course, loading, error }
}
