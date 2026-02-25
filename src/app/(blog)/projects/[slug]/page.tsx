import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getProject } from '@/lib/actions/projects'
import { MarkdownContent } from '@/components/markdown-content'
import { Button } from '@/components/ui/button'
import { Github, CalendarIcon, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getProject(slug)
  if (!result.success || result.data.status !== 'published') {
    return { title: 'Project Not Found' }
  }

  const project = result.data
  const description = project.description ?? 'Open source project'

  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      type: 'article',
      images: project.imageUrl ? [{ url: project.imageUrl }] : [],
    },
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getProject(slug)

  if (!result.success) {
    notFound()
  }

  const project = result.data

  if (project.status !== 'published') {
    notFound()
  }

  const formattedDate = new Date(project.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const readmeUpdatedDate = project.readmeUpdatedAt
    ? new Date(project.readmeUpdatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <article className="container max-w-4xl py-12 mx-auto px-4">
      <div className="mb-8">
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
        >
          ← All Projects
        </Link>
      </div>

      {project.imageUrl && (
        <div className="relative w-full aspect-video mb-8 rounded-lg overflow-hidden">
          <Image
            src={project.imageUrl}
            alt={project.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{project.title}</h1>
          {project.description && (
            <p className="text-lg text-muted-foreground">{project.description}</p>
          )}
        </div>

        {project.githubUrl && (
          <Button asChild variant="outline" className="shrink-0">
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-2" />
              View on GitHub
            </a>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          <time dateTime={new Date(project.createdAt).toISOString()}>{formattedDate}</time>
        </div>
        {readmeUpdatedDate && (
          <div className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            <span>README updated {readmeUpdatedDate}</span>
          </div>
        )}
      </div>

      {project.renderedReadme ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">
              <Github className="h-3 w-3 mr-1" />
              README.md
            </Badge>
          </div>
          <div className="rounded-lg border bg-card p-6 md:p-8">
            <MarkdownContent renderedHtml={project.renderedReadme} />
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <Github className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No README available</h2>
          <p className="text-muted-foreground">
            {project.githubUrl
              ? 'The README could not be loaded from GitHub.'
              : 'No GitHub repository is linked to this project.'}
          </p>
          {project.githubUrl && (
            <Button asChild variant="outline" className="mt-4">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" />
                View Repository
              </a>
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
