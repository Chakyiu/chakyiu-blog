import Link from "next/link";
import { Code2, Rss } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto max-w-screen-xl px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Code2 className="h-4 w-4" />
          <span>© {new Date().getFullYear()} chakyiu.dev</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/feed.xml"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Rss className="h-3.5 w-3.5" />
            <span>RSS</span>
          </Link>
          <a
            href="https://github.com/Chakyiu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
