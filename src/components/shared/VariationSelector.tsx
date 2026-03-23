"use client";

import { effectiveVariationUnitPrice } from "@/lib/product-pricing";
import { Button } from "@/components/ui/button";

export type PDPVariation = {
  id: string;
  attribute_combination: Record<string, string>;
  price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  /** Sellable units after reservations (from inventory embed); falls back to stock_quantity. */
  available_quantity?: number;
  image_url: string | null;
  is_active: boolean;
  track_inventory?: boolean | null;
};

export function variationAttributeAxes(variations: PDPVariation[]): string[] {
  const s = new Set<string>();
  for (const v of variations) {
    Object.keys(v.attribute_combination ?? {}).forEach((k) => s.add(k));
  }
  return Array.from(s).sort();
}

export function variationIsPurchasable(v: PDPVariation | null, productTrackInventory: boolean): v is PDPVariation {
  if (!v) return false;
  if (!v.is_active) return false;
  const enforceStock = productTrackInventory && v.track_inventory !== false;
  const avail = v.available_quantity ?? v.stock_quantity;
  if (enforceStock && avail <= 0) return false;
  return true;
}

function matchesPartial(combo: Record<string, string>, partial: Record<string, string>) {
  return Object.entries(partial).every(([k, val]) => combo[k] === val);
}

export function findMatchingVariation(
  variations: PDPVariation[],
  axes: string[],
  selected: Record<string, string>
): PDPVariation | null {
  if (!axes.length || axes.some((a) => !selected[a])) return null;
  return (
    variations.find((v) => axes.every((a) => v.attribute_combination[a] === selected[a])) ?? null
  );
}

export function isOptionDisabled(
  axis: string,
  value: string,
  selected: Record<string, string>,
  variations: PDPVariation[],
  productTrackInventory: boolean
) {
  const partial = { ...selected, [axis]: value };
  return !variations.some(
    (v) => variationIsPurchasable(v, productTrackInventory) && matchesPartial(v.attribute_combination, partial)
  );
}

export function uniqueValuesForAxis(variations: PDPVariation[], axis: string): string[] {
  const vals = new Set<string>();
  for (const v of variations) {
    const x = v.attribute_combination?.[axis];
    if (x) vals.add(x);
  }
  return Array.from(vals).sort();
}

export function minSellablePrice(variations: PDPVariation[], productTrackInventory: boolean): number {
  const sellable = variations.filter((v) => variationIsPurchasable(v, productTrackInventory));
  if (!sellable.length) return 0;
  return Math.min(...sellable.map((v) => effectiveVariationUnitPrice(v)));
}

type VariationSelectorProps = {
  variations: PDPVariation[];
  productTrackInventory: boolean;
  axes: string[];
  selected: Record<string, string>;
  onSelect: (axis: string, value: string) => void;
};

export function VariationSelector({
  variations,
  productTrackInventory,
  axes,
  selected,
  onSelect,
}: VariationSelectorProps) {
  return (
    <div className="space-y-4">
      {axes.map((axis) => {
        const values = uniqueValuesForAxis(variations, axis);
        return (
          <div key={axis}>
            <p className="text-sm font-medium mb-2">{axis}</p>
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const disabled = isOptionDisabled(axis, val, selected, variations, productTrackInventory);
                const isOn = selected[axis] === val;
                return (
                  <Button
                    key={val}
                    type="button"
                    variant={isOn ? "default" : "outline"}
                    size="sm"
                    disabled={disabled}
                    className="rounded-full"
                    onClick={() => onSelect(axis, val)}
                  >
                    {val}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
