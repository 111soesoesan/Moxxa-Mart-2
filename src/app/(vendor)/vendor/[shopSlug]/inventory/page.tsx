"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getShopInventory,
  getLowStockProducts,
  getInventoryStats,
  updateInventoryManual,
  toggleInventoryTracking,
  setManualStockStatus,
  type InventoryItem,
} from "@/actions/inventory";
import { getShopBySlug } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Package } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Props = { params: Promise<{ shopSlug: string }> };

export default function InventoryPage({ params: paramsPromise }: Props) {
  const [shopId, setShopId] = useState<string>("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [settingManualId, setSettingManualId] = useState<string | null>(null);

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("restock");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async (id: string) => {
    const [inventory, lowStock, inventoryStats] = await Promise.all([
      getShopInventory(id),
      getLowStockProducts(id),
      getInventoryStats(id),
    ]);
    setInventoryItems(inventory as InventoryItem[]);
    setLowStockItems(lowStock as InventoryItem[]);
    setStats(inventoryStats);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const resolvedParams = await paramsPromise;
        const shop = await getShopBySlug(resolvedParams.shopSlug);
        if (!shop) return;
        setShopId(shop.id);
        await loadData(shop.id);
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [paramsPromise, loadData]);

  const openAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setNewQty(String(item.stock_quantity));
    setAdjustReason("restock");
    setAdjustNotes("");
  };

  const handleSaveAdjustment = async () => {
    if (!adjustItem) return;
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error("Enter a valid non-negative quantity");
      return;
    }
    setSaving(true);
    const result = await updateInventoryManual(
      adjustItem.product_id,
      qty,
      adjustReason,
      adjustNotes || undefined
    );
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Inventory updated");
      setAdjustItem(null);
      await loadData(shopId);
    }
  };

  const handleToggleTracking = async (item: InventoryItem, track: boolean) => {
    setTogglingId(item.product_id);
    const result = await toggleInventoryTracking(item.product_id, track);
    setTogglingId(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(track ? "Inventory tracking enabled" : "Inventory tracking disabled");
      // Optimistically update local state
      setInventoryItems((prev) =>
        prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, products: i.products ? { ...i.products, track_inventory: track } : i.products }
            : i
        )
      );
      // Refresh stats (low stock count changes)
      const [lowStock, inventoryStats] = await Promise.all([
        getLowStockProducts(shopId),
        getInventoryStats(shopId),
      ]);
      setLowStockItems(lowStock as InventoryItem[]);
      setStats(inventoryStats);
    }
  };

  const handleManualStatus = async (item: InventoryItem, inStock: boolean) => {
    setSettingManualId(item.product_id);
    const result = await setManualStockStatus(item.product_id, inStock);
    setSettingManualId(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      // Optimistically update the displayed stock_quantity
      setInventoryItems((prev) =>
        prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, stock_quantity: inStock ? 1 : 0 }
            : i
        )
      );
    }
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku ?? "").toLowerCase().includes(searchQuery.toLowerCase())
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
      {/* Stats Cards — only tracked products */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Inventory-tracked items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStock ?? 0}</div>
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
            <div className="text-2xl font-bold text-yellow-600">{stats?.lowStockCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.averageStock ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per tracked product</p>
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
              {lowStockItems.slice(0, 5).map((item) => (
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

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by product name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
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
                    <th className="text-center py-3 px-4 font-medium">Track</th>
                    <th className="text-center py-3 px-4 font-medium">Stock</th>
                    <th className="text-center py-3 px-4 font-medium">Reserved</th>
                    <th className="text-center py-3 px-4 font-medium">Available</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isTracked = item.products?.track_inventory !== false;
                    const isLow = isTracked && item.stock_quantity <= item.low_stock_threshold;
                    const isOut = isTracked && item.stock_quantity === 0;
                    const isToggling = togglingId === item.product_id;

                    return (
                      <tr key={item.product_id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.products?.image_urls?.[0] && (
                              <Image
                                src={item.products.image_urls[0]}
                                alt={item.products.name}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">{item.products?.name}</p>
                              <p className="text-xs text-muted-foreground">{item.sku ?? item.product_id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {item.products?.price != null ? formatCurrency(item.products.price) : "—"}
                        </td>

                        {/* Tracking toggle */}
                        <td className="py-3 px-4 text-center">
                          <Switch
                            checked={isTracked}
                            onCheckedChange={(checked) => handleToggleTracking(item, checked)}
                            disabled={isToggling}
                            aria-label="Track inventory"
                          />
                        </td>

                        <td className="py-3 px-4 text-center font-medium">
                          {isTracked ? item.stock_quantity : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isTracked ? (item.reserved_quantity ?? 0) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {isTracked
                            ? (item.stock_quantity ?? 0) - (item.reserved_quantity ?? 0)
                            : "—"}
                        </td>

                        {/* Status — manual picker when untracked, badge when tracked */}
                        <td className="py-3 px-4 text-center">
                          {!isTracked ? (
                            <select
                              value={item.stock_quantity > 0 ? "in" : "out"}
                              onChange={(e) => handleManualStatus(item, e.target.value === "in")}
                              disabled={settingManualId === item.product_id}
                              className="text-xs border rounded px-2 py-1 bg-background cursor-pointer disabled:opacity-50"
                            >
                              <option value="in">In Stock</option>
                              <option value="out">Out of Stock</option>
                            </select>
                          ) : isOut ? (
                            <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">In Stock</Badge>
                          )}
                        </td>

                        {/* Adjust button — only when tracking is on */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjust(item)}
                            disabled={!isTracked}
                          >
                            Adjust
                          </Button>
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

      {/* Adjustment Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(open) => { if (!open) setAdjustItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory — {adjustItem?.products?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Current stock: <span className="font-semibold text-foreground">{adjustItem?.stock_quantity}</span>
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">New Quantity</label>
              <Input
                type="number"
                min={0}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="Enter new quantity"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="restock">Restock</option>
                <option value="manual_update">Manual Correction</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Add a note..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
