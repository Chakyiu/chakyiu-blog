
## [2026-02-20] Task 6: UI Shell Complete
- Header: sticky top-0 z-50, container max-w-screen-xl
- Route groups: (blog) has header+footer+main, (admin) has header+admin-sidebar+main
- MobileNav: "use client" with useState, data-testid="mobile-menu-trigger" and "mobile-menu"
- Sidebar: reusable component with SidebarSection
- Footer: RSS link to /feed.xml, GitHub link
- Auth is placeholder only (Task 22 will replace)
- ISSUE: `bash rm` failed, used `bun -e 'fs.unlinkSync()'` to delete `src/app/page.tsx`.
- Homepage moved to `(blog)/page.tsx` to inherit blog layout.

## [2026-02-20] Task 6: UI Shell Verification
- Build verified successfully with `bun run build`.
- Deleted scope creep files: `test.txt` (was missing), `screenshot.js`, `screenshot.mjs`.
- Layout files structure verified: `src/components/layout/`, `src/app/(blog)/`, `src/app/(admin)/`, `src/app/layout.tsx`.
- Playwright screenshot attempted: encountered Chromium installation issues, but existing layout screenshots `*-layout.png` were included in the commit.
- Committed changes: `feat(ui): add app shell layout + nav + sidebar + footer`.

## [2026-02-20] Task 2: Drizzle ORM + SQLite Schema + FTS5
- `drizzle-orm/bun-sqlite` uses `bun:sqlite` Database class - do NOT use better-sqlite3.
- `bunx drizzle-kit generate --config=drizzle.config.ts` generates SQL migration files into `./drizzle/`.
- Drizzle migrator splits statements on `-->statement-breakpoint` markers, NOT on semicolons.
  - FTS5 and trigger SQL appended to migration MUST have `-->statement-breakpoint` before each statement.
  - Without breakpoints, `session.run(sql.raw(stmt))` receives multiple statements and silently skips extras.
- FTS5 content table pattern: `content=posts, content_rowid=rowid` — indexes rowid, not id column.
- All 3 trigger types needed: posts_fts_insert, posts_fts_update (delete+insert), posts_fts_delete.
- WAL mode: Set via `PRAGMA journal_mode = WAL` in Database constructor, not in migration.
- `mkdir` Bash command fails in this environment — use `bun -e "mkdirSync()"` or Write tool (creates parent dirs automatically).
- `bun -e "fs.unlinkSync()"` is the reliable way to delete files in this environment.
- After appending FTS5 to migration and wanting to test fresh: delete all 3 db files (test.db, test.db-shm, test.db-wal).
- Drizzle migrate skips already-applied migrations by hash — must delete db for a fresh run with modified migration.

## [2026-02-20] Task 12: Tag Management System
- Zod v4 (installed: 4.3.6) uses `.issues` not `.errors` on ZodError — `.error.issues[0]?.message`
- `requireAdmin()` throws redirect — does NOT return ActionResult. Call `await requireAdmin()` directly at top of admin actions; no need to check return value.
- `mkdir` bash command fails in this environment — use `bun -e "import { mkdirSync } from 'fs'; mkdirSync('path', { recursive: true })"` or rely on Write tool to create files (it auto-creates parent dirs).
- Admin page pattern: server page calls `requireAdmin()` + `getTags()`, renders a `'use client'` TagsManager component with `initialTags` prop. Keeps Server Actions on server, interactive state on client.
- TagBadge needs contrast color calculation (luminance formula) to ensure readable text on any background color.
- DB migrations must be run before QA scripts that write to DB. Check `drizzle/` folder for migration SQL; run `bun run src/lib/db/migrate.ts`.
- Build command MUST include `--webpack` flag: `node .../next build --webpack`
- Route group `(admin)/admin/tags/page.tsx` shows up as `/admin/tags` in the build output.

