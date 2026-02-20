# ChaKyiu Blog — IT Developer Blog (Next.js 16)

## TL;DR

> **Quick Summary**: Build a full-featured IT developer blog with GitHub PR-like layout, using Next.js 16 + Drizzle ORM + SQLite + Auth.js v5. Supports markdown posts with code highlighting, threaded comments, admin panel, search, notifications, and Docker deployment.
> 
> **Deliverables**:
> - Full-stack Next.js 16 blog application
> - Auth system (email+password + GitHub OAuth) with RBAC
> - Blog CRUD with markdown editor + Shiki code highlighting
> - Comment/reply system with markdown support and XSS sanitization
> - In-app notification system
> - Full-text search (SQLite FTS5)
> - Admin panel (role management, content moderation)
> - Image upload with local filesystem storage
> - Dark/light mode toggle
> - RSS feed
> - Docker deployment with multi-stage build
> 
> **Estimated Effort**: XL (25+ tasks across 6 waves)
> **Parallel Execution**: YES — 6 waves, up to 8 concurrent tasks
> **Critical Path**: Scaffolding → DB Schema → Auth → Blog CRUD → Comments → Integration

---

## Context

### Original Request
Build a personal blog web app using Next.js 16 with a layout inspired by GitHub's Pull Requests page. Only admins can create posts. Signed-in users can comment, reply, and view their history/notifications. Admin can edit/remove posts and moderate comments. SQLite for storage. Email + GitHub OAuth for signin.

### Interview Summary
**Key Discussions**:
- **Package manager/runtime**: bun (native SQLite support via bun:sqlite)
- **Post authoring**: Markdown with live preview, stored in DB (not MDX files)
- **Notifications**: In-app only (no email service dependency)
- **Admin model**: First registered user auto-becomes admin; admin panel for promoting/demoting others
- **Email signin**: Traditional email+password (not magic link)
- **Comments**: Markdown-enabled with code block support
- **Images**: Local filesystem, Docker volume mount for persistence
- **Deployment**: Docker with multi-stage build
- **Testing**: Tests after implementation using bun test. Agent QA for every task.
- **Extra features**: Tags, search, image uploads, dark/light mode, code highlighting, RSS feed

**Research Findings**:
- Next.js 16 uses `proxy.ts` instead of `middleware.ts` for auth — breaking change from v15
- Auth.js v5 Credentials provider forces JWT session strategy (no database sessions)
- `Bun.password.hash()` uses Argon2id natively — no bcrypt dependency needed
- Drizzle ORM has native bun:sqlite driver. FTS5 virtual tables need raw SQL.
- shadcn/ui + Tailwind CSS v4 provide closest GitHub-like developer aesthetic

### Metis Review
**Identified Gaps** (addressed in plan):
- Account linking conflict (email+password vs GitHub OAuth same email) → Block with clear error message
- XSS in user-submitted markdown comments → `rehype-sanitize` mandatory
- First-user admin race condition → DB transaction with user count check
- Image serving from outside `public/` → API route `/api/uploads/[...path]`
- SQLite during `next build` → Dynamic imports, build-time guards
- Docker migration entrypoint → Script runs `drizzle-kit migrate` before server start
- Orphaned images → Accept for v1 (cleanup script out of scope)
- Concurrent post editing → Last-write-wins for v1 (no conflict detection)

---

## Work Objectives

### Core Objective
Build a production-ready IT developer blog with GitHub PR-inspired layout, full auth, markdown authoring, threaded comments, and Docker deployment — all backed by SQLite for simplicity.

### Concrete Deliverables
- Next.js 16 app with App Router at `http://localhost:3000`
- SQLite database at `/data/sqlite.db` (Docker volume)
- Auth: register, login, logout, GitHub OAuth, role-based access
- Blog: create/edit/delete posts (admin), view posts (all), paginated list with tags
- Comments: add/reply (signed-in), hide/delete (admin), markdown rendering
- Notifications: in-app bell, mark read/unread
- Search: full-text search via FTS5
- Image uploads: `/data/uploads/` directory, served via API route
- Admin panel: user role management, content moderation
- Dark/light mode toggle with system preference detection
- RSS feed at `/feed.xml`
- Docker: `Dockerfile` + `docker-compose.yml`

### Definition of Done
- [ ] `docker compose up` starts the application successfully
- [ ] `curl http://localhost:3000/api/health` returns `200 OK`
- [ ] Can register first user → automatically admin
- [ ] Can register second user → regular user
- [ ] Admin can create, edit, delete posts with markdown + code highlighting
- [ ] Users can comment/reply with markdown
- [ ] Search returns relevant posts
- [ ] Notifications appear for comment replies
- [ ] Dark/light mode toggle works
- [ ] RSS feed accessible at `/feed.xml`
- [ ] All `bun test` pass

### Must Have
- Server-side markdown rendering (never ship parser to client)
- Pre-rendered code highlighting at save time (store raw + HTML in DB)
- XSS sanitization on all user-submitted markdown via `rehype-sanitize`
- JWT session strategy (forced by Credentials provider)
- `Bun.password.hash()` for password hashing (Argon2id)
- WAL mode enabled on SQLite
- Consistent Server Action return type: `{ success: boolean, error?: string, data?: T }`
- First-user admin check via DB transaction (prevent race condition)
- `proxy.ts` for auth middleware (Next.js 16 pattern, NOT `middleware.ts`)
- FTS5 via raw SQL in Drizzle migrations

### Must NOT Have (Guardrails)
- No client-side state management libraries (Redux, Zustand, etc.)
- No custom `.css` files (Tailwind + shadcn/ui only, except `globals.css`)
- No API routes for internal data (Server Actions only; API routes only for RSS, image serving, health, auth handlers)
- No email notification infrastructure
- No WebSocket/real-time features
- No nested comment threading (comment → reply only, no reply-to-reply)
- No premature abstraction (no generic wrappers, no "for future" code)
- No cloud storage abstraction layer for images
- No CI/CD pipeline or Kubernetes manifests
- No user profile pages, bios, or custom avatar uploads
- No autocomplete or faceted search
- No comment editing after posting (v1 simplification)
- No comment reactions/emojis
- No analytics or telemetry
- No over-engineered error class hierarchies

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: YES (tests after implementation)
- **Framework**: bun test (built-in to bun runtime)
- **Setup**: Task 1 includes bun test configuration

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun REPL or bun run) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately, 6 parallel):
├── Task 1: Project scaffolding + bun + Next.js 16 + Tailwind v4 + shadcn/ui
├── Task 2: Database schema design + Drizzle ORM + migrations + FTS5
├── Task 3: Auth.js v5 setup (email+password + GitHub OAuth + RBAC)
├── Task 4: Tailwind theme tokens + dark/light mode + CSS variables
├── Task 5: Shared TypeScript types + Server Action return type
└── Task 6: Reusable UI shell (layout, nav, sidebar, footer)

Wave 2 (Core Features — after Wave 1, 6 parallel):
├── Task 7: Blog post CRUD — Server Actions + admin-only guards
├── Task 8: Markdown editor with live preview (admin post creation)
├── Task 9: Markdown rendering pipeline (Shiki + rehype-sanitize + pre-render)
├── Task 10: Post list page — GitHub PR-like table layout with tag filters
├── Task 11: Post detail page — content + sidebar metadata + thread area
└── Task 12: Tag management system (admin CRUD + post tagging)

Wave 3 (Social Features — after Wave 2, 6 parallel):
├── Task 13: Comment system — add/reply with markdown + sanitization
├── Task 14: Comment moderation — admin hide/delete + "[removed]" placeholder
├── Task 15: In-app notification system (bell icon, mark read/unread)
├── Task 16: User comment/reply history page
├── Task 17: Image upload system (upload endpoint + serve route + editor integration)
└── Task 18: Full-text search (FTS5 index + search UI + results page)

Wave 4 (Admin & Extras — after Wave 3, 5 parallel):
├── Task 19: Admin panel — user role management (promote/demote)
├── Task 20: Admin panel — content moderation dashboard
├── Task 21: RSS/Atom feed generation
├── Task 22: Auth pages — login, register, error, GitHub callback UI
└── Task 23: SEO basics — meta tags, Open Graph, structured data

Wave 5 (Testing & Polish — after Wave 4, 5 parallel):
├── Task 24: Unit/integration tests for auth + blog CRUD
├── Task 25: Unit/integration tests for comments + notifications + search
├── Task 26: Docker deployment — Dockerfile + docker-compose + entrypoint
├── Task 27: Error handling + loading states + empty states across all pages
└── Task 28: Health check endpoint + graceful shutdown

