"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";
import { uploadProductImage } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup } from "@/components/ui/field";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Product title is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock must be 0 or more"),
  category: z.string().optional(),
  condition: z.string().min(1, "Condition is required"),
  list_on_marketplace: z.boolean(),
});

type NewProductSchema = z.infer<typeof schema>;

export default function NewProductPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tempProductId] = useState(() => crypto.randomUUID());

  const form = useForm<NewProductSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category: "",
      condition: "new",
      list_on_marketplace: true,
    },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;

  const handleImageUpload = async (file: File, index: number) => {
    return uploadProductImage(file, shopSlug, tempProductId, index);
  };

  const onSubmit = (values: NewProductSchema) => {
    startTransition(async () => {
      const { getMyShops } = await import("@/actions/shops");
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      const shopId = shop?.id;

      if (!shopId) {
        form.setError("root", { message: "Shop not found" });
        return;
      }

      const result = await createProduct(shopId, {
        name: values.name,
        slug: slugify(values.name) + "-" + Date.now(),
        description: values.description,
        price: values.price,
        stock: values.stock,
        category: values.category || undefined,
        condition: values.condition,
        image_urls: imageUrls,
        list_on_marketplace: values.list_on_marketplace,
        is_active: true,
      });

      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Product created!");
      router.push(`/vendor/${shopSlug}/products`);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {rootError && <Alert variant="destructive">{rootError}</Alert>}

        <Card>
          <CardHeader><CardTitle className="text-base">Photos (up to 10)</CardTitle></CardHeader>
          <CardContent>
            <ImageUpload
              value={imageUrls}
              onChange={setImageUrls}
              onUpload={handleImageUpload}
              maxFiles={10}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field error={errors.name?.message}>
              <FieldLabel required>Title</FieldLabel>
              <FieldControl>
                <Input placeholder="Product name" {...form.register("name")} />
              </FieldControl>
              <FieldError />
            </Field>

            <Field error={errors.description?.message}>
              <FieldLabel>Description</FieldLabel>
              <FieldControl>
                <Textarea
                  placeholder="Describe your product…"
                  rows={4}
                  {...form.register("description")}
                />
              </FieldControl>
              <FieldError />
            </Field>

            <FieldGroup>
              <Field error={errors.price?.message}>
                <FieldLabel required>Price (₱)</FieldLabel>
                <FieldControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...form.register("price")}
                  />
                </FieldControl>
                <FieldError />
              </Field>

              <Field error={errors.stock?.message}>
                <FieldLabel required>Stock Count</FieldLabel>
                <FieldControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...form.register("stock")}
                  />
                </FieldControl>
                <FieldError />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field error={errors.category?.message}>
                <FieldLabel>Category</FieldLabel>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={!!errors.category}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError />
              </Field>

              <Field error={errors.condition?.message}>
                <FieldLabel required>Condition</FieldLabel>
                <Controller
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={!!errors.condition}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">List on Global Marketplace</p>
                <p className="text-xs text-muted-foreground">
                  Show in browse and search. Turn off for direct-link only.
                </p>
              </div>
              <Controller
                control={form.control}
                name="list_on_marketplace"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Creating…" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
