# Draft: Chakyiu Blog — IT Dev Blog (Next.js 16)

## Requirements (confirmed)

- **Framework**: Next.js 16, App Router
- **Storage**: SQLite (ease of use)
- **Auth**: Email signin + GitHub OAuth
- **Layout**: Inspired by GitHub's Pull Requests page
- **Theme**: IT developer blog aesthetic
- **Roles**: Admin (full CRUD on posts, manage comments) / Signed-in User (comment, reply, view history, notifications)

## User Roles & Permissions

- **Admin**: Create/edit/remove posts, remove/hide comments
- **Signed-in User**: Comment, reply, view comment/reply history, notifications
- **Anonymous/Guest**: Read posts only (implied, TBD)

## Technical Decisions

- **Package manager**: bun (native SQLite support via bun:sqlite is a bonus)
- **Post authoring**: Markdown with live preview, stored in DB
- **Notifications**: In-app only (no email service dependency)
- **Admin model**: Multiple admins (need admin management / role assignment)
- **Deployment**: Docker (SQLite persisted via volume)

## Features Confirmed

- Tags/Categories for post organization
- Full-text search across posts
- Image uploads in blog posts (need local/volume storage)
- Dark/Light mode toggle
- Code syntax highlighting (essential for dev blog)
- RSS/Atom feed

## Additional Decisions

- **Email signin**: Email + Password (traditional, no email service dependency for auth)
- **Comment format**: Markdown-enabled (with code block support — perfect for dev blog)
- **Image storage**: Local filesystem, Docker volume mount for persistence
- **Admin assignment**: First registered user auto-becomes admin, admin panel for promoting/demoting others

## Open Questions

- (all resolved)

## Scope Boundaries

- INCLUDE: (to be finalized)
- EXCLUDE: (to be finalized)

## Research Findings

- **Next.js 16**: Stable with App Router, Server Components default, Server Actions, `refresh()` from `next/cache`, renamed `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`. Proxy (middleware) supports auth route protection.
- **Auth.js v5**: Works with Next.js App Router. PrismaAdapter or DrizzleAdapter available. GitHub OAuth auto-configures with `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` env vars. RBAC via session callbacks (`session.user.role`). Middleware for route protection.
- **Drizzle ORM + SQLite**: Native `bun:sqlite` driver. Schema-first with `drizzle-orm/sqlite-core`. Supports relations, indexes. FTS for SQLite needs raw SQL (FTS5 virtual table). Drizzle Kit for migrations.
- **GitHub PR Layout**: List view (filterable table with status labels), detail view (title + conversation thread + sidebar metadata), threaded comments with reply chains, activity timeline.
- **Tech Stack Recommendation**:
  - Next.js 16 + App Router
  - Drizzle ORM + bun:sqlite (over Prisma — lighter, better for SQLite)
  - Auth.js v5 with Drizzle adapter
  - Tailwind CSS v4 + shadcn/ui for GitHub-like design
  - Shiki for code syntax highlighting
  - react-markdown + remark-gfm for markdown rendering
  - Docker with multi-stage build

## Scope Boundaries

- INCLUDE: Full blog CRUD, auth (email+pw, GitHub OAuth), comments/replies (markdown), notifications (in-app), admin panel, tags, search, image uploads, dark/light mode, code highlighting, RSS, Docker deployment
- EXCLUDE: Email notifications, real-time (websockets), analytics, i18n, CI/CD pipeline, SEO beyond basics, rate limiting, CAPTCHA
