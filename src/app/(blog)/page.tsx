"use client";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-24 text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to Chakyiu Blog</h1>
      <p className="text-lg text-muted-foreground mb-8">
        A modern blog built with Next.js 16, Tailwind CSS, and shadcn/ui
      </p>
      <Button size="lg">Get Started</Button>
    </div>
  );
}
