"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getOrdersByPhone } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PackageSearch, Phone, ArrowRight } from "lucide-react";

type Order = Awaited<ReturnType<typeof getOrdersByPhone>>[number];

function OrderCard({ order }: { order: Order }) {
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
              </div>
              <p className="text-sm font-semibold">{shop?.name ?? "Shop"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(order.created_at)}
              </p>
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

export default function OrderLookupPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    const cleaned = phone.trim();
    if (!cleaned) return;
    startTransition(async () => {
      const data = await getOrdersByPhone(cleaned);
      setOrders(data as Order[]);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
          <PackageSearch className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Track Your Order</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Enter the phone number you used at checkout to find your orders.
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 09123456789"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button onClick={handleSearch} disabled={isPending || !phone.trim()}>
          {isPending ? "Searching…" : "Find Orders"}
        </Button>
      </div>

      {orders === null ? null : orders.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No orders found</p>
          <p className="text-sm mt-1">
            No orders matched the phone number <span className="font-mono">{phone}</span>.
          </p>
          <p className="text-sm mt-1">
            Double-check the number you used at checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Found <span className="font-semibold text-foreground">{orders.length}</span> order{orders.length > 1 ? "s" : ""} for <span className="font-mono">{phone}</span>
          </p>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link href="/orders" className="text-primary hover:underline">
          View all your orders →
        </Link>
      </div>
    </div>
  );
}
