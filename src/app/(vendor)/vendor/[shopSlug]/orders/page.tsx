"use client";

import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { getMyShops } from "@/actions/shops";
import {
  getShopOrders,
  updateOrderStatus,
  deleteOrder,
  bulkUpdateOrderStatus,
  bulkDeleteOrders,
  markOrderPaid,
  confirmCODOrder,
  markCODPaid,
} from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUpDown,
  MoreHorizontal,
  ShoppingBag,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Banknote,
  Search,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  subtotal: number;
  shipping_fee: number;
  created_at: string;
  notes: string | null;
  payment_proof_url: string | null;
  customer_snapshot: {
    full_name: string;
    phone: string;
    address: string;
    email?: string;
  };
  items_snapshot: Array<{ name: string; quantity: number; price: number }>;
  payment_methods: { id: string; name: string; type: string } | null;
};

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const PAYMENT_STATUSES = ["unpaid", "pending_verification", "paid"] as const;
const DATE_RANGES = [
  { label: "All time", days: 0 },
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed:   "bg-blue-100 text-blue-800 border-blue-200",
  processing:  "bg-purple-100 text-purple-800 border-purple-200",
  shipped:     "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered:   "bg-green-100 text-green-800 border-green-200",
  cancelled:   "bg-red-100 text-red-800 border-red-200",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid:                "bg-gray-100 text-gray-700 border-gray-200",
  pending_verification:  "bg-orange-100 text-orange-800 border-orange-200",
  paid:                  "bg-green-100 text-green-800 border-green-200",
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped:    ["delivered", "cancelled"],
  delivered:  [],
  cancelled:  [],
};

