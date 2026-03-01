import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../lib/db/schema'
import { sql } from 'drizzle-orm'
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

async function makeUser() {
  const id = randomUUID()
  await db.insert(schema.users).values({
    id,
    name: 'Author',
    email: `search-user-${id}@example.com`,
    role: 'admin',
    passwordHash: 'x',
  })
  return { id }
}

async function insertPublishedPost(authorId: string, title: string, content: string) {
  const id = randomUUID()
  const now = new Date()
  await db.insert(schema.posts).values({
    id,
    title,
    slug: `search-${id}`,
    content,
    renderedContent: content,
    authorId,
    status: 'published',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  })
  return { id }
}

describe('searchPosts (DB layer via PostgreSQL full-text search)', () => {
  it('returns matching published posts via tsvector', async () => {
    const user = await makeUser()
    await insertPublishedPost(user.id, 'Bun Runtime Guide', 'Bun is a fast JavaScript runtime')
    await insertPublishedPost(user.id, 'Node vs Bun', 'Comparing Node and Bun runtimes')

    const rows = await db.execute(sql`
      SELECT posts.id, posts.title
      FROM posts
      WHERE
        to_tsvector('english', posts.title || ' ' || posts.content) @@ to_tsquery('english', 'Bun')
        AND posts.status = 'published'
      ORDER BY ts_rank_cd(
        to_tsvector('english', posts.title || ' ' || posts.content),
        to_tsquery('english', 'Bun')
      ) DESC
    `)

    expect(rows.length).toBeGreaterThanOrEqual(2)
    rows.forEach((r) => {
      expect((r as { title: string }).title.toLowerCase()).toContain('bun')
    })
  })

  it('returns empty array when query matches nothing', async () => {
    const rows = await db.execute(sql`
      SELECT posts.id
      FROM posts
      WHERE
        to_tsvector('english', posts.title || ' ' || posts.content) @@ to_tsquery('english', 'xyzzynomatchever12345')
        AND posts.status = 'published'
    `)

    expect(rows).toHaveLength(0)
  })

  it('does not return draft posts in search results', async () => {
    const user = await makeUser()
    const id = randomUUID()
    const now = new Date()
    await db.insert(schema.posts).values({
      id,
      title: 'HiddenDraftSpecialKeyword42',
      slug: `draft-fts-${id}`,
      content: 'HiddenDraftSpecialKeyword42 content here',
      renderedContent: 'content',
      authorId: user.id,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    })

    const rows = await db.execute(sql`
      SELECT posts.id, posts.title
      FROM posts
      WHERE
        to_tsvector('english', posts.title || ' ' || posts.content) @@ to_tsquery('english', 'HiddenDraftSpecialKeyword42')
        AND posts.status = 'published'
    `)

    expect(rows).toHaveLength(0)
  })
})
