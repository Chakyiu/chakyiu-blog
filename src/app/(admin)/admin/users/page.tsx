import { getUsers } from '@/lib/actions/admin'
import { requireAdmin } from '@/lib/auth/helpers'
import { UsersManager } from './users-manager'

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin()

  const result = await getUsers()
  const users = result.success ? result.data : []

  return <UsersManager initialUsers={users} currentUserId={currentUser.id} />
}
