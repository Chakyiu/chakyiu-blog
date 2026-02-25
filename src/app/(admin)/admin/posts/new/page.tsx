import { requireAdmin } from '@/lib/auth/helpers'
import { getAllTags } from '@/lib/actions/tags'
import { PostForm } from '@/components/blog/post-form'

export default async function NewPostPage() {
  await requireAdmin()
  const tagsResult = await getAllTags()
  const tags = tagsResult.success ? tagsResult.data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Post</h1>
      </div>
      <PostForm tags={tags} />
    </div>
  )
}
