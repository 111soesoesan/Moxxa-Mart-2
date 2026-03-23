"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createPOSOrder } from "@/actions/pos";
import {
  User,
  Minus,
  Plus,
  Trash2,
  Tag,
  ChevronDown,
  Banknote,
  ParkingSquare,
  Loader2,
  ShoppingCart,
  Clock,
  X,
  Receipt,
} from "lucide-react";
import type { POSCart, POSCartItem, POSCustomer, SuspendedCart } from "./usePOSCart";
import { computeCartTotals } from "./usePOSCart";
import { toast } from "sonner";

type PaymentMethod = { id: string; name: string; type: string };

type Props = {
  cart: POSCart;
  suspendedCarts: SuspendedCart[];
  shopId: string;
  paymentMethods: PaymentMethod[];
  onOpenCustomerSearch: () => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemDiscount: (id: string, amount: number, type: "fixed" | "percent") => void;
  onSetGlobalDiscount: (amount: number, type: "fixed" | "percent") => void;
  onSetNote: (note: string) => void;
  onSetPaymentMethodId: (id: string) => void;
  onSetPaymentStatus: (s: "unpaid" | "pending" | "paid") => void;
  onSuspend: () => void;
  onResume: (id: string) => void;
  onDeleteSuspended: (id: string) => void;
  onClear: () => void;
  onOrderComplete: () => void;
};

