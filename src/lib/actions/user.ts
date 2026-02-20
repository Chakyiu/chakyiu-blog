'use server'

import 'server-only'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/helpers'
import type { ActionResult, CommentView, UserView } from '@/types'

// ── UserCommentView ──────────────────────────────────────────────────────────

export type UserCommentView = CommentView & {
  postTitle: string | null
  postSlug: string | null
}

// ── Row → CommentView helper ──────────────────────────────────────────────────

type CommentRow = {
  id: string
  content: string
  renderedContent: string
  postId: string
  parentId: string | null
  hidden: boolean
  createdAt: Date | null
  authorId: string | null
  authorName: string | null
  authorEmail: string | null
  authorImage: string | null
  authorRole: 'admin' | 'user' | null
  authorCreatedAt: Date | null
}

function rowToCommentView(row: CommentRow): CommentView {
  const author: UserView = row.authorId
    ? {
        id: row.authorId,
        name: row.authorName ?? null,
        email: row.authorEmail ?? '',
        image: row.authorImage ?? null,
        role: row.authorRole ?? 'user',
        createdAt: row.authorCreatedAt ? row.authorCreatedAt.getTime() : 0,
      }
    : {
        id: '',
        name: 'Deleted User',
        email: '',
        image: null,
        role: 'user',
        createdAt: 0,
      }

  return {
    id: row.id,
    content: row.content,
    renderedContent: row.renderedContent,
    postId: row.postId,
    author,
    parentId: row.parentId,
    hidden: row.hidden,
    createdAt: row.createdAt ? row.createdAt.getTime() : 0,
    replies: [],
  }
}

// ── getUserComments ───────────────────────────────────────────────────────────

export async function getUserComments(): Promise<ActionResult<UserCommentView[]>> {
  const user = await requireAuth()

  try {
    const rows = await db
      .select({
        id: schema.comments.id,
        content: schema.comments.content,
        renderedContent: schema.comments.renderedContent,
        postId: schema.comments.postId,
        parentId: schema.comments.parentId,
        hidden: schema.comments.hidden,
        createdAt: schema.comments.createdAt,
        authorId: schema.users.id,
        authorName: schema.users.name,
        authorEmail: schema.users.email,
        authorImage: schema.users.image,
        authorRole: schema.users.role,
        authorCreatedAt: schema.users.createdAt,
        postTitle: schema.posts.title,
        postSlug: schema.posts.slug,
      })
      .from(schema.comments)
      .leftJoin(schema.users, eq(schema.comments.authorId, schema.users.id))
      .leftJoin(schema.posts, eq(schema.comments.postId, schema.posts.id))
      .where(eq(schema.comments.authorId, user.id))
      .orderBy(desc(schema.comments.createdAt))

    const views: UserCommentView[] = rows.map((row) => ({
      ...rowToCommentView(row as CommentRow),
      postTitle: row.postTitle ?? null,
      postSlug: row.postSlug ?? null,
    }))

    return { success: true, data: views }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch user comments' }
  }
}
