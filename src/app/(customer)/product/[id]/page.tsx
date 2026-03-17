"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProductById } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCartContext } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Store, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Product = Awaited<ReturnType<typeof getProductById>>;

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartContext();
  const router = useRouter();

  useEffect(() => {
    getProductById(id).then((p) => { setProduct(p); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!product) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Product not found.</div>;

  const shop = product.shops as { id: string; name: string; slug: string; logo_url?: string | null; allow_guest_purchase?: boolean; payment_info?: Record<string, string> } | null;

  const handleAddToCart = () => {
    if (!shop) return;
    addItem({
      product_id: product.id,
      shop_id: product.shop_id,
      name: product.name,
      price: product.price,
      quantity,
      image_url: product.image_urls?.[0],
    });
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/checkout");
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-3">
          <div className="aspect-square relative rounded-xl overflow-hidden bg-muted">
            {product.image_urls?.[selectedImage] ? (
              <Image
                src={product.image_urls[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">📦</div>
            )}
          </div>
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.image_urls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === i ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image src={url} alt={`View ${i + 1}`} fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge type="condition" value={product.condition} />
              {product.category && <Badge variant="outline">{product.category}</Badge>}
            </div>
          </div>

          <p className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</p>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Inventory Status */}
          <div className="space-y-2">
            {product.stock > 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-green-900">In Stock</p>
                  <p className="text-sm text-green-700">
                    {product.stock <= 5
                      ? `Only ${product.stock} left`
                      : `${product.stock} available`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-medium text-red-900">Out of Stock</p>
                  <p className="text-sm text-red-700">Currently unavailable</p>
                </div>
              </div>
            )}
          </div>

          {product.stock > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Qty:</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}>+</Button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />Add to Cart
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleBuyNow}>
                  Buy Now
                </Button>
              </div>
            </div>
          )}

          {shop && (
            <>
              <Separator />
              <Link href={`/shop/${shop.slug}`} className="flex items-center gap-3 group">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={shop.logo_url ?? undefined} />
                  <AvatarFallback><Store className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Sold by</p>
                  <p className="font-semibold group-hover:text-primary transition-colors">{shop.name}</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
