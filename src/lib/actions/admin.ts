'use server'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAdmin, requireAuth } from '@/lib/auth/helpers'
import type { ActionResult, UserView } from '@/types'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function getUsers(): Promise<ActionResult<UserView[]>> {
  await requireAdmin()

  try {
    const rows = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        image: schema.users.image,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))

    const users: UserView[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role,
      createdAt: row.createdAt ? row.createdAt.getTime() : 0,
    }))

    return { success: true, data: users }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch users' }
  }
}

export async function setUserRole(userId: string, role: 'admin' | 'user'): Promise<ActionResult> {
  const currentUser = await requireAuth()
  
  if (currentUser.role !== 'admin') {
     throw new Error('Unauthorized')
  }

  if (userId === currentUser.id) {
    return { success: false, error: 'Cannot change your own role' }
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })

    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    await db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.id, userId))

    await db.insert(schema.notifications).values({
      id: randomUUID(),
      userId: userId,
      type: 'role_changed',
      message: `Your role has been changed to ${role}`,
      referenceId: null,
      read: false,
      createdAt: new Date(),
    })

    revalidatePath('/admin/users')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update user role' }
  }
}
