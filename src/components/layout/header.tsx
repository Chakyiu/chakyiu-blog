import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell, Code2 } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import React from 'react'
import { SearchBar } from '@/components/blog/search-bar'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors">
          <Code2 className="h-5 w-5" />
          <span>chakyiu.dev</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-1 ml-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Posts</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tags">Tags</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/search">Search</Link>
          </Button>
         </nav>
         
         <div className="hidden md:flex flex-1 mx-4">
           <React.Suspense fallback={<div className="h-9 w-64" />}>
             <SearchBar />
           </React.Suspense>
         </div>
         
         <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" className="relative hidden md:flex" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          
          <ThemeToggle />
          
          <Button variant="outline" size="sm" asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
          
          <div className="" id="mobile-nav-container">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
