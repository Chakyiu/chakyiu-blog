'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/actions/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import type { SessionUser } from '@/types'
import { Loader2 } from 'lucide-react'

interface SettingsFormProps {
  user: SessionUser
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [name, setName] = useState(user.name || '')
  const [image, setImage] = useState(user.image || '')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const result = await updateProfile(name, image)

      if (result.success) {
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
        })
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        })
      }
    })
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your public profile information.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={user.email} 
              disabled 
              className="bg-muted" 
            />
            <p className="text-sm text-muted-foreground">
              Email addresses cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Avatar URL</Label>
            <div className="flex gap-4 items-start">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={image} alt={name} />
                <AvatarFallback>{name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Input
                  id="image"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL for your profile picture.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
