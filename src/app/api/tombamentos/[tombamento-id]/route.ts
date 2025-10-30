import { deleteApiV1AdminTombamentosId } from '@/http-busca-search/tombamentos/tombamentos'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ 'tombamento-id': string }> }
) {
  try {
    const { 'tombamento-id': tombamentoId } = await params

    if (!tombamentoId) {
      return NextResponse.json(
        { error: 'Tombamento ID is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ Deleting tombamento:', tombamentoId)

    // Call the external API to delete the tombamento
    const response = await deleteApiV1AdminTombamentosId(tombamentoId)

    if (response.status === 204) {
      console.log('Tombamento deleted successfully')

      // Revalidate cache tags for services and tombamentos
      revalidateTag('services')
      revalidateTag('tombamentos')

      return NextResponse.json({
        success: true,
        message: 'Tombamento deleted successfully',
      })
    }

    return NextResponse.json(
      { error: 'Failed to delete tombamento' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error deleting tombamento:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete tombamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
