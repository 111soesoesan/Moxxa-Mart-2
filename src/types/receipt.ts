export type ReceiptFormat = "a4" | "thermal";

export type ReceiptThermalWidthMm = "80" | "58";

export interface OrderReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantLabel?: string | null;
}

/** Serializable props for client receipt / PDF / print */
export interface OrderReceiptData {
  orderId: string;
  createdAt: string;
  shopName: string;
  shopSlug?: string | null;
  shopLogoUrl?: string | null;
  shopPhone?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  customerEmail?: string | null;
  items: OrderReceiptLineItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethodName: string;
  orderStatus: string;
  paymentStatus: string;
  notes?: string | null;
}
