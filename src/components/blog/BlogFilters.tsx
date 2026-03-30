"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Most liked" },
  { value: "most-commented", label: "Most commented" },
] as const;

export function BlogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const sort = searchParams.get("sort") ?? "newest";
  const category = searchParams.get("category") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={!category ? "default" : "secondary"}
              className={cn(
                "h-9 rounded-full px-4 text-xs font-semibold shadow-none",
                !category ? "" : "bg-muted/70 text-foreground hover:bg-muted"
              )}
              onClick={() => update("category", "")}
            >
              All stories
            </Button>
            {BLOG_CATEGORIES.map((cat) => {
              const active = category === cat.slug;
              return (
                <Button
                  key={cat.slug}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "secondary"}
                  className={cn(
                    "h-9 rounded-full px-4 text-xs font-semibold shadow-none",
                    active ? "" : "bg-muted/70 text-foreground hover:bg-muted"
                  )}
                  onClick={() => update("category", cat.slug)}
                >
                  {cat.name}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
            Sort by
          </span>
          <Select value={sort} onValueChange={(v) => update("sort", v)}>
            <SelectTrigger className="h-10 w-full min-w-[10.5rem] rounded-lg border-0 bg-muted/40 text-sm font-medium shadow-none ring-1 ring-border/30 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
