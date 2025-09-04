import { getApiV1Orgaos } from '@/http/orgaos/orgaos'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Call the external API using the existing client function
    const response = await getApiV1Orgaos()

    if (response.status === 200) {
      console.log(
        'API Response structure:',
        JSON.stringify(response.data, null, 2)
      )

      // Handle different possible response structures
      let orgaos: any[] = []
      let meta: any = null

      const responseData = response.data as any

      if (responseData?.data) {
        orgaos = responseData.data
        meta = responseData.meta
      } else if (Array.isArray(responseData)) {
        orgaos = responseData
      }

      console.log('Extracted orgaos:', orgaos)
      console.log('Extracted meta:', meta)

      return NextResponse.json({
        data: orgaos,
        meta: meta,
        success: true,
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch orgaos' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error fetching orgaos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
