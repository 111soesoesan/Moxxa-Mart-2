"use client";

import { useState, useEffect } from "react";
import { getCustomerById, getCustomerActivity, type Customer, type CustomerActivity } from "@/actions/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Calendar, ShoppingCart } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type Props = { params: Promise<{ shopSlug: string; customerId: string }> };

export default function CustomerDetailPage({ params: paramsPromise }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activity, setActivity] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await paramsPromise;
        const [customerData, activityData] = await Promise.all([
          getCustomerById(resolvedParams.customerId),
          getCustomerActivity(resolvedParams.customerId),
        ]);
        setCustomer(customerData);
        setActivity(activityData as CustomerActivity[]);
      } catch (err) {
        console.error("Failed to load customer:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [paramsPromise]);

  if (loading) {
    return <div className="h-96 bg-muted rounded-lg animate-pulse" />;
  }

  if (!customer) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{customer.name}</CardTitle>
              <p className="text-muted-foreground mt-1">Customer ID: {customer.id}</p>
            </div>
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

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activity yet</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                  <div className="shrink-0 text-sm">
                    <Badge className="mb-2" variant="outline">
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
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
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
