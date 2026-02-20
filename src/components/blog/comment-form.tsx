'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createComment, createReply } from '@/lib/actions/comments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_CHARS = 5000

interface CommentFormProps {
  postId: string
  parentId?: string
  onCancel?: () => void
}

export function CommentForm({ postId, parentId, onCancel }: CommentFormProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (status === 'loading') {
    return <div className="h-10 animate-pulse rounded bg-muted" />
  }

  if (!session?.user) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/auth/login" className="underline hover:text-foreground transition-colors">
          Sign in
        </Link>{' '}
        to leave a comment.
      </p>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setError(null)
    startTransition(async () => {
      const result = parentId
        ? await createReply({ postId, parentId, content })
        : await createComment({ postId, content })

      if (!result.success) {
        setError(result.error)
        return
      }

      setContent('')
      router.refresh()
      onCancel?.()
    })
  }

  const remaining = MAX_CHARS - content.length
  const isOverLimit = remaining < 0

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Write a reply… (Markdown supported)' : 'Write a comment… (Markdown supported)'}
        rows={4}
        disabled={isPending}
        className="resize-none text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {remaining} characters remaining
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !content.trim() || isOverLimit}
          >
            {isPending ? 'Posting…' : parentId ? 'Post Reply' : 'Post Comment'}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
