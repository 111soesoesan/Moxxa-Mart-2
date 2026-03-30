"use client";

import * as React from "react";
import { Check, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export type OrderFacetedOption = {
  label: string;
  value: string;
};

type OrderListFacetedFilterProps = {
  title: string;
  options: OrderFacetedOption[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  counts?: Record<string, number>;
};

export function OrderListFacetedFilter({
  title,
  options,
  selected,
  onSelectedChange,
  counts,
}: OrderListFacetedFilterProps) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const toggle = (value: string) => {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onSelectedChange(Array.from(next));
  };

  const clear = () => onSelectedChange([]);

  const summary =
    selected.length === 0
      ? null
      : selected.length > 2
        ? `${selected.length} selected`
        : options
            .filter((o) => selectedSet.has(o.value))
            .map((o) => o.label)
            .join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed px-2.5 text-muted-foreground",
            selected.length > 0 && "border-primary/40 text-foreground"
          )}
        >
          <PlusCircle className="mr-1.5 size-4 shrink-0 opacity-70" />
          {title}
          {selected.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1.5 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selected.length}
              </Badge>
              <span className="hidden max-w-[10rem] truncate text-xs font-normal lg:inline">{summary}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="h-9" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value);
                const count = counts?.[option.value];
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    keywords={[option.value, option.label]}
                    onSelect={() => toggle(option.value)}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary/40",
                        isSelected && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      <Check className={cn("size-3", !isSelected && "opacity-0")} />
                    </span>
                    <span className="truncate">{option.label}</span>
                    {count != null && count > 0 && (
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={clear} className="justify-center text-center">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
