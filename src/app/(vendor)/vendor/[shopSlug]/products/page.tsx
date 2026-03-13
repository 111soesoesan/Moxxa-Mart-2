import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getMyShops } from "@/actions/shops";
import { getShopProducts, deleteProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Products ({products.length})</h1>
        <Button asChild size="sm">
          <Link href={`/vendor/${shopSlug}/products/new`}>
            <Plus className="mr-2 h-4 w-4" />Add Product
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <p>No products yet.</p>
          <Button asChild className="mt-3" size="sm">
            <Link href={`/vendor/${shopSlug}/products/new`}>Add your first product</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 border rounded-xl p-3 bg-card">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {product.image_urls?.[0] ? (
                  <Image src={product.image_urls[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-sm text-primary font-semibold">{formatCurrency(product.price)}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <StatusBadge type="condition" value={product.condition} />
                  {!product.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  {!product.list_on_marketplace && <Badge variant="outline" className="text-xs">Direct Only</Badge>}
                  <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/vendor/${shopSlug}/products/${product.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
