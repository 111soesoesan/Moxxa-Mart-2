import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getShopBlogsPublic } from "@/actions/blogs";
import { MarketplaceBlogCard } from "@/components/marketplace/MarketplaceBlogCard";

interface ShopBlogSectionProps {
  shopId: string;
  shopSlug: string;
  /** Narrow sidebar on shop home: single column, compact headings */
  variant?: "default" | "aside";
}

export async function ShopBlogSection({ shopId, shopSlug, variant = "default" }: ShopBlogSectionProps) {
  const blogs = await getShopBlogsPublic(shopId, { sort: "newest", limit: 3 });

  if (blogs.length === 0) return null;

  const aside = variant === "aside";

  return (
    <div className={aside ? "space-y-3" : "mt-8 space-y-4"}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className={aside ? "text-base font-bold" : "text-xl font-bold"}>Latest from the Blog</h3>
          <p className={aside ? "mt-0.5 text-xs text-muted-foreground" : "mt-1 text-sm text-muted-foreground"}>
            Shop news and updates
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href={`/shop/${shopSlug}/blogs`} className="gap-1.5">
            {aside ? "See all" : "See all posts"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className={aside ? "flex flex-col gap-4" : "grid grid-cols-1 gap-4 md:grid-cols-3"}>
        {blogs.map((blog) => (
          <MarketplaceBlogCard key={blog.id} post={blog} shopSlug={shopSlug} compact />
        ))}
      </div>
    </div>
  );
}
