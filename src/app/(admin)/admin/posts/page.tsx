import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/helpers'
import { getPosts, deletePost } from '@/lib/actions/posts'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/blog/pagination'
import { Edit2, Trash2, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const { page } = await searchParams
  const pageNum = Number(page) || 1

  const result = await getPosts({
    page: pageNum,
    pageSize: 20,
    // status: undefined implies fetching all statuses for admin
  })

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading posts: {result.error}
      </div>
    )
  }

  const { data } = result

  // Handle delete action
  async function deleteAction(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (id) {
      await deletePost(id)
      revalidatePath('/admin/posts')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No posts found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">
                    <Link href={`/posts/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        post.status === 'published'
                          ? 'default'
                          : post.status === 'archived'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(post.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/posts/${post.id}/edit`}>
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        basePath="/admin/posts"
      />
    </div>
  )
}
