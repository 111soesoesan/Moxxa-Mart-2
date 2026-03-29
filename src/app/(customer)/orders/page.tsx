"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getMyOrders, getOrdersByPhone } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderListCard, type OrderListItem } from "@/components/customer/OrderListCard";
import { PackageSearch, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function OrdersPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountOrders, setAccountOrders] = useState<OrderListItem[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);

  const [guestPhone, setGuestPhone] = useState("");
  const [phoneResults, setPhoneResults] = useState<OrderListItem[] | null>(null);
  const [phoneSearched, setPhoneSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setLoggedIn(!!user);
      setSessionReady(true);

      if (user) {
        const data = await getMyOrders();
        if (!cancelled) setAccountOrders(data as OrderListItem[]);
      }
      if (!cancelled) setAccountLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
      if (session?.user) {
        setAccountLoading(true);
        getMyOrders().then((data) => {
          setAccountOrders(data as OrderListItem[]);
          setAccountLoading(false);
        });
      } else {
        setAccountOrders([]);
        setAccountLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const searchByPhone = () => {
    const cleaned = guestPhone.trim();
    if (!cleaned) return;
    startTransition(async () => {
      const data = await getOrdersByPhone(cleaned);
      setPhoneResults(data as OrderListItem[]);
      setPhoneSearched(true);
    });
  };

  const onPhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchByPhone();
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Orders</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {loggedIn
          ? "Your account orders and guest checkout lookup in one place."
          : "Sign in to see orders on your account, or find guest orders by phone."}
      </p>

      {!sessionReady || (loggedIn && accountLoading) ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {loggedIn && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Your account
              </h2>
              {accountOrders.length > 0 ? (
                <div className="space-y-3">
                  {accountOrders.map((o) => (
                    <OrderListCard key={o.id} order={o} />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    <p>No orders on this account yet.</p>
                    <Button variant="link" className="mt-1 h-auto p-0" asChild>
                      <Link href="/search">Browse products</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>
          )}

          {loggedIn && <Separator />}

          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <PackageSearch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Find order by phone</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Used guest checkout? Enter the phone number from your order — this does not affect your
                  account list above.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  onKeyDown={onPhoneKeyDown}
                  placeholder="e.g. 09123456789"
                  type="tel"
                  className="pl-9"
                  autoComplete="tel"
                />
              </div>
              <Button onClick={searchByPhone} disabled={isPending || !guestPhone.trim()}>
                {isPending ? "Searching…" : "Find"}
              </Button>
            </div>

            {phoneSearched && phoneResults !== null && (
              <div className="space-y-3 pt-2">
                {phoneResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No orders found for <span className="font-mono text-foreground">{guestPhone.trim()}</span>.
                    Double-check the number you used at checkout.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Found{" "}
                      <span className="font-semibold text-foreground">{phoneResults.length}</span> order
                      {phoneResults.length > 1 ? "s" : ""} for{" "}
                      <span className="font-mono text-foreground">{guestPhone.trim()}</span>
                    </p>
                    {phoneResults.map((o) => (
                      <OrderListCard key={o.id} order={o} />
                    ))}
                  </>
                )}
              </div>
            )}
          </section>

          {!loggedIn && (
            <p className="text-center text-sm text-muted-foreground">
              Have an account?{" "}
              <Link href="/login" className="text-primary underline underline-offset-2">
                Sign in
              </Link>{" "}
              to see all orders linked to your profile.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