Wave FINAL (Verification — after ALL tasks, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Full QA — Playwright end-to-end (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2/3 → Task 7/9 → Task 11 → Task 13 → Task 26 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Waves 1-3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2-28 | 1 |
| 2 | 1 | 7, 9, 10, 12, 13, 15, 17, 18 | 1 |
| 3 | 1 | 7, 13, 14, 15, 16, 19, 22 | 1 |
| 4 | 1 | 6, 10, 11 | 1 |
| 5 | 1 | 7, 13, 15, 17 | 1 |
| 6 | 1, 4 | 10, 11, 16, 19, 20, 22 | 1 |
| 7 | 2, 3, 5 | 8, 10, 11 | 2 |
| 8 | 7, 9 | — | 2 |
| 9 | 2, 5 | 8, 11, 13 | 2 |
| 10 | 2, 6, 7, 12 | — | 2 |
| 11 | 6, 7, 9 | 13 | 2 |
| 12 | 2, 3 | 10 | 2 |
| 13 | 2, 3, 5, 9, 11 | 14, 15, 16 | 3 |
| 14 | 3, 13 | 20 | 3 |
| 15 | 2, 3, 5, 13 | — | 3 |
| 16 | 3, 6, 13 | — | 3 |
| 17 | 2, 5, 8 | — | 3 |
| 18 | 2, 6 | — | 3 |
| 19 | 3, 6 | — | 4 |
| 20 | 6, 14 | — | 4 |
| 21 | 2, 9 | — | 4 |
| 22 | 3, 6 | — | 4 |
| 23 | 7, 11 | — | 4 |
| 24 | 3, 7, 9 | — | 5 |
| 25 | 13, 15, 18 | — | 5 |
| 26 | ALL impl tasks | F1-F4 | 5 |
| 27 | 10, 11, 13, 18 | — | 5 |
| 28 | 1 | 26 | 5 |
| F1 | ALL | — | FINAL |
| F2 | ALL | — | FINAL |
| F3 | ALL | — | FINAL |
| F4 | ALL | — | FINAL |

### Agent Dispatch Summary

| Wave | Count | Tasks → Category |
|------|-------|-----------------|
| 1 | 6 | T1→`quick`, T2→`deep`, T3→`deep`, T4→`quick`, T5→`quick`, T6→`visual-engineering` |
| 2 | 6 | T7→`unspecified-high`, T8→`visual-engineering`, T9→`deep`, T10→`visual-engineering`, T11→`visual-engineering`, T12→`unspecified-high` |
| 3 | 6 | T13→`unspecified-high`, T14→`unspecified-high`, T15→`unspecified-high`, T16→`visual-engineering`, T17→`unspecified-high`, T18→`deep` |
| 4 | 5 | T19→`visual-engineering`, T20→`visual-engineering`, T21→`quick`, T22→`visual-engineering`, T23→`quick` |
| 5 | 5 | T24→`deep`, T25→`deep`, T26→`unspecified-high`, T27→`visual-engineering`, T28→`quick` |
| FINAL | 4 | F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep` |

---

## TODOs

- [ ] 1. Project Scaffolding — Next.js 16 + bun + Tailwind v4 + shadcn/ui

  **What to do**:
  - Initialize Next.js 16 project with bun: `bunx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - Verify bun runtime compatibility: import test for `Bun.password`, `bun:sqlite`
  - Initialize shadcn/ui: `bunx --bun shadcn@latest init` with New York style, neutral theme
  - Add commonly used shadcn components: button, input, card, dialog, dropdown-menu, avatar, badge, separator, tabs, toast, tooltip, textarea, select, popover, command
  - Configure `next.config.ts`: `output: 'standalone'`, image domains for localhost
  - Create `globals.css` with Tailwind v4 imports and CSS variable foundations
  - Create `.env.example` with all required env vars (documented)
  - Configure bun test in `package.json` scripts
  - Add `.gitignore` entries for `/data`, `.env`, `.next`, `node_modules`
  - Verify `bun run build` succeeds and `bun run dev` starts without errors

  **Must NOT do**:
  - No custom CSS files beyond `globals.css`
  - No state management library installs
  - Do not configure database or auth yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard scaffolding with well-known tools, no complex logic
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: shadcn/ui initialization and Tailwind v4 config require design knowledge
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no UI to test yet

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 — must complete FIRST (all other tasks depend on it)
  - **Blocks**: Tasks 2-28
  - **Blocked By**: None

  **References**:

  **External References**:
  - Next.js 16 docs: https://nextjs.org/docs — App Router setup, `output: 'standalone'` config
  - shadcn/ui docs: https://ui.shadcn.com/docs/installation/next — Next.js installation guide
  - Tailwind CSS v4: https://tailwindcss.com/docs — v4 uses CSS-first config, no `tailwind.config.js`
  - bun docs: https://bun.sh/docs — Runtime API, test runner setup

  **WHY Each Reference Matters**:
  - Next.js 16 has breaking changes from v15 (`proxy.ts` replaces `middleware.ts`) — check docs for latest patterns
  - Tailwind v4 uses `@import "tailwindcss"` in CSS instead of `@tailwind` directives — different from v3
  - shadcn/ui must be initialized after Tailwind is working — order matters

  **Acceptance Criteria**:
  - [ ] `bun run dev` starts at http://localhost:3000 without errors
  - [ ] `bun run build` completes with zero errors
  - [ ] `bun test` runner works (even with no tests yet — should report 0 tests)
  - [ ] shadcn Button component renders correctly on a test page
  - [ ] `Bun.password.hash('test')` works in a test script (validates bun runtime)
  - [ ] `.env.example` documents: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `NEXTAUTH_URL`

  **QA Scenarios**:

  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: Project initialized, dependencies installed
    Steps:
      1. Run `bun run dev &` and wait 10s
      2. Run `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
      3. Assert HTTP status code is 200
      4. Kill dev server
    Expected Result: HTTP 200 from localhost:3000
    Failure Indicators: Non-200 status, "Module not found" errors, bun runtime crash
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: Project initialized
    Steps:
      1. Run `bun run build`
      2. Assert exit code is 0
      3. Assert `.next/standalone` directory exists
    Expected Result: Build completes with exit code 0, standalone output generated
    Failure Indicators: TypeScript errors, missing modules, non-zero exit code
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: Bun runtime APIs available
    Tool: Bash
    Preconditions: bun installed
    Steps:
      1. Run `bun -e "const hash = await Bun.password.hash('test'); console.log(hash.startsWith('$argon2'))"`
      2. Assert output is "true"
      3. Run `bun -e "import { Database } from 'bun:sqlite'; const db = new Database(':memory:'); console.log('ok')"`
      4. Assert output is "ok"
    Expected Result: Both Bun.password and bun:sqlite work
    Failure Indicators: Import errors, undefined APIs
    Evidence: .sisyphus/evidence/task-1-bun-runtime.txt
  ```

  **Commit**: YES
  - Message: `chore(scaffold): init Next.js 16 + bun + tailwind + shadcn`
  - Files: All scaffolding files
  - Pre-commit: `bun run build`

- [ ] 2. Database Schema + Drizzle ORM + Migrations + FTS5

  **What to do**:
  - Install `drizzle-orm` and `drizzle-kit` (dev dependency)
  - Create `src/lib/db/index.ts` — Drizzle instance with `bun:sqlite`, WAL mode enabled
  - Create `src/lib/db/schema.ts` with all tables:
    - `users`: id (text UUID), name, email (unique), emailVerified, image, passwordHash, role (text: "admin" | "user", default "user"), createdAt, updatedAt
    - `accounts`: id, userId (FK), type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state (Auth.js compatible)
    - `sessions`: id, sessionToken (unique), userId (FK), expires (Auth.js compatible — kept for future flexibility even though JWT strategy)
    - `verification_tokens`: identifier, token, expires (Auth.js compatible)
    - `posts`: id (text UUID), title, slug (unique), content (raw markdown), renderedContent (pre-rendered HTML), excerpt, coverImageUrl, authorId (FK users), status (text: "draft" | "published" | "archived"), createdAt, updatedAt, publishedAt
    - `tags`: id (text UUID), name (unique), slug (unique), color
    - `post_tags`: postId (FK), tagId (FK), primary key composite
    - `comments`: id (text UUID), content (raw markdown), renderedContent (HTML), postId (FK), authorId (FK users), parentId (FK comments, nullable — for replies), hidden (boolean, default false), createdAt
    - `notifications`: id (text UUID), userId (FK), type (text: "reply" | "comment_hidden" | "comment_deleted" | "role_changed"), message, referenceId (text, nullable — postId or commentId), read (boolean, default false), createdAt
    - `images`: id (text UUID), filename, originalName, mimeType, size, uploadedBy (FK users), postId (FK posts, nullable), createdAt
  - Create Drizzle relations for all FK relationships
  - Create FTS5 virtual table via raw SQL migration: `CREATE VIRTUAL TABLE posts_fts USING fts5(title, content, content=posts, content_rowid=rowid)`
  - Create FTS5 triggers for auto-sync on post INSERT/UPDATE/DELETE
  - Configure `drizzle.config.ts` for SQLite driver
  - Run `bunx drizzle-kit generate` to create initial migration
  - Create `src/lib/db/migrate.ts` script for running migrations programmatically
  - Verify migrations apply cleanly to a fresh SQLite file

  **Must NOT do**:
  - No seed data yet
  - No abstraction layers over Drizzle — use it directly
  - No custom migration runner — use drizzle-kit's built-in

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex schema with many tables, FTS5 raw SQL, Auth.js adapter compatibility, relations
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3-6 after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 9, 10, 12, 13, 15, 17, 18, 21
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - Drizzle ORM SQLite docs: https://orm.drizzle.team/docs/get-started/bun-new — bun:sqlite setup
  - Drizzle SQLite schema: https://orm.drizzle.team/docs/sql-schema-declaration — table definitions, relations
  - Auth.js Drizzle adapter schema: https://authjs.dev/getting-started/adapters/drizzle — required table structure for Auth.js
  - SQLite FTS5: https://www.sqlite.org/fts5.html — virtual table syntax, triggers for content sync

  **WHY Each Reference Matters**:
  - Auth.js adapter requires specific column names and types for `users`, `accounts`, `sessions`, `verification_tokens` — must match exactly
  - FTS5 content sync triggers are essential — without them, search index goes stale when posts are updated/deleted
  - Drizzle relations define how `with` queries work — critical for efficient joined queries later

  **Acceptance Criteria**:
  - [ ] `bunx drizzle-kit generate` produces migration files without errors
  - [ ] Migration applies to fresh SQLite file: `bun src/lib/db/migrate.ts`
  - [ ] All tables created with correct columns and foreign keys
  - [ ] FTS5 virtual table `posts_fts` exists
  - [ ] WAL mode is enabled (`PRAGMA journal_mode` returns `wal`)
  - [ ] Drizzle relations defined for all FK relationships

  **QA Scenarios**:

  ```
  Scenario: Migrations apply cleanly
    Tool: Bash
    Preconditions: Task 1 complete, drizzle-orm installed
    Steps:
      1. Delete any existing `sqlite.db` test file
      2. Run `DATABASE_URL=./test.db bun src/lib/db/migrate.ts`
      3. Run `bun -e "import { Database } from 'bun:sqlite'; const db = new Database('./test.db'); const tables = db.query(\"SELECT name FROM sqlite_master WHERE type='table'\").all(); console.log(JSON.stringify(tables))"`
      4. Assert output contains: users, accounts, sessions, verification_tokens, posts, tags, post_tags, comments, notifications, images, posts_fts
      5. Clean up test.db
    Expected Result: All 11+ tables created including FTS5 virtual table
    Failure Indicators: Missing tables, migration errors, FK constraint failures
    Evidence: .sisyphus/evidence/task-2-migrations.txt

  Scenario: FTS5 search works after insert
    Tool: Bash
    Preconditions: Migrations applied to test.db
    Steps:
      1. Insert a test post: `INSERT INTO posts (id, title, slug, content, ...) VALUES (...)`
      2. Verify FTS trigger fired: `SELECT * FROM posts_fts WHERE posts_fts MATCH 'typescript'`
      3. Assert result contains the test post
      4. Update the post title
      5. Verify FTS updated: search returns updated content
      6. Delete the post
      7. Verify FTS cleaned: search returns no results
    Expected Result: FTS5 stays in sync across INSERT, UPDATE, DELETE
    Failure Indicators: Empty FTS results after insert, stale data after update
    Evidence: .sisyphus/evidence/task-2-fts5.txt

  Scenario: WAL mode enabled
    Tool: Bash
    Preconditions: test.db exists
    Steps:
      1. Run `bun -e "import { Database } from 'bun:sqlite'; const db = new Database('./test.db'); console.log(db.query('PRAGMA journal_mode').get())"`
      2. Assert output contains "wal"
    Expected Result: journal_mode is "wal"
    Failure Indicators: journal_mode is "delete" or "memory"
    Evidence: .sisyphus/evidence/task-2-wal.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add Drizzle schema + SQLite migrations + FTS5`
  - Files: `src/lib/db/*`, `drizzle.config.ts`, `drizzle/*`
  - Pre-commit: `bun run build`

- [ ] 3. Auth.js v5 — Email+Password + GitHub OAuth + RBAC

  **What to do**:
  - Install `next-auth@beta` (Auth.js v5), `@auth/drizzle-adapter`
  - Create `src/auth.ts` — main Auth.js config:
    - Providers: `CredentialsProvider` (email+password) + `GitHub` (OAuth)
    - Adapter: `DrizzleAdapter(db)` pointing to Drizzle instance from Task 2
    - Session strategy: `"jwt"` (forced by Credentials provider)
    - Callbacks: `jwt()` to persist user role in token, `session()` to expose role in session
    - `signIn` callback: block OAuth if email already exists with different provider (prevent `OAuthAccountNotLinked`)
    - Credentials `authorize()`: validate email+password using `Bun.password.verify()`
  - Create `src/app/api/auth/[...nextauth]/route.ts` — `export const { GET, POST } = handlers`
  - Create `src/proxy.ts` — `export { auth as proxy } from "@/auth"` (Next.js 16 pattern)
  - Configure proxy config in `next.config.ts` if needed for protected routes (`/admin/*`, `/dashboard/*`)
  - Create `src/lib/auth/register.ts` — Server Action for user registration:
    - Hash password with `Bun.password.hash(password)` (Argon2id)
    - First-user check: wrap in DB transaction, count users, if 0 → set role "admin"
    - Validate email format, password strength (min 8 chars, 1 uppercase, 1 number)
    - Check email uniqueness before insert
  - Create `src/lib/auth/helpers.ts` — `getCurrentUser()`, `requireAuth()`, `requireAdmin()` helper functions
  - Add `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` to `.env.example`
  - Extend TypeScript types for session to include `role` field

  **Must NOT do**:
  - No database session strategy (won't work with Credentials provider)
  - No email verification flow (out of scope for v1)
  - No rate limiting on auth endpoints yet
  - No custom auth UI yet (Task 22 handles that)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Auth is security-critical with JWT callbacks, RBAC, race condition handling, provider conflict resolution
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI — auth pages built in Task 22

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 4, 5, 6 after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 13, 14, 15, 16, 19, 22
  - **Blocked By**: Task 1 (needs project structure), Task 2 (needs DB schema for adapter) — **NOTE: Task 2 must complete before Task 3 can fully work. In practice, start together but Task 3 imports from Task 2's schema.**

  **References**:

  **External References**:
  - Auth.js v5 Next.js setup: https://authjs.dev/getting-started/installation — handlers, proxy, config
  - Auth.js Credentials provider: https://authjs.dev/getting-started/authentication/credentials — authorize function pattern
  - Auth.js GitHub provider: https://authjs.dev/getting-started/providers/github — auto-config with env vars
  - Auth.js RBAC guide: https://authjs.dev/guides/role-based-access-control — jwt/session callbacks for role
  - Auth.js Drizzle adapter: https://authjs.dev/getting-started/adapters/drizzle — adapter setup
  - Bun.password API: https://bun.sh/docs/api/hashing — hash() and verify() with Argon2id

  **WHY Each Reference Matters**:
  - Auth.js v5 RBAC pattern requires specific callback ordering (jwt → session) — wrong order = role not available
  - Credentials provider + DrizzleAdapter has known quirks: adapter handles OAuth user creation but Credentials users must be created manually
  - `OAuthAccountNotLinked` error must be caught in `signIn` callback — not documented prominently but critical for dual-provider setup
  - `proxy.ts` is Next.js 16 specific — v15 used `middleware.ts`

  **Acceptance Criteria**:
  - [ ] Registration creates user in DB with hashed password (Argon2id)
  - [ ] First registered user gets role "admin"
  - [ ] Second registered user gets role "user"
  - [ ] Login with correct credentials returns JWT session with role
  - [ ] Login with wrong password returns error (not crash)
  - [ ] GitHub OAuth flow redirects to GitHub and back
  - [ ] `getCurrentUser()` returns user with role from session
  - [ ] `requireAdmin()` throws/redirects for non-admin users
  - [ ] Registering with existing email returns error
  - [ ] OAuth login with email that already has password account is blocked

  **QA Scenarios**:

  ```
  Scenario: First user becomes admin
    Tool: Bash (curl)
    Preconditions: Clean database, dev server running
    Steps:
      1. curl -X POST http://localhost:3000/api/register -H "Content-Type: application/json" -d '{"email":"first@test.com","password":"Test1234!","name":"First User"}'
      2. Assert response contains {"success": true}
      3. Query DB: SELECT role FROM users WHERE email='first@test.com'
      4. Assert role is "admin"
    Expected Result: First user has role "admin" in database
    Failure Indicators: Role is "user", registration fails, DB error
    Evidence: .sisyphus/evidence/task-3-first-admin.txt

  Scenario: Second user is regular user
    Tool: Bash (curl)
    Preconditions: First user already registered
    Steps:
      1. curl -X POST http://localhost:3000/api/register -H "Content-Type: application/json" -d '{"email":"second@test.com","password":"Test1234!","name":"Second User"}'
      2. Query DB: SELECT role FROM users WHERE email='second@test.com'
      3. Assert role is "user"
    Expected Result: Second user has role "user"
    Failure Indicators: Role is "admin" (race condition bug)
    Evidence: .sisyphus/evidence/task-3-second-user.txt

  Scenario: Login returns session with role
    Tool: Bash (curl)
    Preconditions: User registered
    Steps:
      1. Get CSRF token: curl -c cookies.txt http://localhost:3000/api/auth/csrf
      2. Login: curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials -d 'email=first@test.com&password=Test1234!'
      3. Get session: curl -b cookies.txt http://localhost:3000/api/auth/session
      4. Assert response JSON contains "role": "admin"
    Expected Result: Session includes user role
    Failure Indicators: No role in session, session empty, 401 error
    Evidence: .sisyphus/evidence/task-3-login-session.txt

  Scenario: Wrong password rejected
    Tool: Bash (curl)
    Preconditions: User registered
    Steps:
      1. Attempt login with wrong password
      2. Assert response indicates authentication failure (redirect to error or error JSON)
      3. Get session: assert no valid session exists
    Expected Result: Login fails gracefully, no session created
    Failure Indicators: Login succeeds with wrong password, server crash
    Evidence: .sisyphus/evidence/task-3-wrong-password.txt
  ```

  **Commit**: YES
  - Message: `feat(auth): add Auth.js v5 with email+password + GitHub OAuth + RBAC`
  - Files: `src/auth.ts`, `src/proxy.ts`, `src/app/api/auth/*`, `src/lib/auth/*`
  - Pre-commit: `bun run build`

- [ ] 4. Tailwind Theme Tokens + Dark/Light Mode + CSS Variables

  **What to do**:
  - Define CSS custom properties in `globals.css` for GitHub-inspired design system:
    - Background colors: `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--card`, `--card-foreground`, `--border`, `--input`, `--ring`
    - Accent colors: `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`
    - Status colors (GitHub-style): `--success`, `--warning`, `--danger`, `--info`
    - Typography: `--font-sans` (Inter/system-ui), `--font-mono` (JetBrains Mono/monospace)
  - Create light theme (GitHub light) and dark theme (GitHub dark) CSS variable sets
  - Dark mode via `class` strategy (toggle `.dark` on `<html>`)
  - Create `src/components/theme-provider.tsx` (client component) — context + localStorage persistence + system preference detection on first visit
  - Create `src/components/theme-toggle.tsx` — button with sun/moon icon toggle
  - Ensure shadcn/ui components inherit theme variables correctly
  - Color palette inspired by GitHub: white backgrounds with subtle borders (light), dark navy backgrounds (dark)

  **Must NOT do**:
  - No custom CSS files — only `globals.css` variables
  - No theme preferences stored in database (localStorage only)
  - No more than 2 themes (light + dark)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS variable definitions and a simple context provider — straightforward
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Color palette design requires visual/design knowledge
  - **Skills Evaluated but Omitted**:
    - `playwright`: Too early for visual testing

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 5, 6)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6, 10, 11
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - shadcn/ui theming: https://ui.shadcn.com/docs/theming — CSS variable naming convention
  - GitHub Primer design system: https://primer.style/foundations/color — GitHub's color tokens for inspiration
  - Tailwind v4 dark mode: https://tailwindcss.com/docs/dark-mode — class strategy setup

  **WHY Each Reference Matters**:
  - shadcn/ui expects specific CSS variable names (`--background`, `--foreground`, etc.) — must match exactly
  - GitHub Primer colors provide the exact hex values for GitHub-like aesthetic
  - Tailwind v4 dark mode config differs from v3 — need current docs

  **Acceptance Criteria**:
  - [ ] Light theme renders with GitHub-light-like colors
  - [ ] Dark theme renders with GitHub-dark-like colors
  - [ ] Toggle switches between themes without page reload
  - [ ] Theme persists across page refreshes (localStorage)
  - [ ] First visit respects system preference (`prefers-color-scheme`)
  - [ ] All shadcn components render correctly in both themes

  **QA Scenarios**:

  ```
  Scenario: Theme toggle works and persists
    Tool: Playwright
    Preconditions: Dev server running, app loaded
    Steps:
      1. Navigate to http://localhost:3000
      2. Check initial theme matches system preference
      3. Click theme toggle button (selector: `[data-testid="theme-toggle"]` or button with sun/moon icon)
      4. Assert `<html>` element has class "dark" (or "light" if was dark)
      5. Assert background color changed
      6. Reload page
      7. Assert theme persisted (same class on `<html>`)
    Expected Result: Theme toggles and persists across reloads
    Failure Indicators: Theme resets on reload, no visual change, FOUC
    Evidence: .sisyphus/evidence/task-4-theme-toggle.png (screenshot of both themes)

  Scenario: System preference detection on first visit
    Tool: Playwright
    Preconditions: Clean browser state (no localStorage)
    Steps:
      1. Emulate dark color scheme: `page.emulateMedia({ colorScheme: 'dark' })`
      2. Navigate to http://localhost:3000
      3. Assert `<html>` has class "dark"
      4. Clear localStorage, emulate light color scheme
      5. Reload
      6. Assert `<html>` has class "light" (or no "dark" class)
    Expected Result: First visit respects OS preference
    Failure Indicators: Always defaults to light, ignores system preference
    Evidence: .sisyphus/evidence/task-4-system-preference.png
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `feat(ui): add theme tokens + dark mode + shared types`
  - Files: `src/app/globals.css`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`
  - Pre-commit: `bun run build`

- [ ] 5. Shared TypeScript Types + Server Action Return Type

  **What to do**:
  - Create `src/types/index.ts` — shared type exports
  - Define `ActionResult<T>` type: `{ success: true, data: T } | { success: false, error: string }`
  - Define view types (not DB types — those come from Drizzle schema):
    - `PostView`: post with author, tags, comment count
    - `CommentView`: comment with author, replies
    - `NotificationView`: notification with reference details
    - `UserView`: public user info (no password hash)
    - `TagView`: tag with post count
    - `PaginatedResult<T>`: `{ items: T[], total: number, page: number, pageSize: number }`
    - `SearchResult`: post with relevance score + highlighted snippet
  - Create `src/lib/constants.ts` — app-wide constants:
    - `POSTS_PER_PAGE = 20`
    - `COMMENTS_PER_PAGE = 30`
    - `MAX_POST_CONTENT_SIZE = 100_000` (100KB markdown)
    - `MAX_COMMENT_LENGTH = 5_000`
    - `MAX_IMAGE_SIZE = 5 * 1024 * 1024` (5MB)
    - `ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
    - `MAX_TITLE_LENGTH = 200`
    - `MAX_TAG_NAME_LENGTH = 50`

  **Must NOT do**:
  - No runtime validation schemas (Zod) — those belong in individual Server Actions
  - No duplicate types from Drizzle's `$inferSelect` — reference those for DB types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure type definitions and constants — no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - All skills: No UI, no browser, no git work

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4, 6)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 13, 15, 17
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - TypeScript utility types: https://www.typescriptlang.org/docs/handbook/utility-types.html — for defining ActionResult union
  - Drizzle `$inferSelect`: https://orm.drizzle.team/docs/goodies#type-api — derive types from schema

  **WHY Each Reference Matters**:
  - `ActionResult<T>` union type ensures all Server Actions have consistent return shape — consumed by every form/action in the app
  - View types decouple API shape from DB schema — allows DB changes without breaking UI

  **Acceptance Criteria**:
  - [ ] `ActionResult<T>` type exported and usable in Server Actions
  - [ ] All view types defined with correct fields
  - [ ] Constants file contains all documented values
  - [ ] `bun run build` succeeds (types compile)
  - [ ] No circular imports

  **QA Scenarios**:

  ```
  Scenario: Types compile correctly
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run `bunx tsc --noEmit`
      2. Assert exit code 0
      3. Run `bun -e "import type { ActionResult, PostView } from './src/types'; console.log('types ok')"`
      4. Assert output is "types ok"
    Expected Result: All types compile without errors
    Failure Indicators: TypeScript errors, circular dependency warnings
    Evidence: .sisyphus/evidence/task-5-types-compile.txt
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `feat(ui): add theme tokens + dark mode + shared types`
  - Files: `src/types/index.ts`, `src/lib/constants.ts`
  - Pre-commit: `bun run build`

- [ ] 6. Reusable UI Shell — Layout, Nav, Sidebar, Footer

  **What to do**:
  - Create `src/app/layout.tsx` — root layout with:
    - ThemeProvider wrapping children
    - `<html lang="en">` with suppressHydrationWarning for theme
    - Inter font (sans) + JetBrains Mono (mono) via `next/font`
    - Toaster component for notifications
  - Create `src/components/layout/header.tsx` — GitHub-style top navigation bar:
    - Logo/blog name (left)
    - Navigation links: Home, Tags, Search (center/left)
    - Theme toggle (right)
    - Auth section (right): Sign In button or user avatar dropdown (sign out, profile, admin link if admin)
    - Notification bell icon with unread count badge (if logged in)
  - Create `src/components/layout/sidebar.tsx` — reusable sidebar component:
    - Used on post detail page (shows: author, date, tags, reading time)
    - Used on admin pages (shows: admin navigation)
    - Responsive: full sidebar on desktop, collapsed/hidden on mobile
  - Create `src/components/layout/footer.tsx` — minimal footer with:
    - Copyright, RSS link, GitHub link
  - Create `src/components/layout/mobile-nav.tsx` — hamburger menu for mobile
  - Create `src/app/(blog)/layout.tsx` — blog route group layout with main content + optional sidebar
  - Create `src/app/(admin)/layout.tsx` — admin route group layout with admin sidebar nav
  - Ensure responsive design: mobile-first, breakpoints at sm/md/lg
  - GitHub-inspired styling: clean lines, subtle borders, monospaced accents

  **Must NOT do**:
  - No actual page content — just structural shells
  - No data fetching in layout components
  - No custom CSS files

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Layout, responsive design, GitHub-inspired aesthetic — core UI/UX work
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Crafting GitHub-like navigation, responsive sidebar, visual polish
  - **Skills Evaluated but Omitted**:
    - `playwright`: Visual testing comes in final QA

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 5 — needs Task 4 for theme vars)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 10, 11, 16, 19, 20, 22
  - **Blocked By**: Tasks 1, 4

  **References**:

  **External References**:
  - GitHub.com UI: https://github.com — Reference for nav bar structure, layout proportions, color use
  - shadcn/ui components: https://ui.shadcn.com/docs/components — Avatar, DropdownMenu, Badge, Button
  - Next.js layouts: https://nextjs.org/docs/app/getting-started/layouts-and-pages — route groups, nested layouts

  **WHY Each Reference Matters**:
  - GitHub's nav bar is the primary design reference — note the flat design, border-bottom separator, right-aligned user controls
  - Route groups `(blog)` and `(admin)` allow different layouts without affecting URL structure
  - shadcn Avatar + DropdownMenu compose the user menu; Badge for notification count

  **Acceptance Criteria**:
  - [ ] Root layout renders with theme provider and fonts
  - [ ] Header shows logo, nav links, theme toggle, auth placeholder
  - [ ] Footer renders with copyright and links
  - [ ] Blog layout has main content area + sidebar slot
  - [ ] Admin layout has admin sidebar navigation
  - [ ] Responsive: nav collapses to hamburger on mobile (<768px)
  - [ ] `bun run build` succeeds

  **QA Scenarios**:

  ```
  Scenario: Layout renders on desktop
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Set viewport to 1440x900
      2. Navigate to http://localhost:3000
      3. Assert header element exists with logo text
      4. Assert navigation links visible (Home, Tags, Search)
      5. Assert theme toggle button exists
      6. Assert footer element exists with copyright text
      7. Take screenshot
    Expected Result: Full desktop layout with header, content area, footer
    Failure Indicators: Missing elements, broken layout, overlapping elements
    Evidence: .sisyphus/evidence/task-6-desktop-layout.png

  Scenario: Layout responsive on mobile
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to http://localhost:3000
      3. Assert hamburger menu button visible
      4. Assert desktop nav links hidden
      5. Click hamburger menu
      6. Assert mobile nav overlay appears with links
      7. Take screenshot
    Expected Result: Mobile-friendly layout with hamburger navigation
    Failure Indicators: Horizontal scroll, overlapping text, nav links visible on mobile
    Evidence: .sisyphus/evidence/task-6-mobile-layout.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add app shell layout + nav + sidebar + footer`
  - Files: `src/app/layout.tsx`, `src/app/(blog)/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/components/layout/*`
  - Pre-commit: `bun run build`

- [ ] 7. Blog Post CRUD — Server Actions + Admin-Only Guards

  **What to do**:
  - Create `src/lib/actions/posts.ts` — Server Actions for post management:
    - `createPost(formData)`: Admin only. Validates title, slug, content, tags. Generates slug from title if not provided. Calls markdown rendering pipeline (Task 9) to generate `renderedContent`. Stores both raw markdown and rendered HTML. Returns `ActionResult<PostView>`.
    - `updatePost(postId, formData)`: Admin only. Same validation. Re-renders markdown. Updates `updatedAt`.
    - `deletePost(postId)`: Admin only. Soft-deletes or hard-deletes post + cascades to comments, notifications. Cleans FTS5 index (trigger handles this).
    - `getPost(slug)`: Public. Fetches post with author, tags, comment count. Increments view count (optional).
    - `getPosts(filters)`: Public. Paginated list. Filters: tag, status (published only for non-admin), search query. Returns `PaginatedResult<PostView>`.
    - `changePostStatus(postId, status)`: Admin only. Toggle between draft/published/archived.
  - All actions use `requireAdmin()` or `requireAuth()` guards from Task 3
  - All actions return `ActionResult<T>` from Task 5
  - Input validation using Zod schemas (install `zod`)
  - Slug generation: kebab-case from title, append random suffix if duplicate

  **Must NOT do**:
  - No UI components — this is pure backend logic
  - No API routes — Server Actions only
  - No draft auto-save functionality
  - No post versioning/history

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: CRUD Server Actions with auth guards, validation, FTS integration — moderate complexity
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-12 in Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8, 10, 11
  - **Blocked By**: Tasks 2, 3, 5

  **References**:

  **Pattern References**:
  - `src/auth.ts` (from Task 3) — How auth helpers are exported and used
  - `src/lib/db/schema.ts` (from Task 2) — posts table schema, relations

  **External References**:
  - Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations — form handling, revalidation
  - Zod validation: https://zod.dev — schema definition and parsing

  **WHY Each Reference Matters**:
  - Server Actions must call `revalidatePath()` or `revalidateTag()` after mutations to update cached pages
  - Zod schemas define input validation — critical for security (never trust client input)
  - Auth helpers determine if user is admin before allowing mutations

  **Acceptance Criteria**:
  - [ ] Admin can create post with title, content, tags → post saved in DB with rendered HTML
  - [ ] Admin can update post → content re-rendered, updatedAt set
  - [ ] Admin can delete post → post removed from DB and FTS5 index
  - [ ] Non-admin calling createPost gets error response (not crash)
  - [ ] Unauthenticated calling createPost gets error response
  - [ ] Slug auto-generated from title, unique constraint enforced
  - [ ] getPosts returns paginated results with correct total count
  - [ ] getPost by slug returns full post with author and tags

  **QA Scenarios**:

  ```
  Scenario: Admin creates post successfully
    Tool: Bash (bun script)
    Preconditions: Admin user exists, DB seeded with admin session
    Steps:
      1. Call createPost Server Action with: title="Test Post", content="# Hello\n\nThis is **markdown**", tags=["typescript"]
      2. Assert result: { success: true, data: { slug: "test-post", ... } }
      3. Query DB: SELECT * FROM posts WHERE slug='test-post'
      4. Assert post exists with renderedContent containing "<h1>Hello</h1>"
      5. Query FTS5: SELECT * FROM posts_fts WHERE posts_fts MATCH 'Hello'
      6. Assert search returns the post
    Expected Result: Post created with rendered HTML and FTS5 entry
    Failure Indicators: Missing renderedContent, FTS5 empty, slug collision
    Evidence: .sisyphus/evidence/task-7-create-post.txt

  Scenario: Non-admin blocked from creating post
    Tool: Bash (bun script)
    Preconditions: Regular user session active
    Steps:
      1. Call createPost with valid data using non-admin session
      2. Assert result: { success: false, error: "Unauthorized" }
      3. Query DB: assert no new post created
    Expected Result: Action rejected with unauthorized error
    Failure Indicators: Post created by non-admin, server crash
    Evidence: .sisyphus/evidence/task-7-non-admin-blocked.txt
  ```

  **Commit**: YES (groups with Task 9)
  - Message: `feat(blog): add post CRUD + markdown rendering pipeline`
  - Files: `src/lib/actions/posts.ts`, `src/lib/validators/post.ts`
  - Pre-commit: `bun run build`

- [ ] 8. Markdown Editor with Live Preview (Admin Post Creation UI)

  **What to do**:
  - Create `src/components/editor/markdown-editor.tsx` (client component) — split-pane editor:
    - Left pane: textarea with monospace font (JetBrains Mono)
    - Right pane: live preview rendering markdown to HTML
    - Toolbar: bold, italic, code, heading, link, image insert, list (simple button row)
    - Toolbar actions insert markdown syntax at cursor position
    - Debounced preview (300ms) to avoid excessive re-renders
    - Tab key inserts 2 spaces (not focus change)
  - Create `src/app/(admin)/admin/posts/new/page.tsx` — new post page:
    - Title input, slug input (auto-generated, editable)
    - Tag selector (multi-select from existing tags)
    - Cover image upload button
    - Status selector (draft/published)
    - Markdown editor component
    - Submit button → calls createPost Server Action
    - Success → redirect to post detail page
  - Create `src/app/(admin)/admin/posts/[id]/edit/page.tsx` — edit post page:
    - Same form, pre-populated with existing post data
    - "Delete Post" button with confirmation dialog
  - Preview pane uses same rendering pipeline as Task 9 (but client-side for preview — lightweight version without Shiki for speed, just basic markdown)
  - For the live preview ONLY: use `react-markdown` + `remark-gfm` client-side (the saved post will use server-side Shiki rendering from Task 9)

  **Must NOT do**:
  - No WYSIWYG rich text editor
  - No drag-and-drop image insertion (button upload only)
  - No auto-save to server (save is explicit button click)
  - No version history

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Split-pane editor UI, toolbar, responsive layout — heavy frontend work
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Editor UX, toolbar design, split-pane layout

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 12 — needs 7, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 17 (image integration)
  - **Blocked By**: Tasks 7, 9

  **References**:

  **External References**:
  - react-markdown: https://github.com/remarkjs/react-markdown — client-side markdown rendering for preview
  - remark-gfm: https://github.com/remarkjs/remark-gfm — GitHub Flavored Markdown (tables, strikethrough)
  - GitHub's markdown editor: https://github.com — Reference for toolbar buttons, preview tab pattern

  **WHY Each Reference Matters**:
  - react-markdown is for client-side preview ONLY — the saved/published version uses Shiki (server-side, Task 9)
  - GitHub's editor has "Write" and "Preview" tabs — good reference for the split-pane UX
  - remark-gfm adds GFM features that developers expect (tables, task lists, etc.)

  **Acceptance Criteria**:
  - [ ] Editor renders with textarea (left) and preview (right)
  - [ ] Typing markdown shows rendered HTML in preview (debounced)
  - [ ] Toolbar buttons insert correct markdown syntax at cursor
  - [ ] Title and slug fields work (slug auto-generates from title)
  - [ ] Tag multi-select works with existing tags
  - [ ] Submit creates post and redirects to post page
  - [ ] Edit page pre-populates all fields
  - [ ] Delete button shows confirmation, then deletes post
  - [ ] Responsive: stacks vertically on mobile

  **QA Scenarios**:

  ```
  Scenario: Markdown editor live preview works
    Tool: Playwright
    Preconditions: Logged in as admin, on /admin/posts/new
    Steps:
      1. Navigate to http://localhost:3000/admin/posts/new
      2. Type "# Hello World" in the textarea
      3. Wait 500ms (debounce)
      4. Assert preview pane contains an <h1> element with text "Hello World"
      5. Type "```js\nconsole.log('hi')\n```" in textarea
      6. Wait 500ms
      7. Assert preview pane contains a <code> element
      8. Take screenshot
    Expected Result: Preview renders markdown in real-time
    Failure Indicators: Preview empty, no debounce, raw markdown shown
    Evidence: .sisyphus/evidence/task-8-editor-preview.png

  Scenario: Create post end-to-end
    Tool: Playwright
    Preconditions: Logged in as admin, tags exist
    Steps:
      1. Navigate to /admin/posts/new
      2. Fill title: "Getting Started with TypeScript"
      3. Assert slug auto-generated: "getting-started-with-typescript"
      4. Select tag "typescript" from multi-select
      5. Type markdown content in editor
      6. Click "Publish" button
      7. Assert redirect to post detail page
      8. Assert post title visible on the page
    Expected Result: Post created and visible at its slug URL
    Failure Indicators: Form validation errors, redirect failure, post not found
    Evidence: .sisyphus/evidence/task-8-create-post-e2e.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add markdown editor with live preview`
  - Files: `src/components/editor/*`, `src/app/(admin)/admin/posts/new/*`, `src/app/(admin)/admin/posts/[id]/edit/*`
  - Pre-commit: `bun run build`

- [ ] 9. Markdown Rendering Pipeline — Shiki + rehype-sanitize + Pre-render

  **What to do**:
  - Install: `shiki`, `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-stringify`, `rehype-sanitize`, `rehype-shiki`
  - Create `src/lib/markdown/render.ts` — server-only markdown rendering function:
    - Input: raw markdown string
    - Output: rendered HTML string
    - Pipeline: `unified() → remark-parse → remark-gfm → remark-rehype → rehype-shiki (with theme) → rehype-stringify`
    - Shiki themes: use `github-light` and `github-dark` (dual theme with CSS classes)
    - Cache Shiki highlighter instance (expensive to create)
  - Create `src/lib/markdown/sanitize.ts` — sanitization for user-submitted content (comments):
    - Same pipeline but with `rehype-sanitize` AFTER rehype-shiki
    - Whitelist: headings, paragraphs, links, code blocks, inline code, bold, italic, lists, blockquotes
    - Blacklist: script, iframe, onclick, onerror, style attributes, form elements
    - Strip all event handlers and javascript: URLs
  - Create `src/lib/markdown/render-comment.ts` — lighter pipeline for comments:
    - Same as above but WITH sanitization (untrusted input)
    - Shiki still applies for code blocks in comments
  - Create `src/components/markdown-content.tsx` — Server Component for displaying rendered HTML:
    - Accepts `renderedHtml` prop
    - Renders with `dangerouslySetInnerHTML`
    - Applies typography styles (prose-like spacing, code block styling)
    - Supports dual Shiki theme (shows correct theme based on dark/light mode via CSS)
  - Pre-rendering strategy: when a post is saved (Task 7), call `renderMarkdown()` and store both `content` (raw) and `renderedContent` (HTML) in DB

  **Must NOT do**:
  - NEVER import Shiki or unified in client components (server-only)
  - No runtime markdown rendering on page load — always serve pre-rendered HTML
  - No custom Shiki themes — use built-in `github-light` and `github-dark`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex unified pipeline, Shiki dual-theme setup, security-critical sanitization logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Minimal UI — mostly pipeline logic

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 7, 10, 11, 12)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 8, 11, 13
  - **Blocked By**: Tasks 2, 5

  **References**:

  **External References**:
  - Shiki docs: https://shiki.style — bundled themes, dual theme setup, rehype integration
  - unified ecosystem: https://unifiedjs.com — remark/rehype pipeline architecture
  - rehype-sanitize: https://github.com/rehypejs/rehype-sanitize — schema-based HTML sanitization
  - OWASP XSS prevention: https://owasp.org/www-community/xss-filter-evasion-cheatsheet — attack vectors to test against

  **WHY Each Reference Matters**:
  - Shiki dual theme (`github-light` + `github-dark`) generates CSS-class-based themes — one render serves both modes
  - rehype-sanitize MUST run after rehype-shiki (Shiki adds HTML that could be stripped if sanitize runs first)
  - OWASP cheatsheet provides XSS test vectors for QA scenarios

  **Acceptance Criteria**:
  - [ ] `renderMarkdown("# Hello")` returns HTML `<h1>Hello</h1>`
  - [ ] Code blocks rendered with Shiki syntax highlighting (colored HTML spans)
  - [ ] Dual theme: both `github-light` and `github-dark` classes present in output
  - [ ] `renderCommentMarkdown("<script>alert(1)</script>")` strips the script tag
  - [ ] `renderCommentMarkdown("<img onerror=alert(1) src=x>")` strips the onerror attribute
  - [ ] Headings, links, code blocks, bold, italic preserved in sanitized output
  - [ ] Pipeline is server-only — importing in client component causes build error
  - [ ] GFM features work: tables, strikethrough, task lists

  **QA Scenarios**:

  ```
  Scenario: Markdown renders with syntax highlighting
    Tool: Bash (bun script)
    Preconditions: Shiki and unified installed
    Steps:
      1. Run bun script that calls renderMarkdown with: "```typescript\nconst x: number = 42;\n```"
      2. Assert output contains '<pre' and '<code'
      3. Assert output contains 'shiki' class or data attribute
      4. Assert output contains colored span elements (syntax highlighting)
    Expected Result: Code block rendered with Shiki syntax colors
    Failure Indicators: Plain text code, no colors, Shiki error
    Evidence: .sisyphus/evidence/task-9-shiki-render.txt

  Scenario: XSS attack vectors sanitized
    Tool: Bash (bun script)
    Preconditions: Pipeline installed
    Steps:
      1. Test: renderCommentMarkdown("<script>alert('xss')</script>") → assert no <script> in output
      2. Test: renderCommentMarkdown("<img src=x onerror=alert(1)>") → assert no onerror in output
      3. Test: renderCommentMarkdown("[click](javascript:alert(1))") → assert no javascript: URL
      4. Test: renderCommentMarkdown("<iframe src='evil.com'></iframe>") → assert no <iframe> in output
      5. Test: renderCommentMarkdown("**bold** and `code`") → assert <strong> and <code> preserved
    Expected Result: All XSS vectors stripped, safe markdown preserved
    Failure Indicators: Any attack vector passes through unsanitized
    Evidence: .sisyphus/evidence/task-9-xss-sanitize.txt

  Scenario: Pipeline is server-only
    Tool: Bash
    Preconditions: Pipeline files exist
    Steps:
      1. Create a temporary client component that imports renderMarkdown
      2. Run `bun run build`
      3. Assert build fails with server-only module error
      4. Clean up temp file
    Expected Result: Import in client component causes build error
    Failure Indicators: Build succeeds (means Shiki shipped to client bundle!)
    Evidence: .sisyphus/evidence/task-9-server-only.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(blog): add post CRUD + markdown rendering pipeline`
  - Files: `src/lib/markdown/*`, `src/components/markdown-content.tsx`
  - Pre-commit: `bun run build`

