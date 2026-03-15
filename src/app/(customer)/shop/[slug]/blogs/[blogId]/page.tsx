import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getShopBySlug } from "@/actions/shops";
import { getBlogWithEngagement, getBlogComments } from "@/actions/blogs";
import { createClient } from "@/lib/supabase/server";
import { BlogInteractions } from "@/components/blog/BlogInteractions";
import { CommentSection } from "@/components/blog/CommentSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";

type Props = {
  params: Promise<{ slug: string; blogId: string }>;
};

export default async function BlogPostPage({ params }: Props) {
  const { slug, blogId } = await params;

  const [shop, blog, comments, supabase] = await Promise.all([
    getShopBySlug(slug),
    getBlogWithEngagement(blogId),
    getBlogComments(blogId),
    createClient(),
  ]);

  if (!shop || !blog) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const categoryLabel = BLOG_CATEGORIES.find((c) => c.slug === blog.category)?.name ?? blog.category;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
        <Link href={`/shop/${slug}/blogs`}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />All posts
        </Link>
      </Button>

      {/* Category + date */}
      <div className="flex items-center gap-3 mb-4">
        {categoryLabel && (
          <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
        )}
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {format(new Date(blog.created_at), "MMMM d, yyyy")}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold leading-tight mb-4">{blog.title}</h1>

      {/* Author */}
      <div className="flex items-center gap-2 mb-6">
        <Avatar className="h-7 w-7">
          <AvatarImage src={shop.logo_url ?? undefined} />
          <AvatarFallback className="text-xs">{shop.name[0]}</AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <Link href={`/shop/${slug}`} className="font-medium hover:text-primary transition-colors">
            {shop.name}
          </Link>
        </div>
      </div>

      {/* Hero image */}
      {blog.image_urls?.[0] && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-8 bg-muted">
          <Image
            src={blog.image_urls[0]}
            alt={blog.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      {/* Body */}
      <div className="prose prose-sm max-w-none mb-6">
        {blog.body.split("\n").map((paragraph, i) =>
          paragraph.trim() ? (
            <p key={i} className="text-base leading-relaxed mb-4 text-foreground">
              {paragraph}
            </p>
          ) : (
            <br key={i} />
          )
        )}
      </div>

      {/* Extra images */}
      {blog.image_urls && blog.image_urls.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {blog.image_urls.slice(1).map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={url}
                alt={`${blog.title} image ${i + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}

      <Separator className="my-6" />

      {/* Interactions bar */}
      <BlogInteractions
        blogId={blog.id}
        initialLiked={blog.user_liked ?? false}
        initialLikeCount={blog.like_count}
        commentCount={blog.comment_count}
        shareCount={blog.share_count}
        isAuthenticated={!!user}
      />

      <Separator className="my-6" />

      {/* Comments */}
      <CommentSection
        blogId={blog.id}
        initialComments={comments as any}
        isAuthenticated={!!user}
        currentUserId={user?.id}
      />
    </div>
  );
}
