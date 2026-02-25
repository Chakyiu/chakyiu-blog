import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/helpers'
import { getProjectById, refreshProjectReadme } from '@/lib/actions/projects'
import { ProjectForm } from '@/components/blog/project-form'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { revalidatePath } from 'next/cache'

interface EditProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  await requireAdmin()
  const { id } = await params

  const projectResult = await getProjectById(id)

  if (!projectResult.success) {
    notFound()
  }

  const project = projectResult.data

  async function refreshAction() {
    'use server'
    await refreshProjectReadme(id)
    revalidatePath(`/admin/projects/${id}/edit`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
        {project.githubUrl && (
          <form action={refreshAction}>
            <Button variant="outline" size="sm" type="submit">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh README
            </Button>
          </form>
        )}
      </div>
      <ProjectForm initialData={project} />
    </div>
  )
}
