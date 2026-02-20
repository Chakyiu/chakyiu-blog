import { db } from '../src/lib/db/index'
import * as schema from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync } from 'fs'

const lines: string[] = []

function log(msg: string) {
  console.log(msg)
  lines.push(msg)
}

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '')
}

async function main() {
  log('=== Task 12 QA: Tag Management System ===')
  log(`Timestamp: ${new Date().toISOString()}`)
  log('')

  const testTagName = `qa-test-tag-${Date.now()}`
  const testTagSlug = toSlug(testTagName)
  const testTagColor = '#0075ca'
  const testTagId = randomUUID()

  log('--- Test 1: Insert tag directly via DB ---')
  await db.insert(schema.tags).values({
    id: testTagId,
    name: testTagName,
    slug: testTagSlug,
    color: testTagColor,
  })
  log(`PASS: Inserted tag id=${testTagId} name="${testTagName}" slug="${testTagSlug}"`)

  log('')
  log('--- Test 2: Query tags via DB (getTags equivalent) ---')
  const tags = await db.select().from(schema.tags).where(eq(schema.tags.id, testTagId))
  if (tags.length !== 1) throw new Error(`Expected 1 tag, got ${tags.length}`)
  const tag = tags[0]
  log(`PASS: Found tag: name="${tag.name}" slug="${tag.slug}" color="${tag.color}"`)

  log('')
  log('--- Test 3: Update tag ---')
  const updatedName = `${testTagName}-updated`
  const updatedSlug = toSlug(updatedName)
  await db.update(schema.tags).set({ name: updatedName, slug: updatedSlug, color: '#e11d48' }).where(eq(schema.tags.id, testTagId))
  const updated = await db.select().from(schema.tags).where(eq(schema.tags.id, testTagId))
  if (updated[0].name !== updatedName) throw new Error('Update failed: name mismatch')
  if (updated[0].color !== '#e11d48') throw new Error('Update failed: color mismatch')
  log(`PASS: Updated tag name="${updated[0].name}" color="${updated[0].color}"`)

  log('')
  log('--- Test 4: Delete tag ---')
  await db.delete(schema.tags).where(eq(schema.tags.id, testTagId))
  const deleted = await db.select().from(schema.tags).where(eq(schema.tags.id, testTagId))
  if (deleted.length !== 0) throw new Error('Delete failed: tag still exists')
  log(`PASS: Tag deleted, no rows found`)

  log('')
  log('--- Test 5: Zod validation ---')
  const { createTagSchema, updateTagSchema } = await import('../src/lib/validators/tag')
  const valid = createTagSchema.safeParse({ name: 'Test Tag', color: '#0075ca' })
  if (!valid.success) throw new Error('Valid input failed Zod parse')
  log('PASS: createTagSchema accepts valid input')

  const invalid = createTagSchema.safeParse({ name: '', color: 'not-a-color' })
  if (invalid.success) throw new Error('Invalid input passed Zod parse unexpectedly')
  log(`PASS: createTagSchema rejects invalid input (${invalid.error.issues.length} issues)`)

  const updateValid = updateTagSchema.safeParse({ tagId: randomUUID(), name: 'Updated', color: '#7057ff' })
  if (!updateValid.success) throw new Error('Valid updateTagSchema failed')
  log('PASS: updateTagSchema accepts valid input')

  log('')
  log('--- Test 6: List all tags (DB count baseline) ---')
  const allTags = await db.select().from(schema.tags)
  log(`PASS: Total tags in DB: ${allTags.length}`)

  log('')
  log('=== All tests PASSED ===')
  log('')
  log('Files created:')
  log('  src/lib/validators/tag.ts        - Zod schemas for tag CRUD')
  log('  src/lib/actions/tags.ts          - Server Actions: getTags, getTagBySlug, createTag, updateTag, deleteTag')
  log('  src/components/blog/tag-badge.tsx - Reusable TagBadge component with color + link support')
  log('  src/app/(admin)/admin/tags/page.tsx       - Admin tags server page')
  log('  src/app/(admin)/admin/tags/tags-manager.tsx - Client-side tags CRUD manager')

  mkdirSync('.sisyphus/evidence', { recursive: true })
  writeFileSync('.sisyphus/evidence/task-12-crud.txt', lines.join('\n') + '\n')
  log('\nEvidence saved to .sisyphus/evidence/task-12-crud.txt')
}

main().catch((err) => {
  console.error('QA FAILED:', err)
  process.exit(1)
})
