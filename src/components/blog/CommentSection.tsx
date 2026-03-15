"use client";

import { useState, useTransition, forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "@/actions/blogs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

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
};

export const CommentSection = forwardRef<HTMLDivElement, Props>(
  ({ blogId, initialComments, isAuthenticated, currentUserId }, ref) => {
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
      <div ref={ref} className="space-y-6">
        <h3 className="font-semibold text-lg">
          Comments <span className="text-muted-foreground font-normal text-base">({comments.length})</span>
        </h3>

        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Write a comment…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
              {isPending ? "Posting…" : "Post comment"}
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            <a href="/login" className="font-medium text-primary hover:underline">Sign in</a> to leave a comment
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const name = comment.profiles?.full_name ?? "Anonymous";
              const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
              const isOwn = currentUserId === comment.author_id;

              return (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    <AvatarImage src={comment.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                    <p className="text-sm mt-0.5 whitespace-pre-line break-words">{comment.body}</p>
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
        )}
      </div>
    );
  }
);

CommentSection.displayName = "CommentSection";
