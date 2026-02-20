
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