function StatusBadgeInline({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${colorMap[value] ?? "bg-muted text-muted-foreground"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorOrdersPage() {
  const params = useParams<{ shopSlug: string }>();
  const shopSlug = params.shopSlug;

  const [shopId, setShopId] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRange, setDateRange] = useState(0);

  // Dialogs
  const [bulkStatusDialog, setBulkStatusDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState("confirmed");
  const [deleteDialog, setDeleteDialog] = useState<Order | null>(null);

  const loadData = useCallback(async (id: string) => {
    const raw = await getShopOrders(id);
    setOrders(raw as unknown as Order[]);
  }, []);

  useEffect(() => {
    (async () => {
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      if (!shop) return;
      setShopId(shop.id);
      await loadData(shop.id);
      setLoading(false);
    })();
  }, [shopSlug, loadData]);

  // ── Filtered data ───────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    const now = Date.now();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
      if (dateRange > 0) {
        const age = now - new Date(o.created_at).getTime();
        if (age > dateRange * 86400000) return false;
      }
      if (globalFilter) {
        const q = globalFilter.toLowerCase();
        const name = o.customer_snapshot?.full_name?.toLowerCase() ?? "";
        const phone = o.customer_snapshot?.phone ?? "";
        const id = o.id.toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, dateRange, globalFilter]);

  // ── Quick actions ───────────────────────────────────────────────────────────

  const act = (fn: () => Promise<{ error?: string }>, successMsg: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      else { toast.success(successMsg); await loadData(shopId); }
    });

  // ── Columns ─────────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Order>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      id: "id",
      header: "Order",
      accessorKey: "id",
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{row.original.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(row.original.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>
          Customer <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      accessorFn: (row) => row.customer_snapshot?.full_name ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.customer_snapshot?.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.customer_snapshot?.phone}</p>
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      enableSorting: false,
      cell: ({ row }) => {
        const items = row.original.items_snapshot;
        const preview = items.slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(", ");
        const more = items.length > 2 ? ` +${items.length - 2} more` : "";
        return (
          <p className="text-xs text-muted-foreground max-w-[160px] truncate" title={preview + more}>
            {preview}{more}
          </p>
        );
      },
    },
    {
      id: "total",
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>
          Total <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      accessorKey: "total",
      cell: ({ row }) => <p className="font-semibold text-sm">{formatCurrency(row.original.total)}</p>,
    },
    {
      id: "payment_method",
      header: "Payment",
      enableSorting: false,
      cell: ({ row }) => {
        const pm = row.original.payment_methods;
        if (!pm) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1">
            {pm.type === "cash" ? <Banknote className="h-3 w-3 text-green-600" /> : null}
            <span className="text-xs">{pm.name}</span>
          </div>
        );
      },
    },
    {
      id: "payment_status",
      header: "Payment Status",
      accessorKey: "payment_status",
      cell: ({ row }) => {
        const o = row.original;
        const isCash = o.payment_methods?.type === "cash";
        return (
          <div className="flex flex-col gap-1">
            <StatusBadgeInline value={o.payment_status} colorMap={PAYMENT_COLORS} />
            {/* Bank: verify proof */}
            {!isCash && o.payment_status === "pending_verification" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[10px] text-green-700"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); act(() => markOrderPaid(o.id), "Marked as paid"); }}
              >
                ✓ Mark paid
              </Button>
            )}
            {/* COD: collect cash */}
            {isCash && o.status !== "cancelled" && o.payment_status !== "paid" && o.status !== "pending" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[10px] text-green-700"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); act(() => markCODPaid(o.id), "Cash collected"); }}
              >
                💵 Collected
              </Button>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Order Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const o = row.original;
        const isCash = o.payment_methods?.type === "cash";
        const next = NEXT_STATUSES[o.status] ?? [];
        const isTerminal = o.status === "delivered" || o.status === "cancelled";

        return (
          <div className="flex flex-col gap-1">
            <StatusBadgeInline value={o.status} colorMap={STATUS_COLORS} />
            {/* COD: confirm pending */}
            {isCash && o.status === "pending" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[10px] text-blue-700"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); act(() => confirmCODOrder(o.id), "Order confirmed"); }}
              >
                ✓ Confirm
              </Button>
            )}
            {/* Next status inline select */}
            {!isTerminal && next.length > 0 && (o.payment_status === "paid" || isCash) && o.status !== "pending" && (
              <Select
                onValueChange={(s) => act(() => updateOrderStatus(o.id, s), `Status → ${s}`)}
                disabled={isPending}
              >
                <SelectTrigger className="h-5 text-[10px] w-28 px-1.5" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Move to…" />
                </SelectTrigger>
                <SelectContent>
                  {next.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      },
    },
    {
      id: "created_at",
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs font-medium" onClick={() => column.toggleSorting()}>
          Date <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      accessorKey: "created_at",
      cell: ({ row }) => (
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.created_at)}
        </p>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const o = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/vendor/${shopSlug}/orders/${o.id}`} className="cursor-pointer">
                  <Eye className="mr-2 h-3.5 w-3.5" /> View details
                </Link>
              </DropdownMenuItem>
              {o.payment_proof_url && (
                <DropdownMenuItem asChild>
                  <a href={o.payment_proof_url} target="_blank" rel="noopener noreferrer">
                    View proof
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialog(o)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [shopSlug, isPending, act, loadData, shopId]);

  // ── Table instance ──────────────────────────────────────────────────────────

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.id);
  const selectedCount = selectedIds.length;

  // ── Bulk handlers ───────────────────────────────────────────────────────────

  const handleBulkStatusUpdate = () =>
    startTransition(async () => {
      const r = await bulkUpdateOrderStatus(selectedIds, bulkTargetStatus);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`Updated ${(r as { updated?: number }).updated ?? selectedIds.length} order(s) to "${bulkTargetStatus}"`);
        setRowSelection({});
        setBulkStatusDialog(false);
        await loadData(shopId);
      }
    });

  const handleBulkDelete = () =>
    startTransition(async () => {
      const r = await bulkDeleteOrders(selectedIds);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`Deleted ${(r as { deleted?: number }).deleted ?? selectedIds.length} order(s)`);
        setRowSelection({});
        setBulkDeleteDialog(false);
        await loadData(shopId);
      }
    });

  const handleDeleteOne = () =>
    startTransition(async () => {
      if (!deleteDialog) return;
      const r = await deleteOrder(deleteDialog.id);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Order deleted");
        setDeleteDialog(null);
        await loadData(shopId);
      }
    });

  const clearFilters = () => {
    setGlobalFilter("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateRange(0);
  };

  const hasActiveFilters =
    globalFilter || statusFilter !== "all" || paymentFilter !== "all" || dateRange > 0;

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-12 w-full bg-muted rounded animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 w-full bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredData.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(shopId)}
          disabled={isPending}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, phone, order ID…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 h-9 w-64"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Order status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border overflow-hidden">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.days}
              onClick={() => setDateRange(dr.days)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                dateRange === dr.days
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-9 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setBulkStatusDialog(true)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Update Status
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setBulkDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setRowSelection({})}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Table */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
          <p className="text-sm text-muted-foreground">Share your shop link to start receiving orders</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs py-3">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground text-sm">
                      No orders match your filters.{" "}
                      <button onClick={clearFilters} className="underline">Clear filters</button>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => row.toggleSelected()}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <p className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} — {filteredData.length} result{filteredData.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk status update dialog */}
      <Dialog open={bulkStatusDialog} onOpenChange={setBulkStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {selectedCount} order{selectedCount !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Set all selected orders to a new status.
            </p>
            <Select value={bulkTargetStatus} onValueChange={setBulkTargetStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialog(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleBulkStatusUpdate} disabled={isPending}>
              {isPending ? "Updating…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} order{selectedCount !== 1 ? "s" : ""}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the selected orders. Confirmed orders will have their inventory
            automatically restored. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Order from <span className="font-semibold text-foreground">{deleteDialog?.customer_snapshot?.full_name}</span> for{" "}
            <span className="font-semibold text-foreground">{deleteDialog ? formatCurrency(deleteDialog.total) : ""}</span> will be
            permanently deleted.
            {deleteDialog?.status === "confirmed" && (
              <span className="block mt-1 text-orange-600">
                This is a confirmed order — stock will be restored automatically.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOne} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
