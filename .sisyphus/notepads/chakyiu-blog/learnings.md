# Learnings — chakyiu-blog

## Project Overview
- Greenfield project: /Users/chakyiu/Documents/github/2026/chakyiu-blog
- Stack: Next.js 16 + Bun + Tailwind v4 + shadcn/ui + Drizzle ORM + SQLite + Auth.js v5
- Package manager: bun (native SQLite, Argon2id, test runner)

## Critical Architecture Decisions
- Next.js 16 uses `proxy.ts` NOT `middleware.ts` for auth (breaking change from v15)
- Auth.js v5 Credentials provider FORCES JWT session strategy (no database sessions)
- `Bun.password.hash()` uses Argon2id natively — no bcrypt needed
- Drizzle ORM with `bun:sqlite` driver — native integration
- FTS5 virtual tables need raw SQL (not Drizzle schema)
- SQLite WAL mode MUST be enabled

## Must Have (from plan)
- Server-side markdown rendering ONLY (never ship parser to client)
- Pre-rendered code highlighting at save time (store raw + HTML in DB)
- XSS sanitization via `rehype-sanitize` on all user-submitted markdown
- JWT session strategy (forced by Credentials provider)
- `Bun.password.hash()` for hashing (Argon2id)
- WAL mode on SQLite
- Consistent Server Action return type: `{ success: boolean, error?: string, data?: T }`
- First-user admin check via DB transaction (prevent race condition)
- `proxy.ts` for auth middleware (NOT `middleware.ts`)
- FTS5 via raw SQL in Drizzle migrations

## Must NOT Have
- No client-side state management libraries (Redux, Zustand, etc.)
- No custom `.css` files (Tailwind + shadcn/ui only, except `globals.css`)
- No API routes for internal data (Server Actions only)
- No email notifications, WebSocket, nested comments, autocomplete
- No user profile pages, bios, custom avatar uploads
- No analytics, telemetry, over-engineered error hierarchies

## Deployment
- SQLite at `/data/sqlite.db` (Docker volume)
- Uploads at `/data/uploads/` (served via API route `/api/uploads/[...path]`)
- Docker multi-stage build with `oven/bun:1` base images
