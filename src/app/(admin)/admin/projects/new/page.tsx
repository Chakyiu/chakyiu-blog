import { requireAdmin } from '@/lib/auth/helpers'
import { ProjectForm } from '@/components/blog/project-form'

export default async function NewProjectPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Project</h1>
      </div>
      <ProjectForm />
    </div>
  )
}
