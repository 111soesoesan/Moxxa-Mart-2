import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/constants";
import type { BlogWithEngagement } from "@/actions/blogs";
import { formatDistanceToNow } from "date-fns";

type Props = {
  blog: BlogWithEngagement;
  shopSlug: string;
};

export function BlogCard({ blog, shopSlug }: Props) {
  const categoryLabel = BLOG_CATEGORIES.find((c) => c.slug === blog.category)?.name ?? blog.category;
  const excerpt = blog.body.length > 140 ? blog.body.slice(0, 140).trimEnd() + "…" : blog.body;
  const timeAgo = formatDistanceToNow(new Date(blog.created_at), { addSuffix: true });

  return (
    <Link href={`/shop/${shopSlug}/blogs/${blog.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow group h-full flex flex-col">
        <div className="relative h-44 bg-gradient-to-br from-primary/10 to-primary/20 overflow-hidden shrink-0">
          {blog.image_urls?.[0] ? (
            <Image
              src={blog.image_urls[0]}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl opacity-30">📝</span>
            </div>
          )}
          {categoryLabel && (
            <div className="absolute top-3 left-3">
              <Badge className="text-xs bg-white/90 text-foreground hover:bg-white/90 shadow-sm">
                {categoryLabel}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 flex flex-col flex-1 gap-2">
          <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {blog.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{excerpt}</p>

          <div className="flex items-center justify-between pt-2 mt-auto">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {blog.like_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {blog.comment_count}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" />
                {blog.share_count}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