- [ ] 10. Post List Page — GitHub PR-like Table Layout with Tag Filters

  **What to do**:
  - Create `src/app/(blog)/page.tsx` — home page / post list (Server Component):
    - Fetch published posts with `getPosts()` from Task 7
    - GitHub PR list-inspired layout:
      - Top: filter bar with tag filter pills, status counts, sort options (newest, oldest)
      - Each row: post title (link), excerpt, author avatar + name, tag badges, comment count, date (relative time like "3 days ago")
      - Pagination: page numbers at bottom (offset-based)
    - Open/Closed-style tabs repurposed: "All Posts" / "By Tag" view toggle
  - Create `src/components/blog/post-list-item.tsx` — single post row component:
    - GitHub PR row style: title as primary link, metadata below
    - Green/blue dot for published status (admin sees draft indicator)
    - Hover: subtle background highlight
  - Create `src/components/blog/tag-filter.tsx` — tag filter component:
    - Horizontal scrollable tag pills
    - Active tag highlighted, URL param based (`?tag=typescript`)
    - "Clear filters" button when filter active
  - Create `src/components/blog/pagination.tsx` — reusable pagination component:
    - Page numbers, previous/next buttons
    - Uses URL search params (no client state)
  - URL-based filtering: `/?tag=react&page=2&sort=newest` — fully shareable URLs
  - Empty state: "No posts yet" with illustration/icon

  **Must NOT do**:
  - No infinite scroll — use pagination
  - No client-side filtering — all server-side via URL params
  - No autocomplete in search (that's Task 18)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Core UI page with GitHub-inspired table layout, tag pills, responsive design
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: GitHub PR list aesthetic, responsive table, visual polish

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8, 9, 11)
  - **Parallel Group**: Wave 2
  - **Blocks**: None directly
  - **Blocked By**: Tasks 2, 6, 7, 12

  **References**:

  **Pattern References**:
  - `src/components/layout/sidebar.tsx` (Task 6) — Layout shell to render within
  - `src/lib/actions/posts.ts` (Task 7) — getPosts() action with pagination
  - `src/types/index.ts` (Task 5) — PostView, PaginatedResult types

  **External References**:
  - GitHub Pull Requests list: https://github.com/vercel/next.js/pulls — Layout reference for post list
  - shadcn Badge: https://ui.shadcn.com/docs/components/badge — For tag pills
  - shadcn Avatar: https://ui.shadcn.com/docs/components/avatar — For author avatar

  **WHY Each Reference Matters**:
  - GitHub PR list has the exact row structure to replicate: icon + title link + metadata line below + right-aligned counts
  - URL-based filtering pattern ensures the page is SSR-friendly and shareable

  **Acceptance Criteria**:
  - [ ] Post list renders with GitHub PR-like row layout
  - [ ] Tag filter pills work — clicking updates URL and filters results
  - [ ] Pagination works — page param in URL, correct items per page (20)
  - [ ] Sort options work (newest/oldest)
  - [ ] Each post shows: title, excerpt, author, tags, comment count, relative date
  - [ ] Empty state shown when no posts match filters
  - [ ] Responsive: single-column on mobile, full layout on desktop

  **QA Scenarios**:

  ```
  Scenario: Post list renders with posts
    Tool: Playwright
    Preconditions: 3+ published posts exist in DB, dev server running
    Steps:
      1. Navigate to http://localhost:3000
      2. Assert post list container exists
      3. Assert at least 3 post items visible
      4. Assert each post item has: title link, author name, date
      5. Assert tag badges visible on posts that have tags
      6. Take screenshot
    Expected Result: Post list renders with correct layout and data
    Failure Indicators: Empty page, missing metadata, broken layout
    Evidence: .sisyphus/evidence/task-10-post-list.png

  Scenario: Tag filtering works via URL
    Tool: Playwright
    Preconditions: Posts with different tags exist
    Steps:
      1. Navigate to http://localhost:3000
      2. Click on a tag filter pill (e.g., "typescript")
      3. Assert URL contains ?tag=typescript
      4. Assert only posts with "typescript" tag are shown
      5. Click "Clear filters"
      6. Assert all posts shown again
    Expected Result: Tag filtering updates URL and filters posts
    Failure Indicators: All posts shown regardless of filter, URL not updated
    Evidence: .sisyphus/evidence/task-10-tag-filter.png
  ```

  **Commit**: YES (groups with Tasks 11, 12)
  - Message: `feat(blog): add post list + detail pages + tag system`
  - Files: `src/app/(blog)/page.tsx`, `src/components/blog/post-list-item.tsx`, `src/components/blog/tag-filter.tsx`, `src/components/blog/pagination.tsx`
  - Pre-commit: `bun run build`

