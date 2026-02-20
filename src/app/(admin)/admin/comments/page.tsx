import { getAdminComments } from '@/lib/actions/comments'
import { requireAdmin } from '@/lib/auth/helpers'
import { CommentsManager } from './comments-manager'

export default async function AdminCommentsPage() {
  await requireAdmin()

  const result = await getAdminComments()
  const comments = result.success ? result.data : []

  return <CommentsManager initialComments={comments} />
}
