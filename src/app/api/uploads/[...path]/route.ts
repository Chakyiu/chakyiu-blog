import path from 'path'
import { UPLOADS_DIR } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params

  // Sanitize: prevent path traversal
  const relative = pathSegments.map((s) => path.basename(s)).join('/')
  const filePath = path.join(UPLOADS_DIR, relative)

  const file = Bun.file(filePath)
  const exists = await file.exists()

  if (!exists) {
    return new Response('Not Found', { status: 404 })
  }

  const buffer = await file.arrayBuffer()
  return new Response(buffer, {
    headers: {
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
