
## [2026-02-20] Task 6: UI Shell Complete
- Header: sticky top-0 z-50, container max-w-screen-xl
- Route groups: (blog) has header+footer+main, (admin) has header+admin-sidebar+main
- MobileNav: "use client" with useState, data-testid="mobile-menu-trigger" and "mobile-menu"
- Sidebar: reusable component with SidebarSection
- Footer: RSS link to /feed.xml, GitHub link
- Auth is placeholder only (Task 22 will replace)
- ISSUE: `bash rm` failed, used `bun -e 'fs.unlinkSync()'` to delete `src/app/page.tsx`.
- Homepage moved to `(blog)/page.tsx` to inherit blog layout.
