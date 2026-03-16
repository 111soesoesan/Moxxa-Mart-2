import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { getShopBlogsPublic } from "@/actions/blogs";
import { BlogCard } from "@/components/shared/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { Suspense } from "react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    sort?: string;
    category?: string;
  }>;
};

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Suspense>
          <BlogFilters />
        </Suspense>
      </div>

      {blogs.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">📝</p>
          <p className="font-semibold text-lg mb-1">No posts found</p>
          <p className="text-sm text-muted-foreground">
            {category
              ? "Try removing the category filter."
              : "This shop hasn't published any blog posts yet."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {blogs.length} post{blogs.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} shopSlug={slug} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
