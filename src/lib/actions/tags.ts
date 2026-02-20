'use server'

import { requireAdmin } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { createTagSchema, updateTagSchema } from '@/lib/validators/tag'
import type { ActionResult, TagView } from '@/types'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getTags(): Promise<ActionResult<TagView[]>> {
  try {
    const rows = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
        color: schema.tags.color,
        postCount: sql<number>`count(${schema.postTags.tagId})`,
      })
      .from(schema.tags)
      .leftJoin(schema.postTags, eq(schema.tags.id, schema.postTags.tagId))
      .groupBy(schema.tags.id)

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        color: row.color,
        postCount: Number(row.postCount),
      })),
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch tags' }
  }
}

export async function getTagBySlug(slug: string): Promise<ActionResult<TagView>> {
  try {
    const rows = await db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
        color: schema.tags.color,
        postCount: sql<number>`count(${schema.postTags.tagId})`,
      })
      .from(schema.tags)
      .leftJoin(schema.postTags, eq(schema.tags.id, schema.postTags.tagId))
      .where(eq(schema.tags.slug, slug))
      .groupBy(schema.tags.id)

    if (rows.length === 0) {
      return { success: false, error: 'Tag not found' }
    }

    const row = rows[0]
    return {
      success: true,
      data: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        color: row.color,
        postCount: Number(row.postCount),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch tag' }
  }
}

export async function createTag(name: string, color: string): Promise<ActionResult<TagView>> {
  await requireAdmin()

  const parsed = createTagSchema.safeParse({ name, color })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { name: validName, color: validColor } = parsed.data
  const slug = toSlug(validName)

  try {
    const existing = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.slug, slug))

    if (existing.length > 0) {
      return { success: false, error: `A tag with slug "${slug}" already exists` }
    }

    const id = randomUUID()

    await db.insert(schema.tags).values({
      id,
      name: validName,
      slug,
      color: validColor,
    })

    revalidatePath('/')
    revalidatePath('/admin/tags')

    return {
      success: true,
      data: { id, name: validName, slug, color: validColor, postCount: 0 },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create tag' }
  }
}

export async function updateTag(
  tagId: string,
  name: string,
  color: string
): Promise<ActionResult<TagView>> {
  await requireAdmin()

  const parsed = updateTagSchema.safeParse({ tagId, name, color })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { name: validName, color: validColor } = parsed.data
  const newSlug = toSlug(validName)

  try {
    const current = await db
      .select({ id: schema.tags.id, slug: schema.tags.slug })
      .from(schema.tags)
      .where(eq(schema.tags.id, tagId))

    if (current.length === 0) {
      return { success: false, error: 'Tag not found' }
    }

    if (current[0].slug !== newSlug) {
      const conflict = await db
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(eq(schema.tags.slug, newSlug))

      if (conflict.length > 0) {
        return { success: false, error: `A tag with slug "${newSlug}" already exists` }
      }
    }

    await db
      .update(schema.tags)
      .set({ name: validName, slug: newSlug, color: validColor })
      .where(eq(schema.tags.id, tagId))

    revalidatePath('/')
    revalidatePath('/admin/tags')

    return {
      success: true,
      data: { id: tagId, name: validName, slug: newSlug, color: validColor, postCount: 0 },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update tag' }
  }
}

export async function deleteTag(tagId: string): Promise<ActionResult<void>> {
  await requireAdmin()

  if (!tagId) {
    return { success: false, error: 'Tag ID is required' }
  }

  try {
    const existing = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.id, tagId))

    if (existing.length === 0) {
      return { success: false, error: 'Tag not found' }
    }

    await db.delete(schema.tags).where(eq(schema.tags.id, tagId))

    revalidatePath('/')
    revalidatePath('/admin/tags')

    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete tag' }
  }
}
