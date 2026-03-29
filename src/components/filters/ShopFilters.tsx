"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";

type ShopFiltersProps = {
  browseCategories: { slug: string; name: string }[];
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "products-high-low", label: "Most Products" },
  { value: "alphabetical", label: "A-Z" },
] as const;

export function ShopFilters({ browseCategories }: ShopFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse current filters from URL
  const currentQuery = searchParams.get("q") || "";
  const currentLocation = searchParams.get("location") || "";
  const currentBrowse = searchParams.get("browse") || "";
  const currentSort = searchParams.get("sort") || "newest";

  const [search, setSearch] = useState(currentQuery);
  const [location, setLocation] = useState(currentLocation);
  const [browse, setBrowse] = useState(currentBrowse);
  const [sort, setSort] = useState(currentSort);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setLocation(searchParams.get("location") || "");
    setBrowse(searchParams.get("browse") || "");
    setSort(searchParams.get("sort") || "newest");
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set("q", search);
    if (location) params.set("location", location);
    if (browse) params.set("browse", browse);
    if (sort !== "newest") params.set("sort", sort);

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const resetFilters = () => {
    setSearch("");
    setLocation("");
    setBrowse("");
    setSort("newest");

    startTransition(() => {
      router.push("/shops");
    });
  };

  const hasActiveFilters = search || location || browse || sort !== "newest";

  return (
    <Card className="p-4 h-fit sticky top-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Search Shops</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Shop name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Browse category</Label>
        <select
          value={browse}
          onChange={(e) => setBrowse(e.target.value)}
          className="w-full h-8 px-2 text-sm border border-input rounded-lg bg-background"
        >
          <option value="">All categories</option>
          {browseCategories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Location</Label>
        <Input
          placeholder="City or region..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-8 text-sm"
        />
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
