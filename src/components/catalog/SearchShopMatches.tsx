import { searchShops } from "@/actions/shops";
import { ShopCard } from "@/components/shared/ShopCard";
import { Separator } from "@/components/ui/separator";

export async function SearchShopMatches({ query }: { query: string }) {
  const q = query.trim();
  if (!q) return null;
  const shops = await searchShops(q, 6);
  if (shops.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Shops matching &ldquo;{q}&rdquo;</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {shops.map((s) => (
          <ShopCard key={s.id} shop={s} />
        ))}
      </div>
      <Separator className="mt-8" />
    </section>
  );
}
