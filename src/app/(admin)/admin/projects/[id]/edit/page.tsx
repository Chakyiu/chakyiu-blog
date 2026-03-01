import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/helpers'
import { getProjectById } from '@/lib/actions/projects'
import { ProjectForm } from '@/components/blog/project-form'

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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
      </div>
      <ProjectForm initialData={project} />
    </div>
  )
}