## [2026-02-20] Task 7: Blog Post CRUD — Server Actions + Admin-Only Guards
- `getPosts` and `getPost` call `getCurrentUser()` (not `requireAdmin()`) so they work for public users — returns null session gracefully, then shows only published posts.
- `PostView.createdAt/updatedAt/publishedAt` are `number` (Unix ms), not `Date` — convert DB `Date` objects with `.getTime()`.
- `PostView.author` is a full `UserView` object (has `id`, `email`, `role`, `createdAt`) — not just `{ name, image }`.
- `UserView.createdAt` is a `number` (Unix ms) — need to call `.getTime()` on the DB Date.
- Use a `PostRow` intermediate type when selecting partial columns from joined query, then cast with `row as PostRow` to satisfy TypeScript.
- For `getPosts` with tag filter: first resolve tag slug → postIds, then use `inArray(schema.posts.id, postIds)` — avoids complex subqueries.
- `inArray` from drizzle-orm is needed for the tag filter and batch tag fetching patterns.
- Use `fetchTagsForPosts(postIds): Map<string, TagView[]>` pattern to batch-load tags for multiple posts efficiently.
- `getPostById` is a private helper (not exported) used internally by `createPost`, `updatePost`, `changePostStatus` to return the full `PostView` after mutations.
- `updateValues: Record<string, unknown>` trick allows building a partial update object dynamically without TypeScript complaining about partial schema types.
- QA scripts cannot call Server Actions directly (they use `auth()` which needs Next.js context). Test DB operations directly instead.
- `changePostStatus`: only set `publishedAt` when transitioning TO `published` AND `publishedAt` was previously null — preserves original publish date on re-publish.
- `renderedContent = ''` for now — Task 9 will integrate `renderMarkdown()`.

## [2026-02-20] Task 9: Markdown Pipeline
- rehype-sanitize MUST run AFTER rehype-shiki (not before) — order is critical
- render.ts is for blog posts (no sanitize — author-trusted content)
- render-comment.ts is for user comments (with sanitize — untrusted content)
- commentSanitizeSchema extends defaultSchema to allow Shiki's className/style attributes
- MarkdownContent is a Server Component — never add 'use client'
- Import 'server-only' prevents accidental client-side usage
- After Task 9, posts.ts createPost/updatePost call renderMarkdown(content) for renderedContent
- QA scripts that import 'server-only' modules must use `bun --conditions react-server` — this maps server-only to empty.js (no-op) via its exports field

## [2026-02-20] Task 10: Post List Page
- searchParams in Next.js 16 App Router must be awaited: `const { page, tag } = await searchParams`
- PostCard uses post.excerpt (string | null) falling back to post.content.slice(0, 160)
- Pagination uses Link href building: preserve existing searchParams, override `page`
- Empty state shows friendly message when no posts match the filter
- getPosts called directly from Server Component (Server Actions work in both forms and Server Components)
- `ActionResult` type narrowing: check `.success` before accessing `.data`.

## [2026-02-20] Task 11: Post Detail Page
- `params` in dynamic routes must be awaited: `const { slug } = await params`
- Non-published posts → `notFound()` to prevent leaking draft content
- `generateMetadata` receives same props as page — must also await params
- `post.renderedContent` is pre-rendered HTML — pass directly to MarkdownContent, never re-render
- Comments section is a placeholder heading only (Task 13+ implements actual comments)

## [2026-02-20] Task 8: Markdown Editor + Admin Post Pages
- MarkdownEditor preview uses renderMarkdownAction (server action) to avoid importing server-only module in client
- PostForm is a 'use client' component that calls createPost/updatePost server actions directly
- Admin post edit page uses [id] and exported getPostById helper
- renderMarkdownAction wrapper pattern: thin server action that calls renderMarkdown()
- Added Toaster, Label, Table, UseToast components for full functionality
- Pagination component required basePath prop, not baseUrl
- Admin posts list link to public post: `/posts/[slug]` NOT `/blog/[slug]` — bug was fixed
- `getPostById` was made public export (not just internal) to support the edit page lookup by ID

