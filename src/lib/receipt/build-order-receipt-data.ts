import type { Json } from "@/types/supabase";
import type { OrderReceiptData, OrderReceiptLineItem } from "@/types/receipt";
import { formatVariant } from "@/lib/utils";

type ShopJoin = {
  name: string;
  slug?: string;
  phone?: string | null;
} | null;

type PaymentJoin = { name: string } | null;

type CustomerSnap = {
  full_name?: string;
  phone?: string;
  address?: string;
  email?: string;
};

type ItemSnap = {
  name: string;
  price: number;
  quantity: number;
  variant?: unknown;
};

export type OrderReceiptSource = {
  id: string;
  created_at: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  payment_status: string;
  notes?: string | null;
  customer_snapshot: Json;
  items_snapshot: Json;
  shops: ShopJoin;
  payment_methods: PaymentJoin;
};

export function buildOrderReceiptData(order: OrderReceiptSource): OrderReceiptData {
  const customer = order.customer_snapshot as CustomerSnap;
  const rawItems = (order.items_snapshot ?? []) as ItemSnap[];

  const items: OrderReceiptLineItem[] = rawItems.map((row) => {
    const qty = Number(row.quantity) || 0;
    const unit = Number(row.price) || 0;
    const variantLabel = formatVariant(row.variant) || null;
    return {
      name: row.name,
      quantity: qty,
      unitPrice: unit,
      lineTotal: unit * qty,
      variantLabel: variantLabel || null,
    };
  });

  const shop = order.shops;

  return {
    orderId: order.id,
    createdAt: order.created_at,
    shopName: shop?.name ?? "Shop",
    shopSlug: shop?.slug ?? null,
    shopPhone: shop?.phone ?? null,
    customerName: customer?.full_name ?? "—",
    customerPhone: customer?.phone ?? "—",
    customerAddress: customer?.address ?? null,
    customerEmail: customer?.email ?? null,
    items,
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    total: order.total,
    paymentMethodName: order.payment_methods?.name ?? "—",
    orderStatus: order.status,
    paymentStatus: order.payment_status,
    notes: order.notes ?? null,
  };
}
