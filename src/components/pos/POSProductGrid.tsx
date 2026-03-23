"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, ShoppingCart, Package } from "lucide-react";
import type { POSProduct, POSProductVariation } from "@/actions/pos";

type Props = {
  products: POSProduct[];
  onAddItem: (
    product: POSProduct,
    variation?: POSProductVariation | null
  ) => void;
};

function StockBadge({ product }: { product: POSProduct }) {
  if (!product.track_inventory) return null;
  if (product.available_stock === 0) {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Out of stock</Badge>;
  }
  if (product.available_stock <= 5) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-600">
        {product.available_stock} left
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
      {product.available_stock} in stock
    </Badge>
  );
}

function VariationDialog({
  product,
  onSelect,
  onClose,
}: {
  product: POSProduct | null;
  onSelect: (product: POSProduct, variation: POSProductVariation) => void;
  onClose: () => void;
}) {
  if (!product) return null;
  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">{product.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">Select a variation:</p>
        <div className="space-y-2">
          {product.variations.map((v) => {
            const varLabel = v.attribute_combination
              ? Object.values(v.attribute_combination).join(" / ")
              : "Default";
            const price = v.sale_price ?? v.price;
            const available = Math.max(0, v.stock_quantity - v.reserved_quantity);
            const outOfStock = v.track_inventory && available === 0;

            return (
              <button
                key={v.id}
                disabled={outOfStock}
                onClick={() => {
                  onSelect(product, v);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all",
                  outOfStock
                    ? "opacity-50 cursor-not-allowed bg-muted"
                    : "hover:border-primary hover:bg-primary/5 cursor-pointer"
                )}
              >
                <div className="text-left">
                  <p className="font-medium">{varLabel}</p>
                  {v.track_inventory && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {outOfStock ? "Out of stock" : `${available} available`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {v.sale_price && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(v.price)}
                    </p>
                  )}
                  <p className={cn("font-semibold", v.sale_price ? "text-red-600" : "")}>
                    {formatCurrency(price)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function POSProductGrid({ products, onAddItem }: Props) {
  const [search, setSearch] = useState("");
  const [variationProduct, setVariationProduct] = useState<POSProduct | null>(null);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q)
    );
  });

  const handleProductClick = (product: POSProduct) => {
    if (product.product_type === "variable") {
      if (product.variations.length === 1) {
        onAddItem(product, product.variations[0]);
      } else {
        setVariationProduct(product);
      }
    } else {
      if (product.track_inventory && product.available_stock === 0) return;
      onAddItem(product, null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Search bar */}
      <div className="px-3 py-2.5 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search products by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Product grid */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `No products matching "${search}"` : "No products in this category"}
            </p>
          </div>
        ) : (
          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
            {filtered.map((product) => {
              const outOfStock =
                product.track_inventory && product.available_stock === 0 &&
                product.product_type !== "variable";
              const hasSale = product.sale_price !== null && product.sale_price < product.price;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={outOfStock}
                  className={cn(
                    "group relative flex flex-col rounded-xl border bg-card text-left overflow-hidden transition-all",
                    outOfStock
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95"
                  )}
                >
                  {/* Image */}
                  <div className="relative aspect-square w-full bg-muted overflow-hidden">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {hasSale && (
                      <div className="absolute top-1.5 left-1.5">
                        <Badge className="text-[9px] px-1 py-0 bg-red-500 hover:bg-red-500">SALE</Badge>
                      </div>
                    )}
                    {product.product_type === "variable" && (
                      <div className="absolute top-1.5 right-1.5">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">Options</Badge>
                      </div>
                    )}
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center bg-primary/80 opacity-0 transition-opacity",
                      !outOfStock && "group-hover:opacity-100"
                    )}>
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col gap-1">
                    <p className="text-xs font-medium leading-tight line-clamp-2">{product.name}</p>
                    {product.sku && (
                      <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                    )}
                    <div className="flex items-center justify-between gap-1 mt-auto pt-0.5">
                      <div>
                        {hasSale && (
                          <p className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(product.price)}
                          </p>
                        )}
                        <p className={cn(
                          "text-sm font-semibold",
                          hasSale ? "text-red-600" : ""
                        )}>
                          {formatCurrency(product.effective_price)}
                        </p>
                      </div>
                      <StockBadge product={product} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <VariationDialog
        product={variationProduct}
        onSelect={onAddItem}
        onClose={() => setVariationProduct(null)}
      />
    </div>
  );
}
