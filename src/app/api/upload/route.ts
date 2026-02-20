import path from 'path'
import { mkdirSync } from 'fs'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { UPLOADS_DIR, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'

export const runtime = 'nodejs'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if ((session.user as { role: string }).role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  const mimeType = file.type
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return Response.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const ext = MIME_TO_EXT[mimeType]
  const filename = `${crypto.randomUUID()}.${ext}`

  mkdirSync(UPLOADS_DIR, { recursive: true })
  await Bun.write(path.join(UPLOADS_DIR, filename), await file.arrayBuffer())

  await db.insert(schema.images).values({
    id: crypto.randomUUID(),
    filename,
    originalName: file.name,
    mimeType,
    size: file.size,
    uploadedBy: session.user.id,
    postId: null,
    createdAt: new Date(),
  })

  return Response.json({ url: `/api/uploads/${filename}` }, { status: 200 })
}
