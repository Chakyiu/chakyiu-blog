'use server'

import { requireAdmin, getCurrentUser } from '@/lib/auth/helpers'
import { renderMarkdown } from '@/lib/markdown/render'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { createPostSchema, updatePostSchema } from '@/lib/validators/post'
import type { ActionResult, PostView, PaginatedResult, TagView } from '@/types'
import { eq, sql, and, asc, desc, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// ── Slug helpers ──────────────────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = toSlug(title)
  let slug = base

  const existing = await db
    .select({ slug: schema.posts.slug })
    .from(schema.posts)
    .where(eq(schema.posts.slug, slug))

  const conflict = existing.filter((r) => !excludeId || r.slug !== slug)

  if (conflict.length > 0) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }

  return slug
}

// ── Row → PostView helper ─────────────────────────────────────────────────────

type PostRow = {
  id: string
  title: string
  slug: string
  content: string
  renderedContent: string
  excerpt: string | null
  coverImageUrl: string | null
  authorId: string | null
  status: 'draft' | 'published' | 'archived'
  createdAt: Date | null
  updatedAt: Date | null
  publishedAt: Date | null
  authorName: string | null
  authorEmail: string | null
  authorImage: string | null
  authorRole: 'admin' | 'user' | null
  authorCreatedAt: Date | null
  commentCount: number
}

function rowToPostView(row: PostRow, tags: TagView[]): PostView {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    renderedContent: row.renderedContent,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl,
    author: {
      id: row.authorId ?? '',
      name: row.authorName,
      email: row.authorEmail ?? '',
      image: row.authorImage,
      role: row.authorRole ?? 'user',
      createdAt: row.authorCreatedAt ? row.authorCreatedAt.getTime() : 0,
    },
    status: row.status,
    tags,
    commentCount: Number(row.commentCount),
    createdAt: row.createdAt ? row.createdAt.getTime() : 0,
    updatedAt: row.updatedAt ? row.updatedAt.getTime() : 0,
    publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
  }
}

// ── Fetch tags for post ids ───────────────────────────────────────────────────

async function fetchTagsForPosts(postIds: string[]): Promise<Map<string, TagView[]>> {
  if (postIds.length === 0) return new Map()

  const rows = await db
    .select({
      postId: schema.postTags.postId,
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
      color: schema.tags.color,
    })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(inArray(schema.postTags.postId, postIds))

  const map = new Map<string, TagView[]>()
  for (const row of rows) {
    if (!map.has(row.postId)) map.set(row.postId, [])
    map.get(row.postId)!.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color,
    })
  }
  return map
}

// ── getPost ───────────────────────────────────────────────────────────────────

