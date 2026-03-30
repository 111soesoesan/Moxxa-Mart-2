"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PriceSlider } from "./PriceSlider";
import { CONDITIONS } from "@/lib/constants";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
  maxPrice?: number;
  browseCategories: { slug: string; name: string }[];
}

const SORT_OPTIONS = [
  { value: "newest", label: "Most relevant" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "price-high-low", label: "Price: High to Low" },
] as const;

const CONDITION_FILTER_LABELS: Record<string, string> = {
  new: "Brand new",
  used_like_new: "Like new",
  used_good: "Good",
  used_fair: "Pre-loved",
};

const accordionItemClass =
  "border-0 border-b border-border/10 shadow-none last:border-b-0 data-[state=open]:border-border/10";

const accordionTriggerClass =
  "py-3.5 hover:no-underline text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground";

export function ProductFilters({ maxPrice = 50000, browseCategories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const currentSort = searchParams.get("sort") || "newest";
  const currentMinPrice = parseInt(searchParams.get("minPrice") || "0", 10);
  const currentMaxPrice = parseInt(searchParams.get("maxPrice") || maxPrice.toString(), 10);
  const currentBrowse =
    searchParams.get("browse") || searchParams.get("category") || "";
  const currentConditions = searchParams.getAll("condition");
  const currentInStock = searchParams.get("inStock") === "true";

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice2, setMaxPrice] = useState(currentMaxPrice);
  const [selectedBrowse, setSelectedBrowse] = useState(currentBrowse);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(currentConditions);
  const [inStock, setInStock] = useState(currentInStock);
  const [sort, setSort] = useState(currentSort);

  useEffect(() => {
    setSelectedBrowse(searchParams.get("browse") || searchParams.get("category") || "");
    setMinPrice(parseInt(searchParams.get("minPrice") || "0", 10));
    setMaxPrice(parseInt(searchParams.get("maxPrice") || maxPrice.toString(), 10));
    setSelectedConditions(searchParams.getAll("condition"));
    setInStock(searchParams.get("inStock") === "true");
    setSort(searchParams.get("sort") || "newest");
  }, [searchParams, maxPrice]);

  const handlePriceChange = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  const handleConditionChange = (condition: string, checked: boolean) => {
    if (checked) {
      setSelectedConditions([...selectedConditions, condition]);
    } else {
      setSelectedConditions(selectedConditions.filter((c) => c !== condition));
    }
  };

  const pushParams = useCallback(() => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    if (selectedBrowse) params.set("browse", selectedBrowse);
    if (sort !== "newest") params.set("sort", sort);
    if (minPrice > 0) params.set("minPrice", minPrice.toString());
    if (maxPrice2 < maxPrice) params.set("maxPrice", maxPrice2.toString());
    selectedConditions.forEach((c) => params.append("condition", c));
    if (inStock) params.set("inStock", "true");
    return params;
  }, [
    searchParams,
    selectedBrowse,
    sort,
    minPrice,
    maxPrice2,
    maxPrice,
    selectedConditions,
    inStock,
  ]);

  const applyFilters = useCallback(() => {
    const params = pushParams();
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }, [pushParams, router]);

  const applyAndCloseMobile = useCallback(() => {
    applyFilters();
    setMobileOpen(false);
  }, [applyFilters]);

  const resetFilters = () => {
    setMinPrice(0);
    setMaxPrice(maxPrice);
    setSelectedBrowse("");
    setSelectedConditions([]);
    setInStock(false);
    setSort("newest");

    startTransition(() => {
      const q = searchParams.get("q");
      if (q) {
        router.push(`${pathname}?q=${encodeURIComponent(q)}`);
      } else {
        router.push(pathname);
      }
    });
  };

  const hasActiveFilters =
    selectedBrowse ||
    minPrice > 0 ||
    maxPrice2 < maxPrice ||
    selectedConditions.length > 0 ||
    inStock ||
    sort !== "newest";

  const filterAccordion = (
    <Accordion
      type="multiple"
      defaultValue={["browse", "price"]}
      className="w-full bg-transparent"
    >
      <AccordionItem value="browse" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Browse category</AccordionTrigger>
        <AccordionContent className="pb-4 pt-1 px-0.5">
          <div className="flex flex-col gap-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedBrowse("")}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors",
                !selectedBrowse
                  ? "font-semibold text-primary"
                  : "text-foreground hover:bg-muted/50"
              )}
            >
              <span>All categories</span>
              {!selectedBrowse ? <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
            </button>
            {browseCategories.map((cat) => {
              const active = selectedBrowse === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedBrowse(cat.slug)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    active ? "font-semibold text-primary" : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="truncate pr-2">{cat.name}</span>
                  {active ? <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="price" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Price range</AccordionTrigger>
        <AccordionContent className="pb-8 pt-6 px-4">
          <PriceSlider
            min={0}
            max={maxPrice}
            minPrice={minPrice}
            maxPrice={maxPrice2}
            onChange={handlePriceChange}
            hideLabel
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="condition" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Condition</AccordionTrigger>
        <AccordionContent className="pb-5 pt-1 px-0.5">
          <div className="space-y-3 px-1">
            {CONDITIONS.map((condition) => (
              <div key={condition.value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`condition-${condition.value}`}
                  checked={selectedConditions.includes(condition.value)}
                  onCheckedChange={(checked) =>
                    handleConditionChange(condition.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={`condition-${condition.value}`}
                  className="cursor-pointer text-sm font-normal leading-none"
                >
                  {CONDITION_FILTER_LABELS[condition.value] ?? condition.label}
                </Label>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="availability" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Availability</AccordionTrigger>
        <AccordionContent className="pb-5 pt-1 px-0.5">
          <div className="flex items-center gap-2.5 px-1">
            <Checkbox
              id="in-stock"
              checked={inStock}
              onCheckedChange={(checked) => setInStock(checked as boolean)}
            />
            <Label htmlFor="in-stock" className="cursor-pointer text-sm font-normal">
              In stock only
            </Label>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sort" className={cn(accordionItemClass, "border-b-0")}>
        <AccordionTrigger className={accordionTriggerClass}>Sort by</AccordionTrigger>
        <AccordionContent className="pb-4 pt-1 px-0.5">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 w-full rounded-lg border-0 bg-muted/40 px-3 text-sm outline-none ring-1 ring-border/30 transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const applyButton = (onClick: () => void) => (
    <Button
      onClick={onClick}
      disabled={isPending}
      className="h-10 min-h-10 w-full font-semibold shadow-none"
    >
      {isPending ? "Applying…" : "Apply filters"}
    </Button>
  );

  return (
    <>
      {/* Mobile: sheet (dropdown) */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 min-h-10 w-full border-border/40 bg-background font-semibold shadow-none"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
              Filters
              {hasActiveFilters ? (
                <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                  On
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(100vw-1rem,380px)] flex-col border-0 bg-background p-0 shadow-xl sm:max-w-md"
          >
            <SheetHeader className="border-b border-border/10 px-4 py-4 text-left">
              <div className="flex items-center justify-between gap-2 pr-8">
                <SheetTitle className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Filters
                </SheetTitle>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    disabled={isPending}
                    className="h-8 shrink-0 px-2 text-sm font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">{filterAccordion}</div>
            <div className="border-t border-border/10 bg-background p-4">
              {applyButton(applyAndCloseMobile)}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: full-height, collapsible panel — no box */}
      <div className="hidden min-h-[calc(100dvh-5.5rem)] flex-col lg:flex">
        <button
          type="button"
          onClick={() => setDesktopOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-left transition-colors hover:bg-muted/30"
          aria-expanded={desktopOpen}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Filters
          </span>
          <span className="flex items-center gap-2">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetFilters();
                }}
                disabled={isPending}
                className="h-8 px-2 text-sm font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              >
                Reset
              </Button>
            ) : null}
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                desktopOpen && "rotate-180"
              )}
              aria-hidden
            />
          </span>
        </button>

        {desktopOpen ? (
          <div className="mt-2 flex min-h-0 flex-1 flex-col border-l border-border/15 pl-4">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">{filterAccordion}</div>
            <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-background from-85% to-transparent pt-6 pb-1">
              {applyButton(applyFilters)}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
