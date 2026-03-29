import Link from "next/link";
import { LayoutGrid, Search, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/products",
    icon: LayoutGrid,
    title: "Catalog",
    description: "All listings, filters & categories in one place.",
    highlight: true as const,
  },
  {
    href: "/search",
    icon: Search,
    title: "Search",
    description: "Find products and shops by keyword across the marketplace.",
    highlight: false as const,
  },
  {
    href: "/shops",
    icon: Store,
    title: "Merchants",
    description: "Browse every storefront and meet independent sellers.",
    highlight: false as const,
  },
] as const;

export function BentoNavGrid() {
  return (
    <section className="mb-6 md:mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {items.map(({ href, icon: Icon, title, description, highlight }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex flex-col justify-between rounded-xl border px-4 py-5 sm:px-5 sm:py-6 min-h-[148px] sm:min-h-[168px] transition-all shadow-sm",
              highlight
                ? "bg-primary text-primary-foreground border-primary hover:brightness-[1.05] hover:shadow-md"
                : "bg-card border-border/80 hover:border-primary/35 hover:shadow-md hover:bg-primary/5"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6 shrink-0",
                highlight ? "text-primary-foreground" : "text-primary"
              )}
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="mt-4 min-w-0">
              <h3
                className={cn(
                  "text-base font-semibold leading-tight",
                  highlight ? "text-primary-foreground" : "group-hover:text-primary transition-colors"
                )}
              >
                {title}
              </h3>
              <p
                className={cn(
                  "text-xs mt-1.5 line-clamp-3 leading-relaxed",
                  highlight ? "text-primary-foreground/85" : "text-muted-foreground"
                )}
              >
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
