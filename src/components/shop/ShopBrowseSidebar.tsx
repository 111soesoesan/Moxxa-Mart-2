"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  shopSlug: string;
  className?: string;
};

const links: { label: string; href: string }[] = [
  { label: "New arrivals", href: "?sort=newest" },
  { label: "Price: low to high", href: "?sort=price-low-high" },
  { label: "Price: high to low", href: "?sort=price-high-low" },
];

export function ShopBrowseSidebar({ shopSlug, className }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const base = `/shop/${shopSlug}/products`;

  const onSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const term = q.trim();
      if (!term) {
        router.push(base);
        return;
      }
      router.push(`${base}?q=${encodeURIComponent(term)}`);
    },
    [base, q, router]
  );

  return (
    <aside
      className={cn(
        "rounded-xl border border-border/70 bg-card p-4 shadow-sm",
        "border-l-4 border-l-primary/35 pl-5",
        className
      )}
    >
      <h2 className="text-sm font-bold tracking-wide text-foreground">Browse collection</h2>
      <p className="mt-1 text-xs text-muted-foreground">Search and sort this shop&apos;s catalog</p>

      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="h-9 pl-8 text-sm bg-muted/40"
            aria-label="Search products in this shop"
          />
        </div>
        <Button type="submit" size="sm" className="shrink-0">
          Go
        </Button>
      </form>

      <nav className="mt-5 space-y-0.5 border-t border-border/60 pt-4" aria-label="Browse shop products">
        <Link
          href={base}
          className="flex items-center justify-between gap-2 rounded-md py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:text-primary px-1 -mx-1"
        >
          All products
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        {links.map((item) => (
          <Link
            key={item.href}
            href={`${base}${item.href}`}
            className="flex items-center justify-between gap-2 rounded-md py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground px-1 -mx-1"
          >
            {item.label}
            <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </Link>
        ))}
      </nav>
    </aside>
  );
}
