"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type ShopFiltersProps = {
  browseCategories: { slug: string; name: string }[];
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "products-high-low", label: "Most products" },
  { value: "alphabetical", label: "A–Z" },
] as const;

const accordionItemClass =
  "border-0 border-b border-border/10 shadow-none last:border-b-0 data-[state=open]:border-border/10";

const accordionTriggerClass =
  "py-3.5 hover:no-underline text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground";

export function ShopFilters({ browseCategories }: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);

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

  const pushParams = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (location.trim()) params.set("location", location.trim());
    if (browse) params.set("browse", browse);
    if (sort !== "newest") params.set("sort", sort);
    return params;
  }, [search, location, browse, sort]);

  const applyFilters = useCallback(() => {
    const params = pushParams();
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [pushParams, pathname, router]);

  const applyAndCloseMobile = useCallback(() => {
    applyFilters();
    setMobileOpen(false);
  }, [applyFilters]);

  const resetFilters = () => {
    setSearch("");
    setLocation("");
    setBrowse("");
    setSort("newest");
    startTransition(() => {
      router.push("/shops");
    });
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(location.trim()) ||
    Boolean(browse) ||
    sort !== "newest";

  const filterAccordion = (
    <Accordion
      type="multiple"
      defaultValue={["search", "browse", "location"]}
      className="w-full bg-transparent"
    >
      <AccordionItem value="search" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Search shops</AccordionTrigger>
        <AccordionContent className="pb-4 pt-1 px-0.5">
          <div className="relative px-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Shop name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-lg border-0 bg-muted/40 pl-9 text-sm outline-none ring-1 ring-border/30 transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Search shops by name"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="browse" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Browse category</AccordionTrigger>
        <AccordionContent className="pb-4 pt-1 px-0.5">
          <div className="flex flex-col gap-1 px-1">
            <button
              type="button"
              onClick={() => setBrowse("")}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors",
                !browse ? "font-semibold text-primary" : "text-foreground hover:bg-muted/50"
              )}
            >
              <span>All categories</span>
              {!browse ? <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden /> : null}
            </button>
            {browseCategories.map((cat) => {
              const active = browse === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setBrowse(cat.slug)}
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

      <AccordionItem value="location" className={accordionItemClass}>
        <AccordionTrigger className={accordionTriggerClass}>Location</AccordionTrigger>
        <AccordionContent className="pb-4 pt-1 px-0.5">
          <div className="px-1">
            <Input
              placeholder="City or region…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-10 rounded-lg border-0 bg-muted/40 text-sm outline-none ring-1 ring-border/30 transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Filter by location"
            />
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
            aria-label="Sort shops"
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
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="h-10 min-h-10 w-full font-semibold shadow-none"
    >
      {isPending ? "Applying…" : "Apply filters"}
    </Button>
  );

  return (
    <>
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
            <div className="border-t border-border/10 bg-background p-4">{applyButton(applyAndCloseMobile)}</div>
          </SheetContent>
        </Sheet>
      </div>

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
