'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getUnreadCount } from '@/lib/actions/notifications'
import type { SessionUser } from '@/types'

export function NotificationBell({ user }: { user: SessionUser | null }) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    getUnreadCount().then((result) => {
      if (result.success) {
        setUnreadCount(result.data)
      }
    })
  }, [user])

  if (!user) return null

  if (unreadCount === 0) {
    return (
      <Button variant="ghost" size="icon" className="relative hidden md:flex" aria-label="Notifications" asChild>
        <Link href="/notifications">
          <Bell className="h-4 w-4" />
        </Link>
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" className="relative hidden md:flex" aria-label={`${unreadCount} unread notifications`} asChild>
      <Link href="/notifications">
        <Bell className="h-4 w-4" />
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      </Link>
    </Button>
  )
}
