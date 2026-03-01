'use server'

import { requireAdmin } from '@/lib/auth/helpers'
import { renderMarkdown } from '@/lib/markdown/render'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { createProjectSchema, updateProjectSchema } from '@/lib/validators/project'
import type { ActionResult, ProjectView, PaginatedResult } from '@/types'
import { eq, sql, desc, asc } from 'drizzle-orm'
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
    .select({ slug: schema.projects.slug })
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))

  const conflict = existing.filter((r) => !excludeId || r.slug !== slug)

  if (conflict.length > 0) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }

  return slug
}

// ── GitHub README fetching ────────────────────────────────────────────────────

/**
 * Parse a GitHub repo URL and fetch its raw README content via the API.
 * Supports https://github.com/owner/repo and https://github.com/owner/repo/tree/branch
 */
export async function fetchGithubReadme(
  githubUrl: string
): Promise<ActionResult<string>> {
  try {
    // Extract owner/repo from URL
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      return { success: false, error: 'Invalid GitHub URL format' }
    }

    const owner = match[1]
    const repo = match[2].replace(/\.git$/, '')

    // Try the GitHub API to get the README
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.raw',
        'User-Agent': 'chakyiu-blog',
      },
      next: { revalidate: 3600 }, // cache 1 hour
    })

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, error: 'README not found in this repository' }
      }
      return { success: false, error: `GitHub API error: ${res.status}` }
    }

    const markdown = await res.text()
    return { success: true, data: markdown }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch README',
    }
  }
}

// ── Row → ProjectView helper ──────────────────────────────────────────────────

type ProjectRow = {
  id: string
  title: string
  slug: string
  description: string | null
  githubUrl: string | null
  imageUrl: string | null
  productUrl: string | null
  cachedReadme: string | null
  readmeUpdatedAt: Date | null
  authorId: string | null
  status: 'draft' | 'published' | 'archived'
  createdAt: Date | null
  updatedAt: Date | null
  authorName: string | null
  authorEmail: string | null
  authorImage: string | null
  authorRole: 'admin' | 'user' | null
  authorCreatedAt: Date | null
}

async function rowToProjectView(row: ProjectRow): Promise<ProjectView> {
  let renderedReadme: string | null = null
  if (row.cachedReadme) {
    renderedReadme = await renderMarkdown(row.cachedReadme)
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    githubUrl: row.githubUrl,
    imageUrl: row.imageUrl,
    productUrl: row.productUrl,
    cachedReadme: row.cachedReadme,
    renderedReadme,
    readmeUpdatedAt: row.readmeUpdatedAt ? row.readmeUpdatedAt.getTime() : null,
    author: {
      id: row.authorId ?? '',
      name: row.authorName,
      email: row.authorEmail ?? '',
      image: row.authorImage,
      role: row.authorRole ?? 'user',
      createdAt: row.authorCreatedAt ? row.authorCreatedAt.getTime() : 0,
    },
    status: row.status,
    createdAt: row.createdAt ? row.createdAt.getTime() : 0,
    updatedAt: row.updatedAt ? row.updatedAt.getTime() : 0,
  }
}

const projectSelect = {
  id: schema.projects.id,
  title: schema.projects.title,
  slug: schema.projects.slug,
  description: schema.projects.description,
  githubUrl: schema.projects.githubUrl,
  imageUrl: schema.projects.imageUrl,
  productUrl: schema.projects.productUrl,
  cachedReadme: schema.projects.cachedReadme,
  readmeUpdatedAt: schema.projects.readmeUpdatedAt,
  authorId: schema.projects.authorId,
  status: schema.projects.status,
  createdAt: schema.projects.createdAt,
  updatedAt: schema.projects.updatedAt,
  authorName: schema.users.name,
  authorEmail: schema.users.email,
  authorImage: schema.users.image,
  authorRole: schema.users.role,
  authorCreatedAt: schema.users.createdAt,
}

// ── getProject ────────────────────────────────────────────────────────────────

