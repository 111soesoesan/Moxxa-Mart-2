"use client";

import { useState, useEffect } from "react";
import { getShopInventory, getLowStockProducts, getInventoryStats } from "@/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Props = { params: Promise<{ shopSlug: string }> };

export default function InventoryPage({ params: paramsPromise }: Props) {
  const [params, setParams] = useState<{ shopSlug: string }>();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await paramsPromise;
        const shopId = resolvedParams.shopSlug;

        const [inventory, lowStock, inventoryStats] = await Promise.all([
          getShopInventory(shopId),
          getLowStockProducts(shopId),
          getInventoryStats(shopId),
        ]);

        setInventoryItems(inventory);
        setLowStockItems(lowStock);
        setStats(inventoryStats);
      } catch (error) {
        console.error("Failed to load inventory:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [paramsPromise]);

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_id?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Items in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStock || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.lowStockCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.averageStock || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per product</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((item: any) => (
                <div key={item.product_id} className="flex items-center justify-between p-2 bg-white rounded border border-yellow-100">
                  <span className="text-sm font-medium">{item.products?.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {item.stock_quantity} left
                  </Badge>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p className="text-xs text-yellow-700 mt-2">
                  +{lowStockItems.length - 5} more items need restocking
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by product name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline">Filter</Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory Items ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">Price</th>
                    <th className="text-center py-3 px-4 font-medium">Stock</th>
                    <th className="text-center py-3 px-4 font-medium">Reserved</th>
                    <th className="text-center py-3 px-4 font-medium">Available</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item: any) => (
                    <tr key={item.product_id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.products?.image_urls?.[0] && (
                            <Image
                              src={item.products.image_urls[0]}
                              alt={item.products.name}
                              width={40}
                              height={40}
                              className="rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.products?.name}</p>
                            <p className="text-xs text-muted-foreground">{item.product_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">${item.products?.price?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center font-medium">{item.stock_quantity}</td>
                      <td className="py-3 px-4 text-center">{item.reserved_quantity || 0}</td>
                      <td className="py-3 px-4 text-center font-medium">
                        {(item.stock_quantity || 0) - (item.reserved_quantity || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.stock_quantity <= item.low_stock_threshold ? (
                          <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                        ) : item.stock_quantity === 0 ? (
                          <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/vendor/${params?.shopSlug}/inventory/${item.product_id}`}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
