import { Header } from "@/components/layout/header";

const adminNavItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/comments", label: "Comments" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1 container mx-auto max-w-screen-xl px-4 py-8 gap-8">
        <aside className="hidden md:flex w-48 shrink-0 flex-col gap-1">
          {adminNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {item.label}
            </a>
          ))}
        </aside>
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
