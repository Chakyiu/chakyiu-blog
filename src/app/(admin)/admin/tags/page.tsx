import { getAllTags } from '@/lib/actions/tags'
import { requireAdmin } from '@/lib/auth/helpers'
import { TagsManager } from './tags-manager'

export default async function AdminTagsPage() {
  await requireAdmin()

  const result = await getAllTags()
  const tags = result.success ? result.data : []

  return <TagsManager initialTags={tags} />
}
