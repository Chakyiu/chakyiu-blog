import { requireAuth } from '@/lib/auth/helpers'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const user = await requireAuth()

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="grid gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>
        <div className="grid gap-6">
          <SettingsForm user={user} />
        </div>
      </div>
    </div>
  )
}
