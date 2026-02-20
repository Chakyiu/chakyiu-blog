import { requireAuth } from '@/lib/auth/helpers'
import { getUserComments } from '@/lib/actions/user'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'My Comment History',
}

export default async function HistoryPage() {
  await requireAuth()
  const result = await getUserComments()

  if (!result.success) {
    throw new Error(result.error)
  }

  const comments = result.data

  return (
    <div className="container max-w-4xl py-12 mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Comment History</h1>
        <p className="text-muted-foreground">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground mb-4">You haven&apos;t posted any comments yet.</p>
          <Link href="/" className="text-primary hover:underline">
            Browse posts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      On
                    </span>
                    {comment.postSlug ? (
                      <Link 
                        href={`/posts/${comment.postSlug}`}
                        className="font-medium text-sm hover:text-primary truncate transition-colors"
                      >
                        {comment.postTitle ?? 'Untitled Post'}
                      </Link>
                    ) : (
                      <span className="font-medium text-sm text-muted-foreground">
                        Deleted Post
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {comment.parentId && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        Reply
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                   {comment.hidden ? (
                     <span className="italic text-muted-foreground/50 text-xs">
                       (hidden by moderator)
                     </span>
                   ) : (
                    <p className="line-clamp-3">
                      {comment.content.slice(0, 200)}
                      {comment.content.length > 200 && '...'}
                    </p>
                   )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