export async function getPost(slug: string): Promise<ActionResult<PostView>> {
  try {
    const currentUser = await getCurrentUser()
    const isAdmin = currentUser?.role === 'admin'

    const rows = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        slug: schema.posts.slug,
        content: schema.posts.content,
        renderedContent: schema.posts.renderedContent,
        excerpt: schema.posts.excerpt,
        coverImageUrl: schema.posts.coverImageUrl,
        authorId: schema.posts.authorId,
        status: schema.posts.status,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
        publishedAt: schema.posts.publishedAt,
        authorName: schema.users.name,
        authorEmail: schema.users.email,
        authorImage: schema.users.image,
        authorRole: schema.users.role,
        authorCreatedAt: schema.users.createdAt,
        commentCount: sql<number>`count(${schema.comments.id})`,
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .leftJoin(schema.comments, and(eq(schema.comments.postId, schema.posts.id), eq(schema.comments.hidden, false)))
      .where(eq(schema.posts.slug, slug))
      .groupBy(schema.posts.id)

    if (rows.length === 0) {
      return { success: false, error: 'Post not found' }
    }

    const row = rows[0]

    if (!isAdmin && row.status !== 'published') {
      return { success: false, error: 'Post not found' }
    }

    const tagsMap = await fetchTagsForPosts([row.id])
    const tags = tagsMap.get(row.id) ?? []

    return {
      success: true,
      data: rowToPostView(row as PostRow, tags),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch post' }
  }
}

// ── getPosts ──────────────────────────────────────────────────────────────────

export type GetPostsFilters = {
  tag?: string
  status?: 'draft' | 'published' | 'archived'
  page?: number
  pageSize?: number
  sort?: 'newest' | 'oldest'
}

export async function getPosts(
  filters: GetPostsFilters = {}
): Promise<ActionResult<PaginatedResult<PostView>>> {
  try {
    const currentUser = await getCurrentUser()
    const isAdmin = currentUser?.role === 'admin'

    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10))
    const offset = (page - 1) * pageSize

    const conditions = []

    if (!isAdmin) {
      conditions.push(eq(schema.posts.status, 'published'))
    } else if (filters.status) {
      conditions.push(eq(schema.posts.status, filters.status))
    }

    let tagFilterPostIds: string[] | null = null
    if (filters.tag) {
      const tagRows = await db
        .select({ postId: schema.postTags.postId })
        .from(schema.postTags)
        .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
        .where(eq(schema.tags.slug, filters.tag))

      tagFilterPostIds = tagRows.map((r) => r.postId)

      if (tagFilterPostIds.length === 0) {
        return {
          success: true,
          data: { items: [], total: 0, page, pageSize, totalPages: 0 },
        }
      }

      conditions.push(inArray(schema.posts.id, tagFilterPostIds))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const countRows = await db
      .select({ count: sql<number>`count(${schema.posts.id})` })
      .from(schema.posts)
      .where(whereClause)

    const total = Number(countRows[0]?.count ?? 0)
    const totalPages = Math.ceil(total / pageSize)

    const orderClause =
      filters.sort === 'oldest'
        ? asc(schema.posts.createdAt)
        : desc(schema.posts.createdAt)

    const rows = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        slug: schema.posts.slug,
        content: schema.posts.content,
        renderedContent: schema.posts.renderedContent,
        excerpt: schema.posts.excerpt,
        coverImageUrl: schema.posts.coverImageUrl,
        authorId: schema.posts.authorId,
        status: schema.posts.status,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
        publishedAt: schema.posts.publishedAt,
        authorName: schema.users.name,
        authorEmail: schema.users.email,
        authorImage: schema.users.image,
        authorRole: schema.users.role,
        authorCreatedAt: schema.users.createdAt,
        commentCount: sql<number>`count(${schema.comments.id})`,
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .leftJoin(schema.comments, and(eq(schema.comments.postId, schema.posts.id), eq(schema.comments.hidden, false)))
      .where(whereClause)
      .groupBy(schema.posts.id)
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset)

    const postIds = rows.map((r) => r.id)
    const tagsMap = await fetchTagsForPosts(postIds)

    const items = rows.map((row) => rowToPostView(row as PostRow, tagsMap.get(row.id) ?? []))

    return {
      success: true,
      data: { items, total, page, pageSize, totalPages },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch posts' }
  }
}

// ── createPost ────────────────────────────────────────────────────────────────

export type CreatePostInput = {
  title: string
  content: string
  excerpt?: string | null
  coverImageUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
  tagIds?: string[]
}

