"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Package,
  TrendingUp,
  BarChart2,
  Layers,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import Image from "next/image";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const REASON_OPTIONS = [
  { value: "restock", label: "Restock" },
  { value: "customer_return", label: "Customer Return" },
  { value: "damaged", label: "Damaged" },
  { value: "shrinkage", label: "Shrinkage / Theft" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other (specify below)" },
];

function getVariationLabel(item: InventoryItem): string | null {
  if (!item.product_variations) return null;
  const combo = item.product_variations.attribute_combination ?? {};
  return Object.values(combo).join(" / ") || item.product_variations.sku || "Variation";
}

function getItemLabel(item: InventoryItem): string {
  const productName = item.products?.name ?? "Unknown Product";
  const varLabel = getVariationLabel(item);
  return varLabel ? `${productName} — ${varLabel}` : productName;
}

function getStockBadge(item: InventoryItem, isTracked: boolean) {
  if (!isTracked) {
    return item.stock_quantity > 0 ? (
      <Badge variant="outline" className="text-xs">In Stock</Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
    );
  }
  const avail = Math.max(0, item.stock_quantity - (item.reserved_quantity ?? 0));
  if (avail === 0) return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
  if (avail <= item.low_stock_threshold) return <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Low Stock</Badge>;
  return <Badge variant="outline" className="text-xs text-green-700 border-green-300">In Stock</Badge>;
}

export default function InventoryPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [shopId, setShopId] = useState<string>("");
  const [shopSlugStr, setShopSlugStr] = useState<string>("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<{ totalProducts: number; totalStock: number; lowStockCount: number; averageStock: number } | null>(null);
  const [adjustmentLogs, setAdjustmentLogs] = useState<InventoryLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stock");

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [settingManualId, setSettingManualId] = useState<string | null>(null);

  // Adjustment dialog
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjInventoryId, setAdjInventoryId] = useState<string>("");
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
    setInventoryItems(inventory);
    setLowStockItems(lowStock);
    setStats(inventoryStats);
    setAdjustmentLogs(logs);
  }, []);

  useEffect(() => {
    if (!shopSlug) return;
    async function init() {
      try {
        const shop = await getShopBySlug(shopSlug as string);
        if (!shop) return;
        setShopId(shop.id);
        setShopSlugStr(shopSlug as string);
        await loadData(shop.id);
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [shopSlug, loadData]);

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
      setLowStockItems(lowStock);
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
          i.product_id === item.product_id ? { ...i, stock_quantity: inStock ? 1 : 0 } : i
        )
      );
    }
  };

  const openAdjDialog = (item: InventoryItem) => {
    setAdjInventoryId(item.id);
    setAdjQty("");
    setAdjReason("restock");
    setAdjNotes("");
    setAdjOpen(true);
  };

  const adjQtyNum = parseInt(adjQty, 10);
  const selectedItem = inventoryItems.find((i) => i.id === adjInventoryId);
  const previewStock =
    selectedItem && !isNaN(adjQtyNum)
      ? Math.max(0, selectedItem.stock_quantity + adjQtyNum)
      : null;

  const handleSubmitAdjustment = async () => {
    if (!adjInventoryId) { toast.error("Select an item"); return; }
    if (!adjQty || isNaN(adjQtyNum) || adjQtyNum === 0) {
      toast.error("Enter a non-zero adjustment quantity");
      return;
    }
    if (adjReason === "other" && !adjNotes.trim()) {
      toast.error("Please describe the reason");
      return;
    }
    setSubmittingAdj(true);
    const result = await createAdjustment(adjInventoryId, adjQtyNum, adjReason, adjNotes.trim() || undefined);
    setSubmittingAdj(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Adjustment saved");
      setAdjOpen(false);
      await loadData(shopId);
    }
  };

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

  const filteredItems = inventoryItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const label = getItemLabel(item).toLowerCase();
    const sku = (item.sku ?? item.product_variations?.sku ?? "").toLowerCase();
    return label.includes(q) || sku.includes(q);
  });

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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Tracked Items
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.totalProducts ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" />
              Total Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats?.totalStock ?? 0}</div>
            <p className="text-xs text-muted-foreground">units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-yellow-600">{stats?.lowStockCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Avg Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{Math.round(stats?.averageStock ?? 0)}</div>
            <p className="text-xs text-muted-foreground">per item</p>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Low Stock Alert — {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} need restocking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 8).map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white dark:bg-background border border-yellow-200 text-yellow-800 dark:text-yellow-400">
                  {getItemLabel(item)}
                  <span className="font-semibold">{item.stock_quantity}</span>
                </span>
              ))}
              {lowStockItems.length > 8 && (
                <span className="text-xs text-yellow-700 self-center">+{lowStockItems.length - 8} more</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock">Stocks</TabsTrigger>
          <TabsTrigger value="adjustments">
            Adjustments
            {adjustmentLogs.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 rounded-full px-1.5 py-0.5">
                {adjustmentLogs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Stocks Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Inventory Items
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredItems.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No inventory items found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Product / Variation</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-center">Track</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Reserved</TableHead>
                      <TableHead className="text-center">Available</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const isVariation = !!item.variation_id;
                      const isTracked = item.products?.track_inventory !== false;
                      const isToggling = togglingId === item.product_id;
                      const varLabel = getVariationLabel(item);
                      const available = Math.max(0, item.stock_quantity - (item.reserved_quantity ?? 0));

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              {item.products?.image_urls?.[0] && !isVariation && (
                                <Image
                                  src={item.products.image_urls[0]}
                                  alt={item.products.name ?? ""}
                                  width={36}
                                  height={36}
                                  className="rounded object-cover shrink-0"
                                />
                              )}
                              {isVariation && <div className="w-1.5 h-8 rounded-full bg-muted-foreground/20 shrink-0" />}
                              <div>
                                <p className={`font-medium text-sm ${isVariation ? "text-muted-foreground" : ""}`}>
                                  {item.products?.name ?? "Unknown"}
                                </p>
                                {varLabel && (
                                  <p className="text-xs text-foreground/80 font-medium">{varLabel}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {item.sku ?? item.product_variations?.sku ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {isVariation
                              ? (item.product_variations?.price != null
                                  ? formatCurrency(item.product_variations.price)
                                  : "—")
                              : (item.products?.price != null
                                  ? formatCurrency(item.products.price)
                                  : "—")}
                          </TableCell>
                          <TableCell className="text-center">
                            {isVariation ? (
                              <span className="text-xs text-muted-foreground">Always</span>
                            ) : (
                              <Switch
                                checked={isTracked}
                                onCheckedChange={(checked) => handleToggleTracking(item, checked)}
                                disabled={isToggling}
                                aria-label="Track inventory"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {isTracked ? item.stock_quantity : "—"}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {isTracked ? (item.reserved_quantity ?? 0) : "—"}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {isTracked ? available : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {!isTracked && !isVariation ? (
                              <select
                                value={item.stock_quantity > 0 ? "in" : "out"}
                                onChange={(e) => handleManualStatus(item, e.target.value === "in")}
                                disabled={settingManualId === item.product_id}
                                className="text-xs border rounded px-2 py-1 bg-background cursor-pointer disabled:opacity-50"
                              >
                                <option value="in">In Stock</option>
                                <option value="out">Out of Stock</option>
                              </select>
                            ) : (
                              getStockBadge(item, isTracked)
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => openAdjDialog(item)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Adjust
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Adjustments Tab ───────────────────────────────────────────────── */}
        <TabsContent value="adjustments" className="space-y-6 mt-4">
          {/* Log table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Adjustment History</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Deleting a log entry reverts its stock change.
                </p>
              </div>
              <Button size="sm" onClick={() => { setAdjInventoryId(""); setAdjQty(""); setAdjReason("restock"); setAdjNotes(""); setAdjOpen(true); }}>
                New Adjustment
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {adjustmentLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No adjustments yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Product / Variation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Change</TableHead>
                      <TableHead className="text-center">Before</TableHead>
                      <TableHead className="text-center">After</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentLogs.map((log) => {
                      const isPos = log.quantity_change > 0;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{log.productName ?? "—"}</p>
                            {log.variationLabel && (
                              <p className="text-xs text-muted-foreground">{log.variationLabel}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {log.change_type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-semibold ${isPos ? "text-green-600" : "text-red-600"}`}>
                              {isPos ? "+" : ""}{log.quantity_change}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {log.previous_quantity ?? "—"}
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">
                            {log.new_quantity ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {log.notes ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingLog(log)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Item selector */}
            <div className="space-y-1.5">
              <Label>Product / Variation</Label>
              <select
                value={adjInventoryId}
                onChange={(e) => { setAdjInventoryId(e.target.value); setAdjQty(""); }}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              >
                <option value="">— Select item —</option>
                {inventoryItems
                  .filter((i) => i.products?.track_inventory !== false || !!i.variation_id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {getItemLabel(item)} (stock: {item.stock_quantity})
                    </option>
                  ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label>Quantity Adjustment</Label>
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
                    {adjQtyNum > 0 ? (
                      <span className="text-green-600 font-medium">+{adjQtyNum}</span>
                    ) : (
                      <span className="text-red-600 font-medium">{adjQtyNum}</span>
                    )}{" "}
                    → <span className="font-semibold">{previewStock}</span>
                    {previewStock !== null && previewStock <= 0 && (
                      <span className="ml-1 text-xs text-red-600">(out of stock)</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>
                Reason <span className="text-destructive">*</span>
              </Label>
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

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>
                {adjReason === "other" ? (
                  <>Describe the reason <span className="text-destructive">*</span></>
                ) : (
                  <span className="text-muted-foreground">Notes (optional)</span>
                )}
              </Label>
              <Input
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder={adjReason === "other" ? "Describe why…" : "Add any extra details…"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitAdjustment}
              disabled={submittingAdj || !adjInventoryId || !adjQty}
            >
              {submittingAdj ? "Saving…" : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingLog} onOpenChange={(open) => { if (!open) setDeletingLog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert this adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the log entry and restore the stock to{" "}
              <strong>{deletingLog?.previous_quantity ?? "—"}</strong> units.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={confirming}
              onClick={handleDeleteAdjustment}
            >
              {confirming ? "Reverting…" : "Yes, Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
