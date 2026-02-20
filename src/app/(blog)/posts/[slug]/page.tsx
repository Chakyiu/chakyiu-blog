import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPost } from '@/lib/actions/posts'
import { getComments } from '@/lib/actions/comments'
import { TagBadge } from '@/components/blog/tag-badge'
import { MarkdownContent } from '@/components/markdown-content'
import { CommentList } from '@/components/blog/comment-list'
import { CommentForm } from '@/components/blog/comment-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const result = await getPost(slug)
  if (!result.success || result.data.status !== 'published') return {}
  const post = result.data
  return {
    title: post.title,
    description: post.excerpt ?? post.content.slice(0, 160),
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getPost(slug)

  if (!result.success) {
    notFound()
  }

  const post = result.data

  if (post.status !== 'published') {
    notFound()
  }

  const commentsResult = await getComments(post.id)
  const comments = commentsResult.success ? commentsResult.data : []

  return (
    <article className="container max-w-4xl py-12 mx-auto px-4">
      <div className="mb-8">
        <Link 
          href="/" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
        >
          ← All Posts
        </Link>
      </div>

      {post.coverImageUrl && (
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="text-4xl font-bold tracking-tight mb-4">{post.title}</h1>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} asLink />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.image ?? undefined} alt={post.author.name ?? 'Author'} />
            <AvatarFallback>{(post.author.name?.[0] ?? post.author.email[0]).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-foreground">{post.author.name ?? 'Unknown Author'}</div>
            <div>
              {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      <MarkdownContent renderedHtml={post.renderedContent} />

      <Separator className="my-12" />

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">
          Comments ({post.commentCount})
        </h2>
        <div className="mb-8">
          <CommentForm postId={post.id} />
        </div>
        <CommentList comments={comments} postId={post.id} />
      </div>
    </article>
  )
}
