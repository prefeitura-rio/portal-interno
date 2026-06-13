import { Storage } from '@google-cloud/storage'
import { isJwtExpired } from '@/lib/jwt-utils'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}


export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')

  if (!accessToken || isJwtExpired(accessToken.value)) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const bucketName = process.env.GCS_BUCKET_NAME
  const clientEmail = process.env.GCS_CLIENT_EMAIL
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!bucketName || !clientEmail || !privateKey) {
    console.error('GCS credentials not configured')
    return NextResponse.json(
      { error: 'Serviço de upload não configurado' },
      { status: 503 }
    )
  }

  let body: { contentType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { contentType } = body

  if (!contentType || !ALLOWED_CONTENT_TYPES[contentType]) {
    return NextResponse.json(
      {
        error: `Tipo de arquivo não permitido. Use: ${Object.keys(ALLOWED_CONTENT_TYPES).join(', ')}`,
      },
      { status: 400 }
    )
  }

  const ext = ALLOWED_CONTENT_TYPES[contentType]
  const uuid = crypto.randomUUID()
  const objectPath = `superapp/images/courses/${uuid}.${ext}`

  const storage = new Storage({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  })

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`

  try {
    // x-goog-acl: public-read makes the uploaded object individually public
    // without making the bucket itself public (requires fine-grained ACL on the bucket)
    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType,
        extensionHeaders: {
          'x-goog-acl': 'public-read',
        },
      })

    return NextResponse.json({ signedUrl, publicUrl })
  } catch (err) {
    console.error('GCS getSignedUrl failed:', err)
    return NextResponse.json(
      { error: 'Não foi possível gerar o link de upload' },
      { status: 502 }
    )
  }
}
