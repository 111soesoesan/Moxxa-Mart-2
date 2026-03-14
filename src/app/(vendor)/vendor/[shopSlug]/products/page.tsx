import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getMyShops } from "@/actions/shops";
import { getShopProducts, deleteProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Package } from "lucide-react";
import { revalidatePath } from "next/cache";

type Props = { params: Promise<{ shopSlug: string }> };

export default async function ProductsPage({ params }: Props) {
  const { shopSlug } = await params;
  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const products = await getShopProducts(shop.id);

  async function handleDelete(productId: string) {
    "use server";
    await deleteProduct(productId);
    revalidatePath(`/vendor/${shopSlug}/products`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">{products.length} items in your catalog</p>
          </div>
          <Button asChild>
            <Link href={`/vendor/${shopSlug}/products/new`}>
              <Plus className="mr-2 h-4 w-4" />Add Product
            </Link>
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card className="border-0 bg-white dark:bg-slate-950">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No products yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Start building your catalog by adding your first product</p>
            <Button asChild>
              <Link href={`/vendor/${shopSlug}/products/new`}>
                <Plus className="mr-2 h-4 w-4" />Add your first product
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="border-0 bg-white dark:bg-slate-950 hover:shadow-lg transition-shadow overflow-hidden group">
              {/* Product Image */}
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {product.image_urls?.[0] ? (
                  <Image 
                    src={product.image_urls[0]} 
                    alt={product.name} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-200" 
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                    <Package className="h-12 w-12 text-muted-foreground opacity-50" />
                  </div>
                )}
                {!product.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="destructive">Inactive</Badge>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <CardContent className="p-4">
                <Link href={`/vendor/${shopSlug}/products/${product.id}/edit`} className="group/link">
                  <p className="font-semibold text-sm truncate group-hover/link:text-primary transition-colors">{product.name}</p>
                </Link>
                
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                  <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <StatusBadge type="condition" value={product.condition} />
                  {!product.list_on_marketplace && <Badge variant="outline" className="text-xs">Direct Only</Badge>}
                </div>

                {/* Action Button */}
                <Button asChild variant="outline" className="w-full mt-4" size="sm">
                  <Link href={`/vendor/${shopSlug}/products/${product.id}/edit`}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
