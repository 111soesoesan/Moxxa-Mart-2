import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getShopBySlug } from "@/actions/shops";
import { getBlogWithEngagement, getBlogComments, getShopBlogsPublic } from "@/actions/blogs";
import { createClient } from "@/lib/supabase/server";
import { BlogInteractions } from "@/components/blog/BlogInteractions";
import { CommentSection } from "@/components/blog/CommentSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";

type Props = {
  params: Promise<{ slug: string; blogId: string }>;
};

function readingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug, blogId } = await params;

  const [shop, supabase] = await Promise.all([getShopBySlug(slug), createClient()]);
  if (!shop) notFound();

  const [blog, comments, relatedRaw] = await Promise.all([
    getBlogWithEngagement(blogId),
    getBlogComments(blogId),
    getShopBlogsPublic(shop.id, { limit: 8, sort: "newest" }),
  ]);

  if (!blog) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const categoryLabel = BLOG_CATEGORIES.find((c) => c.slug === blog.category)?.name ?? blog.category;

  const shopAvatar = shop.profile_image_url ?? shop.logo_url;
  const paragraphs = blog.body
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const leadParagraph = paragraphs.length >= 2 ? paragraphs[0] : null;
  const bodyParagraphs = paragraphs.length >= 2 ? paragraphs.slice(1) : paragraphs;

  const relatedPosts = relatedRaw.filter((b) => b.id !== blog.id).slice(0, 4);

  return (
    <div className="container mx-auto px-4 py-8 md:py-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-8 h-9 text-muted-foreground hover:text-foreground">
        <Link href={`/shop/${slug}/blogs`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          All posts
        </Link>
      </Button>

      <header className="mb-10 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          {categoryLabel ? (
            <span className="rounded-sm bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
              {categoryLabel}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <time dateTime={blog.created_at}>{format(new Date(blog.created_at), "MMMM d, yyyy")}</time>
          </span>
        </div>
        <h1 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-4xl lg:text-[2.5rem] lg:leading-tight">
          {blog.title}
        </h1>
        {leadParagraph ? (
          <p className="mt-6 border-l-[3px] border-primary pl-4 text-base leading-relaxed text-muted-foreground md:text-lg md:leading-relaxed">
            {leadParagraph}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
        <article className="min-w-0 lg:col-span-8">
          <div className="mb-8 flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-border/60">
              <AvatarImage src={shopAvatar ?? undefined} alt="" />
              <AvatarFallback className="text-sm font-semibold">{shop.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Published by</p>
              <Link
                href={`/shop/${slug}`}
                className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                {shop.name}
              </Link>
            </div>
          </div>

          {blog.image_urls?.[0] ? (
            <div className="relative mb-10 aspect-[16/9] min-h-[12rem] w-full overflow-hidden bg-muted md:aspect-[2.1/1] md:min-h-[14rem]">
              <Image
                src={blog.image_urls[0]}
                alt={blog.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>
          ) : null}

          <div className="max-w-none">
            {bodyParagraphs.map((paragraph, i) => (
              <p
                key={i}
                className={cn(
                  "mb-5 text-base leading-[1.75] text-foreground last:mb-0 md:text-[1.05rem] md:leading-[1.8]",
                  i === 0 && "border-l-[3px] border-primary/70 pl-4"
                )}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {blog.image_urls && blog.image_urls.length > 1 ? (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {blog.image_urls.slice(1).map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={url}
                    alt={`${blog.title} — image ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <aside className="min-w-0 border-border/50 lg:col-span-4 lg:border-l lg:pl-8 xl:pl-10">
          <div className="space-y-10 lg:sticky lg:top-24">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Reading time
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                {readingMinutes(blog.body)} <span className="text-base font-semibold">min</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                React &amp; share
              </p>
              <BlogInteractions
                blogId={blog.id}
                initialLiked={blog.user_liked ?? false}
                initialLikeCount={blog.like_count}
                commentCount={blog.comment_count}
                shareCount={blog.share_count}
                isAuthenticated={!!user}
                variant="stacked"
                className="mt-3"
              />
            </div>

            {relatedPosts.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  More from this shop
                </p>
                <ul className="mt-4 space-y-5">
                  {relatedPosts.map((b) => {
                    const relCat =
                      BLOG_CATEGORIES.find((c) => c.slug === b.category)?.name ?? b.category ?? null;
                    return (
                      <li key={b.id}>
                        <Link
                          href={`/shop/${slug}/blogs/${b.id}`}
                          className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                        >
                          <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                            {b.title}
                          </span>
                          {relCat ? (
                            <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                              {relCat}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <section className="mt-16 border-t border-border/60 pt-12 md:mt-20 md:pt-14">
        <div className="mx-auto max-w-3xl">
          <CommentSection
            blogId={blog.id}
            initialComments={comments as any}
            isAuthenticated={!!user}
            currentUserId={user?.id}
          />
        </div>
      </section>
    </div>
  );
}