- [ ] 11. Post Detail Page — Content + Sidebar Metadata + Thread Area

  **What to do**:
  - Create `src/app/(blog)/posts/[slug]/page.tsx` — post detail page (Server Component):
    - Fetch post by slug with `getPost(slug)` from Task 7
    - 404 page if post not found or not published (unless viewer is admin)
    - Layout: GitHub PR detail-inspired:
      - Header: post title (large), author avatar + name + date + reading time
      - Status badge (published/draft — visible to admin only)
      - Body: rendered markdown content (pre-rendered HTML from DB via `renderedContent`)
      - Comment section below (placeholder for Task 13)
    - Sidebar (using sidebar component from Task 6):
      - Tags with colored badges
      - Author info card
      - Table of contents (extracted from heading tags)
      - "Edit" / "Delete" buttons (admin only)
  - Create `src/components/blog/post-header.tsx` — title, author, date, reading time
  - Create `src/components/blog/table-of-contents.tsx` — auto-generated TOC from headings:
    - Parses rendered HTML for h1-h3 elements
    - Adds anchor links
    - Sticky on desktop sidebar
  - Create `src/components/blog/post-sidebar.tsx` — metadata sidebar
  - Add `generateMetadata()` for SEO: title, description (from excerpt), Open Graph image
  - Reading time calculation: ~200 words per minute

  **Must NOT do**:
  - No comment form/display yet (Task 13)
  - No view counter (out of scope v1)
  - No social share buttons
  - No "related posts" section

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Core content page with table of contents, responsive sidebar, typography
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Content layout, TOC component, typography styling

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8, 10, 12)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 6, 7, 9

  **References**:

  **Pattern References**:
  - `src/components/markdown-content.tsx` (Task 9) — For rendering the post body
  - `src/components/layout/sidebar.tsx` (Task 6) — Sidebar shell

  **External References**:
  - GitHub PR detail page: https://github.com/vercel/next.js/pull/1 — Header + body + sidebar layout reference
  - Next.js generateMetadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata — SEO meta tags

  **WHY Each Reference Matters**:
  - GitHub PR detail has the exact layout to replicate: large title, author line, content body, right sidebar with metadata
  - TOC needs to parse rendered HTML headings — use regex or DOM parser on server

  **Acceptance Criteria**:
  - [ ] Post page renders at `/posts/[slug]` with full content
  - [ ] Post title, author avatar, date, reading time displayed
  - [ ] Rendered markdown shows with Shiki code highlighting (correct theme for dark/light)
  - [ ] Sidebar shows tags, author card, table of contents
  - [ ] TOC links scroll to correct headings
  - [ ] Admin sees "Edit" and "Delete" buttons; regular users don't
  - [ ] 404 page for non-existent slugs
  - [ ] SEO meta tags present in page source

  **QA Scenarios**:

  ```
  Scenario: Post detail page renders correctly
    Tool: Playwright
    Preconditions: A published post exists with slug "test-post", has code blocks and headings
    Steps:
      1. Navigate to http://localhost:3000/posts/test-post
      2. Assert page title matches post title
      3. Assert author name visible
      4. Assert date visible
      5. Assert markdown content rendered (check for <h1>, <p>, <pre> elements)
      6. Assert code blocks have syntax highlighting (colored spans)
      7. Assert sidebar has table of contents with links
      8. Assert sidebar has tag badges
      9. Take screenshot
    Expected Result: Full post page with content, metadata, sidebar
    Failure Indicators: Raw markdown shown, missing sidebar, no syntax colors
    Evidence: .sisyphus/evidence/task-11-post-detail.png

  Scenario: 404 for non-existent slug
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000/posts/this-does-not-exist
      2. Assert 404 page or "Post not found" message displayed
    Expected Result: Graceful 404, not a crash
    Failure Indicators: Server error, blank page, wrong post shown
    Evidence: .sisyphus/evidence/task-11-404.png
  ```

  **Commit**: YES (groups with Tasks 10, 12)
  - Message: `feat(blog): add post list + detail pages + tag system`
  - Files: `src/app/(blog)/posts/[slug]/page.tsx`, `src/components/blog/post-header.tsx`, `src/components/blog/table-of-contents.tsx`, `src/components/blog/post-sidebar.tsx`
  - Pre-commit: `bun run build`

- [ ] 12. Tag Management System — Admin CRUD + Post Tagging

  **What to do**:
  - Create `src/lib/actions/tags.ts` — Server Actions:
    - `createTag(name, color)`: Admin only. Auto-generates slug from name. Validates uniqueness.
    - `updateTag(tagId, name, color)`: Admin only.
    - `deleteTag(tagId)`: Admin only. Removes tag from all posts (cascade post_tags).
    - `getTags()`: Public. Returns all tags with post counts.
    - `getTagBySlug(slug)`: Public. Returns tag with post count.
  - Create `src/app/(admin)/admin/tags/page.tsx` — tag management page:
    - List of all tags with post count, color preview, edit/delete actions
    - "Create Tag" button → dialog with name + color picker
    - Inline edit: click tag → edit name/color
    - Delete with confirmation (warns about post dissociation)
  - Create `src/components/blog/tag-badge.tsx` — reusable tag badge:
    - Colored badge with tag name
    - Optional link to filtered post list (`/?tag=slug`)
    - Used across post list, post detail, admin pages
  - Tag colors: use a predefined palette of 12-16 dev-friendly colors (GitHub label-style)

  **Must NOT do**:
  - No tag hierarchy or categories
  - No tag merging
  - No auto-suggest or auto-complete for tags
  - No tag descriptions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: CRUD actions + admin UI + reusable component — moderate complexity
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Color picker UI, tag badge styling

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 7-11)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10 (tag filter needs tags)
  - **Blocked By**: Tasks 2, 3

  **References**:

  **External References**:
  - GitHub Labels: https://github.com/vercel/next.js/labels — Color + name badge design
  - shadcn Badge: https://ui.shadcn.com/docs/components/badge — Badge component base
  - shadcn Dialog: https://ui.shadcn.com/docs/components/dialog — Create/edit tag dialog

  **WHY Each Reference Matters**:
  - GitHub labels are the EXACT design reference for tag badges — colored rounded rectangles with white/dark text based on contrast

  **Acceptance Criteria**:
  - [ ] Admin can create tags with name and color
  - [ ] Admin can edit tag name/color
  - [ ] Admin can delete tag (cascade removes post_tags entries)
  - [ ] Tag list shows all tags with post counts
  - [ ] Tag badge component renders with correct color
  - [ ] Non-admin cannot access tag management actions
  - [ ] Duplicate tag name rejected

  **QA Scenarios**:

  ```
  Scenario: Admin creates and manages tags
    Tool: Playwright
    Preconditions: Logged in as admin
    Steps:
      1. Navigate to /admin/tags
      2. Click "Create Tag" button
      3. Enter name "TypeScript" and select a color
      4. Submit
      5. Assert tag appears in list with correct name and color
      6. Click edit on the tag
      7. Change name to "TS"
      8. Submit
      9. Assert tag name updated in list
      10. Click delete, confirm
      11. Assert tag removed from list
    Expected Result: Full CRUD lifecycle works
    Failure Indicators: Tag not created, color not saved, delete fails
    Evidence: .sisyphus/evidence/task-12-tag-crud.png
  ```

  **Commit**: YES (groups with Tasks 10, 11)
  - Message: `feat(blog): add post list + detail pages + tag system`
  - Files: `src/lib/actions/tags.ts`, `src/app/(admin)/admin/tags/*`, `src/components/blog/tag-badge.tsx`
  - Pre-commit: `bun run build`

- [ ] 13. Comment System — Add/Reply with Markdown + Sanitization

  **What to do**:
  - Create `src/lib/actions/comments.ts` — Server Actions:
    - `addComment(postId, content)`: Auth required. Renders markdown with sanitization (Task 9 `renderCommentMarkdown()`). Stores raw + rendered. Creates notification for post author. Returns `ActionResult<CommentView>`.
    - `addReply(commentId, content)`: Auth required. Same as addComment but sets `parentId`. Creates notification for parent comment author. Only ONE level of replies (reply to comment, not reply-to-reply).
    - `getComments(postId, page)`: Public. Paginated. Returns top-level comments with their replies nested. Hidden comments show as "[Comment hidden by moderator]" to non-admins.
    - `deleteComment(commentId)`: Admin only. Hard deletes the comment. Creates notification for comment author (type: "comment_deleted").
    - `hideComment(commentId)`: Admin only. Sets `hidden=true`. Creates notification for comment author (type: "comment_hidden").
    - `unhideComment(commentId)`: Admin only. Sets `hidden=false`.
  - Create `src/components/comments/comment-section.tsx` — Server Component wrapper:
    - Fetches comments for post
    - Renders comment list + reply chains
    - "Add Comment" form at top (visible to authenticated users)
    - "Sign in to comment" prompt for unauthenticated users
  - Create `src/components/comments/comment-item.tsx` — single comment component:
    - Author avatar, name, relative date
    - Rendered markdown content (sanitized HTML)
    - "Reply" button → expands reply form below
    - Admin sees: "Hide" / "Delete" buttons
    - Hidden comments: gray "[Comment hidden by moderator]" text for non-admins, full content visible to admin with "Unhide" option
  - Create `src/components/comments/comment-form.tsx` (client component):
    - Markdown textarea with preview toggle (simpler than post editor)
    - Character count (max 5000 from constants)
    - Submit via Server Action (useActionState or form action)
    - Optimistic UI: show comment immediately, handle error
  - Reply form: identical to comment form but nested below parent comment
  - GitHub PR conversation thread layout: vertical timeline with connector lines

  **Must NOT do**:
  - No comment editing (v1 simplification)
  - No reply-to-reply (only reply-to-comment)
  - No comment reactions/emojis
  - No markdown toolbar on comment form (just textarea + preview)
  - No real-time comment updates

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-component system with Server Actions, optimistic UI, sanitization, nested layout
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Thread layout, timeline design, reply nesting UX

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-18)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 14, 15, 16
  - **Blocked By**: Tasks 2, 3, 5, 9, 11

  **References**:

  **Pattern References**:
  - `src/lib/markdown/sanitize.ts` (Task 9) — Comment markdown sanitization pipeline
  - `src/lib/actions/posts.ts` (Task 7) — Server Action pattern with auth guards
  - `src/components/markdown-content.tsx` (Task 9) — Rendering sanitized HTML

  **External References**:
  - GitHub PR conversation thread: https://github.com/vercel/next.js/pull/1 — Timeline layout, reply nesting, connector lines
  - Next.js useActionState: https://nextjs.org/docs/app/api-reference/functions/use-action-state — Form action with loading/error states

  **WHY Each Reference Matters**:
  - GitHub PR conversation has the exact thread layout: vertical line connecting comments, replies indented
  - `useActionState` (or `useFormState`) provides pending/error states without client-side state management
  - Comment sanitization is SECURITY CRITICAL — must use the pipeline from Task 9

  **Acceptance Criteria**:
  - [ ] Authenticated user can post a comment on a blog post
  - [ ] Comment renders with sanitized markdown (code blocks, bold, etc.)
  - [ ] User can reply to a comment (one level only)
  - [ ] Reply cannot have replies (no nested threading)
  - [ ] Hidden comment shows "[Comment hidden by moderator]" to regular users
  - [ ] Admin sees full hidden comment content + unhide button
  - [ ] Admin can delete comment (hard delete)
  - [ ] Notification created for post author when comment added
  - [ ] Notification created for comment author when reply added
  - [ ] Unauthenticated users see "Sign in to comment" prompt
  - [ ] XSS in comment content is sanitized

  **QA Scenarios**:

  ```
  Scenario: User posts a markdown comment
    Tool: Playwright
    Preconditions: Published post exists, user logged in (not admin)
    Steps:
      1. Navigate to /posts/test-post
      2. Scroll to comment section
      3. Type "Great post! Here's a code snippet:\n```js\nconsole.log('hi')\n```" in comment textarea
      4. Click submit
      5. Wait for comment to appear
      6. Assert comment visible with rendered markdown (code block with syntax highlighting)
      7. Assert author name matches logged-in user
    Expected Result: Comment posted with rendered markdown
    Failure Indicators: Raw markdown shown, comment not saved, XSS renders
    Evidence: .sisyphus/evidence/task-13-post-comment.png

  Scenario: XSS blocked in comment
    Tool: Playwright
    Preconditions: User logged in, post exists
    Steps:
      1. Navigate to post
      2. Type "<script>alert('xss')</script><b>safe bold</b>" in comment
      3. Submit comment
      4. Assert no <script> tag in rendered comment HTML
      5. Assert <b>safe bold</b> OR <strong>safe bold</strong> IS present
      6. Assert no alert dialog appeared
    Expected Result: Script stripped, safe HTML preserved
    Failure Indicators: Alert dialog, <script> in DOM
    Evidence: .sisyphus/evidence/task-13-xss-blocked.png

  Scenario: Reply creates notification
    Tool: Bash + Playwright
    Preconditions: UserA posted a comment, UserB is logged in
    Steps:
      1. As UserB, reply to UserA's comment
      2. Query DB: SELECT * FROM notifications WHERE userId=(UserA's id) AND type='reply'
      3. Assert notification exists with correct referenceId
    Expected Result: Notification created for parent comment author
    Failure Indicators: No notification row, wrong userId
    Evidence: .sisyphus/evidence/task-13-reply-notification.txt
  ```

  **Commit**: YES (groups with Task 14)
  - Message: `feat(comments): add comment/reply system + moderation`
  - Files: `src/lib/actions/comments.ts`, `src/components/comments/*`
  - Pre-commit: `bun run build`

