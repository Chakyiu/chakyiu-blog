'use server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import type { ActionResult } from '@/types'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  return null
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<ActionResult<{ id: string; role: string }>> {
  if (!validateEmail(email)) {
    return { success: false, error: 'Invalid email format' }
  }
  const pwError = validatePassword(password)
  if (pwError) return { success: false, error: pwError }

  const passwordHash = await Bun.password.hash(password)
  const id = crypto.randomUUID()

  const result = db.transaction((tx) => {
    const existing = tx.select({ id: users.id }).from(users).where(eq(users.email, email)).get()
    if (existing) return { success: false as const, error: 'Email already registered' }

    const count = tx.select({ count: sql<number>`count(*)` }).from(users).get()
    const role: 'admin' | 'user' = (count?.count ?? 0) === 0 ? 'admin' : 'user'

    tx.insert(users).values({ id, name, email, passwordHash, role }).run()
    return { success: true as const, data: { id, role } }
  })

  return result as ActionResult<{ id: string; role: string }>
}