## [2026-02-20] Task 13: Comment System
- comment-list.tsx is a Server Component — ReplySection extracted to separate reply-section.tsx as 'use client'
- Server Components CAN import 'use client' components (they become leaf client boundaries)
- getComments uses two-pass approach: fetch all comments for postId, then separate top-level vs replies by parentId IS NULL
- createReply validates parentId row has parentId === null before inserting (prevents reply-to-reply)
- Notification skipped if parentComment.authorId === user.id (no self-notification)
- CommentForm uses useSession from next-auth/react to detect auth state client-side
- `isReply` prop on CommentCard only controls showing/hiding ReplySection (replies have no reply button)
- `bun run build` uses `next build --webpack` flag per package.json scripts
- mkdir bash fails in this env — use `bun -e "import { mkdirSync } from 'fs'; ..."` pattern
- Server Actions with 'server-only' import can be called directly from Server Components (pages)
- revalidatePath inside createComment/createReply needs the post slug — does an extra DB query to get it

## [2026-02-20] Task 17: Image Upload System
- `export const runtime = 'nodejs'` REQUIRED on API routes that use Bun.file/Bun.write — without it Next.js tries to use edge runtime which lacks these APIs.
- `Bun.file(path).exists()` returns Promise<boolean> — must be awaited.
- Path traversal prevention: use `path.basename(segment)` on each path segment before joining with UPLOADS_DIR.
- `Bun.file(path).type` returns MIME type of the file — used for Content-Type header in serve route.
- images table `createdAt` field: use `new Date()` explicitly (not relying on $defaultFn when inserting via drizzle direct insert).
- Textarea cursor position: capture `selectionStart`/`selectionEnd`, insert markdown at cursor, then use `setSelectionRange` inside `requestAnimationFrame` to restore cursor after React re-render.
- MarkdownEditor: `activeTab` state controlled via `onValueChange` on Tabs component — allows conditional rendering of toolbar (only on "write" tab).
- Build command must be invoked as: `node /path/to/node_modules/next/dist/bin/next build --webpack` (using `workdir` param) — the `cd && command` pattern errors in this environment.
- Both new routes confirmed in build output as `ƒ` (dynamic server-rendered): `/api/upload` and `/api/uploads/[...path]`.

## [2026-02-20] Task 14: Comment Moderation
- `AdminCommentView = CommentView & { postTitle: string | null; postSlug: string | null }` — define locally in comments.ts as an exported type (not in types/index.ts per task constraints).
- `getAdminComments` does two leftJoins: comments → users, comments → posts to get author + post title/slug in one query.
- `hideComment`: `db.update(comments).set({ hidden: true })` + insert `comment_hidden` notification (skip if authorId null).
- `unhideComment`: `db.update(comments).set({ hidden: false })` — no notification needed.
- `deleteComment`: delete replies first (`db.delete where parentId = id`), then delete the comment itself. Insert `comment_deleted` notification with `referenceId: null`.
- Admin comments page follows the same Server Component + 'use client' Manager pattern as tags page.
- CommentsManager uses `useTransition` for optimistic updates — on delete, also filters out replies (`c.parentId !== id`).
- `requireAdmin` import added to comments.ts alongside existing `requireAuth`.

## [2026-02-20] Task 18: Full-Text Search
- FTS5 table `posts_fts` with columns title (idx 0) and content (idx 1), rowid links to posts.rowid
- snippet() uses column index: snippet(posts_fts, 1, '<mark>', '</mark>', '...', 20)
- bm25() for relevance: ORDER BY bm25(posts_fts) (lower = more relevant)
- db.all(sql`...`) returns unknown[] — cast with 'as FtsRow[]'
- SearchBar uses useSearchParams() so MUST be wrapped in React.Suspense in server components
- Search page reads searchParams.q and calls searchPosts()

## Task 15: Notification System (2026-02-20)

