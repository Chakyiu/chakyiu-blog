import Link from 'next/link'
import { searchPosts } from '@/lib/actions/search'
import { TagBadge } from '@/components/blog/tag-badge'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export function generateMetadata() {
  return { title: 'Search Posts' }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const result = query ? await searchPosts(query) : null
  const results = result?.success ? result.data : []

  return (
    <div className="container max-w-4xl py-12 mx-auto px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Search Posts</h1>

      <form action="/search" method="GET" className="mb-8">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search posts..."
            autoFocus
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {!query && (
        <p className="text-muted-foreground">Enter a search term to find posts.</p>
      )}

      {query && results.length === 0 && (
        <p className="text-muted-foreground">No posts found for &ldquo;{query}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          {results.map((result) => (
            <article key={result.id} className="border rounded-lg p-5 hover:bg-muted/30 transition-colors">
              <Link href={`/posts/${result.slug}`} className="block group">
                <h2 className="text-lg font-semibold group-hover:text-primary transition-colors mb-2">
                  {result.title}
                </h2>
              </Link>

              {result.snippet && (
                <p
                  className="text-sm text-muted-foreground mb-3 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800 [&_mark]:rounded-sm [&_mark]:px-0.5"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{result.author.name ?? result.author.email}</span>
                {result.publishedAt && (
                  <span>
                    {new Date(result.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {result.tags.length > 0 && (
                  <div className="flex gap-1">
                    {result.tags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
