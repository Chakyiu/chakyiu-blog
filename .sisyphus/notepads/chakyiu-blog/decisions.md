# Decisions — chakyiu-blog

## Wave 1 Execution Strategy

### Task 1: Project Scaffolding
- Must be executed FIRST and ALONE (all other tasks depend on it)
- Command: `bunx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
- shadcn/ui: New York style, neutral theme
- `output: 'standalone'` in next.config.ts for Docker

### Tasks 2-6 (Wave 1): Run in PARALLEL after Task 1 completes
- Task 2 (DB) and Task 3 (Auth) have a soft dependency: Auth needs DB schema for Drizzle adapter
  - Solution: Run both in parallel, Task 3 agent should check if Task 2 schema is available
- Task 4, 5, 6 can run fully independently after Task 1

## Commit Groupings
| After | Message |
|-------|---------|
| 1 | `chore(scaffold): init Next.js 16 + bun + tailwind + shadcn` |
| 2 | `feat(db): add Drizzle schema + SQLite migrations + FTS5` |
| 3 | `feat(auth): add Auth.js v5 with email+password + GitHub OAuth + RBAC` |
| 4, 5 | `feat(ui): add theme tokens + dark mode + shared types` |
| 6 | `feat(ui): add app shell layout + nav + sidebar + footer` |
| 7, 9 | `feat(blog): add post CRUD + markdown rendering pipeline` |
| 8 | `feat(editor): add markdown editor with live preview` |
| 10, 11, 12 | `feat(blog): add post list + detail pages + tag system` |
| 13, 14 | `feat(comments): add comment/reply system + moderation` |
| 15, 16 | `feat(notifications): add in-app notifications + user history` |
| 17 | `feat(uploads): add image upload + serve system` |
| 18 | `feat(search): add FTS5 full-text search` |
| 19, 20 | `feat(admin): add admin panel + content moderation` |
| 21 | `feat(rss): add RSS feed generation` |
| 22, 23 | `feat(ui): add auth pages + SEO meta tags` |
| 24, 25 | `test: add unit/integration tests for core features` |
| 26, 27, 28 | `chore(deploy): add Docker + error states + health check` |
