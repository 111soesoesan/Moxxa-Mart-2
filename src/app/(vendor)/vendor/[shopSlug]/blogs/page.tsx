import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyShops } from "@/actions/shops";
import { getShopBlogsForVendor, deleteBlog } from "@/actions/blogs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { Plus, Pencil, Newspaper, Heart, MessageCircle, Share2, Eye, EyeOff } from "lucide-react";
import { revalidatePath } from "next/cache";
import { formatDistanceToNow } from "date-fns";

type Props = { params: Promise<{ shopSlug: string }> };

export default async function BlogsPage({ params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const blogs = await getShopBlogsForVendor(shop.id);

  async function handleDelete(blogId: string) {
    "use server";
    await deleteBlog(blogId);
    revalidatePath(`/vendor/${shopSlug}/blogs`);
  }

  const totalLikes = blogs.reduce((sum, b) => sum + b.like_count, 0);
  const totalComments = blogs.reduce((sum, b) => sum + b.comment_count, 0);
  const totalShares = blogs.reduce((sum, b) => sum + b.share_count, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="text-sm text-muted-foreground mt-1">{blogs.length} post{blogs.length !== 1 ? "s" : ""} published</p>
        </div>
        <Button asChild>
          <Link href={`/vendor/${shopSlug}/blogs/new`}>
            <Plus className="mr-2 h-4 w-4" />New Post
          </Link>
        </Button>
      </div>

      {/* Engagement Summary */}
      {blogs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 bg-white dark:bg-slate-950">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLikes}</p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white dark:bg-slate-950">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalComments}</p>
                <p className="text-xs text-muted-foreground">Total Comments</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white dark:bg-slate-950">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalShares}</p>
                <p className="text-xs text-muted-foreground">Total Shares</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Blog List */}
      {blogs.length === 0 ? (
        <Card className="border-0 bg-white dark:bg-slate-950">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Newspaper className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No blog posts yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Share updates, product highlights, and news with your customers
            </p>
            <Button asChild>
              <Link href={`/vendor/${shopSlug}/blogs/new`}>
                <Plus className="mr-2 h-4 w-4" />Write your first post
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {blogs.map((blog) => {
            const categoryLabel = BLOG_CATEGORIES.find((c) => c.slug === blog.category)?.name;
            const timeAgo = formatDistanceToNow(new Date(blog.created_at), { addSuffix: true });

            return (
              <Card key={blog.id} className="border-0 bg-white dark:bg-slate-950">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold truncate">{blog.title}</span>
                        {!blog.published && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <EyeOff className="h-3 w-3" />Draft
                          </Badge>
                        )}
                        {blog.published && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Eye className="h-3 w-3" />Published
                          </Badge>
                        )}
                        {categoryLabel && (
                          <Badge variant="outline" className="text-xs shrink-0">{categoryLabel}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {timeAgo} · {blog.body.length > 120 ? blog.body.slice(0, 120) + "…" : blog.body}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-red-400" />{blog.like_count} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5 text-blue-400" />{blog.comment_count} comments
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-3.5 w-3.5 text-green-400" />{blog.share_count} shares
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/vendor/${shopSlug}/blogs/${blog.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                        </Link>
                      </Button>
                      <form action={handleDelete.bind(null, blog.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
