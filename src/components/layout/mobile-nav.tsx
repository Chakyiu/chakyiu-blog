"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import type { SessionUser } from "@/types";

export function MobileNav({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle mobile menu"
        data-testid="mobile-menu-trigger"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      
      {open && (
        <>
          <div
            className="fixed inset-0 top-14 z-40 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div 
            className="fixed left-0 right-0 top-14 z-50 bg-background border-b border-border shadow-lg"
            data-testid="mobile-menu"
          >
            <nav className="container mx-auto px-4 py-3 flex flex-col">
              <Link href="/" onClick={() => setOpen(false)} className="text-sm font-medium py-3 border-b border-border hover:text-primary transition-colors">Posts</Link>
              <Link href="/tags" onClick={() => setOpen(false)} className="text-sm font-medium py-3 border-b border-border hover:text-primary transition-colors">Tags</Link>
              <Link href="/search" onClick={() => setOpen(false)} className="text-sm font-medium py-3 border-b border-border hover:text-primary transition-colors">Search</Link>
              {user ? (
                <>
                  {user.role === "admin" && (
                    <Link href="/admin" onClick={() => setOpen(false)} className="text-sm font-medium py-3 border-b border-border hover:text-primary transition-colors">Admin</Link>
                  )}
                  <Link href="/history" onClick={() => setOpen(false)} className="text-sm font-medium py-3 border-b border-border hover:text-primary transition-colors">Comment History</Link>
                  <Link href="/settings" onClick={() => setOpen(false)} className="text-sm font-medium py-3 border-b border-border hover:text-primary transition-colors">Settings</Link>
                  <Link href="/auth/signout" onClick={() => setOpen(false)} className="text-sm font-medium py-3 hover:text-primary transition-colors">Log out</Link>
                </>
              ) : (
                <Link href="/auth/login" onClick={() => setOpen(false)} className="text-sm font-medium py-3 hover:text-primary transition-colors">Sign In</Link>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
