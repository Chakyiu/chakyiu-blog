import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { mkdirSync } from 'node:fs'

const url = process.env.DATABASE_URL ?? './data/sqlite.db'
const dir = url.includes('/') ? url.substring(0, url.lastIndexOf('/')) : '.'
if (dir && dir !== '.') mkdirSync(dir, { recursive: true })

const sqlite = new Database(url, { create: true })
sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')
const db = drizzle(sqlite)

await migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations applied successfully')
sqlite.close()
