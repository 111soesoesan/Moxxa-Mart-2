"use client";

import { useEffect, useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";
import { getShopPaymentMethods } from "@/actions/paymentMethods";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup } from "@/components/ui/field";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Product title is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or more"),
  stock: z.number().int("Stock must be a whole number").min(0, "Stock must be 0 or more"),
  category: z.string().optional(),
  condition: z.string().min(1, "Condition is required"),
  track_inventory: z.boolean(),
  list_on_marketplace: z.boolean(),
  payment_method_ids: z.array(z.string()).min(1, "Select at least one payment method"),
});

type NewProductSchema = z.infer<typeof schema>;

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
};

export default function NewProductPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
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
      track_inventory: true,
      list_on_marketplace: true,
      payment_method_ids: [],
    },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;

  useEffect(() => {
    (async () => {
      const { getMyShops } = await import("@/actions/shops");
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      if (!shop) return;
      
      setShopId(shop.id);
      
      // Fetch payment methods and set default
      const result = await getShopPaymentMethods(shop.id);
      if (result.data) {
        setPaymentMethods(result.data);
        // Pre-select all active methods if any
        const activeMethodIds = result.data.filter(m => m.is_active).map(m => m.id);
        if (activeMethodIds.length > 0) {
          form.setValue("payment_method_ids", activeMethodIds);
        }
      }
    })();
  }, [shopSlug, form]);

  const handleImageUpload = async (file: File, index: number) => {
    return uploadProductImage(file, shopSlug, tempProductId, index);
  };

  const onSubmit = (values: NewProductSchema) => {
    if (!shopId) {
      form.setError("root", { message: "Shop not found" });
      return;
    }

    startTransition(async () => {
      const result = await createProduct(shopId, {
        name: values.name,
        slug: slugify(values.name) + "-" + Date.now(),
        description: values.description,
        price: values.price,
        stock: values.stock,
        category: values.category || undefined,
        condition: values.condition,
        image_urls: imageUrls,
        track_inventory: values.track_inventory,
        list_on_marketplace: values.list_on_marketplace,
        is_active: true,
        payment_method_ids: values.payment_method_ids,
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
                    {...form.register("price", { valueAsNumber: true })}
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
                    {...form.register("stock", { valueAsNumber: true })}
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
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field error={errors.payment_method_ids?.message}>
              <FieldLabel required>Accept Payment Via</FieldLabel>
              <FieldDescription>
                Select at least one payment method. Customers will see these options at checkout.
              </FieldDescription>
              {paymentMethods.length === 0 ? (
                <Alert className="mt-3 bg-orange-50 border-orange-200 text-orange-900">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">
                    No payment methods configured. <Button variant="link" size="sm" className="h-auto p-0 ml-1" asChild>
                      <a href={`/vendor/${shopSlug}/payment-methods`}>Create one now</a>
                    </Button>
                  </p>
                </Alert>
              ) : (
                <div className="space-y-2 mt-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center space-x-2">
                      <Controller
                        control={form.control}
                        name="payment_method_ids"
                        render={({ field }) => (
                          <Checkbox
                            id={method.id}
                            checked={field.value.includes(method.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, method.id]);
                              } else {
                                field.onChange(field.value.filter((id) => id !== method.id));
                              }
                            }}
                            disabled={!method.is_active}
                          />
                        )}
                      />
                      <label
                        htmlFor={method.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        {method.name}
                        {!method.is_active && (
                          <span className="text-xs text-muted-foreground">(Inactive)</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <FieldError className="mt-2" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Inventory &amp; Publishing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Track Inventory</p>
                <p className="text-xs text-muted-foreground">
                  Count stock and warn when low. Turn off for always-in-stock items (e.g. digital goods, services).
                </p>
              </div>
              <Controller
                control={form.control}
                name="track_inventory"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
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
