"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { getMyShops } from "@/actions/shops";
import { getShopProductsWithDetails, bulkDeleteProducts, bulkUpdateProductStatus } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Columns, Trash2, Package, Eye, Pencil, Search, X } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  status: string;
  product_type: string;
  price: number;
  stock: number;
  track_inventory: boolean;
  main_image: string | null;
  image_urls: string[];
  created_at: string;
  product_variations: Array<{ id: string; is_active: boolean; stock_quantity: number; price: number | null }>;
};

function getStockStatus(p: ProductRow) {
  if (p.product_type === "variable") {
    const activeVars = p.product_variations.filter((v) => v.is_active);
    if (activeVars.length === 0) return { label: "No Variations", color: "bg-gray-100 text-gray-700" };
    const total = activeVars.reduce((s, v) => s + v.stock_quantity, 0);
    if (total === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-700" };
    if (total <= 5) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700" };
    return { label: "In Stock", color: "bg-green-100 text-green-700" };
  }
  if (!p.track_inventory) return { label: "Not Tracked", color: "bg-gray-100 text-gray-600" };
  if (p.stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-700" };
  if (p.stock <= 5) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-700" };
  return { label: "In Stock", color: "bg-green-100 text-green-700" };
}

function getPriceDisplay(p: ProductRow) {
  if (p.product_type === "variable") {
    const prices = p.product_variations.filter((v) => v.is_active && v.price != null).map((v) => Number(v.price));
    if (prices.length === 0) return "—";
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }
  return formatCurrency(Number(p.price));
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  archived: { label: "Archived", color: "bg-orange-100 text-orange-700" },
};

export default function AllProductsPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    const shops = await getMyShops();
    const shop = shops.find((s) => s.slug === shopSlug);
    if (!shop) return;
    const data = await getShopProductsWithDetails(shop.id);
    setProducts(data as ProductRow[]);
    setLoading(false);
  }, [shopSlug]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => {
    const q = globalFilter.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
    if (stockFilter !== "all") {
      const s = getStockStatus(p).label;
      if (stockFilter === "in_stock" && s !== "In Stock") return false;
      if (stockFilter === "low_stock" && s !== "Low Stock") return false;
      if (stockFilter === "out_of_stock" && s !== "Out of Stock") return false;
    }
    return true;
  });

  const columns: ColumnDef<ProductRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} onClick={(e) => e.stopPropagation()} />
      ),
      enableSorting: false, enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
          Product {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />}
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        const img = p.main_image ?? p.image_urls?.[0] ?? null;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted">
              {img ? <Image src={img} alt={p.name} fill className="object-cover" sizes="40px" /> : <div className="flex h-full items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate max-w-[180px]">{p.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{p.product_type}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = STATUS_CFG[row.original.status] ?? { label: row.original.status, color: "bg-gray-100 text-gray-700" };
        return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
      },
    },
    {
      id: "price", accessorFn: (r) => r.price,
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
          Price {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />}
        </Button>
      ),
      cell: ({ row }) => <span className="text-sm font-medium">{getPriceDisplay(row.original)}</span>,
    },
    {
      id: "stock_status", header: "Stock",
      cell: ({ row }) => { const s = getStockStatus(row.original); return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>; },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
          Created {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />}
        </Button>
      ),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>,
    },
    {
      id: "actions", enableHiding: false,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={`/vendor/${shopSlug}/products/${p.id}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href={`/product/${p.id}`} target="_blank"><Eye className="mr-2 h-4 w-4" />View</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); startTransition(async () => { const r = await bulkDeleteProducts([p.id]); if (r.error) toast.error(r.error); else { toast.success("Deleted"); load(); } }); }}>
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filtered, columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.id);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground text-sm">Loading products…</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} products in your catalog</p>
        </div>
        <Button asChild>
          <Link href={`/vendor/${shopSlug}/products/new`}><Plus className="mr-2 h-4 w-4" />Add Product</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products…" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-8 h-9" />
          {globalFilter && <button onClick={() => setGlobalFilter("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="simple">Simple</SelectItem>
            <SelectItem value="variable">Variable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 ml-auto"><Columns className="mr-2 h-4 w-4" />Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns().filter((c) => c.getCanHide()).map((c) => (
              <DropdownMenuCheckboxItem key={c.id} className="capitalize" checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(v)}>{c.id}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Change Status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(["active", "draft", "archived"] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => startTransition(async () => { const r = await bulkUpdateProductStatus(selectedIds, s); if (r.error) toast.error(r.error); else { toast.success(`Updated to ${s}`); setRowSelection({}); load(); } })}>
                  Set {s.charAt(0).toUpperCase() + s.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
          </Button>
          <button onClick={() => setRowSelection({})} className="ml-auto text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="h-10">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {products.length === 0 ? "No products yet. Click 'Add Product' to get started." : "No products match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => router.push(`/vendor/${shopSlug}/products/${row.original.id}/edit`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
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
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} of {products.length} products</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} product(s)?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected products and their variations. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" disabled={isPending} onClick={() => startTransition(async () => { const r = await bulkDeleteProducts(selectedIds); if (r.error) toast.error(r.error); else { toast.success("Deleted"); setRowSelection({}); load(); } setDeleteOpen(false); })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
