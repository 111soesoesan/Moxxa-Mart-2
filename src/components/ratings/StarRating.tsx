"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarSummary({
  avg,
  count,
  className,
}: {
  avg: number | null | undefined;
  count?: number | null | undefined;
  className?: string;
}) {
  const n = count ?? 0;
  if (n <= 0 || avg == null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>No ratings yet</span>;
  }
  const rounded = Math.min(5, Math.max(0, Math.round(avg)));
  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4 shrink-0",
              i < rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"
            )}
          />
        ))}
      </span>
      <span className="text-sm text-muted-foreground">
        {Number(avg).toFixed(1)} <span className="text-muted-foreground/80">({n})</span>
      </span>
    </div>
  );
}

export function StarPicker({
  value,
  onSelect,
  disabled,
  size = "md",
}: {
  value: number | null;
  onSelect: (stars: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;
  const iconClass = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div
      className="flex gap-0.5"
      role="group"
      aria-label="Rate from 1 to 5 stars"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className="p-0.5 rounded-md hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors"
          onMouseEnter={() => setHover(n)}
          onClick={() => onSelect(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={cn(
              iconClass,
              n <= active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"
            )}
          />
        </button>
      ))}
    </div>
  );
}
