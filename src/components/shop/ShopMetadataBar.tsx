import { cn } from "@/lib/utils";

type Props = {
  location?: string | null;
  establishedLabel: string;
  curatedBy?: string | null;
  className?: string;
};

function cell(label: string, value: string) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4 md:py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

/**
 * Shop facts we can back with real data (no placeholder “ships from” without a dedicated field).
 */
export function ShopMetadataBar({ location, establishedLabel, curatedBy, className }: Props) {
  const loc = location?.trim() || "—";
  const curator = curatedBy?.trim() || "—";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/30 text-left shadow-sm",
        className
      )}
    >
      <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {cell("Location", loc)}
        {cell("Established", establishedLabel)}
        {cell("Curation", curator)}
      </div>
    </div>
  );
}
