import { getApiV1CoursesDrafts } from '@/http-gorio/courses/courses'
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

    // Build params object for the API - using correct parameter names based on GetApiV1CoursesDraftsParams
    const params: any = {}

    // Set defaults and convert parameters
    params.page = page ? Number.parseInt(page, 10) : 1
    params.limit = perPage ? Number.parseInt(perPage, 10) : 10

    // Add search parameter for filtering by title
    if (search?.trim()) {
      params.search = search.trim()
    }

    console.log('Drafts API call params:', params)

    // Call the external API using the existing client function
    const response = await getApiV1CoursesDrafts(params)

    if (response.status === 200) {
      console.log(
        'Drafts API Response structure:',
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
      } else if (responseData?.drafts) {
        courses = responseData.drafts
      } else if (responseData?.data?.drafts) {
        courses = responseData.data.drafts
      } else if (Array.isArray(responseData)) {
        courses = responseData
      }

      if (responseData?.pagination) {
        pagination = responseData.pagination
      } else if (responseData?.data?.pagination) {
        pagination = responseData.data.pagination
      }

      console.log('Extracted draft courses:', courses)
      console.log('Extracted pagination:', pagination)

      // Transform the API response to match our CourseListItem interface
      const transformedCourses = Array.isArray(courses)
        ? courses.map((course: any) => {
            try {
              return transformApiCourseToCourseListItem(course)
            } catch (error) {
              console.error('Error transforming draft course:', course, error)
              // Return a fallback course item
              return {
                id: course.id?.toString() || 'unknown',
                title: course.title || 'Sem título',
                provider: course.orgao?.nome || 'Não informado',
                duration: course.carga_horaria || 0,
                vacancies: course.numero_vagas || 0,
                status: course.status || 'draft',
                created_at: new Date(course.created_at || Date.now()),
                registration_start: course.enrollment_start_date
                  ? new Date(course.enrollment_start_date)
                  : null,
                registration_end: course.enrollment_end_date
                  ? new Date(course.enrollment_end_date)
                  : null,
                modalidade: course.modalidade || 'PRESENCIAL',
                organization: course.orgao?.nome || 'Não informado',
              } as CourseListItem
            }
          })
        : []

      return NextResponse.json({
        courses: transformedCourses,
        pagination: pagination,
        total: pagination?.total || 0,
        page: params.page,
        per_page: params.limit,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch draft courses' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching draft courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