- [ ] 14. Comment Moderation — Admin Hide/Delete + "[Removed]" Placeholder

  **What to do**:
  - Extend comment actions from Task 13 if not already complete:
    - Ensure `hideComment`, `unhideComment`, `deleteComment` work correctly
  - Create `src/components/comments/moderation-actions.tsx` — admin action buttons:
    - "Hide" button (eye-slash icon) → toggles hidden flag
    - "Delete" button (trash icon) → confirmation dialog → hard delete
    - Buttons only visible to admin users
  - Handle hidden comment display in `comment-item.tsx`:
    - Non-admin: replace content with "[Comment hidden by moderator]" in muted text
    - Admin: show full content with yellow/orange background indicator + "Unhide" button
  - Handle deleted comment in thread:
    - If comment had replies, show "[Comment deleted by moderator]" placeholder to preserve thread structure
    - If comment had no replies, remove entirely
  - Notification on moderation:
    - When comment is hidden: notify comment author with type "comment_hidden"
    - When comment is deleted: notify comment author with type "comment_deleted"
    - Message includes post title for context

  **Must NOT do**:
  - No bulk moderation (one at a time)
  - No moderation queue or reporting system
  - No appeal/dispute process
  - No auto-moderation or content filtering

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderation logic, conditional rendering, notification triggers — moderate complexity
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Hidden/deleted comment visual states, admin indicators

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13, 15-18)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 3, 13

  **References**:

  **Pattern References**:
  - `src/components/comments/comment-item.tsx` (Task 13) — Comment component to extend
  - `src/lib/actions/comments.ts` (Task 13) — Moderation Server Actions

  **External References**:
  - GitHub hidden comment: observe how GitHub shows "This comment was marked as off-topic" — visual reference
  - shadcn AlertDialog: https://ui.shadcn.com/docs/components/alert-dialog — Delete confirmation dialog

  **WHY Each Reference Matters**:
  - GitHub's moderation UX is the design target — minimized content with expand option for admins

  **Acceptance Criteria**:
  - [ ] Admin sees hide/delete buttons on every comment
  - [ ] Regular users do NOT see moderation buttons
  - [ ] Hiding a comment: non-admins see "[Comment hidden by moderator]"
  - [ ] Admin sees hidden comment with visual indicator + unhide button
  - [ ] Deleting a comment with replies: placeholder "[Comment deleted]" shown
  - [ ] Deleting a comment without replies: removed entirely
  - [ ] Notification sent to comment author on hide/delete

  **QA Scenarios**:

  ```
  Scenario: Admin hides comment, user sees placeholder
    Tool: Playwright
    Preconditions: Post with user comment exists
    Steps:
      1. Login as admin, navigate to post
      2. Click "Hide" button on a user's comment
      3. Assert comment now shows "hidden" indicator for admin (but content still visible)
      4. Logout, login as the comment author
      5. Navigate to same post
      6. Assert the comment shows "[Comment hidden by moderator]" text
      7. Assert original content NOT visible
    Expected Result: Admin hides → user sees placeholder
    Failure Indicators: Content still visible to user, hide button missing for admin
    Evidence: .sisyphus/evidence/task-14-hide-comment.png

  Scenario: Delete comment with replies preserves thread
    Tool: Playwright
    Preconditions: Comment with 2 replies exists
    Steps:
      1. Login as admin, navigate to post
      2. Click "Delete" on the parent comment
      3. Confirm in dialog
      4. Assert "[Comment deleted by moderator]" placeholder shown
      5. Assert replies still visible below the placeholder
    Expected Result: Parent deleted but thread preserved with placeholder
    Failure Indicators: Replies also deleted, no placeholder, entire thread gone
    Evidence: .sisyphus/evidence/task-14-delete-with-replies.png
  ```

  **Commit**: YES (groups with Task 13)
  - Message: `feat(comments): add comment/reply system + moderation`
  - Files: `src/components/comments/moderation-actions.tsx`, updates to `comment-item.tsx`
  - Pre-commit: `bun run build`

- [ ] 15. In-App Notification System — Bell Icon, Mark Read/Unread

  **What to do**:
  - Create `src/lib/actions/notifications.ts` — Server Actions:
    - `getNotifications(page)`: Auth required. Returns paginated notifications for current user, newest first. Returns `PaginatedResult<NotificationView>`.
    - `getUnreadCount()`: Auth required. Returns number of unread notifications.
    - `markAsRead(notificationId)`: Auth required. Sets `read=true`.
    - `markAllAsRead()`: Auth required. Marks all user's notifications as read.
    - `createNotification(userId, type, message, referenceId)`: Internal helper (not exposed as action). Called by comment/moderation actions.
  - Update header component (Task 6) — notification bell:
    - Bell icon in header (next to user avatar)
    - Unread count badge (red dot or number)
    - Click → dropdown showing recent notifications
    - Each notification: icon by type, message, relative time, read/unread indicator
    - "Mark all as read" button
    - "View all" link → full notifications page
  - Create `src/app/(blog)/notifications/page.tsx` — full notifications page:
    - Paginated list of all notifications
    - Click notification → navigates to relevant post/comment
    - Read/unread visual distinction (bold vs. normal text)
  - Notification types and messages:
    - `reply`: "User X replied to your comment on 'Post Title'"
    - `comment_hidden`: "Your comment on 'Post Title' was hidden by a moderator"
    - `comment_deleted`: "Your comment on 'Post Title' was deleted by a moderator"
    - `role_changed`: "Your role has been changed to admin/user"
  - Use `refresh()` from `next/cache` to update notification count after marking as read

  **Must NOT do**:
  - No email notifications
  - No push notifications
  - No notification preferences/settings
  - No notification batching (1 event = 1 notification)
  - No WebSocket real-time updates (poll on page load)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server Actions + dropdown UI + full page + integration with comments system
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Notification dropdown, bell badge, read/unread states

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13, 14, 16-18)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3, 5, 13

  **References**:

  **Pattern References**:
  - `src/components/layout/header.tsx` (Task 6) — Header to integrate bell icon into
  - `src/lib/actions/comments.ts` (Task 13) — Comment actions that create notifications

  **External References**:
  - GitHub notification bell: https://github.com/notifications — Bell icon + dropdown design
  - shadcn Popover: https://ui.shadcn.com/docs/components/popover — For notification dropdown
  - Next.js refresh(): https://nextjs.org/docs/app/api-reference/functions/revalidatePath — For refreshing notification count

  **WHY Each Reference Matters**:
  - GitHub's notification bell is the exact UX pattern: bell icon, blue dot for unread, dropdown with list, "View all" link

  **Acceptance Criteria**:
  - [ ] Bell icon visible in header for logged-in users
  - [ ] Unread count badge shows when notifications exist
  - [ ] Clicking bell opens dropdown with recent notifications
  - [ ] Each notification shows type icon, message, time
  - [ ] Clicking a notification navigates to the relevant post
  - [ ] "Mark all as read" clears unread count
  - [ ] Full notifications page shows paginated list
  - [ ] Read/unread visual distinction clear

  **QA Scenarios**:

  ```
  Scenario: Notification appears after reply
    Tool: Playwright
    Preconditions: UserA has a comment on a post, UserB is logged in
    Steps:
      1. As UserB: reply to UserA's comment
      2. Logout, login as UserA
      3. Assert bell icon shows unread badge (count >= 1)
      4. Click bell icon
      5. Assert dropdown contains notification about UserB's reply
      6. Click the notification
      7. Assert navigated to the post page
    Expected Result: Notification created and viewable via bell dropdown
    Failure Indicators: No badge, empty dropdown, wrong message text
    Evidence: .sisyphus/evidence/task-15-notification-reply.png

  Scenario: Mark all as read
    Tool: Playwright
    Preconditions: User has 3+ unread notifications
    Steps:
      1. Assert badge shows count >= 3
      2. Click bell, click "Mark all as read"
      3. Assert badge disappears or shows 0
      4. Click bell again
      5. Assert all notifications appear as "read" (no bold text)
    Expected Result: All notifications marked read, badge cleared
    Failure Indicators: Badge persists, notifications still bold
    Evidence: .sisyphus/evidence/task-15-mark-all-read.png
  ```

  **Commit**: YES (groups with Task 16)
  - Message: `feat(notifications): add in-app notifications + user history`
  - Files: `src/lib/actions/notifications.ts`, `src/app/(blog)/notifications/*`, header updates
  - Pre-commit: `bun run build`

- [ ] 16. User Comment/Reply History Page

  **What to do**:
  - Create `src/lib/actions/user.ts` — Server Actions:
    - `getUserComments(page)`: Auth required. Returns paginated list of current user's comments with post title context.
    - `getUserReplies(page)`: Auth required. Returns paginated list of replies to the user's comments.
  - Create `src/app/(blog)/dashboard/page.tsx` — user dashboard:
    - Tabs: "My Comments" | "Replies to Me"
    - Each tab shows paginated list
    - Each entry: comment excerpt, post title (link), date, status (visible/hidden)
    - Empty state for each tab
  - Comment entry in list:
    - Post title as heading (link to post)
    - Comment content preview (first 200 chars)
    - "Hidden by moderator" indicator if applicable
    - Date + link to full comment in thread
  - Use URL-based tab state (`?tab=comments` / `?tab=replies`)

  **Must NOT do**:
  - No user profile page (just activity history)
  - No activity feed combining different types
  - No export functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Dashboard page with tabs, list layout — UI-focused
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Tab layout, list design, empty states

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13-15, 17, 18)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 6, 13

  **References**:

  **Pattern References**:
  - `src/components/blog/pagination.tsx` (Task 10) — Reuse pagination component
  - `src/components/layout/sidebar.tsx` (Task 6) — Layout shell

  **External References**:
  - shadcn Tabs: https://ui.shadcn.com/docs/components/tabs — Tab component for switching views

  **WHY Each Reference Matters**:
  - Tabs switch between comment types without page reload — URL-param based for shareability

  **Acceptance Criteria**:
  - [ ] Dashboard page accessible to logged-in users at `/dashboard`
  - [ ] "My Comments" tab shows user's comments with post context
  - [ ] "Replies to Me" tab shows replies to user's comments
  - [ ] Hidden comments marked with visual indicator
  - [ ] Pagination works on both tabs
  - [ ] Empty state shown when no activity
  - [ ] Unauthenticated users redirected to login

  **QA Scenarios**:

  ```
  Scenario: Dashboard shows user's comment history
    Tool: Playwright
    Preconditions: User has posted 3+ comments across different posts
    Steps:
      1. Login as user, navigate to /dashboard
      2. Assert "My Comments" tab is active
      3. Assert 3+ comment entries visible
      4. Each entry shows: post title, comment preview, date
      5. Click on a post title link
      6. Assert navigated to the post page
    Expected Result: User sees their comment history with links
    Failure Indicators: Empty list despite having comments, broken links
    Evidence: .sisyphus/evidence/task-16-dashboard.png
  ```

  **Commit**: YES (groups with Task 15)
  - Message: `feat(notifications): add in-app notifications + user history`
  - Files: `src/lib/actions/user.ts`, `src/app/(blog)/dashboard/*`
  - Pre-commit: `bun run build`

- [ ] 17. Image Upload System — Upload Endpoint + Serve Route + Editor Integration

  **What to do**:
  - Create upload directory constant: `DATA_DIR = process.env.DATA_DIR || './data'`, `UPLOADS_DIR = path.join(DATA_DIR, 'uploads')`
  - Create `src/lib/actions/images.ts` — Server Action:
    - `uploadImage(formData)`: Auth required (admin for posts, any user for avatars if needed). Validates file type (ALLOWED_IMAGE_TYPES), size (MAX_IMAGE_SIZE = 5MB). Generates unique filename (UUID + original extension). Saves to `UPLOADS_DIR`. Stores metadata in `images` table. Returns `ActionResult<{ url: string, id: string }>`.
    - `deleteImage(imageId)`: Admin only. Removes file from disk + DB record.
  - Create `src/app/api/uploads/[...path]/route.ts` — API route to serve uploaded images:
    - Reads file from `UPLOADS_DIR` based on path
    - Sets correct `Content-Type` header based on file extension
    - Returns 404 if file not found
    - Cache headers: `public, max-age=31536000, immutable` (images are immutable by UUID name)
  - Integrate with markdown editor (Task 8):
    - "Insert Image" button in toolbar
    - Opens file picker dialog
    - Uploads via Server Action
    - Inserts markdown `![alt](/api/uploads/filename.jpg)` at cursor
  - Ensure `UPLOADS_DIR` exists (create on first upload if missing)
  - Ensure `DATA_DIR` is in `.gitignore`

  **Must NOT do**:
  - No image optimization (resize, compress, WebP conversion)
  - No responsive images (`srcset`)
  - No image gallery component
  - No S3/cloud storage abstraction
  - No orphaned image cleanup

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File system operations, API route, security validation, editor integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13-16, 18)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 5, 8

  **References**:

  **Pattern References**:
  - `src/components/editor/markdown-editor.tsx` (Task 8) — Editor to integrate upload button into

  **External References**:
  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers — API route for serving files
  - Bun File API: https://bun.sh/docs/api/file-io — `Bun.write()` for saving files

  **WHY Each Reference Matters**:
  - API route is needed because images are stored outside `public/` (in Docker volume) — `next/image` can't access them directly
  - `Bun.write()` is more efficient than Node.js `fs.writeFile()` in bun runtime

  **Acceptance Criteria**:
  - [ ] Admin can upload JPG, PNG, WebP, GIF images (up to 5MB)
  - [ ] Uploaded images served at `/api/uploads/[filename]`
  - [ ] Invalid file types rejected with error
  - [ ] Files > 5MB rejected with error
  - [ ] Image metadata stored in database
  - [ ] Upload integrated into markdown editor toolbar
  - [ ] Uploaded image URL inserted into markdown editor

  **QA Scenarios**:

  ```
  Scenario: Upload and serve image
    Tool: Bash (curl)
    Preconditions: Admin authenticated, dev server running
    Steps:
      1. Create a 100x100 test PNG: `bun -e "...generate test image..."`
      2. Upload: curl -X POST http://localhost:3000/api/upload -F "file=@test.png" -b cookies.txt
      3. Assert response: { success: true, data: { url: "/api/uploads/uuid.png" } }
      4. Fetch image: curl -o /dev/null -s -w "%{http_code}" http://localhost:3000/api/uploads/uuid.png
      5. Assert HTTP 200
      6. Assert Content-Type: image/png
    Expected Result: Image uploaded and servable
    Failure Indicators: Upload fails, 404 on serve, wrong content type
    Evidence: .sisyphus/evidence/task-17-upload-serve.txt

  Scenario: Oversized file rejected
    Tool: Bash (curl)
    Preconditions: Admin authenticated
    Steps:
      1. Create a 6MB test file
      2. Upload: curl -X POST http://localhost:3000/api/upload -F "file=@large.bin"
      3. Assert response: { success: false, error: "File too large" }
    Expected Result: Upload rejected with clear error
    Failure Indicators: Upload succeeds, server crash
    Evidence: .sisyphus/evidence/task-17-oversized-rejected.txt
  ```

  **Commit**: YES
  - Message: `feat(uploads): add image upload + serve system`
  - Files: `src/lib/actions/images.ts`, `src/app/api/uploads/*`
  - Pre-commit: `bun run build`

- [ ] 18. Full-Text Search — FTS5 Index + Search UI + Results Page

  **What to do**:
  - Create `src/lib/actions/search.ts` — Server Action:
    - `searchPosts(query, page)`: Public. Validates query (min 2 chars). Sanitizes FTS5 special operators. Queries `posts_fts` table. Returns `PaginatedResult<SearchResult>` with relevance ranking and highlighted snippets.
    - Use FTS5 `snippet()` function for result excerpts with highlighted matches
    - Use FTS5 `rank` for relevance ordering
  - Create `src/app/(blog)/search/page.tsx` — search results page:
    - Search input at top (URL param: `?q=query`)
    - Results list: post title (highlighted matches), excerpt (highlighted), author, date, tags
    - Result count: "Found N results for 'query'"
    - Empty state: "No results found for 'query'"
    - Pagination for results
  - Update header (Task 6): add search icon/input in navigation
    - Small search input in header that redirects to `/search?q=...` on Enter
    - Or search icon that expands to input (GitHub-style cmd+K pattern simplified)
  - FTS5 query sanitization: escape special characters, wrap user input in double quotes to prevent FTS5 syntax injection

  **Must NOT do**:
  - No autocomplete/suggestions
  - No search analytics
  - No faceted search (filter by date, author, etc.)
  - No search indexing of comments (posts only)
  - No fuzzy matching

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: FTS5 raw SQL queries, relevance ranking, snippet extraction, security (query sanitization)
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Search results page layout, highlighted text rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13-17)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 6

  **References**:

  **Pattern References**:
  - `src/lib/db/schema.ts` (Task 2) — FTS5 virtual table and triggers
  - `src/components/blog/post-list-item.tsx` (Task 10) — Result item layout reference

  **External References**:
  - SQLite FTS5 query syntax: https://www.sqlite.org/fts5.html#full_text_query_syntax — MATCH, snippet(), rank
  - SQLite FTS5 security: https://www.sqlite.org/fts5.html — Special operators that could be abused

  **WHY Each Reference Matters**:
  - FTS5 `snippet()` function generates highlighted excerpts — exact syntax needed
  - FTS5 query syntax allows `AND`, `OR`, `NEAR`, `NOT` — user input must be quoted to prevent injection

  **Acceptance Criteria**:
  - [ ] Search returns relevant posts for keyword queries
  - [ ] Results show highlighted snippets with matched terms
  - [ ] Results ranked by relevance
  - [ ] Pagination works for many results
  - [ ] Empty query or < 2 chars shows validation message
  - [ ] FTS5 special characters in query don't cause errors
  - [ ] Header search input navigates to search page
  - [ ] Search page accessible via URL: `/search?q=typescript`

  **QA Scenarios**:

  ```
  Scenario: Search finds relevant posts
    Tool: Playwright
    Preconditions: 5+ posts exist, at least one about "TypeScript"
    Steps:
      1. Navigate to http://localhost:3000/search?q=typescript
      2. Assert "Found N results" message (N >= 1)
      3. Assert first result contains "TypeScript" in title or excerpt
      4. Assert highlighted text visible in results
      5. Click first result
      6. Assert navigated to post detail page
    Expected Result: Search returns and highlights relevant results
    Failure Indicators: Zero results despite matching posts, no highlighting
    Evidence: .sisyphus/evidence/task-18-search-results.png

  Scenario: FTS5 injection prevented
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. Search with FTS5 operators: curl "http://localhost:3000/search?q=test+AND+OR+NOT+NEAR"
      2. Assert page renders without error (200 OK)
      3. Assert no SQL error in response
    Expected Result: Special characters escaped, no crash
    Failure Indicators: 500 error, SQL error message in response
    Evidence: .sisyphus/evidence/task-18-fts-injection.txt
  ```

  **Commit**: YES
  - Message: `feat(search): add FTS5 full-text search`
  - Files: `src/lib/actions/search.ts`, `src/app/(blog)/search/*`, header updates
  - Pre-commit: `bun run build`

