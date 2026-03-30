"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  initialValue = "",
  className,
  compactOnMobile = false,
  /** Wider bar with icon inside the field (search page). */
  variant = "default",
}: {
  initialValue?: string;
  className?: string;
  compactOnMobile?: boolean;
  variant?: "default" | "page";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push("/search");
  };

  const isPageVariant = variant === "page";

  if (compactOnMobile) {
    return (
      <div className={cn("w-full", className)}>
        <div className="md:hidden w-full">
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground font-normal h-10 px-3"
            asChild
          >
            <Link href="/search">
              <Search className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">Search products or shops…</span>
            </Link>
          </Button>
        </div>
        <form
          onSubmit={handleSearch}
          className={cn("hidden md:flex w-full max-w-md gap-2", className)}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or shops…"
            className="flex-1 rounded-full"
          />
          <Button type="submit" size="icon" variant="default" className="rounded-full">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  if (isPageVariant) {
    return (
      <form onSubmit={handleSearch} className={cn("relative w-full", className)}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, shops, or categories…"
          className="h-12 w-full rounded-full border-border/80 bg-background pr-14 text-base shadow-sm"
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-1.5 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSearch} className={cn("flex w-full max-w-md gap-2", className)}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products or shops…"
        className="flex-1 rounded-full"
      />
      <Button type="submit" size="icon" variant="default" className="rounded-full">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
