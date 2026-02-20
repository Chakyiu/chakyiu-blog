
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
