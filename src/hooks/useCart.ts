"use client";

import { useState, useCallback } from "react";
import { deriveCartShopId } from "@/lib/cart-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CartItem = {
  product_id: string;
  shop_id: string;
  /** Display / grouping (optional for carts saved before multi-vendor) */
  shop_name?: string;
  shop_slug?: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  /** Selected SKU row when product_type is variable */
  variation_id?: string | null;
  /** Selected variant data (e.g. { size: "M", color: "red" }) */
  variant?: Record<string, string>;
};

export type Cart = {
  items: CartItem[];
  shop_id: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CART_KEY = "moxxa_cart";

const EMPTY_CART: Cart = { items: [], shop_id: null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readCart(): Cart {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as Cart;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return { items, shop_id: deriveCartShopId(items) };
  } catch {
    return EMPTY_CART;
  }
}

function saveCart(cart: Cart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/** Stable React key / identity for a cart line */
export function cartLineKey(item: Pick<CartItem, "product_id" | "variation_id" | "variant">): string {
  const vid = item.variation_id != null && item.variation_id !== "" ? item.variation_id : "";
  const variantStr = item.variant ? JSON.stringify(item.variant) : "";
  return `${item.product_id}::${vid}::${variantStr}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCart() {
  // Initialize from localStorage once on mount via initializer to avoid
  // calling setState synchronously inside an effect (lint rule).
  const [cart, setCart] = useState<Cart>(() => readCart());

  const persist = useCallback((next: Cart) => {
    setCart(next);
    saveCart(next);
  }, []);

  /** Add a product to the cart (multi-vendor: lines from different shops coexist). */
  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      const key = cartLineKey(item);
      const existing = prev.items.find((i) => cartLineKey(i) === key);

      const nextItems = existing
        ? prev.items.map((i) =>
            cartLineKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        : [...prev.items, item];

      const next: Cart = {
        shop_id: deriveCartShopId(nextItems),
        items: nextItems,
      };

      saveCart(next);
      return next;
    });
  }, []);

  /** Update the quantity of an item (removes if qty <= 0). */
  const updateQuantity = useCallback(
    (
      productId: string,
      quantity: number,
      opts?: { variant?: Record<string, string>; variation_id?: string | null }
    ) => {
      setCart((prev) => {
        const key = cartLineKey({
          product_id: productId,
          variant: opts?.variant,
          variation_id: opts?.variation_id,
        });

        const nextItems =
          quantity <= 0
            ? prev.items.filter((i) => cartLineKey(i) !== key)
            : prev.items.map((i) => (cartLineKey(i) === key ? { ...i, quantity } : i));

        const next: Cart = {
          ...prev,
          items: nextItems,
          shop_id: deriveCartShopId(nextItems),
        };

        saveCart(next);
        return next;
      });
    },
    []
  );

  /** Remove an item entirely. */
  const removeItem = useCallback(
    (productId: string, opts?: { variant?: Record<string, string>; variation_id?: string | null }) => {
      updateQuantity(productId, 0, opts);
    },
    [updateQuantity]
  );

  /** Clear the entire cart. */
  const clearCart = useCallback(() => {
    persist(EMPTY_CART);
  }, [persist]);

  // ─── Derived values ──────────────────────────────────────────────────────

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = cart.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  /** Build the items_snapshot payload ready to insert into the orders table. */
  const toOrderSnapshot = (): Cart["items"] => cart.items;

  return {
    cart,
    itemCount,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    toOrderSnapshot,
  };
}
