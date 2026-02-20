import { db } from "@/lib/db"
import { posts, users, comments } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/auth/helpers"
import { count, eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  Users, 
  MessageSquare, 
  EyeOff, 
  CheckCircle, 
  Clock,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminDashboard() {
  await requireAdmin()

  const [
    totalPostsResult,
    publishedPostsResult,
    draftPostsResult,
    totalUsersResult,
    totalCommentsResult,
    hiddenCommentsResult
  ] = await Promise.all([
    db.select({ count: count() }).from(posts),
    db.select({ count: count() }).from(posts).where(eq(posts.status, 'published')),
    db.select({ count: count() }).from(posts).where(eq(posts.status, 'draft')),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(comments),
    db.select({ count: count() }).from(comments).where(eq(comments.hidden, true))
  ])

  const totalPosts = totalPostsResult[0]?.count ?? 0
  const publishedPosts = publishedPostsResult[0]?.count ?? 0
  const draftPosts = draftPostsResult[0]?.count ?? 0
  const totalUsers = totalUsersResult[0]?.count ?? 0
  const totalComments = totalCommentsResult[0]?.count ?? 0
  const hiddenComments = hiddenCommentsResult[0]?.count ?? 0

  const stats = [
    {
      title: "Total Posts",
      value: totalPosts,
      icon: FileText,
      description: "All time content",
      link: "/admin/posts"
    },
    {
      title: "Published",
      value: publishedPosts,
      icon: CheckCircle,
      description: "Live on site",
      link: "/admin/posts?status=published"
    },
    {
      title: "Drafts",
      value: draftPosts,
      icon: Clock,
      description: "Work in progress",
      link: "/admin/posts?status=draft"
    },
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      description: "Registered accounts",
      link: "/admin/users"
    },
    {
      title: "Comments",
      value: totalComments,
      icon: MessageSquare,
      description: "Community engagement",
      link: "/admin/comments"
    },
    {
      title: "Hidden Comments",
      value: hiddenComments,
      icon: EyeOff,
      description: "Moderated content",
      link: "/admin/comments?hidden=true"
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Dashboard</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            Overview of your blog's activity and performance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.link} className="block group transition-transform hover:-translate-y-1">
            <Card className="hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild variant="outline" className="h-auto py-4 px-6 justify-start space-x-3 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Link href="/admin/posts">
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Manage Posts</div>
                <div className="text-xs text-neutral-500 font-normal">Create, edit, or delete content</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto py-4 px-6 justify-start space-x-3 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Link href="/admin/users">
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Manage Users</div>
                <div className="text-xs text-neutral-500 font-normal">View registered members</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto py-4 px-6 justify-start space-x-3 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Link href="/admin/comments">
              <MessageSquare className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Manage Comments</div>
                <div className="text-xs text-neutral-500 font-normal">Moderate community discussions</div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