- [ ] 19. Admin Panel — User Role Management (Promote/Demote)

  **What to do**:
  - Create `src/lib/actions/admin.ts` — Server Actions:
    - `getUsers(page, search?)`: Admin only. Paginated user list with search by name/email. Returns `PaginatedResult<UserView>`.
    - `updateUserRole(userId, role)`: Admin only. Cannot demote yourself. Creates notification for target user (type: "role_changed").
  - Create `src/app/(admin)/admin/users/page.tsx` — user management page:
    - Table: avatar, name, email, role badge, provider (email/github icon), joined date
    - Search input to filter users by name/email
    - Role toggle: dropdown to change user role (admin/user)
    - Cannot modify own role (button disabled with tooltip explaining why)
    - Confirmation dialog before role changes
  - Create `src/app/(admin)/admin/page.tsx` — admin dashboard overview:
    - Stats cards: total posts, total users, total comments, pending (hidden) comments
    - Quick links: manage posts, manage tags, manage users
    - Recent activity: latest 5 comments/registrations

  **Must NOT do**:
  - No user deletion (just role management)
  - No user banning/suspension
  - No user detail page
  - No bulk role changes
  - No audit log

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Admin UI with tables, stats cards, search, role management — design-heavy
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Admin table design, stats cards, responsive layout

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20-23)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 6

  **References**:

  **External References**:
  - GitHub Settings > Collaborators: https://github.com — Role management UI reference
  - shadcn Table: https://ui.shadcn.com/docs/components/table — Table component
  - shadcn Select: https://ui.shadcn.com/docs/components/select — Role selector

  **WHY Each Reference Matters**:
  - GitHub's collaborator management is the UX reference: user row + role dropdown + action buttons

  **Acceptance Criteria**:
  - [ ] Admin dashboard shows stats (posts, users, comments)
  - [ ] User list shows all users with role, provider, date
  - [ ] Admin can promote user to admin
  - [ ] Admin can demote admin to user (not self)
  - [ ] Self-demotion prevented
  - [ ] Role change creates notification for target user
  - [ ] User search works by name and email
  - [ ] Non-admins redirected from `/admin/*`

  **QA Scenarios**:

  ```
  Scenario: Admin promotes user
    Tool: Playwright
    Preconditions: Admin and regular user both exist
    Steps:
      1. Login as admin, navigate to /admin/users
      2. Find regular user in table
      3. Change role dropdown to "admin"
      4. Confirm in dialog
      5. Assert role badge updated to "admin"
      6. Query DB: assert user role is now "admin"
      7. Login as the promoted user
      8. Assert notification about role change exists
    Expected Result: Role changed, notification sent
    Failure Indicators: Role not updated, no notification
    Evidence: .sisyphus/evidence/task-19-promote-user.png

  Scenario: Cannot demote self
    Tool: Playwright
    Preconditions: Logged in as admin
    Steps:
      1. Navigate to /admin/users
      2. Find own row in table
      3. Assert role dropdown is disabled or missing
      4. Assert tooltip/text explains "Cannot change your own role"
    Expected Result: Self-demotion prevented in UI
    Failure Indicators: Dropdown enabled, role changed
    Evidence: .sisyphus/evidence/task-19-cannot-self-demote.png
  ```

  **Commit**: YES (groups with Task 20)
  - Message: `feat(admin): add admin panel + content moderation`
  - Files: `src/lib/actions/admin.ts`, `src/app/(admin)/admin/users/*`, `src/app/(admin)/admin/page.tsx`
  - Pre-commit: `bun run build`

- [ ] 20. Admin Panel — Content Moderation Dashboard

  **What to do**:
  - Create `src/app/(admin)/admin/comments/page.tsx` — comment moderation dashboard:
    - Tabs: "All Comments" | "Hidden Comments" | "Recent"
    - Table: comment excerpt, author, post title, status (visible/hidden), date, actions
    - Quick actions: hide/unhide/delete per row
    - Bulk actions would be nice but OUT OF SCOPE — one at a time only
    - Filter by post
  - Create `src/app/(admin)/admin/posts/page.tsx` — post management list:
    - Table: title, status (draft/published/archived), author, comment count, date
    - Actions: edit, delete, change status
    - Filter by status
    - Link to create new post
  - Admin sidebar navigation (update from Task 6):
    - Dashboard, Posts, Tags, Users, Comments sections
    - Active section highlighted
    - Counts/badges on sections with pending items

  **Must NOT do**:
  - No bulk operations
  - No content reporting system
  - No moderation queue with approval workflow
  - No auto-moderation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Admin dashboard with tables, tabs, filters — UI-heavy
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Dashboard layout, table design, admin navigation

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19, 21-23)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 14

  **References**:

  **Pattern References**:
  - `src/components/comments/moderation-actions.tsx` (Task 14) — Reuse hide/delete action buttons
  - `src/lib/actions/posts.ts` (Task 7) — Post management actions

  **External References**:
  - shadcn DataTable: https://ui.shadcn.com/docs/components/data-table — Sortable, filterable table pattern

  **WHY Each Reference Matters**:
  - shadcn DataTable provides filtering, sorting, pagination out of the box

  **Acceptance Criteria**:
  - [ ] Comment moderation page shows all comments with status and actions
  - [ ] Hidden comments tab filters to hidden-only
  - [ ] Quick hide/unhide/delete works from table row
  - [ ] Post management page shows all posts with status
  - [ ] Post status change (draft/published/archived) works from table
  - [ ] Admin sidebar shows section links with counts

  **QA Scenarios**:

  ```
  Scenario: Admin moderates comments from dashboard
    Tool: Playwright
    Preconditions: Multiple comments exist, some hidden
    Steps:
      1. Login as admin, navigate to /admin/comments
      2. Assert table shows comments with status column
      3. Click "Hidden Comments" tab
      4. Assert only hidden comments shown
      5. Click "Unhide" on a hidden comment
      6. Assert comment moves out of hidden tab
    Expected Result: Moderation dashboard functional with filtering
    Failure Indicators: Wrong comments shown, status not updating
    Evidence: .sisyphus/evidence/task-20-moderation-dashboard.png
  ```

  **Commit**: YES (groups with Task 19)
  - Message: `feat(admin): add admin panel + content moderation`
  - Files: `src/app/(admin)/admin/comments/*`, `src/app/(admin)/admin/posts/page.tsx`, sidebar updates
  - Pre-commit: `bun run build`

- [ ] 21. RSS/Atom Feed Generation

  **What to do**:
  - Create `src/app/feed.xml/route.ts` — API route returning RSS 2.0 feed:
    - Fetches latest 50 published posts
    - Generates valid RSS 2.0 XML
    - Includes: title, link, description (excerpt), author, pubDate, guid (slug), categories (tags)
    - Content: full rendered HTML in `<content:encoded>` CDATA section
    - Channel info: blog title, description, link, language, lastBuildDate
  - Add RSS autodiscovery link in root layout `<head>`:
    - `<link rel="alternate" type="application/rss+xml" title="ChaKyiu Blog" href="/feed.xml" />`
  - Add RSS icon/link in footer
  - No external RSS library — generate XML directly (RSS 2.0 is simple XML)

  **Must NOT do**:
  - No Atom feed (RSS 2.0 only for simplicity)
  - No JSON Feed
  - No per-tag feeds
  - No pagination in feed (latest 50 is enough)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple XML generation from DB data — no complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19, 20, 22, 23)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 9

  **References**:

  **External References**:
  - RSS 2.0 spec: https://www.rssboard.org/rss-specification — XML format
  - W3C Feed validator: https://validator.w3.org/feed/ — For validation

  **WHY Each Reference Matters**:
  - RSS 2.0 has a specific XML format that RSS readers expect — must be spec-compliant

  **Acceptance Criteria**:
  - [ ] `/feed.xml` returns valid RSS 2.0 XML
  - [ ] Content-Type header: `application/rss+xml; charset=utf-8`
  - [ ] Feed includes latest 50 published posts
  - [ ] Each item has title, link, description, author, pubDate, guid
  - [ ] RSS autodiscovery link in HTML head
  - [ ] RSS link in footer

  **QA Scenarios**:

  ```
  Scenario: RSS feed valid and contains posts
    Tool: Bash (curl)
    Preconditions: Published posts exist
    Steps:
      1. curl -s http://localhost:3000/feed.xml
      2. Assert Content-Type contains "application/rss+xml"
      3. Assert response starts with "<?xml"
      4. Assert response contains "<rss version="2.0""
      5. Assert response contains "<item>" elements
      6. Assert at least one <title> and <link> within <item>
    Expected Result: Valid RSS 2.0 feed with post items
    Failure Indicators: Invalid XML, no items, wrong content type
    Evidence: .sisyphus/evidence/task-21-rss-feed.txt
  ```

  **Commit**: YES
  - Message: `feat(rss): add RSS feed generation`
  - Files: `src/app/feed.xml/route.ts`, layout head update, footer update
  - Pre-commit: `bun run build`

- [ ] 22. Auth Pages — Login, Register, Error, GitHub Callback UI

  **What to do**:
  - Create `src/app/(auth)/login/page.tsx` — login page:
    - Email + password form
    - "Sign in with GitHub" button (OAuth)
    - "Don't have an account? Register" link
    - Error messages: invalid credentials, account not found
    - GitHub-inspired clean, centered form layout
  - Create `src/app/(auth)/register/page.tsx` — registration page:
    - Name, email, password, confirm password form
    - Password strength indicator
    - "Sign in with GitHub" button
    - "Already have an account? Login" link
    - First-user info: "You'll be the first user and will become an admin" (if no users exist)
  - Create `src/app/(auth)/error/page.tsx` — auth error page:
    - Handles Auth.js error codes (OAuthAccountNotLinked, etc.)
    - User-friendly error messages
    - Link back to login
  - Create `src/app/(auth)/layout.tsx` — centered layout for auth pages:
    - Card in center of page
    - Blog logo/name at top
    - Minimal footer
  - Form validation: client-side (HTML5 + basic JS) + server-side (Zod in Server Actions)
  - Style: clean, GitHub-inspired, card-based forms with subtle shadows

  **Must NOT do**:
  - No forgot password flow (v1 simplification)
  - No email verification
  - No CAPTCHA
  - No social login providers beyond GitHub

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Auth UI design with forms, validation, error handling — visual focus
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Form design, centered layout, error state UX

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19-21, 23)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 6

  **References**:

  **Pattern References**:
  - `src/auth.ts` (Task 3) — signIn/signOut/auth exports
  - `src/lib/auth/register.ts` (Task 3) — Registration Server Action

  **External References**:
  - GitHub login page: https://github.com/login — Design reference for auth forms
  - shadcn Form: https://ui.shadcn.com/docs/components/form — Form component with validation

  **WHY Each Reference Matters**:
  - GitHub's login page is the design reference: centered card, minimal UI, provider buttons below form
  - Auth.js error codes map to specific user-facing messages — need the error code reference

  **Acceptance Criteria**:
  - [ ] Login form accepts email + password and authenticates
  - [ ] GitHub OAuth button redirects to GitHub and back
  - [ ] Registration form creates new user
  - [ ] Password validation (min 8 chars, 1 uppercase, 1 number)
  - [ ] Error messages displayed for invalid input
  - [ ] Auth error page shows human-friendly messages
  - [ ] Redirects to original page after successful login
  - [ ] Responsive design on all auth pages

  **QA Scenarios**:

  ```
  Scenario: Registration and login flow
    Tool: Playwright
    Preconditions: Clean database
    Steps:
      1. Navigate to /register
      2. Fill: name="Test User", email="test@test.com", password="Test1234!", confirm="Test1234!"
      3. Submit form
      4. Assert redirected to home page or dashboard
      5. Assert user avatar/name visible in header
      6. Click sign out
      7. Navigate to /login
      8. Fill: email="test@test.com", password="Test1234!"
      9. Submit
      10. Assert logged in (avatar visible in header)
    Expected Result: Full registration → logout → login flow works
    Failure Indicators: Registration fails, login fails, no redirect
    Evidence: .sisyphus/evidence/task-22-auth-flow.png

  Scenario: Invalid login shows error
    Tool: Playwright
    Preconditions: User exists
    Steps:
      1. Navigate to /login
      2. Enter wrong password
      3. Submit
      4. Assert error message visible (e.g., "Invalid credentials")
      5. Assert still on login page
    Expected Result: Clear error message, no crash
    Failure Indicators: Generic error, server crash, redirect to error page
    Evidence: .sisyphus/evidence/task-22-login-error.png
  ```

  **Commit**: YES (groups with Task 23)
  - Message: `feat(ui): add auth pages + SEO meta tags`
  - Files: `src/app/(auth)/*`
  - Pre-commit: `bun run build`

- [ ] 23. SEO Basics — Meta Tags, Open Graph, Structured Data

  **What to do**:
  - Update `src/app/layout.tsx` — default metadata:
    - Title template: `%s | ChaKyiu Blog`
    - Default description
    - Open Graph defaults (site name, type, locale)
    - Twitter card: summary_large_image
  - Update post detail page `generateMetadata()` (Task 11) — per-post meta:
    - Title: post title
    - Description: excerpt or first 160 chars
    - Open Graph: title, description, type=article, publishedTime, author, tags, image (cover or default)
    - Twitter card with cover image
  - Create `src/app/robots.txt/route.ts` — dynamic robots.txt:
    - Allow all crawlers
    - Point to sitemap
  - Create `src/app/sitemap.xml/route.ts` — dynamic sitemap:
    - List all published posts with lastmod
    - Include static pages (home, tags, search)
    - `changefreq` and `priority` values
  - Add structured data (JSON-LD) to post pages:
    - `@type: BlogPosting` with name, datePublished, author, description
  - Ensure canonical URLs on all pages

  **Must NOT do**:
  - No Google Analytics or tracking scripts
  - No AMP pages
  - No complex structured data (just BlogPosting)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Metadata configuration and XML generation — straightforward
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 19-22)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 11

  **References**:

  **External References**:
  - Next.js Metadata API: https://nextjs.org/docs/app/building-your-application/optimizing/metadata — generateMetadata, template
  - Schema.org BlogPosting: https://schema.org/BlogPosting — JSON-LD structure
  - Google Rich Results: https://developers.google.com/search/docs/appearance/structured-data — Testing tool

  **WHY Each Reference Matters**:
  - Next.js metadata API handles deduplication and merging — must follow their pattern for templates to work
  - JSON-LD structured data enables rich search results (author, date, image preview)

  **Acceptance Criteria**:
  - [ ] Default metadata renders on all pages
  - [ ] Post pages have unique title, description, OG tags
  - [ ] `/robots.txt` returns valid robots.txt
  - [ ] `/sitemap.xml` returns valid sitemap with all published posts
  - [ ] JSON-LD BlogPosting schema on post pages
  - [ ] Canonical URL on all pages

  **QA Scenarios**:

  ```
  Scenario: Post page has correct meta tags
    Tool: Bash (curl)
    Preconditions: Published post exists
    Steps:
      1. curl -s http://localhost:3000/posts/test-post | grep -E "<meta|<title|application/ld"
      2. Assert <title> contains post title
      3. Assert og:title meta tag present
      4. Assert og:description meta tag present
      5. Assert JSON-LD script tag with BlogPosting type present
    Expected Result: All SEO tags present in HTML source
    Failure Indicators: Missing OG tags, no JSON-LD, generic title
    Evidence: .sisyphus/evidence/task-23-seo-tags.txt

  Scenario: Sitemap includes all posts
    Tool: Bash (curl)
    Preconditions: 3+ published posts exist
    Steps:
      1. curl -s http://localhost:3000/sitemap.xml
      2. Assert valid XML
      3. Assert contains <url> entries for each published post
      4. Assert contains static pages (/search, etc.)
    Expected Result: Complete sitemap with all published posts
    Failure Indicators: Empty sitemap, draft posts included
    Evidence: .sisyphus/evidence/task-23-sitemap.txt
  ```

  **Commit**: YES (groups with Task 22)
  - Message: `feat(ui): add auth pages + SEO meta tags`
  - Files: `src/app/robots.txt/*`, `src/app/sitemap.xml/*`, layout metadata updates
  - Pre-commit: `bun run build`

