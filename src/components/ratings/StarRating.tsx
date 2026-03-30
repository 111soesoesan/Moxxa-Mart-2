"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarSummary({
  avg,
  count,
  className,
  compact = false,
}: {
  avg: number | null | undefined;
  count?: number | null | undefined;
  className?: string;
  /** Smaller stars and type — fits minimal PDP layout */
  compact?: boolean;
}) {
  const n = count ?? 0;
  const starSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = compact ? "text-xs" : "text-sm";
  if (n <= 0 || avg == null) {
    return (
      <span className={cn(textSize, "text-muted-foreground", className)}>No ratings yet</span>
    );
  }
  const rounded = Math.min(5, Math.max(0, Math.round(avg)));
  const filled = compact
    ? "fill-primary text-primary"
    : "fill-amber-400 text-amber-400";
  const empty = compact ? "text-muted-foreground/30" : "text-muted-foreground/35";
  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(starSize, "shrink-0", i < rounded ? filled : empty)}
          />
        ))}
      </span>
      <span className={cn(textSize, "tabular-nums text-muted-foreground")}>
        {Number(avg).toFixed(1)} <span className="text-muted-foreground/70">({n})</span>
      </span>
    </div>
  );
}

export function StarPicker({
  value,
  onSelect,
  disabled,
  size = "md",
  accent = "amber",
}: {
  value: number | null;
  onSelect: (stars: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  /** `primary` aligns with PDP / theme accent */
  accent?: "amber" | "primary";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;
  const iconClass = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const filled = accent === "primary" ? "fill-primary text-primary" : "fill-amber-400 text-amber-400";

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
          className="rounded-md p-0.5 transition-colors hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50"
          onMouseEnter={() => setHover(n)}
          onClick={() => onSelect(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={cn(
              iconClass,
              n <= active ? filled : "text-muted-foreground/35"
            )}
          />
        </button>
      ))}
    </div>
  );
}
