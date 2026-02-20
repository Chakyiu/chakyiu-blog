import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { SessionUser } from '@/types'

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user as SessionUser
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== 'admin') redirect('/')
  return user
}
