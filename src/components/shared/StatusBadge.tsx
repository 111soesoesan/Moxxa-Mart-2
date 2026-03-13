import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SHOP_STATUSES,
  BILLING_PROOF_STATUSES,
  CONDITIONS,
} from "@/lib/constants";

type StatusType = "order" | "payment" | "shop" | "billing" | "condition";

const maps: Record<StatusType, { value: string; label: string; color: string }[]> = {
  order: ORDER_STATUSES as unknown as { value: string; label: string; color: string }[],
  payment: PAYMENT_STATUSES as unknown as { value: string; label: string; color: string }[],
  shop: SHOP_STATUSES as unknown as { value: string; label: string; color: string }[],
  billing: BILLING_PROOF_STATUSES as unknown as { value: string; label: string; color: string }[],
  condition: CONDITIONS.map((c) => ({ value: c.value, label: c.label, color: "bg-blue-100 text-blue-800" })),
};

export function StatusBadge({ type, value }: { type: StatusType; value: string }) {
  const entry = maps[type]?.find((s) => s.value === value);
  if (!entry) return <Badge variant="outline">{value}</Badge>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", entry.color)}>
      {entry.label}
    </span>
  );
}
