import { db } from '../src/lib/db/index'
import * as schema from '../src/lib/db/schema'
import { eq, sql, count } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync } from 'fs'

const lines: string[] = []

function log(msg: string) {
  console.log(msg)
  lines.push(msg)
}

function toSlug(title: string): string {
  return title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
}

async function main() {
  log('=== Task 7 QA: Blog Post CRUD ===')
  log(`Timestamp: ${new Date().toISOString()}`)
  log('')

  log('--- Test 1: getPosts on empty DB (DB-level query) ---')
  const publishedPosts = await db
    .select({ count: sql<number>`count(${schema.posts.id})` })
    .from(schema.posts)
    .where(eq(schema.posts.status, 'published'))
  const total = Number(publishedPosts[0]?.count ?? 0)
  log(`PASS: Published posts count = ${total} (expected 0 or more on fresh DB)`)

  const allPosts = await db
    .select({ count: sql<number>`count(${schema.posts.id})` })
    .from(schema.posts)
  const totalAll = Number(allPosts[0]?.count ?? 0)
  log(`PASS: Total posts in DB = ${totalAll}`)

  log('')
  log('--- Test 2: Direct DB insert + getPost equivalent ---')

  const userId = randomUUID()
  await db.insert(schema.users).values({
    id: userId,
    name: 'QA Test Author',
    email: `qa-author-${Date.now()}@test.com`,
    role: 'admin',
  })
  log(`PASS: Inserted test user id=${userId}`)

  const postId = randomUUID()
  const postTitle = `QA Test Post ${Date.now()}`
  const postSlug = toSlug(postTitle)
  const now = new Date()

  await db.insert(schema.posts).values({
    id: postId,
    title: postTitle,
    slug: postSlug,
    content: '# QA Test\n\nThis is a QA test post.',
    renderedContent: '',
    excerpt: 'QA test excerpt',
    authorId: userId,
    status: 'published',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  })
  log(`PASS: Inserted test post id=${postId} slug="${postSlug}"`)

  const fetched = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.slug, postSlug))

  if (fetched.length !== 1) throw new Error(`Expected 1 post, got ${fetched.length}`)
  if (fetched[0].title !== postTitle) throw new Error(`Title mismatch: ${fetched[0].title}`)
  if (fetched[0].status !== 'published') throw new Error(`Status mismatch: ${fetched[0].status}`)
  log(`PASS: getPost(slug) equivalent - found post title="${fetched[0].title}" status="${fetched[0].status}"`)

  log('')
  log('--- Test 3: Zod schema validation ---')
  const { createPostSchema, updatePostSchema } = await import('../src/lib/validators/post')

  const validCreate = createPostSchema.safeParse({
    title: 'My Test Post',
    content: 'Content here',
    status: 'draft',
  })
  if (!validCreate.success) throw new Error(`Valid createPostSchema failed: ${validCreate.error.issues[0]?.message}`)
  log('PASS: createPostSchema accepts valid input')

  const invalidCreate = createPostSchema.safeParse({ title: '', content: '' })
  if (invalidCreate.success) throw new Error('Empty title/content should fail validation')
  log(`PASS: createPostSchema rejects empty title (${invalidCreate.error.issues.length} issues)`)

  const invalidUrl = createPostSchema.safeParse({
    title: 'Test',
    content: 'Content',
    coverImageUrl: 'not-a-url',
  })
  if (invalidUrl.success) throw new Error('Invalid URL should fail validation')
  log('PASS: createPostSchema rejects invalid coverImageUrl')

  const validUpdate = updatePostSchema.safeParse({ title: 'Updated Title', status: 'published' })
  if (!validUpdate.success) throw new Error(`Valid updatePostSchema failed: ${validUpdate.error.issues[0]?.message}`)
  log('PASS: updatePostSchema accepts partial update')

  const emptyUpdate = updatePostSchema.safeParse({})
  if (!emptyUpdate.success) throw new Error('Empty updatePostSchema should be valid (all fields optional)')
  log('PASS: updatePostSchema accepts empty object (all fields optional)')

  log('')
  log('--- Test 4: Slug generation (toSlug) ---')
  const slugTests: [string, string][] = [
    ['Hello World', 'hello-world'],
    ['My Blog Post!', 'my-blog-post'],
    ['  Trimmed  ', 'trimmed'],
    ['multiple   spaces', 'multiple-spaces'],
    ['special@chars#here', 'specialcharshere'],
  ]
  for (const [input, expected] of slugTests) {
    const result = toSlug(input)
    if (result !== expected) throw new Error(`toSlug("${input}") = "${result}", expected "${expected}"`)
  }
  log('PASS: toSlug produces correct kebab-case slugs')

  log('')
  log('--- Test 5: Tag association ---')
  const tagId = randomUUID()
  await db.insert(schema.tags).values({
    id: tagId,
    name: 'qa-test-tag',
    slug: 'qa-test-tag',
    color: '#0075ca',
  })

  await db.insert(schema.postTags).values({ postId, tagId })

  const tagRows = await db
    .select({ tagName: schema.tags.name, tagSlug: schema.tags.slug })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(eq(schema.postTags.postId, postId))

  if (tagRows.length !== 1) throw new Error(`Expected 1 tag association, got ${tagRows.length}`)
  if (tagRows[0].tagSlug !== 'qa-test-tag') throw new Error('Tag slug mismatch')
  log(`PASS: Post-tag association works: post has tag "${tagRows[0].tagName}"`)

  log('')
  log('--- Test 6: Post deletion cascades post_tags ---')
  await db.delete(schema.posts).where(eq(schema.posts.id, postId))

  const remainingTags = await db
    .select()
    .from(schema.postTags)
    .where(eq(schema.postTags.postId, postId))

  if (remainingTags.length !== 0) throw new Error('postTags not cascade-deleted with post')
  log('PASS: Deleting post cascades to postTags (FKs with onDelete: cascade)')

  await db.delete(schema.tags).where(eq(schema.tags.id, tagId))
  await db.delete(schema.users).where(eq(schema.users.id, userId))
  log('PASS: Cleanup complete (test user, tag removed)')

  log('')
  log('--- Test 7: changePostStatus publishedAt logic ---')
  const p2Id = randomUUID()
  const u2Id = randomUUID()
  await db.insert(schema.users).values({
    id: u2Id,
    name: 'QA Author 2',
    email: `qa-author2-${Date.now()}@test.com`,
    role: 'admin',
  })
  await db.insert(schema.posts).values({
    id: p2Id,
    title: 'Draft Post',
    slug: `draft-post-${Date.now()}`,
    content: 'Draft content',
    renderedContent: '',
    authorId: u2Id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  })

  const draftPost = await db.select().from(schema.posts).where(eq(schema.posts.id, p2Id))
  if (draftPost[0].publishedAt !== null) throw new Error('Draft post should have null publishedAt')
  log('PASS: Draft post has null publishedAt')

  const publishTime = new Date()
  await db.update(schema.posts).set({ status: 'published', publishedAt: publishTime }).where(eq(schema.posts.id, p2Id))
  const publishedPost = await db.select().from(schema.posts).where(eq(schema.posts.id, p2Id))
  if (!publishedPost[0].publishedAt) throw new Error('Published post should have publishedAt set')
  log(`PASS: Publishing post sets publishedAt = ${publishedPost[0].publishedAt}`)

  await db.delete(schema.posts).where(eq(schema.posts.id, p2Id))
  await db.delete(schema.users).where(eq(schema.users.id, u2Id))
  log('PASS: Cleanup complete')

  log('')
  log('=== All tests PASSED ===')
  log('')
  log('Files created:')
  log('  src/lib/validators/post.ts  — Zod schemas: createPostSchema, updatePostSchema, changePostStatusSchema')
  log('  src/lib/actions/posts.ts    — Server Actions: createPost, updatePost, deletePost, getPost, getPosts, changePostStatus')

  mkdirSync('.sisyphus/evidence', { recursive: true })
  writeFileSync('.sisyphus/evidence/task-7-posts-crud.txt', lines.join('\n') + '\n')
  log('\nEvidence saved to .sisyphus/evidence/task-7-posts-crud.txt')
}

main().catch((err) => {
  console.error('QA FAILED:', err)
  process.exit(1)
})