export async function getProject(slug: string): Promise<ActionResult<ProjectView>> {
  try {
    const rows = await db
      .select(projectSelect)
      .from(schema.projects)
      .leftJoin(schema.users, eq(schema.projects.authorId, schema.users.id))
      .where(eq(schema.projects.slug, slug))

    if (rows.length === 0) {
      return { success: false, error: 'Project not found' }
    }

    const row = rows[0]
    return { success: true, data: await rowToProjectView(row as ProjectRow) }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch project',
    }
  }
}

// ── getProjectById ────────────────────────────────────────────────────────────

export async function getProjectById(projectId: string): Promise<ActionResult<ProjectView>> {
  try {
    const rows = await db
      .select(projectSelect)
      .from(schema.projects)
      .leftJoin(schema.users, eq(schema.projects.authorId, schema.users.id))
      .where(eq(schema.projects.id, projectId))

    if (rows.length === 0) {
      return { success: false, error: 'Project not found' }
    }

    return { success: true, data: await rowToProjectView(rows[0] as ProjectRow) }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch project',
    }
  }
}

// ── getProjects ───────────────────────────────────────────────────────────────

export type GetProjectsFilters = {
  status?: 'draft' | 'published' | 'archived'
  page?: number
  pageSize?: number
  sort?: 'newest' | 'oldest'
  adminView?: boolean
}

export async function getProjects(
  filters: GetProjectsFilters = {}
): Promise<ActionResult<PaginatedResult<ProjectView>>> {
  try {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 12))
    const offset = (page - 1) * pageSize

    const whereClause = filters.adminView
      ? filters.status
        ? eq(schema.projects.status, filters.status)
        : undefined
      : eq(schema.projects.status, 'published')

    const countRows = await db
      .select({ count: sql<number>`count(${schema.projects.id})` })
      .from(schema.projects)
      .where(whereClause)

    const total = Number(countRows[0]?.count ?? 0)
    const totalPages = Math.ceil(total / pageSize)

    const orderClause =
      filters.sort === 'oldest'
        ? asc(schema.projects.createdAt)
        : desc(schema.projects.createdAt)

    const rows = await db
      .select(projectSelect)
      .from(schema.projects)
      .leftJoin(schema.users, eq(schema.projects.authorId, schema.users.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset)

    const items = await Promise.all(rows.map((row) => rowToProjectView(row as ProjectRow)))

    return { success: true, data: { items, total, page, pageSize, totalPages } }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch projects',
    }
  }
}

// ── createProject ─────────────────────────────────────────────────────────────

export type CreateProjectInput = {
  title: string
  description?: string | null
  githubUrl?: string | null
  imageUrl?: string | null
  productUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
}