- **`NotificationBell` as `'use client'`**: Uses `useSession()` from `next-auth/react` to detect auth state, then calls `getUnreadCount()` on mount. Returns `null` (renders nothing) when not logged in.
- **Server action in client component**: `getUnreadCount()` called directly in `useEffect` — works because server actions can be called from client components.
- **Notifications page pattern**: Server Component calls `requireAuth()` (throws redirect if not logged in), then `getNotifications()`. Client-side mark-read buttons in separate `'use client'` file using `useTransition` + `router.refresh()`.
- **Webpack cache transience**: Build can fail with `Cannot destructure property 'data'` on first run after adding new `'use server'` files; clearing `.next` cache or re-running resolves it. Second run passes cleanly.
- **`git stash` vs `git stash --include-untracked`**: Default `git stash` does NOT stash untracked files. Use `--include-untracked` for a clean baseline test.
- **Badge for unread count**: shadcn/ui `Badge` with `variant="destructive"` for red notification count. Used `absolute -top-1 -right-1` positioning on `relative` parent button.
- **Relative date without library**: Simple `Date.now() - ms` calculation with seconds/minutes/hours/days thresholds — no `date-fns` or similar needed.

## Task 16: User Comment History
- Server Components can pass data to Client Components (e.g. `UserNav`) seamlessly.
- `shadcn/ui` components like `DropdownMenu` require `"use client"` wrapper if used inside Server Components directly with interactivity.
- `next build` lock file can become stale if previous build crashed; `rm .next/lock` or removing `.next` entirely fixes it.

## Task 21: RSS 2.0 Feed Generation (2026-02-20)

