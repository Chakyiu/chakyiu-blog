import { cn } from "@/lib/utils";

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside className={cn(
      "w-full md:w-64 lg:w-72 shrink-0",
      className
    )}>
      {children}
    </aside>
  );
}

export function SidebarSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 mb-4">
      {title && <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">{title}</h3>}
      {children}
    </div>
  );
}
