'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { setUserRole } from '@/lib/actions/admin'
import type { UserView } from '@/types'
import { useToast } from '@/components/ui/use-toast'

interface UsersManagerProps {
  initialUsers: UserView[]
  currentUserId: string
}

export function UsersManager({ initialUsers, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState<UserView[]>(initialUsers)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleRoleChange(userId: string, newRole: 'admin' | 'user') {
    startTransition(async () => {
      const result = await setUserRole(userId, newRole)
      
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )

      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`,
      })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const date = new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
              const isCurrentUser = user.id === currentUserId

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
                        <AvatarFallback>{(user.name ?? user.email ?? 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name ?? 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {date}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {user.role === 'user' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, 'admin')}
                          disabled={isPending || isCurrentUser}
                        >
                          Promote to Admin
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, 'user')}
                          disabled={isPending || isCurrentUser}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Demote to User
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
