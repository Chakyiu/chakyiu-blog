import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '../lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import path from 'path'

const sqlite = new Database(':memory:')
sqlite.exec('PRAGMA foreign_keys = ON;')
const db = drizzle(sqlite, { schema })

const migrationsFolder = path.resolve(import.meta.dir, '../../drizzle')

beforeAll(async () => {
  await migrate(db, { migrationsFolder })
})

afterAll(() => {
  sqlite.close()
})

function makeAdminUser() {
  const id = randomUUID()
  db.insert(schema.users).values({
    id,
    name: 'Admin',
    email: `admin-${id}@example.com`,
    role: 'admin',
    passwordHash: 'irrelevant',
  }).run()
  return { id, email: `admin-${id}@example.com`, role: 'admin' as const }
}

function insertPost(authorId: string, overrides: Partial<{
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
  db.insert(schema.posts).values(data).run()
  return { ...data }
}

describe('getPosts (DB layer)', () => {
  it('returns all posts from the DB', () => {
    const admin = makeAdminUser()
    const post1 = insertPost(admin.id, { title: 'Alpha', status: 'published', publishedAt: new Date() })
    const post2 = insertPost(admin.id, { title: 'Beta', status: 'draft' })

    const rows = db.select({ id: schema.posts.id, title: schema.posts.title })
      .from(schema.posts)
      .where(eq(schema.posts.authorId, admin.id))
      .all()

    expect(rows.length).toBeGreaterThanOrEqual(2)
    const titles = rows.map((r) => r.title)
    expect(titles).toContain('Alpha')
    expect(titles).toContain('Beta')
  })

  it('filters by status=published', () => {
    const admin = makeAdminUser()
    insertPost(admin.id, { title: 'Published', status: 'published', publishedAt: new Date() })
    insertPost(admin.id, { title: 'Hidden Draft', status: 'draft' })

    const rows = db.select({ id: schema.posts.id, status: schema.posts.status })
      .from(schema.posts)
      .where(and(
        eq(schema.posts.authorId, admin.id),
        eq(schema.posts.status, 'published'),
      ))
      .all()

    expect(rows.every((r) => r.status === 'published')).toBe(true)
  })

  it('returns empty array when no posts exist for a new user', () => {
    const admin = makeAdminUser()
    const rows = db.select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.authorId, admin.id))
      .all()
    expect(rows).toHaveLength(0)
  })
})

describe('createPost (DB layer)', () => {
  it('inserts a post and returns it', () => {
    const admin = makeAdminUser()
    const id = randomUUID()
    const now = new Date()
    db.insert(schema.posts).values({
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
    }).run()

    const row = db.select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
      .get()

    expect(row).not.toBeNull()
    expect(row!.title).toBe('New Post')
    expect(row!.status).toBe('draft')
    expect(row!.authorId).toBe(admin.id)
  })

  it('rejects a post with a duplicate slug', () => {
    const admin = makeAdminUser()
    const id1 = randomUUID()
    const slug = `dup-slug-${randomUUID()}`
    const now = new Date()

    db.insert(schema.posts).values({
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
    }).run()

    const id2 = randomUUID()
    expect(() => {
      db.insert(schema.posts).values({
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
      }).run()
    }).toThrow()
  })
})

describe('updatePost (DB layer)', () => {
  it('updates the title and status of a post', () => {
    const admin = makeAdminUser()
    const post = insertPost(admin.id, { title: 'Original Title', status: 'draft' })

    db.update(schema.posts)
      .set({ title: 'Updated Title', status: 'published', updatedAt: new Date() })
      .where(eq(schema.posts.id, post.id))
      .run()

    const row = db.select({ title: schema.posts.title, status: schema.posts.status })
      .from(schema.posts)
      .where(eq(schema.posts.id, post.id))
      .get()

    expect(row!.title).toBe('Updated Title')
    expect(row!.status).toBe('published')
  })

  it('returns not found for a non-existent post ID', () => {
    const fakeId = randomUUID()
    const row = db.select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, fakeId))
      .get()

    expect(row).toBeUndefined()
  })
})