- [ ] 24. Unit & Integration Tests — Auth + Blog CRUD

  **What to do**:
  - Create test setup file `src/lib/__tests__/setup.ts` with in-memory SQLite DB initialization, schema migration, and seed helpers
  - Write `src/lib/__tests__/auth.test.ts`:
    - Test user registration: creates user, hashes password with Argon2id, returns user object
    - Test first-user-becomes-admin: verify role="admin" when user count=0, role="user" for subsequent registrations
    - Test first-user race condition: concurrent registrations result in exactly one admin
    - Test password verification: correct password returns true, wrong password returns false
    - Test duplicate email rejection: registration with existing email fails
    - Test GitHub OAuth account creation: creates user from GitHub profile data
    - Test account linking conflict: email+password user can't link GitHub with same email (and vice versa)
  - Write `src/lib/__tests__/blog-crud.test.ts`:
    - Test post creation: admin creates post, stored with slug + rendered HTML + metadata
    - Test post creation denied for non-admin: user role cannot create posts
    - Test post update: admin updates title/content/tags, rendered HTML regenerated
    - Test post publish/unpublish toggle: draft ↔ published status change
    - Test post deletion: soft-delete or hard-delete, associated comments cascade
    - Test slug generation: title "Hello World!" → "hello-world", duplicate titles get suffix
    - Test tag association: create post with tags, query posts by tag, tag counts
    - Test markdown rendering: code blocks get Shiki highlighting, XSS stripped
  - Write `src/lib/__tests__/blog-queries.test.ts`:
    - Test post listing: returns published posts only, paginated, sorted by date
    - Test post listing for admin: includes drafts when requested
    - Test single post by slug: returns post with rendered content + author info
    - Test post not found: returns null for non-existent slug
  - All tests use bun test with `describe`/`it`/`expect` syntax
  - Each test file imports from source modules directly (no HTTP layer)

  **Must NOT do**:
  - Do NOT test API routes or Server Actions (those are QA scenario territory)
  - Do NOT mock the database — use real in-memory SQLite
  - Do NOT install any testing libraries beyond bun's built-in test runner
  - Do NOT add excessive comments or JSDoc to test files

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Tests require deep understanding of auth flows, race conditions, and data integrity — logic-heavy work
  - **Skills**: []
    - No specialized skills needed — pure TypeScript testing with bun
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — these are unit/integration tests, not browser tests

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 25)
  - **Parallel Group**: Wave 5 (with Tasks 25, 26, 27, 28)
  - **Blocks**: None (final verification only)
  - **Blocked By**: Tasks 1-12 (needs auth + blog CRUD implementations to exist)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/lib/db/schema.ts` — DB schema definitions: users, posts, tags, postTags tables and their relationships
  - `src/lib/auth/credentials.ts` — Password hashing/verification functions using Bun.password
  - `src/lib/auth/first-user.ts` — First-user-becomes-admin logic with transaction
  - `src/lib/blog/actions.ts` — Server Actions for post CRUD (createPost, updatePost, deletePost)
  - `src/lib/blog/queries.ts` — Data access functions for post listing, single post retrieval
  - `src/lib/markdown/render.ts` — Markdown-to-HTML pipeline with Shiki + rehype-sanitize

  **API/Type References** (contracts to implement against):
  - `src/lib/types.ts` — TypeScript types for Post, User, Tag, ServerActionResult
  - `src/lib/db/schema.ts` — Drizzle schema as source of truth for DB structure

  **Test References** (testing patterns to follow):
  - bun test docs: `describe()`, `it()`, `expect()`, `beforeAll()`, `afterEach()` — standard test runner API

  **External References**:
  - Bun test runner: https://bun.sh/docs/cli/test — describe/it/expect syntax, lifecycle hooks
  - Drizzle ORM testing: use `drizzle(new Database(":memory:"))` for in-memory SQLite

  **WHY Each Reference Matters**:
  - `schema.ts` defines all table structures — tests must match column names and relationships exactly
  - `credentials.ts` contains the actual hash/verify functions under test
  - `first-user.ts` contains the race-condition-prone admin logic that needs concurrency testing
  - `actions.ts` and `queries.ts` are the units under test for blog CRUD
  - `render.ts` is needed to verify markdown rendering produces correct HTML with code highlighting

  **Acceptance Criteria**:

  - [ ] Test files created: `src/lib/__tests__/setup.ts`, `src/lib/__tests__/auth.test.ts`, `src/lib/__tests__/blog-crud.test.ts`, `src/lib/__tests__/blog-queries.test.ts`
  - [ ] `bun test src/lib/__tests__/auth.test.ts` → PASS (7+ tests, 0 failures)
  - [ ] `bun test src/lib/__tests__/blog-crud.test.ts` → PASS (8+ tests, 0 failures)
  - [ ] `bun test src/lib/__tests__/blog-queries.test.ts` → PASS (4+ tests, 0 failures)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All auth tests pass
    Tool: Bash
    Preconditions: Source code for auth modules exists from Tasks 3-4
    Steps:
      1. bun test src/lib/__tests__/auth.test.ts --verbose
      2. Assert exit code 0
      3. Assert output contains "7 pass" (or greater)
      4. Assert output contains "0 fail"
    Expected Result: All 7+ auth tests pass with 0 failures
    Failure Indicators: Any test failure, import errors, DB connection issues
    Evidence: .sisyphus/evidence/task-24-auth-tests.txt

  Scenario: All blog CRUD tests pass
    Tool: Bash
    Preconditions: Source code for blog modules exists from Tasks 7-8
    Steps:
      1. bun test src/lib/__tests__/blog-crud.test.ts --verbose
      2. Assert exit code 0
      3. Assert output contains "8 pass" (or greater)
      4. Assert output contains "0 fail"
    Expected Result: All 8+ blog CRUD tests pass with 0 failures
    Failure Indicators: Any test failure, slug collision errors, markdown rendering errors
    Evidence: .sisyphus/evidence/task-24-blog-crud-tests.txt

  Scenario: All blog query tests pass
    Tool: Bash
    Preconditions: Source code for blog query modules exists from Tasks 10-11
    Steps:
      1. bun test src/lib/__tests__/blog-queries.test.ts --verbose
      2. Assert exit code 0
      3. Assert output contains "4 pass" (or greater)
    Expected Result: All 4+ query tests pass with 0 failures
    Failure Indicators: Pagination logic errors, draft visibility leaks
    Evidence: .sisyphus/evidence/task-24-blog-query-tests.txt

  Scenario: Full test suite runs without errors
    Tool: Bash
    Preconditions: All test files from this task exist
    Steps:
      1. bun test src/lib/__tests__/ --verbose
      2. Assert exit code 0
      3. Assert total pass count >= 19
    Expected Result: 19+ tests pass, 0 failures, clean output
    Failure Indicators: Any test failure, timeout, unhandled promise rejection
    Evidence: .sisyphus/evidence/task-24-full-suite.txt
  ```

  **Commit**: YES
  - Message: `test(auth,blog): add unit/integration tests for auth + blog CRUD`
  - Files: `src/lib/__tests__/setup.ts`, `src/lib/__tests__/auth.test.ts`, `src/lib/__tests__/blog-crud.test.ts`, `src/lib/__tests__/blog-queries.test.ts`
  - Pre-commit: `bun test src/lib/__tests__/`

- [ ] 25. Unit & Integration Tests — Comments + Notifications + Search

  **What to do**:
  - Write `src/lib/__tests__/comments.test.ts`:
    - Test comment creation: authenticated user creates comment on published post
    - Test comment creation denied: unauthenticated user cannot comment
    - Test comment on non-existent post: fails gracefully
    - Test reply creation: user replies to existing comment (single level only)
    - Test reply-to-reply blocked: attempting to reply to a reply returns error
    - Test comment with markdown: code blocks and inline code render, XSS stripped
    - Test comment visibility: hidden comments excluded from public queries, visible to admin
    - Test comment deletion by admin: removes comment and its replies
    - Test comment deletion by non-admin: denied
  - Write `src/lib/__tests__/notifications.test.ts`:
    - Test notification on comment: post author gets notified when someone comments
    - Test notification on reply: comment author gets notified when someone replies
    - Test no self-notification: commenting on own post or replying to own comment does not create notification
    - Test mark as read: single notification marked as read
    - Test mark all as read: bulk mark-all-read
    - Test unread count: returns correct count of unread notifications
    - Test notification content: contains correct actor name, action type, post title/slug
  - Write `src/lib/__tests__/search.test.ts`:
    - Test FTS5 index population: new published post appears in search
    - Test search by title keyword: returns matching posts
    - Test search by content keyword: returns matching posts
    - Test search excludes drafts: unpublished posts not in results
    - Test empty search: returns empty array, no error
    - Test search ranking: more relevant results appear first
    - Test FTS5 special characters: queries with quotes/symbols don't crash
  - All tests use the shared setup from Task 24's `setup.ts`

  **Must NOT do**:
  - Do NOT test UI rendering of comments/notifications/search
  - Do NOT mock the database — use real in-memory SQLite with FTS5
  - Do NOT test real-time/WebSocket notification delivery (doesn't exist in v1)
  - Do NOT add reply-to-reply functionality even in tests

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Comment threading logic, notification triggers, and FTS5 query behavior require careful logic testing
  - **Skills**: []
    - No specialized skills needed — pure TypeScript testing
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — unit/integration level tests only

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 24, 26, 27, 28)
  - **Parallel Group**: Wave 5 (with Tasks 24, 26, 27, 28)
  - **Blocks**: None (final verification only)
  - **Blocked By**: Tasks 13-18 (needs comments + notifications + search implementations)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/lib/__tests__/setup.ts` — Shared test setup from Task 24 (DB init, seed helpers)
  - `src/lib/comments/actions.ts` — Server Actions for createComment, createReply, hideComment, deleteComment
  - `src/lib/comments/queries.ts` — Query functions for fetching comments by post, comment visibility
  - `src/lib/notifications/actions.ts` — Server Actions for markAsRead, markAllAsRead
  - `src/lib/notifications/queries.ts` — Query functions for unread count, notification listing
  - `src/lib/search/queries.ts` — FTS5 search query functions

  **API/Type References**:
  - `src/lib/types.ts` — Comment, Reply, Notification, SearchResult types
  - `src/lib/db/schema.ts` — comments, replies, notifications, postsFts tables

  **External References**:
  - SQLite FTS5: https://www.sqlite.org/fts5.html — Full-text search query syntax

  **WHY Each Reference Matters**:
  - `setup.ts` provides DB initialization and seed data — tests depend on this shared foundation
  - `comments/actions.ts` contains the threading logic (comment vs reply) and authorization checks under test
  - `notifications/actions.ts` has the trigger logic — tests verify notifications are created on the right events
  - `search/queries.ts` wraps FTS5 — tests verify the raw SQL queries produce correct rankings

  **Acceptance Criteria**:

  - [ ] Test files created: `src/lib/__tests__/comments.test.ts`, `src/lib/__tests__/notifications.test.ts`, `src/lib/__tests__/search.test.ts`
  - [ ] `bun test src/lib/__tests__/comments.test.ts` → PASS (9+ tests, 0 failures)
  - [ ] `bun test src/lib/__tests__/notifications.test.ts` → PASS (7+ tests, 0 failures)
  - [ ] `bun test src/lib/__tests__/search.test.ts` → PASS (7+ tests, 0 failures)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All comment tests pass
    Tool: Bash
    Preconditions: Comment modules exist from Tasks 13-14
    Steps:
      1. bun test src/lib/__tests__/comments.test.ts --verbose
      2. Assert exit code 0
      3. Assert output contains "9 pass" (or greater)
      4. Assert output contains "0 fail"
    Expected Result: All 9+ comment tests pass with 0 failures
    Failure Indicators: Threading logic errors, authorization bypass, XSS in rendered markdown
    Evidence: .sisyphus/evidence/task-25-comment-tests.txt

  Scenario: All notification tests pass
    Tool: Bash
    Preconditions: Notification modules exist from Task 15
    Steps:
      1. bun test src/lib/__tests__/notifications.test.ts --verbose
      2. Assert exit code 0
      3. Assert output contains "7 pass" (or greater)
    Expected Result: All 7+ notification tests pass with 0 failures
    Failure Indicators: Self-notification created, missing notifications on replies, incorrect unread count
    Evidence: .sisyphus/evidence/task-25-notification-tests.txt

  Scenario: All search tests pass
    Tool: Bash
    Preconditions: Search modules exist from Task 18
    Steps:
      1. bun test src/lib/__tests__/search.test.ts --verbose
      2. Assert exit code 0
      3. Assert output contains "7 pass" (or greater)
    Expected Result: All 7+ search tests pass with 0 failures
    Failure Indicators: FTS5 virtual table not created, draft posts in search results, crash on special chars
    Evidence: .sisyphus/evidence/task-25-search-tests.txt

  Scenario: Combined test suite passes
    Tool: Bash
    Preconditions: All test files from Tasks 24 + 25 exist
    Steps:
      1. bun test src/lib/__tests__/ --verbose
      2. Assert exit code 0
      3. Assert total pass count >= 42 (19 from Task 24 + 23 from Task 25)
    Expected Result: 42+ tests pass, 0 failures
    Failure Indicators: Any test failure, import resolution errors, DB schema drift
    Evidence: .sisyphus/evidence/task-25-combined-suite.txt
  ```

  **Commit**: YES
  - Message: `test(comments,notifications,search): add unit/integration tests for social features`
  - Files: `src/lib/__tests__/comments.test.ts`, `src/lib/__tests__/notifications.test.ts`, `src/lib/__tests__/search.test.ts`
  - Pre-commit: `bun test src/lib/__tests__/`

- [ ] 26. Docker Deployment — Dockerfile + docker-compose + Entrypoint

  **What to do**:
  - Create `Dockerfile` with multi-stage build:
    - Stage 1 (`deps`): `FROM oven/bun:1` → copy package.json + bun.lock → `bun install --frozen-lockfile`
    - Stage 2 (`builder`): copy source + deps → `bun run build` (Next.js standalone output)
    - Stage 3 (`runner`): `FROM oven/bun:1-slim` → copy standalone output + public + .next/static → set NODE_ENV=production → expose 3000 → entrypoint script
  - Create `docker-compose.yml`:
    - Service `blog`: build from Dockerfile, ports 3000:3000, volumes for SQLite DB (`./data:/app/data`) and uploads (`./uploads:/app/uploads`), environment variables (AUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, AUTH_URL, DATABASE_URL), restart: unless-stopped
    - Named volumes for data persistence
  - Create `docker-entrypoint.sh`:
    - Create data directory if not exists
    - Run database migrations (`bun run db:migrate`)
    - Initialize FTS5 virtual tables if not present
    - Start the Next.js server (`bun run start`)
  - Create `.dockerignore`: node_modules, .next, .git, data/, uploads/, .env, .sisyphus/
  - Update `package.json` scripts:
    - `"db:migrate"`: drizzle migration command
    - `"docker:build"`: `docker compose build`
    - `"docker:up"`: `docker compose up -d`
    - `"docker:down"`: `docker compose down`
  - Create `.env.example` with all required environment variables documented

  **Must NOT do**:
  - Do NOT use Node.js base images — use oven/bun images only
  - Do NOT hardcode secrets in Dockerfile or docker-compose.yml
  - Do NOT include development dependencies in the production image
  - Do NOT use `latest` tag for base images — pin to specific bun version
  - Do NOT expose database file outside the data volume

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Docker deployment requires infrastructure knowledge but isn't pure logic or UI work
  - **Skills**: []
    - No specialized skills needed — Docker/compose are standard tooling
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — infrastructure task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 24, 25, 27, 28)
  - **Parallel Group**: Wave 5 (with Tasks 24, 25, 27, 28)
  - **Blocks**: None (final verification only)
  - **Blocked By**: Tasks 1-2 (needs project scaffolding and DB schema for migration script)

  **References**:

  **Pattern References**:
  - `package.json` — Scripts section, dependencies list, build configuration
  - `next.config.ts` — Must have `output: "standalone"` for Docker deployment
  - `src/lib/db/index.ts` — Database connection setup, file path configuration
  - `drizzle.config.ts` — Migration configuration

  **API/Type References**:
  - `src/lib/db/schema.ts` — All table definitions needed for migration
  - `src/lib/search/fts-setup.ts` — FTS5 virtual table creation SQL (raw SQL, not Drizzle)

  **External References**:
  - Bun Docker: https://bun.sh/guides/ecosystem/docker — Official Bun Docker guide
  - Next.js standalone: https://nextjs.org/docs/app/api-reference/config/next-config-js/output — Standalone output mode
  - Docker Compose v2: https://docs.docker.com/compose/compose-file/ — Compose file reference

  **WHY Each Reference Matters**:
  - `next.config.ts` must have `output: "standalone"` or the Docker build will copy the entire node_modules (bloated image)
  - `drizzle.config.ts` tells the entrypoint what migration command to run
  - `fts-setup.ts` contains the raw SQL for FTS5 virtual tables that must run after standard migrations
  - Package.json scripts define the build/start commands the Dockerfile calls

  **Acceptance Criteria**:

  - [ ] Files created: `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `.dockerignore`, `.env.example`
  - [ ] `docker compose build` → succeeds with no errors
  - [ ] `docker compose up -d` → container starts and stays running
  - [ ] `curl http://localhost:3000` → returns HTML (200 status)
  - [ ] Container logs show successful migration + FTS5 setup
  - [ ] `docker compose down && docker compose up -d` → data persists (posts, users still exist)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Docker image builds successfully
    Tool: Bash
    Preconditions: All source code from Tasks 1-23 exists, Docker daemon running
    Steps:
      1. docker compose build --no-cache 2>&1 | tee /tmp/docker-build.log
      2. Assert exit code 0
      3. Assert log contains "Successfully built" or "exporting to image"
      4. docker images | grep chakyiu-blog
      5. Assert image size < 500MB (lean standalone build)
    Expected Result: Image builds in <5 minutes, size under 500MB
    Failure Indicators: Build failure, missing dependencies, bun install errors
    Evidence: .sisyphus/evidence/task-26-docker-build.txt

  Scenario: Container starts and serves the app
    Tool: Bash
    Preconditions: Docker image built successfully
    Steps:
      1. docker compose up -d
      2. sleep 10 (wait for migrations + server start)
      3. docker compose logs blog 2>&1 | tee /tmp/docker-logs.txt
      4. Assert logs contain "Ready" or "started server" (Next.js ready message)
      5. Assert logs do NOT contain "Error" or "FATAL"
      6. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
      7. Assert HTTP status code is 200
    Expected Result: Container running, migrations applied, app serving on port 3000
    Failure Indicators: Container crash loop, migration failure, port not accessible
    Evidence: .sisyphus/evidence/task-26-container-start.txt

  Scenario: Data persists across container restarts
    Tool: Bash
    Preconditions: Container running with at least one admin user registered
    Steps:
      1. curl -s http://localhost:3000/api/health (verify running)
      2. docker compose down
      3. docker compose up -d
      4. sleep 10
      5. curl -s http://localhost:3000/api/health
      6. Assert health check returns 200 with {"status":"ok"}
      7. Verify previously created data still accessible (check DB file exists in data/ volume)
    Expected Result: SQLite database and uploads persist through container restart
    Failure Indicators: Empty database after restart, missing uploaded files
    Evidence: .sisyphus/evidence/task-26-data-persistence.txt

  Scenario: Environment variables are required
    Tool: Bash
    Preconditions: Docker image built
    Steps:
      1. Remove AUTH_SECRET from docker-compose.yml env
      2. docker compose up -d 2>&1
      3. docker compose logs blog 2>&1
      4. Assert logs contain error about missing AUTH_SECRET
      5. Restore AUTH_SECRET
    Expected Result: App fails gracefully with clear error about missing required env vars
    Failure Indicators: App starts with undefined secrets, silent failure
    Evidence: .sisyphus/evidence/task-26-env-validation.txt
  ```

  **Commit**: YES
  - Message: `chore(docker): add Dockerfile, docker-compose, and entrypoint for deployment`
  - Files: `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `.dockerignore`, `.env.example`, `package.json` (scripts)
  - Pre-commit: `docker compose build`