function ItemDiscountPopover({
  item,
  onUpdate,
}: {
  item: POSCartItem;
  onUpdate: (amount: number, type: "fixed" | "percent") => void;
}) {
  const [amount, setAmount] = useState(String(item.item_discount_amount));
  const [type, setType] = useState<"fixed" | "percent">(item.item_discount_type);
  const [open, setOpen] = useState(false);

  const apply = () => {
    onUpdate(Number(amount) || 0, type);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          <Tag className="h-2.5 w-2.5" />
          {item.item_discount_amount > 0
            ? `${item.item_discount_type === "percent" ? `${item.item_discount_amount}%` : formatCurrency(item.item_discount_amount)} off`
            : "Discount"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="text-xs font-medium mb-2">Item Discount</p>
        <div className="flex gap-1.5">
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
            placeholder="0"
          />
          <Select value={type} onValueChange={(v) => setType(v as "fixed" | "percent")}>
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">₱</SelectItem>
              <SelectItem value="percent">%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5 mt-2">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={apply}>Apply</Button>
          {item.item_discount_amount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { onUpdate(0, "fixed"); setAmount("0"); setOpen(false); }}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const PAYMENT_STATUS_CONFIG = {
  unpaid: { label: "Unpaid", color: "bg-red-100 text-red-700 border-red-200" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  paid: { label: "Paid ✓", color: "bg-green-100 text-green-700 border-green-200" },
};

export function POSCartPanel({
  cart,
  suspendedCarts,
  shopId,
  paymentMethods,
  onOpenCustomerSearch,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemDiscount,
  onSetGlobalDiscount,
  onSetNote,
  onSetPaymentMethodId,
  onSetPaymentStatus,
  onSuspend,
  onResume,
  onDeleteSuspended,
  onClear,
  onOrderComplete,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showParked, setShowParked] = useState(false);
  const { rawSubtotal, totalDiscount, total } = computeCartTotals(cart);

  const handleCharge = () => {
    if (cart.items.length === 0) { toast.error("Cart is empty"); return; }
    if (!cart.payment_method_id) { toast.error("Select a payment method"); return; }

    startTransition(async () => {
      const result = await createPOSOrder({
        shop_id: shopId,
        items: cart.items.map((i) => ({
          product_id: i.product_id,
          variation_id: i.variation_id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          item_discount_amount: i.item_discount_amount,
          item_discount_type: i.item_discount_type,
          image_url: i.image_url,
          variant: i.variant,
        })),
        customer_id: cart.customer?.id ?? null,
        customer_name: cart.customer?.name ?? "Walk-in Customer",
        customer_phone: cart.customer?.phone ?? null,
        customer_email: cart.customer?.email ?? null,
        customer_mode: cart.customer?.mode ?? "guest",
        payment_method_id: cart.payment_method_id,
        payment_status: cart.payment_status,
        global_discount_amount: cart.global_discount_amount,
        global_discount_type: cart.global_discount_type,
        note: cart.note || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Order created successfully!");
      onOrderComplete();
    });
  };

  return (
    <aside className="w-80 shrink-0 border-l flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Cart</span>
          {cart.items.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5">{cart.items.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {suspendedCarts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => setShowParked(true)}
            >
              <ParkingSquare className="h-3.5 w-3.5" />
              {suspendedCarts.length} parked
            </Button>
          )}
          {cart.items.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onSuspend}
                title="Suspend cart"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={onClear}
                title="Clear cart"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="px-4 py-2.5 border-b">
        <button
          onClick={onOpenCustomerSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-all"
        >
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 text-left min-w-0">
            {cart.customer ? (
              <>
                <p className="text-xs font-medium truncate">{cart.customer.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {cart.customer.mode === "guest" ? "Guest checkout" : cart.customer.phone ?? cart.customer.email ?? "Customer"}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Assign customer (or guest)</p>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Cart items */}
      <ScrollArea className="flex-1">
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Cart is empty</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click a product to add it
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cart.items.map((item) => {
              const lineTotal = item.price * item.quantity;
              const itemDisc =
                item.item_discount_type === "percent"
                  ? lineTotal * (item.item_discount_amount / 100)
                  : item.item_discount_amount;
              const lineFinal = Math.max(0, lineTotal - itemDisc);

              return (
                <div key={item.id} className="flex gap-2.5 p-2 rounded-lg bg-muted/30 border">
                  {/* Thumbnail */}
                  {item.image_url ? (
                    <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted">
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="48px" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md bg-muted flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight line-clamp-1">{item.name}</p>
                    {item.variant && (
                      <p className="text-[10px] text-muted-foreground">{item.variant}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <ItemDiscountPopover
                        item={item}
                        onUpdate={(a, t) => onUpdateItemDiscount(item.id, a, t)}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1 bg-background rounded-md border">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="h-5 w-5 flex items-center justify-center rounded-l-md hover:bg-muted text-muted-foreground"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="text-xs font-medium min-w-[20px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="h-5 w-5 flex items-center justify-center rounded-r-md hover:bg-muted text-muted-foreground"
                          disabled={item.track_inventory && item.quantity >= item.available_stock}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      {/* Price */}
                      <div className="text-right">
                        {itemDisc > 0 && (
                          <p className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(lineTotal)}
                          </p>
                        )}
                        <p className="text-xs font-semibold">{formatCurrency(lineFinal)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Totals & checkout */}
      {cart.items.length > 0 && (
        <div className="border-t p-4 space-y-3">
          {/* Global discount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Global Discount</Label>
            </div>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min="0"
                value={cart.global_discount_amount || ""}
                onChange={(e) => onSetGlobalDiscount(Number(e.target.value) || 0, cart.global_discount_type)}
                className="h-8 text-sm"
                placeholder="0"
              />
              <Select
                value={cart.global_discount_type}
                onValueChange={(v) => onSetGlobalDiscount(cart.global_discount_amount, v as "fixed" | "percent")}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">₱</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note */}
          <Textarea
            placeholder="Order note…"
            value={cart.note}
            onChange={(e) => onSetNote(e.target.value)}
            rows={1}
            className="text-xs resize-none"
          />

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(rawSubtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>- {formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Separator />

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Method *</Label>
            <Select value={cart.payment_method_id} onValueChange={onSetPaymentMethodId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select method…" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    <div className="flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5" />
                      {pm.name}
                    </div>
                  </SelectItem>
                ))}
                {paymentMethods.length === 0 && (
                  <SelectItem value="_none" disabled>No payment methods</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Payment status toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Status</Label>
            <div className="flex rounded-lg border overflow-hidden">
              {(["unpaid", "pending", "paid"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onSetPaymentStatus(s)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0",
                    cart.payment_status === s
                      ? PAYMENT_STATUS_CONFIG[s].color
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {PAYMENT_STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Charge button */}
          <Button
            className="w-full h-11 text-base font-semibold"
            onClick={handleCharge}
            disabled={isPending || !cart.payment_method_id}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Receipt className="h-5 w-5 mr-2" />
            )}
            Charge {formatCurrency(total)}
          </Button>
        </div>
      )}

      {/* Parked carts sheet */}
      <Sheet open={showParked} onOpenChange={setShowParked}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Parked Sales</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {suspendedCarts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No parked sales</p>
            ) : (
              suspendedCarts.map((sc) => (
                <div key={sc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sc.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {sc.cart.items.length} items · {formatCurrency(
                        sc.cart.items.reduce((s, i) => s + i.price * i.quantity, 0)
                      )}
                    </p>
                    {sc.cart.customer && (
                      <p className="text-xs text-muted-foreground">{sc.cart.customer.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => { onResume(sc.id); setShowParked(false); }}
                    >
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => onDeleteSuspended(sc.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}
