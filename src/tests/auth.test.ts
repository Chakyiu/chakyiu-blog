import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from '../lib/db/schema'
import { eq, sql } from 'drizzle-orm'
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

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  return null
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ success: true; data: { id: string; role: string } } | { success: false; error: string }> {
  if (!validateEmail(email)) {
    return { success: false, error: 'Invalid email format' }
  }
  const pwError = validatePassword(password)
  if (pwError) return { success: false, error: pwError }

  const passwordHash = await Bun.password.hash(password)
  const id = randomUUID()

  const result = sqlite.transaction(() => {
    const existing = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).get()
    if (existing) return { success: false as const, error: 'Email already registered' }

    const count = db.select({ count: sql<number>`count(*)` }).from(schema.users).get()
    const role: 'admin' | 'user' = (count?.count ?? 0) === 0 ? 'admin' : 'user'

    db.insert(schema.users).values({ id, name, email, passwordHash, role }).run()
    return { success: true as const, data: { id, role } }
  })()

  return result as { success: true; data: { id: string; role: string } } | { success: false; error: string }
}

describe('registerUser', () => {
  it('registers a new user successfully', async () => {
    const email = `new-${randomUUID()}@example.com`
    const result = await registerUser('Alice', email, 'Password1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBeTruthy()
      expect(['admin', 'user']).toContain(result.data.role)
    }
  })

  it('rejects duplicate email registration', async () => {
    const email = `dup-${randomUUID()}@example.com`

    const first = await registerUser('Bob', email, 'Password1')
    expect(first.success).toBe(true)

    const second = await registerUser('Bobby', email, 'Password1')
    expect(second.success).toBe(false)
    if (!second.success) {
      expect(second.error).toBe('Email already registered')
    }
  })

  it('rejects invalid email format', async () => {
    const result = await registerUser('Charlie', 'not-an-email', 'Password1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Invalid email format')
    }
  })

  it('rejects weak password (too short)', async () => {
    const result = await registerUser('Dave', `dave-${randomUUID()}@example.com`, 'abc')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('8 characters')
    }
  })

  it('rejects password with no uppercase letter', async () => {
    const result = await registerUser('Eve', `eve-${randomUUID()}@example.com`, 'password1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('uppercase')
    }
  })
})