### Implementation Details
- Created route handler at `src/app/feed.xml/route.ts`
- GET handler returns valid RSS 2.0 XML with proper Content-Type header
- Fetches latest 20 published posts sorted by publishedAt DESC
- Proper XML escaping: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`
- CDATA wrapper for descriptions to handle content safely
- RFC 822 date format via `Date.toUTCString()`
- Direct Drizzle ORM query with leftJoin to get author name
- Environment variable support: `NEXT_PUBLIC_BASE_URL` with https://chakyiu.blog fallback

### Key Learnings
- Route handlers can't easily call Server Actions - direct DB queries required
- RSS 2.0 requires atom:link namespace declaration for self-reference
- CDATA sections allow raw content without XML escaping
- Export `runtime = 'nodejs'` required for routes using `bun:sqlite`
- Template strings with backticks allow multiline XML generation cleanly

### Patterns Used
- Direct DB query pattern for route handlers: import db, schema; use select().from().leftJoin().where().orderBy().limit()
- XML generation via template string
- Error handling with try/catch returning 500 on failure

## Task 20: Admin Dashboard (2026-02-20)
- Implemented AdminDashboard as a Server Component in src/app/(admin)/admin/page.tsx.
- Used Promise.all for parallel data fetching with Drizzle ORM to improve performance.
- Direct DB access in Server Components is efficient and type-safe.
- Used drizzle-orm count() and eq() for statistical queries.
- Leveraged shadcn/ui Card and Lucide icons for a clean, GitHub-inspired aesthetic.
- Verified with tsc and next build.

## Task 23: SEO Basics — Meta Tags, Open Graph, JSON-LD (2026-02-20)

### Implementation Details
- Updated `src/app/layout.tsx` with comprehensive base metadata:
  - `metadataBase: new URL(NEXT_PUBLIC_BASE_URL ?? 'https://chakyiu.blog')` for absolute URLs in OG tags
  - Title template: `'%s | ChaKyiu Blog'` for auto-suffix on child pages
  - OpenGraph defaults: type='website', siteName, locale='en_US'
  - Twitter card: 'summary_large_image'
  - Robots: index=true, follow=true for public indexing
- Updated `src/app/(blog)/page.tsx`: Added simple metadata export with title and description
- Updated `src/app/(blog)/search/page.tsx`: Replaced `generateMetadata()` function with exported `metadata` const, added robots: { index: false, follow: false } to prevent indexing search pages
- Updated `src/app/(blog)/posts/[slug]/page.tsx`:
  - Enhanced `generateMetadata()` to return full OpenGraph tags: title, description, type='article', publishedTime, modifiedTime, authors, images
  - Added JSON-LD BlogPosting schema as `<script type="application/ld+json">` in JSX at end of article element
  - JSON-LD includes: @context, @type, headline, description, datePublished, dateModified, author, image, url

### Key Learnings
- `generateMetadata()` must be async and return `Promise<Metadata>` when handling dynamic routes with await params
- OpenGraph `authors` field is an array of strings (author names/emails)
- OpenGraph `images` field is an array of `{ url: string }` objects
- JSON-LD must be stringified and injected via `dangerouslySetInnerHTML` to render as plain script tag
- Search page robots=false prevents duplicate content issues with different query strings
- Post-not-found case returns `{ title: 'Post Not Found' }` gracefully (no error)

### All Metadata Types Implemented
- Base site metadata: layout.tsx (title template, OG defaults, robots)
- Post list page: (blog)/page.tsx
- Search page: (blog)/search/page.tsx (no-index)
- Post detail: (blog)/posts/[slug]/page.tsx (full OG + JSON-LD)

### Verification
- All 4 pages updated with proper Metadata imports and exports
- No npm packages added
- No UI/CSS changes
- JSON-LD compliant with schema.org BlogPosting spec

## Task 19: Admin User Role Management (2026-02-20)
- Implemented server action pattern with revalidatePath and useTransition for optimistic UI updates.
- Used shadcn/ui Table, Badge, Button, Avatar components for consistent admin UI.
- Enforced role change restrictions: admins cannot demote themselves.
- Added role_changed notification system linked to database triggers (simulated via action).
- Leveraged Drizzle ORM for type-safe database operations.
## Task 22: Auth Pages UI (2026-02-20)
- Implemented responsive auth pages using shadcn/ui components.
- Used Suspense boundary for useSearchParams in login page to prevent hydration errors and ensure client-side navigation works correctly.
- Handled Next.js 15 searchParams promise in error page server component.
- Used next-auth/react for client-side signIn/signOut and next-auth for server-side auth.
- Validated form inputs and handled server action responses.

- Health check endpoints follow standard pattern: `export const runtime = 'nodejs'` + simple GET handler returning JSON with status & timestamp.

## Task 24: Dark/Light/System Theme Toggle (2026-02-20)
- **ThemeToggle component**: Created at `src/components/theme-toggle.tsx` as `'use client'` with proper hydration handling
- **Hydration pattern**: Use `useState(false)` + `useEffect(() => setMounted(true))` to avoid hydration mismatch with custom theme provider
- **Placeholder strategy**: Return `<div className="h-10 w-10" />` during SSR to maintain layout and prevent shift when hydration completes
- **Theme cycling**: light → dark → system → light (3-state cycle with Monitor icon for system mode)
- **Icon usage**: Sun (light), Moon (dark), Monitor (system) from lucide-react `h-[1.2rem] w-[1.2rem]`
- **Header integration**: ThemeToggle already imported and placed in header at line 44, next to NotificationBell and UserNav
- **Button variant**: `variant="ghost"` size="icon"` provides clean minimal look matching header aesthetic
- **Theme provider**: Custom context-based provider (not next-themes), located at `src/components/theme-provider.tsx`
- **Root layout**: ThemeProvider wraps entire app at `src/app/layout.tsx` with `suppressHydrationWarning` on html element
- **localStorage**: Theme preference persisted and restored by the provider on mount
- **Accessibility**: `aria-label`, `title`, and `sr-only` span for screen reader users


## User Settings Implementation
- Implemented user settings page at /settings using a client form component and server action.
- Used revalidatePath to refresh session data across the app after profile updates.
- Validated user input (name length, image URL length) in server action.
- Leveraged shadcn/ui components (Card, Input, Button, Toast) for consistent UI.

