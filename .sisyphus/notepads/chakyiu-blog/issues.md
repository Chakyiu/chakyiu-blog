# Issues & Gotchas — chakyiu-blog

## Known Gotchas from Plan

### Auth.js v5
- `OAuthAccountNotLinked` error MUST be caught in `signIn` callback when same email used for both email/password and GitHub OAuth
- Credentials provider forces JWT strategy — cannot use database sessions
- `proxy.ts` pattern: `export { auth as proxy } from "@/auth"` — NOT middleware.ts

### Next.js 16
- `proxy.ts` replaces `middleware.ts` for auth route protection
- Route groups `(blog)` and `(admin)` allow different layouts without affecting URLs

### Bun
- Use `Bun.password.hash()` for Argon2id — no bcrypt dependency
- Use `bun:sqlite` for SQLite — NOT better-sqlite3 or better-drizzle packages
- Use `Bun.write()` for file IO — more efficient than Node.js fs

### SQLite / Drizzle
- FTS5 virtual tables NOT supported by Drizzle schema — must use raw SQL migrations
- FTS5 triggers needed for auto-sync on INSERT/UPDATE/DELETE
- WAL mode: `PRAGMA journal_mode = WAL` in db initialization
- SQLite during `next build` — Dynamic imports needed, build-time guards

### Tailwind v4
- Uses `@import "tailwindcss"` in CSS (NOT `@tailwind` directives from v3)
- Dark mode config differs from v3 — use `class` strategy

### Security
- XSS: rehype-sanitize MUST run AFTER rehype-shiki (not before)
- FTS5 injection: wrap user queries in double quotes
- First-user race condition: use DB transaction with user count check

### Docker
- Entrypoint MUST run `drizzle-kit migrate` before server start
- Use `oven/bun:1` base (NOT node images)
- Images served outside `public/` via `/api/uploads/[...path]` route

## Problems to Watch
- Circular imports between src/types and src/lib/db/schema — keep separate
- SQLite file path must match between migrations and runtime
