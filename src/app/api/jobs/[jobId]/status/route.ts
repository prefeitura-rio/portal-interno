import { getApiV1JobsJobIdStatus } from '@/http-gorio/jobs/jobs'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const response = await getApiV1JobsJobIdStatus(jobId)

    console.log('Job status response:', JSON.stringify(response.data, null, 2))

    if (response.status === 200) {
      return NextResponse.json(response.data, { status: 200 })
    }

    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
