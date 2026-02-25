import type { Metadata } from 'next'
import { getProjects } from '@/lib/actions/projects'
import { ProjectCard } from '@/components/blog/project-card'
import { Pagination } from '@/components/blog/pagination'

export const revalidate = 60

interface PageProps {
  searchParams: Promise<{
    page?: string
  }>
}

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Open source projects and experiments.',
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page) : 1

  const result = await getProjects({
    page,
    pageSize: 12,
    status: 'published',
  })

  if (!result.success) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Error loading projects</h1>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    )
  }

  const { items: projects, totalPages } = result.data

  return (
    <div className="container max-w-5xl py-12 mx-auto px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Projects</h1>
        <p className="text-muted-foreground text-lg">
          Open source work, experiments, and side projects.
        </p>
      </div>

      {projects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/projects"
            searchParams={params}
          />
        </>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground">Check back soon for open source work and experiments.</p>
        </div>
      )}
    </div>
  )
}
