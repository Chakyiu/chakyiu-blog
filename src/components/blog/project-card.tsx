import Link from 'next/link'
import Image from 'next/image'
import type { ProjectView } from '@/types'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Github, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectCardProps {
  project: ProjectView
}

export function ProjectCard({ project }: ProjectCardProps) {
  const description = project.description ?? (project.cachedReadme ? project.cachedReadme.slice(0, 160) + '...' : 'No description available.')

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md group">
      {project.imageUrl && (
        <div className="relative w-full aspect-video overflow-hidden">
          <Image
            src={project.imageUrl}
            alt={project.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl leading-tight">
          <Link
            href={`/projects/${project.slug}`}
            className="hover:text-primary transition-colors"
          >
            {project.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground text-sm line-clamp-3">{description}</p>
      </CardContent>
      <CardFooter className="flex items-center gap-2 pt-4 border-t mt-auto">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${project.slug}`}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Details
          </Link>
        </Button>
        {project.githubUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-1" />
              GitHub
            </a>
          </Button>
        )}
        {project.productUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={project.productUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Visit
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
