"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getMyOrders, getOrdersByPhone } from "@/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderListCard, type OrderListItem } from "@/components/customer/OrderListCard";
import { OrderListFacetedFilter } from "@/components/customer/OrderListFacetedFilter";
import { PackageSearch, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const orderFilterOptions = ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label }));
const paymentFilterOptions = PAYMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }));

function filterOrders(
  list: OrderListItem[],
  orderStatus: string[],
  paymentStatus: string[]
): OrderListItem[] {
  return list.filter((o) => {
    if (orderStatus.length > 0 && !orderStatus.includes(o.status)) return false;
    if (paymentStatus.length > 0 && !paymentStatus.includes(o.payment_status)) return false;
    return true;
  });
}

export default function OrdersPage() {
  const guestSectionRef = useRef<HTMLElement | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountOrders, setAccountOrders] = useState<OrderListItem[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);

  const [guestPhone, setGuestPhone] = useState("");
  const [phoneResults, setPhoneResults] = useState<OrderListItem[] | null>(null);
  const [phoneSearched, setPhoneSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [orderStatusFilter, setOrderStatusFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);

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

  const allForFacets = useMemo(() => {
    const list = [...accountOrders];
    if (phoneSearched && phoneResults) list.push(...phoneResults);
    return list;
  }, [accountOrders, phoneSearched, phoneResults]);

  const orderStatusCounts = useMemo(() => {
    const base = allForFacets.filter(
      (o) => paymentStatusFilter.length === 0 || paymentStatusFilter.includes(o.payment_status)
    );
    const m: Record<string, number> = {};
    for (const o of base) {
      m[o.status] = (m[o.status] ?? 0) + 1;
    }
    return m;
  }, [allForFacets, paymentStatusFilter]);

  const paymentStatusCounts = useMemo(() => {
    const base = allForFacets.filter(
      (o) => orderStatusFilter.length === 0 || orderStatusFilter.includes(o.status)
    );
    const m: Record<string, number> = {};
    for (const o of base) {
      m[o.payment_status] = (m[o.payment_status] ?? 0) + 1;
    }
    return m;
  }, [allForFacets, orderStatusFilter]);

  const filteredAccountOrders = useMemo(
    () => filterOrders(accountOrders, orderStatusFilter, paymentStatusFilter),
    [accountOrders, orderStatusFilter, paymentStatusFilter]
  );

  const filteredPhoneResults = useMemo(() => {
    if (!phoneResults) return null;
    return filterOrders(phoneResults, orderStatusFilter, paymentStatusFilter);
  }, [phoneResults, orderStatusFilter, paymentStatusFilter]);

  const hasFilterableOrders =
    accountOrders.length > 0 ||
    (phoneSearched && phoneResults !== null && phoneResults.length > 0);

  const filtersActive = orderStatusFilter.length > 0 || paymentStatusFilter.length > 0;

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

  const scrollToGuestLookup = () => {
    guestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFilters = () => {
    setOrderStatusFilter([]);
    setPaymentStatusFilter([]);
  };

  return (
    <div className="min-h-[60vh] bg-muted/25">
      <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <header className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My orders</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {loggedIn
                ? "Track your recent purchases, manage returns, and discover new favorites from our curated marketplace."
                : "Sign in to see orders on your account, or find guest orders by phone number."}
            </p>
          </div>
          <Button className="shrink-0 gap-2 self-start sm:self-auto" onClick={scrollToGuestLookup}>
            <Phone className="size-4" />
            Find order by phone
          </Button>
        </header>

        {!sessionReady || (loggedIn && accountLoading) ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {hasFilterableOrders && (
              <div className="flex flex-wrap items-center gap-2">
                <OrderListFacetedFilter
                  title="Order status"
                  options={orderFilterOptions}
                  selected={orderStatusFilter}
                  onSelectedChange={setOrderStatusFilter}
                  counts={orderStatusCounts}
                />
                <OrderListFacetedFilter
                  title="Payment"
                  options={paymentFilterOptions}
                  selected={paymentStatusFilter}
                  onSelectedChange={setPaymentStatusFilter}
                  counts={paymentStatusCounts}
                />
                {filtersActive && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={resetFilters}>
                    Reset
                  </Button>
                )}
              </div>
            )}

            {loggedIn && (
              <section className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your account</h2>
                {accountOrders.length > 0 ? (
                  filteredAccountOrders.length > 0 ? (
                    <div className="space-y-3">
                      {filteredAccountOrders.map((o) => (
                        <OrderListCard key={o.id} order={o} />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        <p>No orders match these filters.</p>
                        <Button variant="link" className="mt-1 h-auto p-0" onClick={resetFilters}>
                          Clear filters
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card className="border-dashed border-border/80 bg-card">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <p className="text-sm">No orders on this account yet.</p>
                      <Button variant="link" className="mt-2 h-auto p-0 text-primary" asChild>
                        <Link href="/search">Browse products</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </section>
            )}

            {loggedIn && <Separator className="opacity-60" />}

            <section ref={guestSectionRef} id="guest-order-lookup" className="scroll-mt-24 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <PackageSearch className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Find order by phone</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Used guest checkout? Enter the phone number from your order — this does not affect your account list
                    above.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
                <Button onClick={searchByPhone} disabled={isPending || !guestPhone.trim()} className="sm:w-auto">
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
                  ) : filteredPhoneResults && filteredPhoneResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No orders match these filters.{" "}
                      <button type="button" className="text-primary underline underline-offset-2" onClick={resetFilters}>
                        Clear filters
                      </button>
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Found{" "}
                        <span className="font-semibold text-foreground">{phoneResults.length}</span> order
                        {phoneResults.length > 1 ? "s" : ""} for{" "}
                        <span className="font-mono text-foreground">{guestPhone.trim()}</span>
                        {filtersActive && filteredPhoneResults && filteredPhoneResults.length < phoneResults.length && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({filteredPhoneResults.length} shown with current filters)
                          </span>
                        )}
                      </p>
                      {(filteredPhoneResults ?? []).map((o) => (
                        <OrderListCard key={o.id} order={o} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>

            <div
              className={cn(
                "rounded-2xl border border-border/60 bg-muted/40 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8"
              )}
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Missing an order?</h3>
                <p className="text-sm text-muted-foreground">
                  If you checked out as a guest, use the phone verification tool above with the number you provided at
                  checkout.
                </p>
              </div>
              <Button variant="outline" className="mt-4 w-full shrink-0 bg-background sm:mt-0 sm:w-auto" onClick={scrollToGuestLookup}>
                Check order status
              </Button>
            </div>

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
    </div>
  );
}
