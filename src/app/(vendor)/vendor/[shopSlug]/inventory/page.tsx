"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getShopInventory,
  getLowStockProducts,
  getInventoryStats,
  toggleInventoryTracking,
  setManualStockStatus,
  createAdjustment,
  deleteAdjustment,
  getShopAdjustmentLogs,
  type InventoryItem,
  type InventoryLog,
} from "@/actions/inventory";
import { getShopBySlug } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Package,
  PlusCircle,
  MinusCircle,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Props = { params: Promise<{ shopSlug: string }> };

const REASON_OPTIONS = [
  { value: "restock", label: "Restock" },
  { value: "customer_return", label: "Customer Return" },
  { value: "damaged", label: "Damaged" },
  { value: "shrinkage", label: "Shrinkage / Theft" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other (specify below)" },
];

export default function InventoryPage({ params: paramsPromise }: Props) {
  const [shopId, setShopId] = useState<string>("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [adjustmentLogs, setAdjustmentLogs] = useState<InventoryLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stock");

  // Tracking/manual status
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [settingManualId, setSettingManualId] = useState<string | null>(null);

  // Adjustment form
  const [adjProductId, setAdjProductId] = useState<string>("");
  const [adjQty, setAdjQty] = useState<string>("");
  const [adjReason, setAdjReason] = useState<string>("restock");
  const [adjNotes, setAdjNotes] = useState<string>("");
  const [submittingAdj, setSubmittingAdj] = useState(false);

  // Delete confirmation
  const [deletingLog, setDeletingLog] = useState<InventoryLog | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadData = useCallback(async (id: string) => {
    const [inventory, lowStock, inventoryStats, logs] = await Promise.all([
      getShopInventory(id),
      getLowStockProducts(id),
      getInventoryStats(id),
      getShopAdjustmentLogs(id),
    ]);
    setInventoryItems(inventory as InventoryItem[]);
    setLowStockItems(lowStock as InventoryItem[]);
    setStats(inventoryStats);
    setAdjustmentLogs(logs as InventoryLog[]);
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

  // ── Stock tab handlers ──────────────────────────────────────────────────────

  const handleToggleTracking = async (item: InventoryItem, track: boolean) => {
    setTogglingId(item.product_id);
    const result = await toggleInventoryTracking(item.product_id, track);
    setTogglingId(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(track ? "Inventory tracking enabled" : "Inventory tracking disabled");
      setInventoryItems((prev) =>
        prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, products: i.products ? { ...i.products, track_inventory: track } : i.products }
            : i
        )
      );
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
      setInventoryItems((prev) =>
        prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, stock_quantity: inStock ? 1 : 0 }
            : i
        )
      );
    }
  };

  // ── Adjustment form handler ──────────────────────────────────────────────────

  const trackedItems = inventoryItems.filter(
    (i) => i.products?.track_inventory !== false
  );

  const selectedItem = trackedItems.find((i) => i.product_id === adjProductId);
  const adjQtyNum = parseInt(adjQty, 10);
  const previewStock =
    selectedItem && !isNaN(adjQtyNum)
      ? Math.max(0, selectedItem.stock_quantity + adjQtyNum)
      : null;

  const handleSubmitAdjustment = async () => {
    if (!adjProductId) { toast.error("Select a product"); return; }
    if (!adjQty || isNaN(adjQtyNum) || adjQtyNum === 0) {
      toast.error("Enter a non-zero adjustment quantity");
      return;
    }
    if (adjReason === "other" && !adjNotes.trim()) {
      toast.error("Please describe the reason");
      return;
    }

    setSubmittingAdj(true);
    const result = await createAdjustment(
      adjProductId,
      adjQtyNum,
      adjReason,
      adjNotes.trim() || undefined
    );
    setSubmittingAdj(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Adjustment saved");
      setAdjQty("");
      setAdjNotes("");
      setAdjReason("restock");
      setAdjProductId("");
      await loadData(shopId);
    }
  };

  // ── Delete adjustment handler ────────────────────────────────────────────────

  const handleDeleteAdjustment = async () => {
    if (!deletingLog) return;
    setConfirming(true);
    const result = await deleteAdjustment(deletingLog.id, shopId);
    setConfirming(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Adjustment deleted and stock reverted");
      setDeletingLog(null);
      await loadData(shopId);
    }
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Stats row */}
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

      {/* Low stock alert */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="adjustments">
            Adjustments
            {adjustmentLogs.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 rounded-full px-1.5 py-0.5">
                {adjustmentLogs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Stock Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const isTracked = item.products?.track_inventory !== false;
                        const isLow = isTracked && item.stock_quantity <= item.low_stock_threshold && item.stock_quantity > 0;
                        const isOut = isTracked && item.stock_quantity <= 0;
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
                                  <p className="text-xs text-muted-foreground">{item.sku ?? item.product_id.slice(0, 8)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {item.products?.price != null ? formatCurrency(item.products.price) : "—"}
                            </td>
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
                                ? Math.max(0, (item.stock_quantity ?? 0) - (item.reserved_quantity ?? 0))
                                : "—"}
                            </td>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Adjustments Tab ───────────────────────────────────────────────── */}
        <TabsContent value="adjustments" className="space-y-6 mt-4">

          {/* New adjustment form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Adjustment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter a positive number to add stock or a negative number to remove it.
                Stock at 0 or below is automatically marked out of stock.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Product</label>
                {trackedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tracked products. Enable inventory tracking on a product first.
                  </p>
                ) : (
                  <select
                    value={adjProductId}
                    onChange={(e) => { setAdjProductId(e.target.value); setAdjQty(""); }}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="">— Select product —</option>
                    {trackedItems.map((item) => (
                      <option key={item.product_id} value={item.product_id}>
                        {item.products?.name} (current: {item.stock_quantity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity adjustment</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    placeholder="e.g. +10 or -3"
                    className="max-w-[160px]"
                  />
                  {selectedItem && adjQty && !isNaN(adjQtyNum) && adjQtyNum !== 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.stock_quantity}{" "}
                      {adjQtyNum > 0
                        ? <span className="text-green-600 font-medium">+{adjQtyNum}</span>
                        : <span className="text-red-600 font-medium">{adjQtyNum}</span>}{" "}
                      → <span className="font-semibold">{previewStock}</span>
                      {previewStock !== null && previewStock <= 0 && (
                        <span className="ml-2 text-xs text-red-600">(out of stock)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason <span className="text-red-500">*</span></label>
                <select
                  value={adjReason}
                  onChange={(e) => { setAdjReason(e.target.value); setAdjNotes(""); }}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Custom reason / notes */}
              {adjReason === "other" ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Describe the reason <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="Describe why you're making this adjustment..."
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
                  <Input
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="Add any extra details..."
                  />
                </div>
              )}

              <Button
                onClick={handleSubmitAdjustment}
                disabled={submittingAdj || !adjProductId || !adjQty}
              >
                {submittingAdj ? "Saving…" : "Save Adjustment"}
              </Button>
            </CardContent>
          </Card>

          {/* Adjustment log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adjustment History ({adjustmentLogs.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Deleting an entry reverts the stock change it caused.
              </p>
            </CardHeader>
            <CardContent>
              {adjustmentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No adjustments yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Product</th>
                        <th className="text-center py-3 px-4 font-medium">Change</th>
                        <th className="text-center py-3 px-4 font-medium">Before → After</th>
                        <th className="text-left py-3 px-4 font-medium">Reason / Notes</th>
                        <th className="text-right py-3 px-4 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentLogs.map((log) => {
                        const change = log.quantity_change ?? 0;
                        return (
                          <tr key={log.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleDateString("en-PH", {
                                month: "short", day: "numeric", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {log.productName ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {change > 0 ? (
                                <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                                  <PlusCircle className="h-3.5 w-3.5" />{change}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                                  <MinusCircle className="h-3.5 w-3.5" />{Math.abs(change)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {log.previous_quantity ?? "?"} → {log.new_quantity ?? "?"}
                            </td>
                            <td className="py-3 px-4 max-w-[220px] truncate text-muted-foreground">
                              {log.notes ?? log.change_type}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeletingLog(log)}
                              >
                                <Trash2 className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingLog} onOpenChange={(open) => { if (!open) setDeletingLog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Adjustment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will revert the stock of{" "}
            <span className="font-semibold text-foreground">{deletingLog?.productName}</span>{" "}
            from{" "}
            <span className="font-semibold text-foreground">{deletingLog?.new_quantity}</span>{" "}
            back to{" "}
            <span className="font-semibold text-foreground">{deletingLog?.previous_quantity}</span>.
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLog(null)} disabled={confirming}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAdjustment} disabled={confirming}>
              {confirming ? "Deleting…" : "Delete & Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
