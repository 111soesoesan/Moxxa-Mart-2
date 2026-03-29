import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export type CategoryNavItem = { slug: string; name: string };

type Props = {
  categories: CategoryNavItem[];
  activeBrowseSlug?: string;
  /** Build link for a browse slug (undefined = “all”) */
  buildHref: (browseSlug?: string) => string;
};

export function CategoryNav({ categories, activeBrowseSlug, buildHref }: Props) {
  return (
    <div className="border-b bg-background">
      <ScrollArea className="w-full">
        <div className="container mx-auto flex items-center gap-1 px-4 py-2">
          <Link
            href={buildHref()}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-muted ${
              !activeBrowseSlug ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={buildHref(cat.slug)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-muted ${
                activeBrowseSlug === cat.slug
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
