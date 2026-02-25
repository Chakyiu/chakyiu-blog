import { ReplySection } from '@/components/blog/reply-section'
import type { CommentView } from '@/types'

interface CommentCardProps {
  comment: CommentView
  postId: string
  isReply?: boolean
}

function CommentCard({ comment, postId, isReply = false }: CommentCardProps) {
  const date = new Date(comment.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const initial = (comment.author.name?.[0] ?? comment.author.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        {comment.author.image ? (
          <img
            src={comment.author.image}
            alt={comment.author.name ?? 'User'}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium">
            {comment.author.name ?? 'Anonymous'}
          </span>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>
        {comment.hidden ? (
          <p className="text-sm italic text-muted-foreground">[removed]</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: comment.renderedContent }}
          />
        )}
        {!isReply && (
          <ReplySection postId={postId} parentId={comment.id} />
        )}
      </div>
    </div>
  )
}

interface CommentListProps {
  comments: CommentView[]
  postId: string
}

export function CommentList({ comments, postId }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No comments yet. Be the first to share your thoughts!
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <div key={comment.id} id={`comment-${comment.id}`}>
          <CommentCard comment={comment} postId={postId} />
          {comment.replies && comment.replies.length > 0 && (
            <div className="border-l-2 border-muted ml-4 pl-2 mt-2 space-y-4">
              {comment.replies.map((reply) => (
                <CommentCard key={reply.id} comment={reply} postId={postId} isReply />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
