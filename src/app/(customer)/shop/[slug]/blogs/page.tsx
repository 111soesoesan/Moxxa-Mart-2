import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { getShopBySlug } from "@/actions/shops";
import { getShopBlogsPublic } from "@/actions/blogs";
import { MarketplaceBlogCard } from "@/components/marketplace/MarketplaceBlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sort?: string;
    category?: string;
  }>;
};

function BlogFiltersSkeleton() {
  return (
    <div className="border-b border-border/60 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
    </div>
  );
}

export default async function ShopBlogsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort = "newest", category } = await searchParams;

  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const blogs = await getShopBlogsPublic(shop.id, {
    sort: sort as "newest" | "oldest" | "popular" | "most-commented",
    category: category || undefined,
    limit: 30,
  });

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Blog</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          Stories, updates, and guides from{" "}
          <span className="font-medium text-foreground">{shop.name}</span>.
        </p>
      </header>

      <Suspense fallback={<BlogFiltersSkeleton />}>
        <BlogFilters />
      </Suspense>

      {blogs.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground">
            <FileText className="h-8 w-8 opacity-50" strokeWidth={1.25} aria-hidden />
          </div>
          <p className="text-lg font-semibold text-foreground">No posts found</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {category
              ? "Try choosing a different category or clear filters."
              : "This shop hasn’t published any blog posts yet."}
          </p>
        </div>
      ) : (
        <div className="mt-8 min-w-0">
          <p className="mb-6 text-sm text-muted-foreground">
            {blogs.length} post{blogs.length !== 1 ? "s" : ""}
          </p>

          {blogs.length === 1 ? (
            <div className="mx-auto max-w-4xl min-w-0">
              <MarketplaceBlogCard post={blogs[0]} shopSlug={slug} layout="featured" />
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-6 lg:grid-cols-3 lg:gap-8">
                <div className="min-w-0 lg:col-span-2">
                  <MarketplaceBlogCard post={blogs[0]} shopSlug={slug} layout="featured" />
                </div>
                <div className="min-w-0 lg:col-span-1">
                  <MarketplaceBlogCard post={blogs[1]} shopSlug={slug} layout="side" />
                </div>
              </div>

              {blogs.length > 2 ? (
                <div className="mt-8 grid min-w-0 gap-6 sm:grid-cols-2 lg:mt-10 lg:gap-8">
                  {blogs.slice(2).map((blog) => (
                    <MarketplaceBlogCard key={blog.id} post={blog} shopSlug={slug} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
