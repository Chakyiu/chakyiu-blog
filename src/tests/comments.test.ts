import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '../lib/db/schema'
import { eq } from 'drizzle-orm'
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

function makeUser(role: 'admin' | 'user' = 'user') {
  const id = randomUUID()
  db.insert(schema.users).values({
    id,
    name: 'Test User',
    email: `user-${id}@example.com`,
    role,
    passwordHash: 'x',
  }).run()
  return { id }
}

function makePost(authorId: string) {
  const id = randomUUID()
  const now = new Date()
  db.insert(schema.posts).values({
    id,
    title: 'Comment Test Post',
    slug: `comment-post-${id}`,
    content: '.',
    renderedContent: '.',
    authorId,
    status: 'published',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  }).run()
  return { id }
}

describe('getComments (DB layer)', () => {
  it('returns empty array when no comments exist', () => {
    const user = makeUser()
    const post = makePost(user.id)

    const rows = db.select()
      .from(schema.comments)
      .where(eq(schema.comments.postId, post.id))
      .all()

    expect(rows).toHaveLength(0)
  })

  it('returns comments for a given post', () => {
    const user = makeUser()
    const post = makePost(user.id)
    const commentId = randomUUID()

    db.insert(schema.comments).values({
      id: commentId,
      content: 'Hello world',
      renderedContent: '<p>Hello world</p>',
      postId: post.id,
      authorId: user.id,
      parentId: null,
      hidden: false,
      createdAt: new Date(),
    }).run()

    const rows = db.select({ id: schema.comments.id, content: schema.comments.content })
      .from(schema.comments)
      .where(eq(schema.comments.postId, post.id))
      .all()

    expect(rows).toHaveLength(1)
    expect(rows[0]!.content).toBe('Hello world')
  })
})

describe('createComment (DB layer)', () => {
  it('inserts a comment and retrieves it', () => {
    const user = makeUser()
    const post = makePost(user.id)
    const id = randomUUID()
    const now = new Date()

    db.insert(schema.comments).values({
      id,
      content: 'Great post!',
      renderedContent: '<p>Great post!</p>',
      postId: post.id,
      authorId: user.id,
      parentId: null,
      hidden: false,
      createdAt: now,
    }).run()

    const row = db.select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id))
      .get()

    expect(row).not.toBeNull()
    expect(row!.content).toBe('Great post!')
    expect(row!.postId).toBe(post.id)
    expect(row!.hidden).toBe(false)
  })

  it('rejects comment with invalid postId (foreign key)', () => {
    const user = makeUser()
    const fakePostId = randomUUID()

    expect(() => {
      db.insert(schema.comments).values({
        id: randomUUID(),
        content: 'Orphaned comment',
        renderedContent: '<p>Orphaned</p>',
        postId: fakePostId,
        authorId: user.id,
        parentId: null,
        hidden: false,
        createdAt: new Date(),
      }).run()
    }).toThrow()
  })
})
