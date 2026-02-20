'use client'

import { useState } from 'react'
import { CommentForm } from '@/components/blog/comment-form'
import { Button } from '@/components/ui/button'

interface ReplySectionProps {
  postId: string
  parentId: string
}

export function ReplySection({ postId, parentId }: ReplySectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      {!open ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-7 px-2"
          onClick={() => setOpen(true)}
        >
          Reply
        </Button>
      ) : (
        <div className="mt-3">
          <CommentForm
            postId={postId}
            parentId={parentId}
            onCancel={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
