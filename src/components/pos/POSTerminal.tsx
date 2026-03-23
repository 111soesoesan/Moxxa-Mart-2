"use client";

import { useState, useMemo } from "react";
import { usePOSCart } from "./usePOSCart";
import { POSCategoryFilter } from "./POSCategoryFilter";
import { POSProductGrid } from "./POSProductGrid";
import { POSCartPanel } from "./POSCartPanel";
import { POSCustomerSearch } from "./POSCustomerSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, ShoppingCart } from "lucide-react";
import type { POSProduct, POSProductVariation } from "@/actions/pos";
import type { Category } from "@/actions/categories";
import { toast } from "sonner";

type PaymentMethod = { id: string; name: string; type: string };

type Props = {
  shopId: string;
  shopSlug: string;
  products: POSProduct[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
};

export function POSTerminal({
  shopId,
  shopSlug: _shopSlug,
  products,
  categories,
  paymentMethods,
}: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

  const {
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
  } = usePOSCart(shopId);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return products;
    return products.filter((p) => p.category_ids.includes(selectedCategoryId));
  }, [products, selectedCategoryId]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of products) {
      for (const catId of product.category_ids) {
        counts[catId] = (counts[catId] ?? 0) + 1;
      }
    }
    return counts;
  }, [products]);

  const handleAddItem = (product: POSProduct, variation?: POSProductVariation | null) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        effective_price: product.effective_price,
        image_url: product.image_url,
        track_inventory: product.track_inventory,
        available_stock: product.available_stock,
      },
      variation
    );
    if (mobileTab === "products") {
      toast.success(`Added ${product.name}`, { duration: 1200 });
    }
  };

  const handleOrderComplete = () => {
    clearCart();
    toast.success("Order processed!", { description: "Cart has been cleared." });
  };

  const cartItemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col h-[calc(100svh-4rem)] overflow-hidden">
      {/* ── Desktop: three-pane layout ──────────────────────────── */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <POSCategoryFilter
          categories={categories}
          selectedId={selectedCategoryId}
          counts={categoryCounts}
          onSelect={setSelectedCategoryId}
        />

        <POSProductGrid
          products={filteredProducts}
          onAddItem={handleAddItem}
        />

        <POSCartPanel
          cart={cart}
          suspendedCarts={suspendedCarts}
          shopId={shopId}
          paymentMethods={paymentMethods}
          onOpenCustomerSearch={() => setShowCustomerSearch(true)}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onUpdateItemDiscount={updateItemDiscount}
          onSetGlobalDiscount={setGlobalDiscount}
          onSetNote={setNote}
          onSetPaymentMethodId={setPaymentMethodId}
          onSetPaymentStatus={setPaymentStatus}
          onSuspend={suspendCart}
          onResume={resumeCart}
          onDeleteSuspended={deleteSuspendedCart}
          onClear={clearCart}
          onOrderComplete={handleOrderComplete}
        />
      </div>

      {/* ── Mobile: tabs layout ─────────────────────────────────── */}
      <div className="flex md:hidden flex-col h-full overflow-hidden">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as "products" | "cart")}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="mx-3 mt-2 mb-0 shrink-0">
            <TabsTrigger value="products" className="flex-1 gap-1.5">
              <Grid3X3 className="h-3.5 w-3.5" />Products
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex-1 gap-1.5 relative">
              <ShoppingCart className="h-3.5 w-3.5" />Cart
              {cartItemCount > 0 && (
                <Badge className="h-4 min-w-[16px] px-1 text-[10px] absolute -top-1 -right-1">
                  {cartItemCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden">
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <POSCategoryFilter
                categories={categories}
                selectedId={selectedCategoryId}
                counts={categoryCounts}
                onSelect={setSelectedCategoryId}
              />
              <POSProductGrid
                products={filteredProducts}
                onAddItem={handleAddItem}
              />
            </div>
          </TabsContent>

          <TabsContent value="cart" className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <POSCartPanel
                cart={cart}
                suspendedCarts={suspendedCarts}
                shopId={shopId}
                paymentMethods={paymentMethods}
                onOpenCustomerSearch={() => setShowCustomerSearch(true)}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onUpdateItemDiscount={updateItemDiscount}
                onSetGlobalDiscount={setGlobalDiscount}
                onSetNote={setNote}
                onSetPaymentMethodId={setPaymentMethodId}
                onSetPaymentStatus={setPaymentStatus}
                onSuspend={suspendCart}
                onResume={resumeCart}
                onDeleteSuspended={deleteSuspendedCart}
                onClear={clearCart}
                onOrderComplete={handleOrderComplete}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Customer search modal */}
      <POSCustomerSearch
        open={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        shopId={shopId}
        onSelect={(customer) => setCustomer(customer)}
      />
    </div>
  );
}
