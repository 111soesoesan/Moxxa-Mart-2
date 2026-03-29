import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

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

export function OrderListCard({ order }: { order: OrderListItem }) {
  const shop = order.shops as { name: string; slug: string } | null;
  const items = order.items_snapshot as Array<{ name: string; quantity: number; price: number }>;

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <StatusBadge type="order" value={order.status} />
                <StatusBadge type="payment" value={order.payment_status} />
                {order.checkout_group_id && (
                  <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                    Multi-checkout
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold">{shop?.name ?? "Shop"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.created_at)}</p>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                View <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
