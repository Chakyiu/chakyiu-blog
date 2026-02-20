'use server'

import 'server-only'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'
import type { ActionResult, NotificationView } from '@/types'

// ── getNotifications ──────────────────────────────────────────────────────────

export async function getNotifications(): Promise<ActionResult<NotificationView[]>> {
  const user = await requireAuth()

  try {
    const rows = await db
      .select({
        id: schema.notifications.id,
        type: schema.notifications.type,
        message: schema.notifications.message,
        referenceId: schema.notifications.referenceId,
        read: schema.notifications.read,
        createdAt: schema.notifications.createdAt,
      })
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, user.id))
      .orderBy(desc(schema.notifications.createdAt))

    const views: NotificationView[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      referenceId: row.referenceId,
      read: row.read,
      createdAt: row.createdAt ? row.createdAt.getTime() : 0,
    }))

    return { success: true, data: views }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch notifications' }
  }
}

// ── getUnreadCount ────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<ActionResult<number>> {
  const user = await requireAuth()

  try {
    const rows = await db
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, user.id),
          eq(schema.notifications.read, false)
        )
      )

    return { success: true, data: rows.length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch unread count' }
  }
}

// ── markRead ──────────────────────────────────────────────────────────────────

export async function markRead(id: string): Promise<ActionResult<void>> {
  const user = await requireAuth()

  try {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, user.id)
        )
      )

    revalidatePath('/notifications')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to mark notification as read' }
  }
}

// ── markAllRead ───────────────────────────────────────────────────────────────

export async function markAllRead(): Promise<ActionResult<void>> {
  const user = await requireAuth()

  try {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.userId, user.id),
          eq(schema.notifications.read, false)
        )
      )

    revalidatePath('/notifications')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to mark all notifications as read' }
  }
}
