"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PriceSlider } from "./PriceSlider";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { Search, X } from "lucide-react";

interface ProductFiltersProps {
  maxPrice?: number;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "price-high-low", label: "Price: High to Low" },
] as const;

export function ProductFilters({ maxPrice = 50000 }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse current filters from URL
  const currentQuery = searchParams.get("q") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentMinPrice = parseInt(searchParams.get("minPrice") || "0");
  const currentMaxPrice = parseInt(searchParams.get("maxPrice") || maxPrice.toString());
  const currentCategory = searchParams.get("category") || "";
  const currentConditions = searchParams.getAll("condition");
  const currentInStock = searchParams.get("inStock") === "true";

  const [search, setSearch] = useState(currentQuery);
  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice2, setMaxPrice] = useState(currentMaxPrice);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(currentConditions);
  const [inStock, setInStock] = useState(currentInStock);
  const [sort, setSort] = useState(currentSort);

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

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set("q", search);
    if (selectedCategory) params.set("category", selectedCategory);
    if (sort !== "newest") params.set("sort", sort);
    if (minPrice > 0) params.set("minPrice", minPrice.toString());
    if (maxPrice2 < maxPrice) params.set("maxPrice", maxPrice2.toString());
    selectedConditions.forEach((c) => params.append("condition", c));
    if (inStock) params.set("inStock", "true");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const resetFilters = () => {
    setSearch("");
    setMinPrice(0);
    setMaxPrice(maxPrice);
    setSelectedCategory("");
    setSelectedConditions([]);
    setInStock(false);
    setSort("newest");

    startTransition(() => {
      router.push("/search");
    });
  };

  const hasActiveFilters =
    search ||
    selectedCategory ||
    minPrice > 0 ||
    maxPrice2 < maxPrice ||
    selectedConditions.length > 0 ||
    inStock ||
    sort !== "newest";

  return (
    <Card className="p-4 h-fit sticky top-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Search</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Category Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Category</Label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full h-8 px-2 text-sm border border-input rounded-lg bg-background"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <Separator />

      {/* Price Filter */}
      <PriceSlider
        min={0}
        max={maxPrice}
        minPrice={minPrice}
        maxPrice={maxPrice2}
        onChange={handlePriceChange}
      />

      <Separator />

      {/* Condition Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Condition</Label>
        <div className="space-y-2">
          {CONDITIONS.map((condition) => (
            <div key={condition.value} className="flex items-center gap-2">
              <Checkbox
                id={`condition-${condition.value}`}
                checked={selectedConditions.includes(condition.value)}
                onCheckedChange={(checked) =>
                  handleConditionChange(condition.value, checked as boolean)
                }
              />
              <Label htmlFor={`condition-${condition.value}`} className="text-sm cursor-pointer">
                {condition.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Stock Filter */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock"
          checked={inStock}
          onCheckedChange={(checked) => setInStock(checked as boolean)}
        />
        <Label htmlFor="in-stock" className="text-sm cursor-pointer">
          In Stock Only
        </Label>
      </div>

      <Separator />

      {/* Sort */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Sort By</Label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full h-8 px-2 text-sm border border-input rounded-lg bg-background"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={applyFilters}
          disabled={isPending}
          className="w-full h-8 text-sm"
        >
          {isPending ? "Applying..." : "Apply Filters"}
        </Button>
        {hasActiveFilters && (
          <Button
            onClick={resetFilters}
            variant="outline"
            disabled={isPending}
            className="w-full h-8 text-sm"
          >
            Reset Filters
          </Button>
        )}
      </div>
    </Card>
  );
}
