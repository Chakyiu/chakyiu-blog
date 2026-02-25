'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { markRead, markAllRead } from '@/lib/actions/notifications'

export function MarkReadButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markRead(id)
          router.refresh()
        })
      }}
    >
      Mark as read
    </Button>
  )
}

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markAllRead()
          router.refresh()
        })
      }}
    >
      Mark all as read
    </Button>
  )
}

export function NotificationLink({
  id,
  href,
  children,
  className,
}: {
  id: string
  href: string
  children: React.ReactNode
  className?: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      className={className}
      onClick={() => {
        startTransition(async () => {
          await markRead(id)
          window.location.href = href
        })
      }}
    >
      {children}
    </button>
  )
}
