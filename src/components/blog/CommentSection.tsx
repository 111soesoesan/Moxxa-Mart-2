"use client";

import { useState, useTransition, forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "@/actions/blogs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type Props = {
  blogId: string;
  initialComments: Comment[];
  isAuthenticated: boolean;
  currentUserId?: string;
  /** Main section heading (blog post page uses editorial style) */
  heading?: string;
};

export const CommentSection = forwardRef<HTMLDivElement, Props>(
  ({ blogId, initialComments, isAuthenticated, currentUserId, heading = "Join the conversation" }, ref) => {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [body, setBody] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!body.trim()) return;
      if (!isAuthenticated) {
        toast.error("Sign in to comment");
        return;
      }

      startTransition(async () => {
        const result = await addComment(blogId, body.trim());
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.data) {
          setComments((prev) => [...prev, result.data as unknown as Comment]);
          setBody("");
        }
      });
    };

    const handleDelete = (commentId: string) => {
      startTransition(async () => {
        const result = await deleteComment(commentId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success("Comment deleted");
      });
    };

    return (
      <div id="blog-comments" ref={ref} className="scroll-mt-24 space-y-8">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">{heading}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {comments.length === 0
              ? "No replies yet."
              : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
          </p>
        </div>

        {comments.length > 0 ? (
          <div className="space-y-0 divide-y divide-border/60">
            {comments.map((comment) => {
              const name = comment.profiles?.full_name ?? "Anonymous";
              const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
              const isOwn = currentUserId === comment.author_id;
              const initials = name
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={comment.id} className="group flex gap-4 py-6 first:pt-0">
                  <Avatar className="mt-0.5 h-10 w-10 shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs font-semibold">{initials || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="text-sm font-semibold text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground">· {timeAgo}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-line break-words text-foreground/90">
                      {comment.body}
                    </p>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {isAuthenticated ? (
          <form
            onSubmit={handleSubmit}
            className={cn(
              "space-y-3",
              comments.length > 0 && "mt-8 border-t border-border/60 pt-8"
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Leave a comment
            </p>
            <Textarea
              placeholder="Share your thoughts…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="min-h-[7.5rem] resize-none rounded-lg border-border/60 bg-muted/20 text-base"
            />
            <Button
              type="submit"
              disabled={isPending || !body.trim()}
              className="h-11 w-full font-semibold uppercase tracking-wide sm:w-auto sm:px-8"
            >
              {isPending ? "Posting…" : "Post comment"}
            </Button>
          </form>
        ) : (
          <div
            className={cn(
              "rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground",
              comments.length > 0 && "mt-8"
            )}
          >
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>{" "}
            to leave a comment
          </div>
        )}
      </div>
    );
  }
);

CommentSection.displayName = "CommentSection";
