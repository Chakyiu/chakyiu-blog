import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import path from 'path'

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost:5432/blog_test'
const client = postgres(connectionString, { prepare: false })
const db = drizzle(client, { schema })

const migrationsFolder = path.resolve(import.meta.dir, '../../drizzle')

beforeAll(async () => {
  await migrate(db, { migrationsFolder })
})

afterAll(async () => {
  await client.end()
})

async function makeAdminUser() {
  const id = randomUUID()
  await db.insert(schema.users).values({
    id,
    name: 'Admin',
    email: `admin-${id}@example.com`,
    role: 'admin',
    passwordHash: 'irrelevant',
  })
  return { id, email: `admin-${id}@example.com`, role: 'admin' as const }
}

async function insertPost(authorId: string, overrides: Partial<{
  title: string
  slug: string
  content: string
  renderedContent: string
  status: 'draft' | 'published' | 'archived'
  publishedAt: Date | null
}> = {}) {
  const id = randomUUID()
  const now = new Date()
  const data = {
    id,
    title: overrides.title ?? 'Test Post',
    slug: overrides.slug ?? `test-post-${id}`,
    content: overrides.content ?? '# Hello',
    renderedContent: overrides.renderedContent ?? '<h1>Hello</h1>',
    authorId,
    status: overrides.status ?? 'draft' as const,
    createdAt: now,
    updatedAt: now,
    publishedAt: overrides.publishedAt ?? null,
  }
  await db.insert(schema.posts).values(data)
  return { ...data }
}

describe('getPosts (DB layer)', () => {
  it('returns all posts from the DB', async () => {
    const admin = await makeAdminUser()
    const post1 = await insertPost(admin.id, { title: 'Alpha', status: 'published', publishedAt: new Date() })
    const post2 = await insertPost(admin.id, { title: 'Beta', status: 'draft' })

    const rows = await db.select({ id: schema.posts.id, title: schema.posts.title })
      .from(schema.posts)
      .where(eq(schema.posts.authorId, admin.id))

    expect(rows.length).toBeGreaterThanOrEqual(2)
    const titles = rows.map((r) => r.title)
    expect(titles).toContain('Alpha')
    expect(titles).toContain('Beta')
  })

  it('filters by status=published', async () => {
    const admin = await makeAdminUser()
    await insertPost(admin.id, { title: 'Published', status: 'published', publishedAt: new Date() })
    await insertPost(admin.id, { title: 'Hidden Draft', status: 'draft' })

    const rows = await db.select({ id: schema.posts.id, status: schema.posts.status })
      .from(schema.posts)
      .where(and(
        eq(schema.posts.authorId, admin.id),
        eq(schema.posts.status, 'published'),
      ))

    expect(rows.every((r) => r.status === 'published')).toBe(true)
  })

  it('returns empty array when no posts exist for a new user', async () => {
    const admin = await makeAdminUser()
    const rows = await db.select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.authorId, admin.id))
    expect(rows).toHaveLength(0)
  })
})

describe('createPost (DB layer)', () => {
  it('inserts a post and returns it', async () => {
    const admin = await makeAdminUser()
    const id = randomUUID()
    const now = new Date()
    await db.insert(schema.posts).values({
      id,
      title: 'New Post',
      slug: `new-post-${id}`,
      content: '# New',
      renderedContent: '<h1>New</h1>',
      authorId: admin.id,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    })

    const [row] = await db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
      .limit(1)

    expect(row).not.toBeNull()
    expect(row!.title).toBe('New Post')
    expect(row!.status).toBe('draft')
    expect(row!.authorId).toBe(admin.id)
  })

  it('rejects a post with a duplicate slug', async () => {
    const admin = await makeAdminUser()
    const id1 = randomUUID()
    const slug = `dup-slug-${randomUUID()}`
    const now = new Date()

    await db.insert(schema.posts).values({
      id: id1,
      title: 'First',
      slug,
      content: '.',
      renderedContent: '.',
      authorId: admin.id,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    })

    const id2 = randomUUID()
    expect(async () => {
      await db.insert(schema.posts).values({
        id: id2,
        title: 'Second',
        slug, 
        content: '.',
        renderedContent: '.',
        authorId: admin.id,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      })
    }).toThrow()
  })
})

describe('updatePost (DB layer)', () => {
  it('updates the title and status of a post', async () => {
    const admin = await makeAdminUser()
    const post = await insertPost(admin.id, { title: 'Original Title', status: 'draft' })

    await db.update(schema.posts)
      .set({ title: 'Updated Title', status: 'published', updatedAt: new Date() })
      .where(eq(schema.posts.id, post.id))

    const [row] = await db.select({ title: schema.posts.title, status: schema.posts.status })
      .from(schema.posts)
      .where(eq(schema.posts.id, post.id))
      .limit(1)

    expect(row!.title).toBe('Updated Title')
    expect(row!.status).toBe('published')
  })

  it('returns not found for a non-existent post ID', async () => {
    const fakeId = randomUUID()
    const [row] = await db.select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, fakeId))
      .limit(1)

    expect(row).toBeUndefined()
  })
})
