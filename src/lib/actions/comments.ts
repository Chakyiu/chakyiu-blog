'use server'

import 'server-only'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { eq, isNull, inArray } from 'drizzle-orm'
import { requireAuth, requireAdmin } from '@/lib/auth/helpers'
import { renderCommentMarkdown } from '@/lib/markdown/render-comment'
import { createCommentSchema, createReplySchema } from '@/lib/validators/comment'
import type { ActionResult, CommentView, UserView } from '@/types'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

// ── AdminCommentView ──────────────────────────────────────────────────────────

export type AdminCommentView = CommentView & {
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

// ── getComments ───────────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<ActionResult<CommentView[]>> {
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
      })
      .from(schema.comments)
      .leftJoin(schema.users, eq(schema.comments.authorId, schema.users.id))
      .where(eq(schema.comments.postId, postId))
      .orderBy(schema.comments.createdAt)

    // Build top-level + replies structure
    const topLevel: CommentView[] = []
    const repliesMap = new Map<string, CommentView[]>()

    for (const row of rows) {
      const comment = rowToCommentView(row as CommentRow)

      if (row.parentId === null) {
        topLevel.push(comment)
      } else {
        if (!repliesMap.has(row.parentId)) {
          repliesMap.set(row.parentId, [])
        }
        repliesMap.get(row.parentId)!.push(comment)
      }
    }

    // Attach replies to their parent
    for (const comment of topLevel) {
      comment.replies = repliesMap.get(comment.id) ?? []
    }

    return { success: true, data: topLevel }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch comments' }
  }
}

// ── createComment ─────────────────────────────────────────────────────────────

export async function createComment(input: {
  postId: string
  content: string
}): Promise<ActionResult<CommentView>> {
  const user = await requireAuth()

  const parsed = createCommentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { postId, content } = parsed.data

  try {
    const renderedContent = await renderCommentMarkdown(content)
    const id = randomUUID()
    const now = new Date()

    await db.insert(schema.comments).values({
      id,
      content,
      renderedContent,
      postId,
      authorId: user.id,
      parentId: null,
      hidden: false,
      createdAt: now,
    })

    revalidatePath(`/posts/${(await db.select({ slug: schema.posts.slug }).from(schema.posts).where(eq(schema.posts.id, postId)))[0]?.slug ?? ''}`)

    const newComment: CommentView = {
      id,
      content,
      renderedContent,
      postId,
      author: {
        id: user.id,
        name: user.name ?? null,
        email: user.email,
        image: user.image ?? null,
        role: user.role,
        createdAt: 0,
      },
      parentId: null,
      hidden: false,
      createdAt: now.getTime(),
      replies: [],
    }

    return { success: true, data: newComment }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create comment' }
  }
}

// ── createReply ───────────────────────────────────────────────────────────────

export async function createReply(input: {
  postId: string
  parentId: string
  content: string
}): Promise<ActionResult<CommentView>> {
  const user = await requireAuth()

  const parsed = createReplySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { postId, parentId, content } = parsed.data

  try {
    // Validate that parentId refers to a top-level comment (parentId IS NULL)
    const parentRows = await db
      .select({
        id: schema.comments.id,
        parentId: schema.comments.parentId,
        authorId: schema.comments.authorId,
      })
      .from(schema.comments)
      .where(eq(schema.comments.id, parentId))

    if (parentRows.length === 0) {
      return { success: false, error: 'Parent comment not found' }
    }

    const parentComment = parentRows[0]

    if (parentComment.parentId !== null) {
      return { success: false, error: 'Cannot reply to a reply' }
    }

    const renderedContent = await renderCommentMarkdown(content)
    const id = randomUUID()
    const now = new Date()

    await db.insert(schema.comments).values({
      id,
      content,
      renderedContent,
      postId,
      authorId: user.id,
      parentId,
      hidden: false,
      createdAt: now,
    })

    // Create notification for parent comment's author (skip self-notification)
    if (parentComment.authorId && parentComment.authorId !== user.id) {
      await db.insert(schema.notifications).values({
        id: randomUUID(),
        userId: parentComment.authorId,
        type: 'reply',
        message: 'Someone replied to your comment',
        referenceId: id,
        read: false,
        createdAt: now,
      })
    }

    revalidatePath(`/posts/${(await db.select({ slug: schema.posts.slug }).from(schema.posts).where(eq(schema.posts.id, postId)))[0]?.slug ?? ''}`)

    const newComment: CommentView = {
      id,
      content,
      renderedContent,
      postId,
      author: {
        id: user.id,
        name: user.name ?? null,
        email: user.email,
        image: user.image ?? null,
        role: user.role,
        createdAt: 0,
      },
      parentId,
      hidden: false,
      createdAt: now.getTime(),
      replies: [],
    }

    return { success: true, data: newComment }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create reply' }
  }
}

// ── hideComment ───────────────────────────────────────────────────────────────

export async function hideComment(id: string): Promise<ActionResult> {
  await requireAdmin()

  try {
    const rows = await db
      .select({ authorId: schema.comments.authorId })
      .from(schema.comments)
      .where(eq(schema.comments.id, id))

    if (rows.length === 0) {
      return { success: false, error: 'Comment not found' }
    }

    await db.update(schema.comments).set({ hidden: true }).where(eq(schema.comments.id, id))

    const authorId = rows[0].authorId
    if (authorId) {
      await db.insert(schema.notifications).values({
        id: randomUUID(),
        userId: authorId,
        type: 'comment_hidden',
        message: 'Your comment was hidden',
        referenceId: id,
        read: false,
        createdAt: new Date(),
      })
    }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to hide comment' }
  }
}

// ── unhideComment ─────────────────────────────────────────────────────────────

export async function unhideComment(id: string): Promise<ActionResult> {
  await requireAdmin()

  try {
    const rows = await db
      .select({ id: schema.comments.id })
      .from(schema.comments)
      .where(eq(schema.comments.id, id))

    if (rows.length === 0) {
      return { success: false, error: 'Comment not found' }
    }

    await db.update(schema.comments).set({ hidden: false }).where(eq(schema.comments.id, id))

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to unhide comment' }
  }
}

// ── deleteComment ─────────────────────────────────────────────────────────────

export async function deleteComment(id: string): Promise<ActionResult> {
  await requireAdmin()

  try {
    const rows = await db
      .select({ authorId: schema.comments.authorId })
      .from(schema.comments)
      .where(eq(schema.comments.id, id))

    if (rows.length === 0) {
      return { success: false, error: 'Comment not found' }
    }

    const authorId = rows[0].authorId

    await db.delete(schema.comments).where(eq(schema.comments.parentId, id))
    await db.delete(schema.comments).where(eq(schema.comments.id, id))

    if (authorId) {
      await db.insert(schema.notifications).values({
        id: randomUUID(),
        userId: authorId,
        type: 'comment_deleted',
        message: 'Your comment was deleted',
        referenceId: null,
        read: false,
        createdAt: new Date(),
      })
    }

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete comment' }
  }
}

// ── getAdminComments ──────────────────────────────────────────────────────────

export async function getAdminComments(): Promise<ActionResult<AdminCommentView[]>> {
  await requireAdmin()

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
      .orderBy(schema.comments.createdAt)

    const views: AdminCommentView[] = rows.map((row) => ({
      ...rowToCommentView(row as CommentRow),
      postTitle: row.postTitle ?? null,
      postSlug: row.postSlug ?? null,
    }))

    return { success: true, data: views }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch comments' }
  }
}
