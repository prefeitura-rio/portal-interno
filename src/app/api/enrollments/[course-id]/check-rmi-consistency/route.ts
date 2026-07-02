import { getApiV1CoursesCourseIdEnrollments } from '@/http-gorio/inscricoes/inscricoes'
import type { ModelsInscricao } from '@/http-gorio/models'
import {
  type EnrollmentRmiDivergence,
  type SubmittedEnrollmentData,
  compareEnrollmentWithRmi,
} from '@/lib/enrollment-rmi-consistency'
import { type NextRequest, NextResponse } from 'next/server'

interface CheckRmiConsistencyBody {
  entries: SubmittedEnrollmentData[]
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'course-id': string }> }
) {
  try {
    const { 'course-id': courseId } = await params

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    const body = (await request.json()) as CheckRmiConsistencyBody
    const entries = body.entries

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is required' },
        { status: 400 }
      )
    }

    const courseIdNum = Number.parseInt(courseId, 10)
    const divergences: EnrollmentRmiDivergence[] = []
    const processedCpfs = new Set<string>()

    for (const entry of entries) {
      const cpf = normalizeCpf(entry.cpf || '')
      if (!cpf || cpf.length !== 11) continue
      if (processedCpfs.has(cpf)) continue
      processedCpfs.add(cpf)

      const response = await getApiV1CoursesCourseIdEnrollments(courseIdNum, {
        search: cpf,
        limit: 1,
        page: 1,
      })

      if (response.status !== 200) continue

      const apiData = response.data as {
        data?: { enrollments?: ModelsInscricao[] }
      }
      const enrollments = apiData.data?.enrollments || []
      const enrollment = enrollments.find(
        e => normalizeCpf((e.cpf as string) || '') === cpf
      )

      if (!enrollment?.id) continue

      const divergence = compareEnrollmentWithRmi(
        { ...entry, cpf },
        enrollment.personal_info,
        enrollment.id as string
      )

      if (divergence) {
        divergences.push(divergence)
      }
    }

    return NextResponse.json({ divergences })
  } catch (error) {
    console.error('Error checking RMI consistency:', error)
    return NextResponse.json(
      {
        error: 'Failed to check RMI consistency',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
