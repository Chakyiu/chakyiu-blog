import { requireAuth } from '@/lib/auth/helpers'
import { getNotifications } from '@/lib/actions/notifications'
import { MarkReadButton, MarkAllReadButton, NotificationLink } from './mark-read-buttons'
import { Bell, MessageSquareReply, EyeOff, Trash2, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { NotificationView } from '@/types'

function formatRelativeDate(ms: number): string {
  const diff = Date.now() - ms
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  return 'just now'
}

function NotificationIcon({ type }: { type: NotificationView['type'] }) {
  switch (type) {
    case 'reply':
      return <MessageSquareReply className="h-4 w-4 text-blue-500" />
    case 'comment_hidden':
      return <EyeOff className="h-4 w-4 text-yellow-500" />
    case 'comment_deleted':
      return <Trash2 className="h-4 w-4 text-red-500" />
    case 'role_changed':
      return <UserCog className="h-4 w-4 text-purple-500" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

function NotificationTypeLabel({ type }: { type: NotificationView['type'] }) {
  switch (type) {
    case 'reply':
      return 'Reply'
    case 'comment_hidden':
      return 'Comment Hidden'
    case 'comment_deleted':
      return 'Comment Deleted'
    case 'role_changed':
      return 'Role Changed'
    default:
      return 'Notification'
  }
}

export default async function NotificationsPage() {
  await requireAuth()

  const result = await getNotifications()

  if (!result.success) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <p className="text-destructive">Failed to load notifications: {result.error}</p>
      </div>
    )
  }

  const notifications = result.data
  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const replyHref =
              notification.type === 'reply' &&
              notification.referenceId?.includes('#')
                ? `/posts/${notification.referenceId}`
                : null

            const inner = (
              <>
                <div className="mt-0.5 shrink-0">
                  <NotificationIcon type={notification.type} />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <NotificationTypeLabel type={notification.type} />
                    </span>
                    {!notification.read && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeDate(notification.createdAt)}</p>
                </div>

                {!notification.read && !replyHref && (
                  <div className="shrink-0">
                    <MarkReadButton id={notification.id} />
                  </div>
                )}
              </>
            )

            return (
              <li
                key={notification.id}
                className={`rounded-lg border transition-colors ${
                  notification.read
                    ? 'bg-background border-border opacity-70'
                    : 'bg-muted/40 border-border'
                } ${replyHref ? 'hover:bg-muted/60' : ''}`}
              >
                {replyHref ? (
                  <NotificationLink
                    id={notification.id}
                    href={replyHref}
                    className="flex items-start gap-4 w-full p-4 text-left"
                  >
                    {inner}
                  </NotificationLink>
                ) : (
                  <div className="flex items-start gap-4 w-full p-4">
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
