import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../lib/db/schema'
import { eq } from 'drizzle-orm'
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

async function makeUser(role: 'admin' | 'user' = 'user') {
  const id = randomUUID()
  await db.insert(schema.users).values({
    id,
    name: 'Test User',
    email: `user-${id}@example.com`,
    role,
    passwordHash: 'x',
  })
  return { id }
}

async function makePost(authorId: string) {
  const id = randomUUID()
  const now = new Date()
  await db.insert(schema.posts).values({
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
  })
  return { id }
}

describe('getComments (DB layer)', () => {
  it('returns empty array when no comments exist', async () => {
    const user = await makeUser()
    const post = await makePost(user.id)

    const rows = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.postId, post.id))

    expect(rows).toHaveLength(0)
  })

  it('returns comments for a given post', async () => {
    const user = await makeUser()
    const post = await makePost(user.id)
    const commentId = randomUUID()

    await db.insert(schema.comments).values({
      id: commentId,
      content: 'Hello world',
      renderedContent: '<p>Hello world</p>',
      postId: post.id,
      authorId: user.id,
      parentId: null,
      hidden: false,
      createdAt: new Date(),
    })

    const rows = await db.select({ id: schema.comments.id, content: schema.comments.content })
      .from(schema.comments)
      .where(eq(schema.comments.postId, post.id))

    expect(rows).toHaveLength(1)
    expect(rows[0]!.content).toBe('Hello world')
  })
})

describe('createComment (DB layer)', () => {
  it('inserts a comment and retrieves it', async () => {
    const user = await makeUser()
    const post = await makePost(user.id)
    const id = randomUUID()
    const now = new Date()

    await db.insert(schema.comments).values({
      id,
      content: 'Great post!',
      renderedContent: '<p>Great post!</p>',
      postId: post.id,
      authorId: user.id,
      parentId: null,
      hidden: false,
      createdAt: now,
    })

    const [row] = await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.id, id))
      .limit(1)

    expect(row).not.toBeNull()
    expect(row!.content).toBe('Great post!')
    expect(row!.postId).toBe(post.id)
    expect(row!.hidden).toBe(false)
  })

  it('rejects comment with invalid postId (foreign key)', async () => {
    const user = await makeUser()
    const fakePostId = randomUUID()

    expect(async () => {
      await db.insert(schema.comments).values({
        id: randomUUID(),
        content: 'Orphaned comment',
        renderedContent: '<p>Orphaned</p>',
        postId: fakePostId,
        authorId: user.id,
        parentId: null,
        hidden: false,
        createdAt: new Date(),
      })
    }).toThrow()
  })
})
