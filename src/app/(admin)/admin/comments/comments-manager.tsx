'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { hideComment, unhideComment, deleteComment } from '@/lib/actions/comments'
import type { AdminCommentView } from '@/lib/actions/comments'
import Link from 'next/link'

interface CommentsManagerProps {
  initialComments: AdminCommentView[]
}

export function CommentsManager({ initialComments }: CommentsManagerProps) {
  const [comments, setComments] = useState<AdminCommentView[]>(initialComments)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleHide(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await hideComment(id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hidden: true } : c))
      )
    })
  }

  function handleUnhide(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await unhideComment(id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, hidden: false } : c))
      )
    })
  }

  function handleDelete(id: string, preview: string) {
    if (!confirm(`Delete comment "${preview}"? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteComment(id)
      if (!result.success) {
        setError(result.error)
        return
      }
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id))
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {comments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No comments yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Author</th>
                <th className="text-left px-4 py-3 font-medium">Comment</th>
                <th className="text-left px-4 py-3 font-medium">Post</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => {
                const preview = comment.content.slice(0, 100) + (comment.content.length > 100 ? '…' : '')
                const date = new Date(comment.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
                return (
                  <tr key={comment.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium">{comment.author.name ?? comment.author.email}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className={comment.hidden ? 'line-through text-muted-foreground italic' : ''}>
                        {preview}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {comment.postSlug ? (
                        <Link
                          href={`/posts/${comment.postSlug}`}
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          {comment.postTitle ?? comment.postSlug}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {comment.hidden ? (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                          Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
                          Visible
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {comment.hidden ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnhide(comment.id)}
                            disabled={isPending}
                          >
                            Unhide
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHide(comment.id)}
                            disabled={isPending}
                          >
                            Hide
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(comment.id, preview)}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
