import type { CartItem } from "@/hooks/useCart";

/** When every line shares one shop, keep that id; otherwise null (multi-vendor cart). */
export function deriveCartShopId(items: CartItem[]): string | null {
  if (items.length === 0) return null;
  const first = items[0].shop_id;
  return items.every((i) => i.shop_id === first) ? first : null;
}

export type CartShopGroup = { shopId: string; items: CartItem[] };

/** Preserve first-seen shop order (matches cart line order). */
export function groupCartItemsByShop(items: CartItem[]): CartShopGroup[] {
  const order: string[] = [];
  const map = new Map<string, CartItem[]>();
  for (const item of items) {
    if (!map.has(item.shop_id)) {
      map.set(item.shop_id, []);
      order.push(item.shop_id);
    }
    map.get(item.shop_id)!.push(item);
  }
  return order.map((shopId) => ({ shopId, items: map.get(shopId)! }));
}

export function shopSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}
