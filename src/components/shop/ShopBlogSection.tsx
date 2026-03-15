import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, ArrowRight } from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { getShopBlogsPublic } from "@/actions/blogs";
import { formatDistanceToNow } from "date-fns";

interface ShopBlogSectionProps {
  shopId: string;
  shopSlug: string;
}

export async function ShopBlogSection({ shopId, shopSlug }: ShopBlogSectionProps) {
  const blogs = await getShopBlogsPublic(shopId, { sort: "newest", limit: 3 });

  if (blogs.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Latest from the Blog</h3>
          <p className="text-sm text-muted-foreground mt-1">Shop news and updates</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/shop/${shopSlug}/blogs`}>
            See all posts <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {blogs.map((blog) => {
          const categoryLabel = BLOG_CATEGORIES.find((c) => c.slug === blog.category)?.name;
          const timeAgo = formatDistanceToNow(new Date(blog.created_at), { addSuffix: true });
          const excerpt = blog.body.length > 120 ? blog.body.slice(0, 120).trimEnd() + "…" : blog.body;

          return (
            <Link key={blog.id} href={`/shop/${shopSlug}/blogs/${blog.id}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group h-full">
                <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/20 overflow-hidden">
                  {blog.image_urls?.[0] ? (
                    <Image
                      src={blog.image_urls[0]}
                      alt={blog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-4xl opacity-30">📝</span>
                    </div>
                  )}
                  {categoryLabel && (
                    <div className="absolute top-2 left-2">
                      <Badge className="text-xs bg-white/90 text-foreground hover:bg-white/90 text-[10px]">
                        {categoryLabel}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {blog.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />{blog.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />{blog.comment_count}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
