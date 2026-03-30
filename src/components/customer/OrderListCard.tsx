import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { CalendarDays, Package, Store } from "lucide-react";

/** Line item shape stored on orders (snapshot may omit image on older rows). */
export type OrderSnapshotLine = {
  name: string;
  quantity: number;
  price: number;
  image_url?: string | null;
  variant?: unknown;
};

/** Minimal order shape for list rows (my orders or phone lookup) */
export type OrderListItem = {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  items_snapshot: unknown;
  shops: unknown;
  checkout_group_id?: string | null;
};

function listCta(paymentStatus: string): string {
  if (paymentStatus === "unpaid") return "Complete payment";
  if (paymentStatus === "pending_verification") return "Payment pending";
  return "View details";
}

export function OrderListCard({ order }: { order: OrderListItem }) {
  const shop = order.shops as { name: string; slug: string; logo_url?: string | null } | null;
  const items = (order.items_snapshot ?? []) as OrderSnapshotLine[];
  const first = items[0];
  const thumb =
    (first?.image_url && String(first.image_url).trim()) || (shop?.logo_url && String(shop.logo_url).trim()) || null;

  const title =
    items.length === 0
      ? "Order"
      : items.length === 1
        ? first.name
        : `${first.name} +${items.length - 1} more`;

  return (
    <Link href={`/orders/${order.id}`} className="block">
      <Card
        className={cn(
          "overflow-hidden border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md",
          "hover:border-primary/20"
        )}
      >
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5">
            <div className="flex min-w-0 gap-4">
              <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24">
                {thumb ? (
                  <Image src={thumb} alt="" fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Package className="size-8 opacity-50" aria-hidden />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge type="order" value={order.status} />
                  <StatusBadge type="payment" value={order.payment_status} />
                  {order.checkout_group_id && (
                    <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wide px-1.5 py-0">
                      Multi-checkout
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Store className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{shop?.name ?? "Shop"}</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  <span>{formatDate(order.created_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-border/60 pt-3 sm:min-w-[7rem] sm:flex-col sm:justify-between sm:border-t-0 sm:pt-0 sm:text-right">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total price</p>
                <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">{formatCurrency(order.total)}</p>
              </div>
              <span className="text-sm font-medium text-primary">{listCta(order.payment_status)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
