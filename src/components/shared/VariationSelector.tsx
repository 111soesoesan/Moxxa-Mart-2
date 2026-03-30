"use client";

import { effectiveVariationUnitPrice } from "@/lib/product-pricing";
import { cn } from "@/lib/utils";
import {
  isColorAttributeAxis,
  isLightSwatchFill,
  swatchColorFromAttributeValue,
} from "@/lib/attribute-swatch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

function formatAxisLabel(axis: string) {
  return axis.replace(/_/g, " ");
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
    <div className="space-y-8">
      {axes.map((axis) => {
        const values = uniqueValuesForAxis(variations, axis);
        const colorAxis = isColorAttributeAxis(axis);
        return (
          <div key={axis}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {formatAxisLabel(axis)}
            </p>
            {colorAxis ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  {values.map((val) => {
                    const disabled = isOptionDisabled(axis, val, selected, variations, productTrackInventory);
                    const isOn = selected[axis] === val;
                    const fill = swatchColorFromAttributeValue(val);
                    const light = isLightSwatchFill(fill);
                    return (
                      <Tooltip key={val} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex rounded-full">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => !disabled && onSelect(axis, val)}
                              className={cn(
                                "relative size-9 shrink-0 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                disabled && "cursor-not-allowed opacity-35",
                                !disabled && "cursor-pointer hover:scale-105",
                                isOn
                                  ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                                  : light
                                    ? "border-border"
                                    : "border-transparent"
                              )}
                              style={{ backgroundColor: fill }}
                              aria-label={val}
                              aria-pressed={isOn}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-center">
                          <span className="font-medium">{val}</span>
                          {disabled ? <span className="block text-background/70">Unavailable</span> : null}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                {selected[axis] ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Selected:{" "}
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="cursor-default font-medium text-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {selected[axis]}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-medium">{selected[axis]}</p>
                        <p className="mt-0.5 text-[10px] text-background/75">Currently selected color</p>
                      </TooltipContent>
                    </Tooltip>
                  </p>
                ) : null}
              </>
            ) : (
              <div
                role="group"
                aria-label={formatAxisLabel(axis)}
                className="inline-flex flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/30 p-1"
              >
                {values.map((val) => {
                  const disabled = isOptionDisabled(axis, val, selected, variations, productTrackInventory);
                  const isOn = selected[axis] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && onSelect(axis, val)}
                      className={cn(
                        "min-h-9 rounded-md px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide transition-colors",
                        disabled && "cursor-not-allowed opacity-40",
                        isOn
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      )}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
