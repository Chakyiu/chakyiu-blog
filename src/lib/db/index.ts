import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from './schema'

type DbInstance = ReturnType<typeof drizzle<typeof schema>>

const globalForDb = globalThis as unknown as { _db: DbInstance | undefined }

const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../../')

function resolveDbUrl(url: string): string {
  if (path.isAbsolute(url)) return url
  return path.resolve(PROJECT_ROOT, url)
}

function createDb(): DbInstance {
  const rawUrl = process.env.DATABASE_URL ?? './data/sqlite.db'
  const url = resolveDbUrl(rawUrl)
  const sqlite = new Database(url, { create: true })
  sqlite.exec('PRAGMA journal_mode = WAL;')
  sqlite.exec('PRAGMA foreign_keys = ON;')
  return drizzle(sqlite, { schema })
}

export const db: DbInstance = globalForDb._db ?? createDb()
if (process.env.NODE_ENV !== 'production') globalForDb._db = db
