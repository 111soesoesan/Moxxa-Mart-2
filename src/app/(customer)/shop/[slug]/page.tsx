import { notFound } from "next/navigation";
import Image from "next/image";
import { getShopBySlug } from "@/actions/shops";
import { getPublicProducts } from "@/actions/products";
import { ProductCard } from "@/components/shared/ProductCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop || shop.status !== "active") notFound();

  const products = await getPublicProducts({ shopId: shop.id, limit: 40 });

  const paymentInfo = shop.payment_info as Record<string, string> | null;

  return (
    <div>
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-primary/30">
        {shop.cover_url && (
          <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" priority sizes="100vw" />
        )}
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-end gap-4 -mt-10 mb-6">
          <Avatar className="h-20 w-20 border-4 border-background shadow-md">
            <AvatarImage src={shop.logo_url ?? undefined} alt={shop.name} />
            <AvatarFallback className="text-2xl">{shop.name[0]}</AvatarFallback>
          </Avatar>
          <div className="pb-1">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            {shop.allow_guest_purchase && (
              <Badge variant="secondary" className="text-xs">Guest Purchase Allowed</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {products.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center">No products listed yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={{ ...p, shops: { name: shop.name, slug: shop.slug } }} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {shop.description && (
              <div>
                <p className="font-semibold text-sm mb-1">About</p>
                <p className="text-sm text-muted-foreground">{shop.description}</p>
              </div>
            )}
            {shop.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{shop.location}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{shop.phone}</span>
              </div>
            )}
            {shop.delivery_policy && (
              <div>
                <p className="font-semibold text-sm mb-1">Delivery & Returns</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{shop.delivery_policy}</p>
              </div>
            )}
            {paymentInfo && Object.keys(paymentInfo).length > 0 && (
              <div>
                <Separator className="my-2" />
                <p className="font-semibold text-sm mb-2">Payment Methods</p>
                {Object.entries(paymentInfo).map(([method, detail]) => (
                  <div key={method} className="text-sm">
                    <span className="font-medium">{method}:</span>{" "}
                    <span className="text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
