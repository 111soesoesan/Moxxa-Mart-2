"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";
import { uploadProductImage } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";

export default function NewProductPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [listOnMarket, setListOnMarket] = useState(true);
  const [condition, setCondition] = useState("new");
  const [category, setCategory] = useState("");
  const [tempProductId] = useState(() => crypto.randomUUID());

  const handleImageUpload = async (file: File, index: number) => {
    return uploadProductImage(file, shopSlug, tempProductId, index);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const shopRes = await fetch(`/api/shop-id?slug=${shopSlug}`).catch(() => null);
      let shopId = shopRes ? await shopRes.json().then((d) => d.id).catch(() => null) : null;

      if (!shopId) {
        const { getMyShops } = await import("@/actions/shops");
        const shops = await getMyShops();
        const shop = shops.find((s) => s.slug === shopSlug);
        shopId = shop?.id;
      }

      if (!shopId) { setError("Shop not found"); return; }

      const result = await createProduct(shopId, {
        name: productName,
        slug: slugify(productName) + "-" + Date.now(),
        description: fd.get("description") as string,
        price: parseFloat(fd.get("price") as string),
        stock: parseInt(fd.get("stock") as string, 10),
        category,
        condition,
        image_urls: imageUrls,
        list_on_marketplace: listOnMarket,
        is_active: true,
      });

      if (result.error) { setError(result.error); return; }
      toast.success("Product created!");
      router.push(`/vendor/${shopSlug}/products`);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

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
            <div className="space-y-1.5">
              <Label htmlFor="name">Title *</Label>
              <Input id="name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Describe your product…" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (₱) *</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" placeholder="0.00" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock Count *</Label>
                <Input id="stock" name="stock" type="number" min="0" placeholder="0" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Condition *</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">List on Global Marketplace</p>
                <p className="text-xs text-muted-foreground">Show in browse and search. Turn off for direct-link only.</p>
              </div>
              <Switch checked={listOnMarket} onCheckedChange={setListOnMarket} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Creating…" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