- [ ] 27. Error Handling + Loading States + Empty States Across All Pages

  **What to do**:
  - Create shared error boundary component `src/components/error-boundary.tsx`:
    - Uses Next.js `error.tsx` convention per route segment
    - Displays user-friendly error message with "Try Again" button
    - Logs error details to console in development
    - Shows different messages for 404 vs 500 vs generic errors
  - Create shared loading skeleton components `src/components/skeletons/`:
    - `post-list-skeleton.tsx`: Mimics post list layout (title bar + meta line + tags, repeated 5x)
    - `post-detail-skeleton.tsx`: Mimics post detail (title + author + content block)
    - `comment-skeleton.tsx`: Mimics comment thread (avatar + name + text block, nested)
    - `sidebar-skeleton.tsx`: Mimics sidebar with tag cloud + recent posts
  - Add `loading.tsx` files to key route segments:
    - `src/app/(blog)/loading.tsx` — post list skeleton
    - `src/app/(blog)/posts/[slug]/loading.tsx` — post detail skeleton
    - `src/app/(blog)/search/loading.tsx` — search results skeleton
    - `src/app/admin/loading.tsx` — admin panel skeleton
  - Create empty state components `src/components/empty-states/`:
    - `no-posts.tsx`: "No posts yet" with icon, shown on empty post list
    - `no-results.tsx`: "No results found for [query]" with search suggestions
    - `no-comments.tsx`: "Be the first to comment" with call-to-action
    - `no-notifications.tsx`: "You're all caught up" with checkmark icon
  - Add `not-found.tsx` pages:
    - `src/app/not-found.tsx` — Global 404 with navigation links
    - `src/app/(blog)/posts/[slug]/not-found.tsx` — Post not found with "Browse all posts" link
  - Integrate empty states into existing pages:
    - Post list page: show `no-posts` when zero published posts
    - Search results: show `no-results` when query returns nothing
    - Comments section: show `no-comments` when post has zero comments
    - Notifications page: show `no-notifications` when all read / none exist
  - Add error.tsx files to catch runtime errors:
    - `src/app/error.tsx` — Root error boundary
    - `src/app/(blog)/posts/[slug]/error.tsx` — Post page error
    - `src/app/admin/error.tsx` — Admin error boundary

  **Must NOT do**:
  - Do NOT use client-side state management for loading states (use Next.js Suspense boundaries + loading.tsx)
  - Do NOT create custom CSS files for skeletons — use Tailwind animate-pulse utility
  - Do NOT over-design skeletons — simple gray boxes with pulse animation matching the real layout
  - Do NOT add loading spinners — use skeleton screens exclusively (GitHub-like pattern)
  - Do NOT add toast notifications (not in v1 scope)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Skeletons, empty states, and error UIs are visual components requiring layout matching and polish
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Needed for crafting visually consistent skeleton and empty state designs that match the GitHub-like aesthetic
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation — QA scenarios will use it but the agent selects it at runtime

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 24, 25, 26, 28)
  - **Parallel Group**: Wave 5 (with Tasks 24, 25, 26, 28)
  - **Blocks**: None (final verification only)
  - **Blocked By**: Tasks 6, 10, 11, 13, 15, 16, 18 (needs page layouts to exist for skeleton matching + integration)

  **References**:

  **Pattern References**:
  - `src/app/(blog)/page.tsx` — Post list page layout (skeleton must match this shape)
  - `src/app/(blog)/posts/[slug]/page.tsx` — Post detail layout (skeleton reference)
  - `src/components/ui/` — shadcn/ui components used across the app (Card, Skeleton, etc.)
  - `src/app/(blog)/layout.tsx` — Blog layout with sidebar (skeleton needs matching sidebar shape)
  - `src/components/comments/comment-list.tsx` — Comment thread layout
  - `src/app/(blog)/notifications/page.tsx` — Notifications page layout

  **API/Type References**:
  - Next.js error.tsx: `export default function Error({ error, reset })` — error boundary convention
  - Next.js loading.tsx: `export default function Loading()` — Suspense fallback convention
  - Next.js not-found.tsx: `export default function NotFound()` — 404 page convention

  **External References**:
  - Next.js error handling: https://nextjs.org/docs/app/building-your-application/routing/error-handling
  - Next.js loading UI: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
  - Tailwind animate-pulse: https://tailwindcss.com/docs/animation#pulse — Skeleton animation utility

  **WHY Each Reference Matters**:
  - Page layouts are the templates that skeletons must match — if post list shows 5 items in a vertical stack, the skeleton must show 5 pulsing blocks in the same vertical stack
  - shadcn/ui Skeleton component may already exist — check before creating custom one
  - Comment list layout determines comment skeleton nesting structure
  - Next.js conventions (error.tsx, loading.tsx, not-found.tsx) must follow exact export signatures

  **Acceptance Criteria**:

  - [ ] Skeleton components exist in `src/components/skeletons/` (4 files)
  - [ ] Empty state components exist in `src/components/empty-states/` (4 files)
  - [ ] `loading.tsx` files exist in 4 route segments
  - [ ] `error.tsx` files exist in 3 route segments + root
  - [ ] `not-found.tsx` exists at root + post slug route
  - [ ] `bun run build` → succeeds with no errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Loading skeletons appear during navigation
    Tool: Playwright (playwright skill)
    Preconditions: App running on localhost:3000 with posts in DB
    Steps:
      1. Navigate to http://localhost:3000
      2. Enable network throttling (slow 3G) or use page.route() to delay API responses by 3 seconds
      3. Click on a post link
      4. Assert `.animate-pulse` elements are visible (skeleton is showing)
      5. Wait for actual content to load
      6. Assert `.animate-pulse` elements are gone
      7. Assert post title text is visible
      8. Take screenshot during loading state
    Expected Result: Skeleton UI appears during loading, replaced by real content
    Failure Indicators: Blank white page during load, no skeleton visible, content flash
    Evidence: .sisyphus/evidence/task-27-loading-skeleton.png

  Scenario: Empty states render correctly
    Tool: Playwright (playwright skill)
    Preconditions: App running, empty database (no posts)
    Steps:
      1. Navigate to http://localhost:3000 (post list)
      2. Assert text "No posts yet" is visible
      3. Navigate to http://localhost:3000/search?q=nonexistent
      4. Assert text "No results found" is visible
      5. Take screenshots of both empty states
    Expected Result: Friendly empty state messages with icons, no broken layouts
    Failure Indicators: Raw "undefined" text, blank page, error thrown
    Evidence: .sisyphus/evidence/task-27-empty-states.png

  Scenario: 404 page renders for non-existent post
    Tool: Playwright (playwright skill)
    Preconditions: App running on localhost:3000
    Steps:
      1. Navigate to http://localhost:3000/posts/this-slug-does-not-exist
      2. Assert HTTP response status is 404
      3. Assert text "not found" (case-insensitive) is visible
      4. Assert a link to "Browse all posts" or similar navigation exists
      5. Click the navigation link
      6. Assert redirected to post list page
    Expected Result: Custom 404 page with helpful navigation, not default Next.js 404
    Failure Indicators: Default Next.js 404, 500 error instead of 404, broken navigation link
    Evidence: .sisyphus/evidence/task-27-not-found.png

  Scenario: Error boundary catches runtime errors gracefully
    Tool: Playwright (playwright skill)
    Preconditions: App running on localhost:3000
    Steps:
      1. Temporarily break a server component (e.g., throw Error in post detail page)
      2. Navigate to a post page
      3. Assert error boundary UI is shown (not raw error stack)
      4. Assert "Try Again" button is visible
      5. Click "Try Again"
      6. Assert page attempts to reload
      7. Restore the server component
    Expected Result: User-friendly error message with recovery action
    Failure Indicators: Raw error stack trace, white screen of death, no recovery option
    Evidence: .sisyphus/evidence/task-27-error-boundary.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add loading skeletons, empty states, error boundaries, and 404 pages`
  - Files: `src/components/skeletons/*`, `src/components/empty-states/*`, `src/app/**/loading.tsx`, `src/app/**/error.tsx`, `src/app/**/not-found.tsx`
  - Pre-commit: `bun run build`

- [ ] 28. Health Check Endpoint + Graceful Shutdown

  **What to do**:
  - Create `src/app/api/health/route.ts`:
    - GET handler returns JSON `{ status: "ok", timestamp: ISO8601, uptime: seconds, db: "connected"|"error" }`
    - Tests database connectivity by running a simple `SELECT 1` query
    - Returns 200 if all checks pass, 503 if database is unreachable
    - No authentication required (public endpoint for Docker health checks)
  - Update `docker-compose.yml` to add health check:
    - `healthcheck: test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]`
    - `interval: 30s`, `timeout: 10s`, `retries: 3`, `start_period: 40s`
  - Create `src/lib/db/health.ts`:
    - Export `checkDatabaseHealth()` function that runs `SELECT 1` and returns boolean
    - Handles connection timeout (5s max)
    - Catches and logs errors without crashing
  - Add graceful shutdown handling in `docker-entrypoint.sh`:
    - Trap SIGTERM and SIGINT signals
    - On signal: log "Shutting down gracefully...", wait for in-flight requests, close DB connection, exit 0
  - Update `src/lib/db/index.ts`:
    - Export `closeDatabase()` function for clean shutdown
    - Register process signal handlers for SIGTERM/SIGINT to call `closeDatabase()`

  **Must NOT do**:
  - Do NOT add complex health metrics (no CPU/memory monitoring — that's observability, not health)
  - Do NOT add authentication to the health endpoint
  - Do NOT add readiness vs liveness distinction (overkill for single-container deployment)
  - Do NOT install any monitoring libraries

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused task — one API route, one utility function, minor Docker update
  - **Skills**: []
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — API endpoint tested via curl

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 24, 25, 26, 27)
  - **Parallel Group**: Wave 5 (with Tasks 24, 25, 26, 27)
  - **Blocks**: None (final verification only)
  - **Blocked By**: Tasks 1-2, 26 (needs project scaffolding, DB setup, and Docker config)

  **References**:

  **Pattern References**:
  - `src/app/api/uploads/[...path]/route.ts` — Existing API route pattern (from Task 17 image uploads)
  - `src/lib/db/index.ts` — Database connection initialization and export
  - `docker-compose.yml` — Docker Compose configuration (from Task 26)
  - `docker-entrypoint.sh` — Entrypoint script (from Task 26)

  **API/Type References**:
  - `src/lib/types.ts` — Type for HealthCheckResponse if needed

  **External References**:
  - Docker healthcheck: https://docs.docker.com/reference/dockerfile/#healthcheck — Healthcheck directive
  - Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers — GET handler syntax

  **WHY Each Reference Matters**:
  - Existing API route in uploads shows the route handler pattern used in this project
  - `db/index.ts` is where the DB connection lives — health check must use the same connection
  - Docker compose file needs the healthcheck directive added alongside the existing service config
  - Entrypoint script gets signal handling added to the existing migration + start logic

  **Acceptance Criteria**:

  - [ ] Files created: `src/app/api/health/route.ts`, `src/lib/db/health.ts`
  - [ ] Files updated: `docker-compose.yml` (healthcheck), `docker-entrypoint.sh` (signal handling), `src/lib/db/index.ts` (closeDatabase)
  - [ ] `curl http://localhost:3000/api/health` → 200 with `{"status":"ok","db":"connected",...}`
  - [ ] Docker health check shows "healthy" status after container starts
  - [ ] `bun run build` → succeeds with no errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Health endpoint returns healthy status
    Tool: Bash (curl)
    Preconditions: App running on localhost:3000 with valid DB connection
    Steps:
      1. curl -s http://localhost:3000/api/health | jq .
      2. Assert JSON contains "status": "ok"
      3. Assert JSON contains "db": "connected"
      4. Assert JSON contains "timestamp" (ISO 8601 format)
      5. Assert JSON contains "uptime" (number > 0)
      6. Assert HTTP status code is 200
    Expected Result: Health check returns 200 with all fields populated
    Failure Indicators: 500 error, missing fields, db shows "error"
    Evidence: .sisyphus/evidence/task-28-health-ok.txt

  Scenario: Health endpoint reports DB failure
    Tool: Bash (curl)
    Preconditions: App running, temporarily make DB file unreadable (chmod 000 data/blog.db)
    Steps:
      1. chmod 000 data/blog.db (simulate DB failure)
      2. curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
      3. Assert HTTP status code is 503
      4. curl -s http://localhost:3000/api/health | jq .
      5. Assert JSON contains "db": "error"
      6. chmod 644 data/blog.db (restore DB)
      7. curl -s http://localhost:3000/api/health | jq .status
      8. Assert status is back to "ok"
    Expected Result: 503 when DB is unreachable, recovers when DB is restored
    Failure Indicators: Still returns 200 with broken DB, app crashes instead of returning 503
    Evidence: .sisyphus/evidence/task-28-health-db-failure.txt

  Scenario: Docker health check marks container as healthy
    Tool: Bash
    Preconditions: Docker container running from Task 26
    Steps:
      1. docker compose up -d
      2. sleep 45 (wait for start_period + first health check)
      3. docker inspect --format='{{.State.Health.Status}}' $(docker compose ps -q blog)
      4. Assert output is "healthy"
      5. docker inspect --format='{{json .State.Health.Log}}' $(docker compose ps -q blog) | jq '.[0].Output'
      6. Assert health log shows successful check
    Expected Result: Container health status is "healthy"
    Failure Indicators: "unhealthy" or "starting" status after 60s
    Evidence: .sisyphus/evidence/task-28-docker-health.txt

  Scenario: Graceful shutdown on SIGTERM
    Tool: Bash
    Preconditions: Docker container running
    Steps:
      1. docker compose up -d
      2. sleep 10
      3. docker compose logs --tail=0 -f blog > /tmp/shutdown.log &
      4. docker compose stop blog (sends SIGTERM)
      5. sleep 5
      6. cat /tmp/shutdown.log
      7. Assert log contains "Shutting down gracefully" or similar message
      8. Assert container exit code is 0 (docker inspect --format='{{.State.ExitCode}}')
    Expected Result: Clean shutdown with log message, exit code 0
    Failure Indicators: Exit code 137 (SIGKILL), no shutdown message, DB corruption warning
    Evidence: .sisyphus/evidence/task-28-graceful-shutdown.txt
  ```

  **Commit**: YES
  - Message: `feat(ops): add health check endpoint + graceful shutdown + Docker healthcheck`
  - Files: `src/app/api/health/route.ts`, `src/lib/db/health.ts`, `src/lib/db/index.ts`, `docker-compose.yml`, `docker-entrypoint.sh`
  - Pre-commit: `bun run build`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` (no errors) + `bun test` (all pass). Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic variable names (data/result/item/temp). Verify no custom `.css` files except `globals.css`. Verify no client-side state management libraries. Verify Server Actions return `{ success, error?, data? }` consistently.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Full QA — Playwright End-to-End** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (`docker compose down -v && docker compose up -d`). Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: register → become admin → create post with image → another user comments → admin gets notification → admin hides comment → user sees "[hidden]" → search finds post → RSS contains post. Test edge cases: XSS in comment, empty form submissions, invalid file upload, simultaneous first-user registration. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance per task. Check global "Must NOT Have" guardrails. Detect cross-task contamination. Flag unaccounted changes. Verify no client-side markdown parser shipped. Verify no API routes used for internal data (only RSS, uploads, health, auth handlers).
  Output: `Tasks [N/N compliant] | Guardrails [N/N] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| After Task(s) | Commit Message | Pre-commit |
|---------------|---------------|------------|
| 1 | `chore(scaffold): init Next.js 16 + bun + tailwind + shadcn` | `bun run build` |
| 2 | `feat(db): add Drizzle schema + SQLite migrations + FTS5` | `bun run build` |
| 3 | `feat(auth): add Auth.js v5 with email+password + GitHub OAuth + RBAC` | `bun run build` |
| 4, 5 | `feat(ui): add theme tokens + dark mode + shared types` | `bun run build` |
| 6 | `feat(ui): add app shell layout + nav + sidebar + footer` | `bun run build` |
| 7, 9 | `feat(blog): add post CRUD + markdown rendering pipeline` | `bun run build` |
| 8 | `feat(editor): add markdown editor with live preview` | `bun run build` |
| 10, 11, 12 | `feat(blog): add post list + detail pages + tag system` | `bun run build` |
| 13, 14 | `feat(comments): add comment/reply system + moderation` | `bun run build` |
| 15, 16 | `feat(notifications): add in-app notifications + user history` | `bun run build` |
| 17 | `feat(uploads): add image upload + serve system` | `bun run build` |
| 18 | `feat(search): add FTS5 full-text search` | `bun run build` |
| 19, 20 | `feat(admin): add admin panel + content moderation` | `bun run build` |
| 21 | `feat(rss): add RSS feed generation` | `bun run build` |
| 22, 23 | `feat(ui): add auth pages + SEO meta tags` | `bun run build` |
| 24, 25 | `test: add unit/integration tests for core features` | `bun test` |
| 26, 27, 28 | `chore(deploy): add Docker + error states + health check` | `docker build .` |

---

## Success Criteria

### Verification Commands
```bash
# Build succeeds
bun run build  # Expected: no errors

# Tests pass
bun test  # Expected: all tests pass

# Docker works
docker compose up -d  # Expected: container starts
curl http://localhost:3000/api/health  # Expected: 200 OK

# Auth works
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -d '{"email":"admin@test.com","password":"Test1234!"}' \
  # Expected: session cookie set

# RSS works
curl http://localhost:3000/feed.xml  # Expected: valid XML with posts

# Search works
curl "http://localhost:3000/api/search?q=typescript"  # Expected: JSON results
```

### Final Checklist
- [ ] All "Must Have" present (verified by F1)
- [ ] All "Must NOT Have" absent (verified by F1 + F4)
- [ ] All `bun test` pass (verified by F2)
- [ ] `bun run build` succeeds with zero warnings (verified by F2)
- [ ] Docker deployment functional (verified by F3)
- [ ] End-to-end user flows working (verified by F3)
- [ ] No scope creep (verified by F4)
- [ ] All evidence files present in `.sisyphus/evidence/`