export async function createPost(input: CreatePostInput): Promise<ActionResult<PostView>> {
  const adminUser = await requireAdmin()

  const parsed = createPostSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { title, content, excerpt, coverImageUrl, status, tagIds } = parsed.data

  try {
    const slug = await generateUniqueSlug(title)
    const id = randomUUID()
    const now = new Date()
    const publishedAt = status === 'published' ? now : null

    await db.insert(schema.posts).values({
      id,
      title,
      slug,
      content,
      renderedContent: await renderMarkdown(content),
      excerpt: excerpt ?? null,
      coverImageUrl: coverImageUrl ?? null,
      authorId: adminUser.id,
      status,
      createdAt: now,
      updatedAt: now,
      publishedAt,
    })

    if (tagIds && tagIds.length > 0) {
      await db.insert(schema.postTags).values(
        tagIds.map((tagId) => ({ postId: id, tagId }))
      )
    }

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath('/admin/posts')

    const result = await getPostById(id)
    if (!result.success) {
      return { success: false, error: 'Post created but could not be retrieved' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create post' }
  }
}

// ── updatePost ────────────────────────────────────────────────────────────────

export type UpdatePostInput = {
  title?: string
  content?: string
  excerpt?: string | null
  coverImageUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
  tagIds?: string[]
}

export async function updatePost(
  postId: string,
  input: UpdatePostInput
): Promise<ActionResult<PostView>> {
  await requireAdmin()

  if (!postId) {
    return { success: false, error: 'Post ID is required' }
  }

  const parsed = updatePostSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { title, content, excerpt, coverImageUrl, status, tagIds } = parsed.data

  try {
    const existing = await db
      .select({ id: schema.posts.id, slug: schema.posts.slug, status: schema.posts.status, publishedAt: schema.posts.publishedAt })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))

    if (existing.length === 0) {
      return { success: false, error: 'Post not found' }
    }

    const current = existing[0]
    const now = new Date()

    let newSlug = current.slug
    if (title) {
      const base = toSlug(title)
      if (base !== current.slug) {
        const conflict = await db
          .select({ id: schema.posts.id })
          .from(schema.posts)
          .where(and(eq(schema.posts.slug, base), sql`${schema.posts.id} != ${postId}`))

        if (conflict.length > 0) {
          newSlug = `${base}-${Math.random().toString(36).slice(2, 6)}`
        } else {
          newSlug = base
        }
      }
    }

    let publishedAt = current.publishedAt
    if (status === 'published' && !current.publishedAt) {
      publishedAt = now
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: now,
      slug: newSlug,
    }
    if (title !== undefined) updateValues.title = title
    if (content !== undefined) {
      updateValues.content = content
      updateValues.renderedContent = await renderMarkdown(content)
    }
    if (excerpt !== undefined) updateValues.excerpt = excerpt
    if (coverImageUrl !== undefined) updateValues.coverImageUrl = coverImageUrl
    if (status !== undefined) updateValues.status = status
    if (publishedAt !== current.publishedAt) updateValues.publishedAt = publishedAt

    await db
      .update(schema.posts)
      .set(updateValues)
      .where(eq(schema.posts.id, postId))

    if (tagIds !== undefined) {
      await db.delete(schema.postTags).where(eq(schema.postTags.postId, postId))
      if (tagIds.length > 0) {
        await db.insert(schema.postTags).values(
          tagIds.map((tagId) => ({ postId, tagId }))
        )
      }
    }

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath(`/blog/${newSlug}`)
    revalidatePath('/admin/posts')

    const result = await getPostById(postId)
    if (!result.success) {
      return { success: false, error: 'Post updated but could not be retrieved' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update post' }
  }
}

// ── deletePost ────────────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<ActionResult<void>> {
  await requireAdmin()

  if (!postId) {
    return { success: false, error: 'Post ID is required' }
  }

  try {
    const existing = await db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))

    if (existing.length === 0) {
      return { success: false, error: 'Post not found' }
    }

    await db.delete(schema.posts).where(eq(schema.posts.id, postId))

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath('/admin/posts')

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete post' }
  }
}

// ── changePostStatus ──────────────────────────────────────────────────────────

export async function changePostStatus(
  postId: string,
  status: 'draft' | 'published' | 'archived'
): Promise<ActionResult<PostView>> {
  await requireAdmin()

  if (!postId) {
    return { success: false, error: 'Post ID is required' }
  }

  if (!['draft', 'published', 'archived'].includes(status)) {
    return { success: false, error: 'Invalid status value' }
  }

  try {
    const existing = await db
      .select({ id: schema.posts.id, slug: schema.posts.slug, publishedAt: schema.posts.publishedAt })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))

    if (existing.length === 0) {
      return { success: false, error: 'Post not found' }
    }

    const current = existing[0]
    const now = new Date()

    const publishedAt =
      status === 'published' && !current.publishedAt ? now : current.publishedAt

    await db
      .update(schema.posts)
      .set({ status, publishedAt, updatedAt: now })
      .where(eq(schema.posts.id, postId))

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath(`/blog/${current.slug}`)
    revalidatePath('/admin/posts')

    const result = await getPostById(postId)
    if (!result.success) {
      return { success: false, error: 'Status changed but post could not be retrieved' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to change post status' }
  }
}

// ── getPostById (internal helper) ─────────────────────────────────────────────

export async function getPostById(postId: string): Promise<ActionResult<PostView>> {
  try {
    const rows = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        slug: schema.posts.slug,
        content: schema.posts.content,
        renderedContent: schema.posts.renderedContent,
        excerpt: schema.posts.excerpt,
        coverImageUrl: schema.posts.coverImageUrl,
        authorId: schema.posts.authorId,
        status: schema.posts.status,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
        publishedAt: schema.posts.publishedAt,
        authorName: schema.users.name,
        authorEmail: schema.users.email,
        authorImage: schema.users.image,
        authorRole: schema.users.role,
        authorCreatedAt: schema.users.createdAt,
        commentCount: sql<number>`count(${schema.comments.id})`,
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
      .leftJoin(schema.comments, and(eq(schema.comments.postId, schema.posts.id), eq(schema.comments.hidden, false)))
      .where(eq(schema.posts.id, postId))
      .groupBy(schema.posts.id)

    if (rows.length === 0) {
      return { success: false, error: 'Post not found' }
    }

    const row = rows[0]
    const tagsMap = await fetchTagsForPosts([row.id])
    const tags = tagsMap.get(row.id) ?? []

    return {
      success: true,
      data: rowToPostView(row as PostRow, tags),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch post' }
  }
}
