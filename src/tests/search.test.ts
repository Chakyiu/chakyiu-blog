import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '../lib/db/schema'
import { sql } from 'drizzle-orm'
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

function makeUser() {
  const id = randomUUID()
  db.insert(schema.users).values({
    id,
    name: 'Author',
    email: `search-user-${id}@example.com`,
    role: 'admin',
    passwordHash: 'x',
  }).run()
  return { id }
}

function insertPublishedPost(authorId: string, title: string, content: string) {
  const id = randomUUID()
  const now = new Date()
  db.insert(schema.posts).values({
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
  }).run()
  return { id }
}

describe('searchPosts (DB layer via raw SQL)', () => {
  it('returns matching published posts via FTS5', () => {
    const user = makeUser()
    insertPublishedPost(user.id, 'Bun Runtime Guide', 'Bun is a fast JavaScript runtime')
    insertPublishedPost(user.id, 'Node vs Bun', 'Comparing Node and Bun runtimes')

    type FtsRow = { id: string; title: string }
    const rows = sqlite.prepare<FtsRow, [string]>(`
      SELECT posts.id, posts.title
      FROM posts_fts
      JOIN posts ON posts.rowid = posts_fts.rowid
      WHERE posts_fts MATCH ?
        AND posts.status = 'published'
      ORDER BY bm25(posts_fts)
    `).all('Bun')

    expect(rows.length).toBeGreaterThanOrEqual(2)
    rows.forEach((r) => {
      expect(r.title.toLowerCase()).toContain('bun')
    })
  })

  it('returns empty array when query matches nothing', () => {
    type FtsRow = { id: string }
    const rows = sqlite.prepare<FtsRow, [string]>(`
      SELECT posts.id
      FROM posts_fts
      JOIN posts ON posts.rowid = posts_fts.rowid
      WHERE posts_fts MATCH ?
        AND posts.status = 'published'
    `).all('xyzzy_no_match_ever_12345')

    expect(rows).toHaveLength(0)
  })

  it('does not return draft posts in search results', () => {
    const user = makeUser()
    const id = randomUUID()
    const now = new Date()
    db.insert(schema.posts).values({
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
    }).run()

    type FtsRow = { id: string; title: string }
    const rows = sqlite.prepare<FtsRow, [string]>(`
      SELECT posts.id, posts.title
      FROM posts_fts
      JOIN posts ON posts.rowid = posts_fts.rowid
      WHERE posts_fts MATCH ?
        AND posts.status = 'published'
    `).all('HiddenDraftSpecialKeyword42')

    expect(rows).toHaveLength(0)
  })
})
