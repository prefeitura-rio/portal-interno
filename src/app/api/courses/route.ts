import { getApiV1Courses } from '@/http-gorio/courses/courses'
import { transformApiCourseToCourseListItem } from '@/lib/api-transformers'
import type { CourseListItem } from '@/types/course'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const page = searchParams.get('page')
    const perPage = searchParams.get('per_page')
    const search = searchParams.get('search')

    // Build params object for the API - using correct parameter names based on GetApiV1CoursesParams
    const params: any = {}

    // Set defaults and convert parameters
    params.page = page ? Number.parseInt(page, 10) : 1
    params.limit = perPage ? Number.parseInt(perPage, 10) : 10

    // Add search parameter for filtering by title
    if (search?.trim()) {
      params.search = search.trim()
    }

    console.log('API call params:', params)

    // Call the external API using the existing client function
    const response = await getApiV1Courses(params)

    if (response.status === 200) {
      console.log(
        'API Response structure:',
        JSON.stringify(response.data, null, 2)
      )

      // Handle different possible response structures
      let courses: any[] = []
      let pagination: any = null

      const responseData = response.data as any

      if (responseData?.courses) {
        courses = responseData.courses
      } else if (responseData?.data?.courses) {
        courses = responseData.data.courses
      } else if (Array.isArray(responseData)) {
        courses = responseData
      }

      if (responseData?.pagination) {
        pagination = responseData.pagination
      } else if (responseData?.data?.pagination) {
        pagination = responseData.data.pagination
      }

      // Filter out courses that belong to other tabs (drafts and curadoria
      // review queue). The "Cursos Criados" tab must not show in_review/draft/
      // needs_changes courses — those have their own dedicated tabs/endpoints.
      const excludedStatuses = new Set(['in_review', 'draft', 'needs_changes'])
      const filteredApiCourses = Array.isArray(courses)
        ? courses.filter((course: any) => !excludedStatuses.has(course?.status))
        : []
      const removedCount = Array.isArray(courses)
        ? courses.length - filteredApiCourses.length
        : 0

      // Transform the API response to match our CourseListItem interface
      const transformedCourses = filteredApiCourses.map((course: any) => {
        try {
          return transformApiCourseToCourseListItem(course)
        } catch (error) {
          console.error('Error transforming course:', course, error)
          // Return a fallback course item
          return {
            id: course.id?.toString() || 'unknown',
            title: course.title || 'Sem título',
            duration: course.carga_horaria || 0,
            vacancies: course.numero_vagas || 0,
            status: course.status || 'draft',
            originalStatus: course.status || 'draft',
            created_at: new Date(course.created_at || Date.now()),
            registration_start: course.enrollment_start_date
              ? new Date(course.enrollment_start_date)
              : null,
            registration_end: course.enrollment_end_date
              ? new Date(course.enrollment_end_date)
              : null,
            modalidade: course.modalidade || 'PRESENCIAL',
            orgao_id: course.orgao_id || null,
            is_external_partner: course.is_external_partner,
            course_management_type: course.course_management_type,
            external_partner_name: course.external_partner_name,
          } as CourseListItem
        }
      })

      // Adjust pagination total to account for items filtered out on this page.
      // Note: ideally the backend would filter by status server-side; until
      // then this keeps the displayed count consistent with the visible rows.
      const adjustedTotal = Math.max(
        (pagination?.total || 0) - removedCount,
        transformedCourses.length
      )
      const adjustedPagination = pagination
        ? { ...pagination, total: adjustedTotal }
        : null

      return NextResponse.json({
        courses: transformedCourses,
        pagination: adjustedPagination,
        total: adjustedTotal,
        page: params.page,
        per_page: params.limit,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