export async function createProject(
  input: CreateProjectInput
): Promise<ActionResult<ProjectView>> {
  const adminUser = await requireAdmin()

  const parsed = createProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { title, description, githubUrl, imageUrl, status, productUrl } = parsed.data

  try {
    const slug = await generateUniqueSlug(title)
    const id = randomUUID()
    const now = new Date()

    // Fetch and cache the README if a GitHub URL is provided
    let cachedReadme: string | null = null
    let readmeUpdatedAt: Date | null = null
    if (githubUrl) {
      const readmeResult = await fetchGithubReadme(githubUrl)
      if (readmeResult.success) {
        cachedReadme = readmeResult.data
        readmeUpdatedAt = now
      }
    }

    await db.insert(schema.projects).values({
      id,
      title,
      slug,
      description: description ?? null,
      githubUrl: githubUrl ?? null,
      imageUrl: imageUrl ?? null,
      productUrl: productUrl ?? null,
      cachedReadme,
      readmeUpdatedAt,
      authorId: adminUser.id,
      status,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/projects')
    revalidatePath('/admin/projects')

    const result = await getProjectById(id)
    if (!result.success) {
      return { success: false, error: 'Project created but could not be retrieved' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create project',
    }
  }
}

// ── updateProject ─────────────────────────────────────────────────────────────

export type UpdateProjectInput = {
  title?: string
  description?: string | null
  githubUrl?: string | null
  imageUrl?: string | null
  productUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<ActionResult<ProjectView>> {
  await requireAdmin()

  if (!projectId) {
    return { success: false, error: 'Project ID is required' }
  }

  const parsed = updateProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { title, description, githubUrl, imageUrl, status, productUrl } = parsed.data

  try {
    const existing = await db
      .select({
        id: schema.projects.id,
        slug: schema.projects.slug,
        githubUrl: schema.projects.githubUrl,
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))

    if (existing.length === 0) {
      return { success: false, error: 'Project not found' }
    }

    const current = existing[0]
    const now = new Date()

    let newSlug = current.slug
    if (title) {
      const base = toSlug(title)
      if (base !== current.slug) {
        const conflict = await db
          .select({ id: schema.projects.id })
          .from(schema.projects)
          .where(
            sql`${schema.projects.slug} = ${base} AND ${schema.projects.id} != ${projectId}`
          )

        newSlug = conflict.length > 0 ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base
      }
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: now,
      slug: newSlug,
    }
    if (title !== undefined) updateValues.title = title
    if (description !== undefined) updateValues.description = description
    if (imageUrl !== undefined) updateValues.imageUrl = imageUrl
    if (status !== undefined) updateValues.status = status
    if (productUrl !== undefined) updateValues.productUrl = productUrl

    // If the GitHub URL changed, re-fetch the README
    if (githubUrl !== undefined) {
      updateValues.githubUrl = githubUrl
      if (githubUrl) {
        const readmeResult = await fetchGithubReadme(githubUrl)
        if (readmeResult.success) {
          updateValues.cachedReadme = readmeResult.data
          updateValues.readmeUpdatedAt = now
        }
      } else {
        updateValues.cachedReadme = null
        updateValues.readmeUpdatedAt = null
      }
    }

    await db
      .update(schema.projects)
      .set(updateValues)
      .where(eq(schema.projects.id, projectId))

    revalidatePath('/projects')
    revalidatePath(`/projects/${newSlug}`)
    revalidatePath('/admin/projects')

    const result = await getProjectById(projectId)
    if (!result.success) {
      return { success: false, error: 'Project updated but could not be retrieved' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update project',
    }
  }
}

// ── refreshProjectReadme ──────────────────────────────────────────────────────

export async function refreshProjectReadme(
  projectId: string
): Promise<ActionResult<ProjectView>> {
  await requireAdmin()

  if (!projectId) {
    return { success: false, error: 'Project ID is required' }
  }

  try {
    const existing = await db
      .select({ id: schema.projects.id, githubUrl: schema.projects.githubUrl, slug: schema.projects.slug })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))

    if (existing.length === 0) {
      return { success: false, error: 'Project not found' }
    }

    const { githubUrl, slug } = existing[0]
    if (!githubUrl) {
      return { success: false, error: 'No GitHub URL set for this project' }
    }

    const readmeResult = await fetchGithubReadme(githubUrl)
    if (!readmeResult.success) {
      return { success: false, error: readmeResult.error }
    }

    const now = new Date()
    await db
      .update(schema.projects)
      .set({ cachedReadme: readmeResult.data, readmeUpdatedAt: now, updatedAt: now })
      .where(eq(schema.projects.id, projectId))

    revalidatePath('/projects')
    revalidatePath(`/projects/${slug}`)
    revalidatePath('/admin/projects')

    const result = await getProjectById(projectId)
    if (!result.success) {
      return { success: false, error: 'README refreshed but project could not be retrieved' }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to refresh README',
    }
  }
}

// ── deleteProject ─────────────────────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<ActionResult<void>> {
  await requireAdmin()

  if (!projectId) {
    return { success: false, error: 'Project ID is required' }
  }

  try {
    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))

    if (existing.length === 0) {
      return { success: false, error: 'Project not found' }
    }

    await db.delete(schema.projects).where(eq(schema.projects.id, projectId))

    revalidatePath('/projects')
    revalidatePath('/admin/projects')

    return { success: true, data: undefined }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete project',
    }
  }
}
