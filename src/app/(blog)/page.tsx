import { getPosts } from '@/lib/actions/posts'
import { PostCard } from '@/components/blog/post-card'
import { Pagination } from '@/components/blog/pagination'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    page?: string
    tag?: string
    q?: string
  }>
}

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page) : 1
  const tag = params.tag
  // const query = params.q

  const result = await getPosts({
    page,
    pageSize: 10,
    tag,
    status: 'published',
  })

  if (!result.success) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Error loading posts</h1>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    )
  }

  const { items: posts, totalPages } = result.data

  return (
    <div className="container max-w-5xl py-12 mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {tag ? `Posts tagged "${tag}"` : 'Latest Posts'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {tag 
              ? `Exploring all posts in the ${tag} category` 
              : 'Thoughts, tutorials, and insights on development and design'
            }
          </p>
        </div>
        
        {tag && (
          <Button variant="outline" asChild>
            <Link href="/">Clear Filter</Link>
          </Button>
        )}
      </div>

      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            basePath="/"
            searchParams={params}
          />
        </>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <h2 className="text-2xl font-semibold mb-2">No posts found</h2>
          <p className="text-muted-foreground mb-6">
            {tag 
              ? `We couldn't find any posts tagged with "${tag}".` 
              : "We haven't published any posts yet. Check back soon!"
            }
          </p>
          {tag && (
            <Button asChild>
              <Link href="/">View All Posts</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
