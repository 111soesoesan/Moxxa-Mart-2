import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function CategoryNav({ activeCategory }: { activeCategory?: string }) {
  return (
    <div className="border-b bg-background">
      <ScrollArea className="w-full">
        <div className="container mx-auto flex items-center gap-1 px-4 py-2">
          <Link
            href="/"
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-muted ${
              !activeCategory ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/?category=${cat.slug}`}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1 ${
                activeCategory === cat.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