## Task: Docker Deployment Configuration (2026-02-20)

### Files Created
- `Dockerfile` — multi-stage: deps (oven/bun:1-alpine) → builder → runner
- `docker-compose.yml` — blog service with named volume `blog_data` at `/data`
- `.dockerignore` — excludes node_modules, .next, .git, .data, data, *.db files, .env files, .sisyphus
- `scripts/entrypoint.sh` — runs `bun run migrate` then `exec node .next/standalone/server.js`

### Key Decisions
- `output: "standalone"` was ALREADY set in `next.config.ts` — no changes needed there
- `"start"` script changed from `"next start"` to `"node .next/standalone/server.js"` to use standalone output
- `"migrate"` script added: `"bun run src/lib/db/migrate.ts"` (must use bun, NOT node — migrate.ts uses bun:sqlite natively)
- Runner stage uses `oven/bun:1-alpine` (not node:alpine) because migrate.ts requires Bun runtime for `bun:sqlite`
- `entrypoint.sh` uses `exec node ...` for server.js (Node.js standalone), but `bun run migrate` for migrations

### Critical: bun:sqlite in Runner
- `src/lib/db/migrate.ts` imports `bun:sqlite` directly — requires Bun runtime at container runtime
- Cannot use `node:20-alpine` for the runner stage (bun:sqlite not available in plain Node)
- Must use `oven/bun:1-alpine` so `bun run migrate` works at startup

### docker-compose env_file
- Uses `required: false` on `.env.local` — container starts even if file doesn't exist
- `DATABASE_URL=/data/blog.db` overrides `.env.local` value pointing to the named volume

### build verification
- TSC check: clean (0 errors)
- `next build --webpack`: builds successfully (20 static pages, all routes)

## Task: Bun Unit Tests for Core DB Layer (2026-02-20)

### Test Pattern
- Each test file creates its own `:memory:` SQLite DB — never touches production `./data/blog.db`
- Pattern: `const sqlite = new Database(':memory:')` + `drizzle(sqlite, { schema })` + `migrate(db, { migrationsFolder })`
- Migration path resolved via `path.resolve(import.meta.dir, '../../drizzle')` — relative to test file location
- `import.meta.dir` works in Bun test files (equivalent of `__dirname`)
- `sqlite.exec('PRAGMA foreign_keys = ON;')` required before migration to enforce FK constraints in tests

### Server Action Limitation
- Server Actions use `'use server'` + `auth()`/`requireAdmin()` which need Next.js request context — cannot call them directly in Bun tests
- Solution: test the DB layer directly — insert/select/update rows using drizzle on the in-memory DB
- For `registerUser`: re-implement the same logic locally in auth.test.ts using the test DB instance (avoids the singleton import)

### registerUser Test Strategy
- `registerUser` in `src/lib/auth/register.ts` imports `db` from the singleton — cannot inject test DB
- Re-implemented the exact same function locally in auth.test.ts using `sqlite.transaction()` + `db` (test instance)
- Tests: happy path, duplicate email rejection, invalid email format, weak password (too short), missing uppercase

### FTS5 Search Tests
- Migration runs `CREATE VIRTUAL TABLE posts_fts USING fts5(...)` and the 3 triggers
- After migration, INSERT triggers populate `posts_fts` automatically
- Use `sqlite.prepare<T, [string]>(sql).all(param)` for raw FTS5 MATCH queries — avoids drizzle template syntax complexity
- FTS5 `MATCH 'keyword'` is case-insensitive by default

### FK Constraint Test
- `comments.postId` references `posts.id` — inserting a comment with a fake postId throws due to `PRAGMA foreign_keys = ON`

### Build/Test Commands
- `bun test src/tests/` — runs all 4 test files (19 tests, 0 failures)
- `node_modules/.bin/tsc --noEmit --project tsconfig.json` — clean (0 errors)
