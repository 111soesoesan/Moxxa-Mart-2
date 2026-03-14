"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { getShopProducts, updateProduct, deleteProduct } from "@/actions/products";
import { uploadProductImage } from "@/lib/supabase/storage";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Field, FieldLabel, FieldControl, FieldError, FieldGroup } from "@/components/ui/field";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Product title is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock must be 0 or more"),
  category: z.string().optional(),
  condition: z.string().min(1, "Condition is required"),
  list_on_marketplace: z.boolean(),
  is_active: z.boolean(),
});

type EditProductSchema = z.infer<typeof schema>;

export default function EditProductPage() {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const form = useForm<EditProductSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category: "",
      condition: "new",
      list_on_marketplace: true,
      is_active: true,
    },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;

  useEffect(() => {
    (async () => {
      const { getMyShops } = await import("@/actions/shops");
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      if (!shop) { setLoading(false); return; }

      const products = await getShopProducts(shop.id);
      const product = products.find((p) => p.id === productId);
      if (!product) { setLoading(false); return; }

      setImageUrls(product.image_urls ?? []);
      form.reset({
        name: product.name,
        description: product.description ?? "",
        price: Number(product.price),
        stock: product.stock,
        category: (product as { category?: string | null }).category ?? "",
        condition: product.condition ?? "new",
        list_on_marketplace: product.list_on_marketplace ?? true,
        is_active: product.is_active ?? true,
      });
      setLoading(false);
    })();
  }, [shopSlug, productId, form]);

  const handleImageUpload = async (file: File, index: number) => {
    return uploadProductImage(file, shopSlug, productId, index);
  };

  const onSubmit = (values: EditProductSchema) => {
    startTransition(async () => {
      const result = await updateProduct(productId, {
        name: values.name,
        description: values.description,
        price: values.price,
        stock: values.stock,
        category: values.category || undefined,
        condition: values.condition,
        image_urls: imageUrls,
        list_on_marketplace: values.list_on_marketplace,
        is_active: values.is_active,
      });

      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("Product updated!");
      router.push(`/vendor/${shopSlug}/products`);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Product deleted.");
      router.push(`/vendor/${shopSlug}/products`);
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this product?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The product will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

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
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...form.register("price")} />
                </FieldControl>
                <FieldError />
              </Field>

              <Field error={errors.stock?.message}>
                <FieldLabel required>Stock Count</FieldLabel>
                <FieldControl>
                  <Input type="number" min="0" placeholder="0" {...form.register("stock")} />
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
          <CardContent className="space-y-4">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive products are hidden from all public views.
                </p>
              </div>
              <Controller
                control={form.control}
                name="is_active"
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
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
