import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { _db: ReturnType<typeof drizzle> | undefined }

function createDb() {
  const url = process.env.DATABASE_URL ?? './data/sqlite.db'
  const sqlite = new Database(url, { create: true })
  sqlite.exec('PRAGMA journal_mode = WAL;')
  sqlite.exec('PRAGMA foreign_keys = ON;')
  return drizzle(sqlite, { schema })
}

export const db = globalForDb._db ?? createDb()
if (process.env.NODE_ENV !== 'production') globalForDb._db = db
