"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getMyOrders, getOrdersByPhone } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PackageSearch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Order = Awaited<ReturnType<typeof getMyOrders>>[number];

function OrderRow({ order }: { order: Order }) {
  const shop = order.shops as { name: string; slug: string } | null;
  const snapshot = order.items_snapshot as Array<{ name: string; quantity: number; price: number }>;
  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge type="order" value={order.status} />
                <StatusBadge type="payment" value={order.payment_status} />
              </div>
              <p className="text-sm font-medium">{shop?.name ?? "Shop"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {snapshot.length} item{snapshot.length > 1 ? "s" : ""} •{" "}
                {snapshot.map((i) => `${i.name} x${i.quantity}`).join(", ").slice(0, 60)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.created_at)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-primary">{formatCurrency(order.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestPhone, setGuestPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    getMyOrders().then((data) => {
      setOrders(data as Order[]);
      setLoading(false);
    });
  }, []);

  const searchByPhone = () => {
    if (!guestPhone.trim()) return;
    startTransition(async () => {
      const data = await getOrdersByPhone(guestPhone.trim());
      setOrders(data as Order[]);
      setSearched(true);
    });
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center py-10 text-muted-foreground">
            <PackageSearch className="h-10 w-10 mx-auto mb-3" />
            <p>No orders found on your account.</p>
          </div>
          <div className="border rounded-xl p-6 space-y-3">
            <p className="font-medium">Checked out as guest?</p>
            <p className="text-sm text-muted-foreground">Find your order using the phone number you provided.</p>
            <div className="flex gap-2">
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="09XX XXX XXXX"
                type="tel"
              />
              <Button onClick={searchByPhone} disabled={isPending}>Find</Button>
            </div>
            {searched && orders.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders found for that phone number.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
