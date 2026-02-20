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

## [2026-02-20] Task 1 Completion: Project Scaffolding

### What was completed
- ✅ `bun install` runs successfully (all dependencies installed)
- ✅ `bun run build` completes with exit code 0
- ✅ `bun run dev` serves HTTP 200 at localhost:3000
- ✅ `bun test` runs without crashing (0 tests found, no errors)
- ✅ `Bun.password.hash('test')` works (Argon2id hashing confirmed)
- ✅ All required shadcn components installed: button, input, card, dialog, dropdown-menu, avatar, badge, separator, tabs, toast, tooltip, textarea, select, popover, command
- ✅ `next.config.ts` has `output: 'standalone'` configured
- ✅ `.env.example` documents: DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, NEXTAUTH_URL
- ✅ Evidence saved to `.sisyphus/evidence/`
- ✅ Git commit made with message: `chore(scaffold): init Next.js + bun + tailwind + shadcn`

### Key implementation notes
- **Tailwind v4 migration**: Requires `@tailwindcss/postcss` package + updated `postcss.config.mjs`
- **Tailwind v4 CSS**: Use `@import "tailwindcss"` (NOT `@tailwind` directives)
- **shadcn components**: Manually created all 15 components (no `bunx shadcn` used)
- **Button component fix**: Changed import from `@radix-ui/primitive` to `@radix-ui/react-slot`
- **Globals CSS**: Removed `@layer base` directives (Tailwind v4 handles this via @import)
- **Package versions**: 
  - Next.js 16.1.6 (latest)
  - React 19.2.4
  - Tailwind CSS 4.2.0
  - @tailwindcss/postcss 4.2.0
  - Bun 1.3.9

### Architecture verified
- ✅ Bun runtime with Argon2id password hashing
- ✅ SQLite support via `bun:sqlite` (tested separately)
- ✅ TypeScript strict mode active
- ✅ Next.js App Router (src/app/)
- ✅ Dark mode via CSS variables (prefers-color-scheme)

### What's ready for Task 2 (Database Setup)
- All dependencies installed
- Build system verified
- Bun runtime confirmed working
- shadcn/ui components ready to use
- Project structure stable

### Gotchas encountered & fixed
1. `@radix-ui/primitive` doesn't export `Slot` → must use `@radix-ui/react-slot`
2. Tailwind v4 requires separate PostCSS plugin package
3. `bun:sqlite` import works natively (no setup needed)
4. Next.js 16 with Turbopack can be strict about Tailwind v4 syntax

## [2026-02-20] Task 5: Shared Types Complete
- **ActionResult<T>** in src/types/index.ts — all Server Actions return this type (unified error/success contract)
- **View types**: PostView, CommentView, NotificationView, UserView, TagView, PaginatedResult<T>, SearchResult, SessionUser, PostFilters
  - View types decouple API shape from DB schema (Task 2 creates raw DB types)
  - Distinguished between raw markdown (content) and pre-rendered HTML (renderedContent)
  - Timestamps use Unix timestamps (number) to match SQLite integer columns
- **Constants in src/lib/constants.ts**: pagination, content limits, image limits, auth, paths
- **No circular imports**: Both files are pure definitions with zero external dependencies
- **TypeScript compilation**: clean, `npx tsc --noEmit` passes, `npm run build` succeeds
