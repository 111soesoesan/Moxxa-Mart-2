"use client";

import { useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { createBlog } from "@/actions/blogs";
import { getMyShops } from "@/actions/shops";
import { uploadBlogImage } from "@/lib/supabase/storage";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  body: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  published: z.boolean(),
});

type NewBlogSchema = z.infer<typeof schema>;

export default function NewBlogPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [tempBlogId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    getMyShops().then((shops) => {
      const shop = shops.find((s) => s.slug === shopSlug);
      if (shop) setShopId(shop.id);
    });
  }, [shopSlug]);

  const form = useForm<NewBlogSchema>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", category: "", published: true },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!shopId) return;
    startTransition(async () => {
      const result = await createBlog(shopId, {
        title: values.title,
        body: values.body,
        category: values.category || undefined,
        image_urls: imageUrls,
        published: values.published,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Blog post published!");
      router.push(`/vendor/${shopSlug}/blogs`);
    });
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/vendor/${shopSlug}/blogs`}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Blog Post</h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Card className="border-0 bg-white dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Post details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field error={form.formState.errors.title?.message}>
              <FieldLabel required>Title</FieldLabel>
              <FieldControl>
                <Input placeholder="Enter a catchy title…" {...form.register("title")} />
              </FieldControl>
              <FieldError />
            </Field>

            <Field error={form.formState.errors.body?.message}>
              <FieldLabel required>Content</FieldLabel>
              <FieldControl>
                <Textarea
                  placeholder="Write your blog post content here…"
                  rows={10}
                  className="resize-none"
                  {...form.register("body")}
                />
              </FieldControl>
              <FieldError />
            </Field>

            <Field>
              <FieldLabel>Category</FieldLabel>
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent>
            {shopId ? (
              <ImageUpload
                value={imageUrls}
                onChange={setImageUrls}
                onUpload={async (file, index) =>
                  uploadBlogImage(file, shopId, tempBlogId, index)
                }
                maxFiles={6}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Publish immediately</p>
                <p className="text-xs text-muted-foreground">Uncheck to save as draft</p>
              </div>
              <Controller
                name="published"
                control={form.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/vendor/${shopSlug}/blogs`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
