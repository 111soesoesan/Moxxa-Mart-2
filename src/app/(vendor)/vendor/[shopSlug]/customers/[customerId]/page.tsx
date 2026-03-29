"use client";

import { useState, useEffect } from "react";
import {
  getCustomerById,
  getCustomerActivity,
  getCustomerOrders,
  getCustomerIdentities,
  type Customer,
  type CustomerActivity,
  type CustomerIdentity,
} from "@/actions/customers";
import { resolvedCustomerAvatarUrl, resolvedCustomerName } from "@/lib/customers-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Mail, Phone, Calendar, ShoppingCart, Globe,
  MessageCircle, Send, Instagram, PhoneCall, Link2, User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";

type Props = { params: Promise<{ shopSlug: string; customerId: string }> };

const PLATFORM_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  web:       { label: "Web",       icon: Globe,          color: "bg-blue-100 text-blue-700" },
  whatsapp:  { label: "WhatsApp",  icon: MessageCircle,  color: "bg-green-100 text-green-700" },
  telegram:  { label: "Telegram",  icon: Send,           color: "bg-sky-100 text-sky-700" },
  messenger: { label: "Messenger", icon: MessageCircle,  color: "bg-indigo-100 text-indigo-700" },
  instagram: { label: "Instagram", icon: Instagram,      color: "bg-pink-100 text-pink-700" },
  phone:     { label: "Phone",     icon: PhoneCall,      color: "bg-orange-100 text-orange-700" },
};

type OrderRow = {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  items_snapshot: unknown;
  customer_snapshot: unknown;
};

export default function CustomerDetailPage({ params: paramsPromise }: Props) {
  const [shopSlug, setShopSlug] = useState<string>("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activity, setActivity] = useState<CustomerActivity[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [identities, setIdentities] = useState<CustomerIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { shopSlug: slug, customerId } = await paramsPromise;
        setShopSlug(slug);
        const [customerData, activityData, ordersData, identitiesData] = await Promise.all([
          getCustomerById(customerId),
          getCustomerActivity(customerId),
          getCustomerOrders(customerId),
          getCustomerIdentities(customerId),
        ]);
        setCustomer(customerData as Customer);
        setActivity(activityData as CustomerActivity[]);
        setOrders(ordersData as OrderRow[]);
        setIdentities(identitiesData);
      } catch (err) {
        console.error("Failed to load customer:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [paramsPromise]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-28 bg-muted rounded-lg animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-10 text-muted-foreground p-6">
        <p>Customer not found or you don&apos;t have access.</p>
      </div>
    );
  }

  const channelMeta = PLATFORM_META[customer.preferred_channel] ?? PLATFORM_META.web;
  const ChannelIcon = channelMeta.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Customer Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarImage src={resolvedCustomerAvatarUrl(customer) ?? undefined} alt="" />
                <AvatarFallback>
                  <User className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{resolvedCustomerName(customer)}</CardTitle>
                {customer.user_id && customer.name !== resolvedCustomerName(customer) && (
                  <p className="text-xs text-muted-foreground mt-1">Shop record name: {customer.name}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-1">ID: {customer.id}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${channelMeta.color}`}>
              <ChannelIcon className="h-3.5 w-3.5" />
              {channelMeta.label}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium break-all">{customer.email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{customer.phone ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm font-medium">{formatDate(customer.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">First Order</p>
                <p className="text-sm font-medium">
                  {customer.first_order_at ? formatDate(customer.first_order_at) : "No orders yet"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{customer.total_orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(customer.total_spent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Order</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {customer.last_order_at ? formatDate(customer.last_order_at) : "No orders"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Connected Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {identities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional channels linked.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {identities.map((identity) => {
                const meta = PLATFORM_META[identity.platform] ?? PLATFORM_META.web;
                const Icon = meta.icon;
                return (
                  <div
                    key={identity.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${meta.color}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{meta.label}</p>
                      <p className="text-xs font-mono opacity-80">{identity.platform_id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order History ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => {
                const items = order.items_snapshot as Array<{ name: string; quantity: number }>;
                return (
                  <Link
                    key={order.id}
                    href={`/vendor/${shopSlug}/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <StatusBadge type="order" value={order.status} />
                        <StatusBadge type="payment" value={order.payment_status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {items.slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                        {items.length > 2 && ` +${items.length - 2} more`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.created_at)}</p>
                    </div>
                    <p className="font-semibold text-sm shrink-0 ml-4">{formatCurrency(order.total)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No activity yet</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                  <div className="shrink-0">
                    <Badge className="mb-1.5" variant="outline">
                      {item.activity_type.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.description && (
                      <p className="text-sm mb-1">{item.description}</p>
                    )}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.metadata.total !== undefined && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            Total: {formatCurrency(item.metadata.total)}
                          </span>
                        )}
                        {item.metadata.channel && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                            via {item.metadata.channel}
                          </span>
                        )}
                        {item.metadata.status && item.metadata.status !== "pending" && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            Status: {item.metadata.status}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
