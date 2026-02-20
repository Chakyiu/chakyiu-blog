import Link from 'next/link'
import type { PostView } from '@/types'
import { TagBadge } from '@/components/blog/tag-badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarIcon } from 'lucide-react'

interface PostCardProps {
  post: PostView
}

export function PostCard({ post }: PostCardProps) {
  const excerpt = post.excerpt || post.content.slice(0, 160) + (post.content.length > 160 ? '...' : '')
  const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {post.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} asLink />
          ))}
        </div>
        <CardTitle className="text-2xl leading-tight">
          <Link href={`/posts/${post.slug}`} className="hover:text-primary transition-colors">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground line-clamp-3">{excerpt}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground mt-auto pt-6 border-t">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.author.image ?? undefined} alt={post.author.name ?? 'Author'} />
            <AvatarFallback>{post.author.name?.[0] ?? 'A'}</AvatarFallback>
          </Avatar>
          <span>{post.author.name || post.author.email}</span>
        </div>
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          <time dateTime={new Date(post.createdAt).toISOString()}>{formattedDate}</time>
        </div>
      </CardFooter>
    </Card>
  )
}
