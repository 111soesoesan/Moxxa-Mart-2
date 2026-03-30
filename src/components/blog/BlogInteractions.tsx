"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { toggleLike, trackShare } from "@/actions/blogs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  blogId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  commentCount: number;
  shareCount: number;
  isAuthenticated: boolean;
  onCommentClick?: () => void;
  /** Stack actions vertically (e.g. blog post sidebar) */
  variant?: "inline" | "stacked";
  className?: string;
};

export function BlogInteractions({
  blogId,
  initialLiked,
  initialLikeCount,
  commentCount,
  shareCount,
  isAuthenticated,
  onCommentClick,
  variant = "inline",
  className,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [shares, setShares] = useState(shareCount);
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like posts");
      return;
    }
    startTransition(async () => {
      const prev = liked;
      setLiked(!liked);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
      const result = await toggleLike(blogId);
      if (result.error) {
        setLiked(prev);
        setLikeCount((c) => (liked ? c + 1 : c - 1));
        toast.error(result.error);
      }
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
      setShares((s) => s + 1);
      await trackShare(blogId);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const stacked = variant === "stacked";

  return (
    <div
      className={cn(
        "flex gap-2",
        stacked ? "flex-col items-stretch" : "items-center",
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "justify-start gap-1.5 text-muted-foreground hover:text-red-500",
          stacked && "h-10 w-full",
          liked && "text-red-500"
        )}
        onClick={handleLike}
        disabled={isPending}
      >
        <Heart className={cn("h-4 w-4 shrink-0", liked && "fill-current")} />
        <span>{likeCount} likes</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "justify-start gap-1.5 text-muted-foreground hover:text-primary",
          stacked && "h-10 w-full"
        )}
        onClick={() => {
          if (onCommentClick) onCommentClick();
          else document.getElementById("blog-comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        <span>{commentCount} comments</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "justify-start gap-1.5 text-muted-foreground hover:text-primary",
          stacked && "h-10 w-full"
        )}
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4 shrink-0" />
        <span>{shares} shares</span>
      </Button>
    </div>
  );
}
