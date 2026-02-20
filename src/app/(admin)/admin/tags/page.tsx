import { getTags } from '@/lib/actions/tags'
import { requireAdmin } from '@/lib/auth/helpers'
import { TagsManager } from './tags-manager'

export default async function AdminTagsPage() {
  await requireAdmin()

  const result = await getTags()
  const tags = result.success ? result.data : []

  return <TagsManager initialTags={tags} />
}
