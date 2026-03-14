"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { getShopProducts, updateProduct, deleteProduct } from "@/actions/products";
import { uploadProductImage } from "@/lib/supabase/storage";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function EditProductPage() {
  const { shopSlug, productId } = useParams<{ shopSlug: string; productId: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("new");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [listOnMarket, setListOnMarket] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    getShopProducts("").then(async () => {
      const { getMyShops } = await import("@/actions/shops");
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      if (!shop) { setLoading(false); return; }

      const products = await getShopProducts(shop.id);
      const product = products.find((p) => p.id === productId);
      if (!product) { setLoading(false); return; }

      setProductName(product.name);
      setDescription(product.description ?? "");
      setPrice(String(product.price));
      setStock(String(product.stock));
      setCategory((product as { category?: string | null }).category ?? "");
      setCondition(product.condition ?? "new");
      setImageUrls(product.image_urls ?? []);
      setListOnMarket(product.list_on_marketplace ?? true);
      setIsActive(product.is_active ?? true);
      setLoading(false);
    });
  }, [shopSlug, productId]);

  const handleImageUpload = async (file: File, index: number) => {
    return uploadProductImage(file, shopSlug, productId, index);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateProduct(productId, {
        name: productName,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        category: category || undefined,
        condition,
        image_urls: imageUrls,
        list_on_marketplace: listOnMarket,
        is_active: isActive,
      });

      if (result.error) { setError(result.error); return; }
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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

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
              <Input
                id="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product…"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (₱) *</Label>
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock Count *</Label>
                <Input
                  id="stock"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  required
                />
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
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">List on Global Marketplace</p>
                <p className="text-xs text-muted-foreground">Show in browse and search. Turn off for direct-link only.</p>
              </div>
              <Switch checked={listOnMarket} onCheckedChange={setListOnMarket} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Active</p>
                <p className="text-xs text-muted-foreground">Inactive products are hidden from all public views.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
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
