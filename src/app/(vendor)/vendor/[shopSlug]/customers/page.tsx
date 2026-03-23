"use client";

import { useState, useEffect } from "react";
import {
  getShopCustomers,
  getCustomerStats,
  getHighValueCustomers,
  type Customer,
} from "@/actions/customers";
import { getShopBySlug } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, ShoppingCart, DollarSign, Globe, MessageCircle, Send, PhoneCall, Instagram } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

const CHANNEL_BADGE: Record<string, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  web:       { label: "Web",       className: "bg-blue-100 text-blue-700",    Icon: Globe },
  whatsapp:  { label: "WhatsApp",  className: "bg-green-100 text-green-700",  Icon: MessageCircle },
  telegram:  { label: "Telegram",  className: "bg-sky-100 text-sky-700",      Icon: Send },
  messenger: { label: "Messenger", className: "bg-indigo-100 text-indigo-700",Icon: MessageCircle },
  instagram: { label: "Instagram", className: "bg-pink-100 text-pink-700",    Icon: Instagram },
  phone:     { label: "Phone",     className: "bg-orange-100 text-orange-700",Icon: PhoneCall },
};

type SortOption = "last_order_at" | "total_spent" | "name";

type Props = { params: Promise<{ shopSlug: string }> };

export default function CustomersPage({ params: paramsPromise }: Props) {
  const [shopSlug, setShopSlug] = useState<string>("");
  const [shopId, setShopId] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [highValueCustomers, setHighValueCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("last_order_at");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const resolvedParams = await paramsPromise;
        setShopSlug(resolvedParams.shopSlug);
        const shop = await getShopBySlug(resolvedParams.shopSlug);
        if (!shop) return;
        setShopId(shop.id);

        const [customerList, customerStats, highValue] = await Promise.all([
          getShopCustomers(shop.id, { search: searchQuery, sortBy }),
          getCustomerStats(shop.id),
          getHighValueCustomers(shop.id),
        ]);

        setCustomers(customerList as Customer[]);
        setStats(customerStats);
        setHighValueCustomers(highValue as Customer[]);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [paramsPromise]);

  useEffect(() => {
    if (!shopId) return;
    getShopCustomers(shopId, { search: searchQuery, sortBy }).then((data) =>
      setCustomers(data as Customer[])
    );
  }, [shopId, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.averageOrderValue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Customer Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.averageCustomerValue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* High Value Customers */}
      {highValueCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Customers (High Value)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highValueCustomers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(customer.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">{customer.total_orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by name, email, or phone…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 border rounded-lg text-sm bg-background"
        >
          <option value="last_order_at">Last Order</option>
          <option value="total_spent">Highest Spent</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No customers yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-center py-3 px-4 font-medium">Channel</th>
                    <th className="text-center py-3 px-4 font-medium">Phone</th>
                    <th className="text-center py-3 px-4 font-medium">Orders</th>
                    <th className="text-right py-3 px-4 font-medium">Total Spent</th>
                    <th className="text-center py-3 px-4 font-medium">Last Order</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const channelKey = (customer as any).preferred_channel ?? "web";
                    const ch = CHANNEL_BADGE[channelKey] ?? CHANNEL_BADGE.web;
                    const ChIcon = ch.Icon;
                    return (
                      <tr key={customer.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email ?? "—"}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ch.className}`}>
                            <ChIcon className="h-3 w-3" />
                            {ch.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm">{customer.phone ?? "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline">{customer.total_orders}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(customer.total_spent)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                          {customer.last_order_at ? formatDate(customer.last_order_at) : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/vendor/${shopSlug}/customers/${customer.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
