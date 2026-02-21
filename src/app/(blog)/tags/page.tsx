import type { Metadata } from 'next'
import Link from 'next/link'
import { getTags } from '@/lib/actions/tags'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Tags',
  description: 'Browse all tags used across the blog.',
}

export default async function TagsPage() {
  const result = await getTags()

  if (!result.success) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Error loading tags</h1>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    )
  }

  const tags = result.data

  return (
    <div className="container max-w-4xl py-12 mx-auto px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Tags</h1>
        <p className="text-muted-foreground text-lg">
          Browse all topics covered on the blog
        </p>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/?tag=${tag.slug}`}
              className="group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tag.color ?? '#6e7781' }}
              />
              <span>{tag.name}</span>
              {tag.postCount !== undefined && (
                <span className="text-muted-foreground text-xs">
                  {tag.postCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <h2 className="text-2xl font-semibold mb-2">No tags yet</h2>
          <p className="text-muted-foreground">Tags will appear here once posts are published.</p>
        </div>
      )}
    </div>
  )
}
