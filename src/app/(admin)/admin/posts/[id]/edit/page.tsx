import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/helpers'
import { getPostById } from '@/lib/actions/posts'
import { getTags } from '@/lib/actions/tags'
import { PostForm } from '@/components/blog/post-form'

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  await requireAdmin()
  const { id } = await params

  const [postResult, tagsResult] = await Promise.all([
    getPostById(id),
    getTags(),
  ])

  if (!postResult.success) {
    notFound()
  }

  const tags = tagsResult.success ? tagsResult.data : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
      </div>
      <PostForm tags={tags} initialData={postResult.data} />
    </div>
  )
}
