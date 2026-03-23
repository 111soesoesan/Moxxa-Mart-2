"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Category } from "@/actions/categories";
import { Tag } from "lucide-react";

type Props = {
  categories: Category[];
  selectedId: string | null;
  counts: Record<string, number>;
  onSelect: (id: string | null) => void;
};

export function POSCategoryFilter({ categories, selectedId, counts, onSelect }: Props) {
  const allCount = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <aside className="w-44 shrink-0 border-r flex flex-col bg-sidebar">
      <div className="px-3 py-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Categories
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => onSelect(null)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              selectedId === null
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-accent text-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              All Items
            </span>
            <span className={cn(
              "text-xs shrink-0 rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
              selectedId === null ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {allCount}
            </span>
          </button>

          {categories.map((cat) => {
            const count = counts[cat.id] ?? 0;
            const active = selectedId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent text-foreground"
                )}
              >
                <span className="truncate text-left">{cat.name}</span>
                <span className={cn(
                  "text-xs shrink-0 rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}

          {categories.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              No categories yet
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
