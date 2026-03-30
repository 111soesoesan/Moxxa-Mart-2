import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Clock, FileText, Heart, MessageCircle, Share2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Minimal blog fields for the card; `BlogWithEngagement` is compatible */
export type MarketplaceBlogCardPost = {
  id: string;
  title: string;
  body: string;
  image_urls?: string[] | null;
  category?: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  share_count: number;
};

type CardLayout = "default" | "featured" | "side";

type Props = {
  post: MarketplaceBlogCardPost;
  shopSlug: string;
  className?: string;
  /** Tighter typography and spacing for 3-up grids (e.g. shop homepage) */
  compact?: boolean;
  /** Shop blog index: large feature + narrow side column */
  layout?: CardLayout;
};

function excerptFromBody(body: string, maxLen: number) {
  const t = body.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

function categoryLabel(category: string | null | undefined) {
  if (!category?.trim()) return null;
  return BLOG_CATEGORIES.find((c) => c.slug === category)?.name ?? category;
}

function CategoryInline({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{children}</p>
  );
}

/**
 * Block-style blog card aligned with {@link MarketplaceShopCard}: hero media, title, excerpt, separator, engagement + CTA.
 */
export function MarketplaceBlogCard({ post, shopSlug, className, compact, layout = "default" }: Props) {
  const cover = post.image_urls?.[0]?.trim() || null;
  const cat = categoryLabel(post.category);
  const journalLayout = layout === "featured" || layout === "side";
  const excerptMax =
    layout === "featured" ? 220 : layout === "side" ? 120 : compact ? 110 : 140;
  const excerpt = excerptFromBody(post.body, excerptMax);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const mediaClass = cn(
    "relative w-full shrink-0 overflow-hidden bg-muted",
    layout === "featured" && "aspect-[16/9] min-h-[11rem] lg:aspect-[2.05/1] lg:min-h-[13rem]",
    layout === "side" && "aspect-[5/4] min-h-[10rem] sm:aspect-square sm:min-h-0",
    layout === "default" && "aspect-[16/9]"
  );

  const imageSizes =
    layout === "featured"
      ? "(max-width: 1024px) 100vw, 66vw"
      : layout === "side"
        ? "(max-width: 1024px) 100vw, 34vw"
        : compact
          ? "(max-width: 768px) 100vw, 33vw"
          : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  const metaRow = (
    <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground tabular-nums",
          layout === "featured" ? "text-sm" : compact ? "text-[11px]" : "text-xs sm:text-sm"
        )}
      >
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          {post.like_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          {post.comment_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <Share2 className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
          {post.share_count}
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
        Read post
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </div>
  );

  return (
    <Link
      href={`/shop/${shopSlug}/blogs/${post.id}`}
      className={cn(
        "group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.99]",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        journalLayout && "border-border/60 shadow-xs",
        className
      )}
    >
      <div className={mediaClass}>
        {cover ? (
          <Image
            src={cover}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes={imageSizes}
            priority={layout === "featured"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted via-muted to-primary/10">
            <FileText className="h-14 w-14 text-muted-foreground/25" strokeWidth={1} aria-hidden />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 via-black/10 to-transparent"
          aria-hidden
        />
        {!journalLayout && cat ? (
          <span className="absolute left-2 top-2 z-[1] max-w-[calc(100%-1rem)] truncate rounded-md bg-background/92 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm ring-1 ring-black/5 backdrop-blur-[2px]">
            {cat}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          layout === "featured" && "p-5 md:p-6 md:pt-5",
          layout === "side" && "p-4 pt-3",
          layout === "default" && (compact ? "p-3 pt-2" : "p-4 pt-3")
        )}
      >
        {journalLayout && cat ? <CategoryInline>{cat}</CategoryInline> : null}

        <h3
          className={cn(
            "font-bold leading-snug text-foreground transition-colors group-hover:text-primary",
            layout === "featured" && "mt-2 line-clamp-3 text-xl md:text-2xl md:leading-tight",
            layout === "side" && "mt-2 line-clamp-2 text-base",
            layout === "default" && compact && "line-clamp-2 text-sm",
            layout === "default" && !compact && "line-clamp-2 text-base"
          )}
        >
          {post.title}
        </h3>

        <p
          className={cn(
            "flex items-center gap-1.5 text-muted-foreground",
            layout === "featured" && "mt-2 text-sm",
            layout === "side" && "mt-1.5 text-xs",
            layout === "default" && compact && "mt-1 text-[11px]",
            layout === "default" && !compact && "mt-1.5 text-xs"
          )}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
          <span className="line-clamp-1">{timeAgo}</span>
        </p>

        <p
          className={cn(
            "flex-1 leading-relaxed text-muted-foreground",
            layout === "featured" && "mt-3 line-clamp-4 text-sm md:text-base",
            layout === "side" && "mt-2 line-clamp-3 text-sm",
            layout === "default" && compact && "mt-1.5 line-clamp-2 text-xs",
            layout === "default" && !compact && "mt-2 line-clamp-3 text-sm"
          )}
        >
          {excerpt}
        </p>

        <Separator
          className={cn(
            "bg-border/60",
            layout === "featured" && "my-4",
            layout === "side" && "my-3",
            layout === "default" && compact && "my-2",
            layout === "default" && !compact && "my-3"
          )}
        />

        {metaRow}
      </div>
    </Link>
  );
}
