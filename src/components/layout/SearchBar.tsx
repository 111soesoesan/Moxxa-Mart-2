"use client";

import { useState } from "react";
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
}: {
  initialValue?: string;
  className?: string;
  /** On small screens, show a tap target that goes to `/search` instead of an inline field. */
  compactOnMobile?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push("/search");
  };

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
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="default">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSearch} className={cn("flex w-full max-w-md gap-2", className)}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products or shops…"
        className="flex-1"
      />
      <Button type="submit" size="icon" variant="default">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
