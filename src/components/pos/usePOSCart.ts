"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";

// ─── Types ────────────────────────────────────────────────────────────────────

export type POSCartItem = {
  id: string;
  product_id: string;
  variation_id: string | null;
  name: string;
  variant: string | null;
  price: number;
  quantity: number;
  image_url: string | null;
  item_discount_amount: number;
  item_discount_type: "fixed" | "percent";
  track_inventory: boolean;
  available_stock: number;
};

export type POSCustomer = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  mode: "guest" | "customer";
};

export type POSCart = {
  items: POSCartItem[];
  customer: POSCustomer | null;
  global_discount_amount: number;
  global_discount_type: "fixed" | "percent";
  note: string;
  payment_method_id: string;
  payment_status: "unpaid" | "pending" | "paid";
};

export type SuspendedCart = {
  id: string;
  label: string;
  cart: POSCart;
  suspended_at: string;
};

// ─── Computed helpers ─────────────────────────────────────────────────────────

export function computeCartTotals(cart: POSCart) {
  const rawSubtotal = cart.items.reduce(
    (s, item) => s + item.price * item.quantity,
    0
  );
  const itemDiscounts = cart.items.reduce((s, item) => {
    const lineTotal = item.price * item.quantity;
    const d =
      item.item_discount_type === "percent"
        ? lineTotal * (item.item_discount_amount / 100)
        : item.item_discount_amount;
    return s + Math.min(d, lineTotal);
  }, 0);
  const afterItems = rawSubtotal - itemDiscounts;
  const globalDiscount =
    cart.global_discount_type === "percent"
      ? afterItems * (cart.global_discount_amount / 100)
      : cart.global_discount_amount;
  const totalDiscount = itemDiscounts + Math.min(globalDiscount, afterItems);
  const total = Math.max(0, rawSubtotal - totalDiscount);
  return { rawSubtotal, totalDiscount, total };
}

const STORAGE_KEY = (shopId: string) => `pos_suspended_${shopId}`;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePOSCart(shopId: string) {
  const emptyCart = (): POSCart => ({
    items: [],
    customer: null,
    global_discount_amount: 0,
    global_discount_type: "fixed",
    note: "",
    payment_method_id: "",
    payment_status: "unpaid",
  });

  const [cart, setCart] = useState<POSCart>(emptyCart);
  const [suspendedCarts, setSuspendedCarts] = useState<SuspendedCart[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY(shopId)) ?? "[]");
    } catch {
      return [];
    }
  });

  const saveSuspended = useCallback(
    (carts: SuspendedCart[]) => {
      setSuspendedCarts(carts);
      try {
        localStorage.setItem(STORAGE_KEY(shopId), JSON.stringify(carts));
      } catch {}
    },
    [shopId]
  );

  // ── Item operations ──────────────────────────────────────────────────────

  const addItem = useCallback(
    (
      product: {
        id: string;
        name: string;
        effective_price: number;
        image_url: string | null;
        track_inventory: boolean;
        available_stock: number;
      },
      variation?: {
        id: string;
        price: number;
        sale_price: number | null;
        attribute_combination: Record<string, string> | null;
        stock_quantity: number;
        reserved_quantity: number;
        track_inventory: boolean;
      } | null
    ) => {
      setCart((prev) => {
        const vid = variation?.id ?? null;
        const price = variation ? (variation.sale_price ?? variation.price) : product.effective_price;
        const variantLabel = variation?.attribute_combination
          ? Object.values(variation.attribute_combination).join(" / ")
          : null;
        const available = variation
          ? Math.max(0, variation.stock_quantity - variation.reserved_quantity)
          : product.available_stock;
        const track = variation?.track_inventory ?? product.track_inventory;

        const existing = prev.items.find(
          (i) => i.product_id === product.id && i.variation_id === vid
        );

        if (existing) {
          if (track && existing.quantity >= available) return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }

        const newItem: POSCartItem = {
          id: nanoid(),
          product_id: product.id,
          variation_id: vid,
          name: product.name,
          variant: variantLabel,
          price,
          quantity: 1,
          image_url: product.image_url,
          item_discount_amount: 0,
          item_discount_type: "fixed",
          track_inventory: track,
          available_stock: available,
        };

        return { ...prev, items: [...prev.items, newItem] };
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== itemId) }));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.id !== itemId) return i;
        const capped = i.track_inventory ? Math.min(quantity, i.available_stock) : quantity;
        return { ...i, quantity: Math.max(1, capped) };
      }),
    }));
  }, []);

  const updateItemDiscount = useCallback(
    (itemId: string, amount: number, type: "fixed" | "percent") => {
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId
            ? { ...i, item_discount_amount: Math.max(0, amount), item_discount_type: type }
            : i
        ),
      }));
    },
    []
  );

  // ── Cart-level operations ────────────────────────────────────────────────

  const setCustomer = useCallback((customer: POSCustomer | null) => {
    setCart((prev) => ({ ...prev, customer }));
  }, []);

  const setGlobalDiscount = useCallback(
    (amount: number, type: "fixed" | "percent") => {
      setCart((prev) => ({
        ...prev,
        global_discount_amount: Math.max(0, amount),
        global_discount_type: type,
      }));
    },
    []
  );

  const setNote = useCallback((note: string) => {
    setCart((prev) => ({ ...prev, note }));
  }, []);

  const setPaymentMethodId = useCallback((id: string) => {
    setCart((prev) => ({ ...prev, payment_method_id: id }));
  }, []);

  const setPaymentStatus = useCallback((status: "unpaid" | "pending" | "paid") => {
    setCart((prev) => ({ ...prev, payment_status: status }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(emptyCart());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cart suspension ──────────────────────────────────────────────────────

  const suspendCart = useCallback(
    (label?: string) => {
      if (cart.items.length === 0) return;
      const suspended: SuspendedCart = {
        id: nanoid(),
        label: label ?? `Sale ${new Date().toLocaleTimeString()}`,
        cart,
        suspended_at: new Date().toISOString(),
      };
      saveSuspended([...suspendedCarts, suspended]);
      setCart(emptyCart());
    },
    [cart, suspendedCarts, saveSuspended] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const resumeCart = useCallback(
    (id: string) => {
      const found = suspendedCarts.find((s) => s.id === id);
      if (!found) return;
      saveSuspended(suspendedCarts.filter((s) => s.id !== id));
      setCart(found.cart);
    },
    [suspendedCarts, saveSuspended]
  );

  const deleteSuspendedCart = useCallback(
    (id: string) => {
      saveSuspended(suspendedCarts.filter((s) => s.id !== id));
    },
    [suspendedCarts, saveSuspended]
  );

  return {
    cart,
    suspendedCarts,
    addItem,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    setCustomer,
    setGlobalDiscount,
    setNote,
    setPaymentMethodId,
    setPaymentStatus,
    clearCart,
    suspendCart,
    resumeCart,
    deleteSuspendedCart,
    totals: computeCartTotals(cart),
  };
}
