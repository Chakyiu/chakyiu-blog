"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function MobileNav() {
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
        <div 
          className="fixed inset-0 top-14 z-50 bg-background/95 backdrop-blur"
          data-testid="mobile-menu"
        >
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Link href="/" onClick={() => setOpen(false)} className="text-lg font-medium py-2 border-b border-border hover:text-primary">Posts</Link>
            <Link href="/tags" onClick={() => setOpen(false)} className="text-lg font-medium py-2 border-b border-border hover:text-primary">Tags</Link>
            <Link href="/search" onClick={() => setOpen(false)} className="text-lg font-medium py-2 border-b border-border hover:text-primary">Search</Link>
            <Link href="/auth/login" onClick={() => setOpen(false)} className="text-lg font-medium py-2 hover:text-primary">Sign In</Link>
          </nav>
        </div>
      )}
    </>
  );
}
