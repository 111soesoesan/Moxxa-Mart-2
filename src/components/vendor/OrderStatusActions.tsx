"use client";

import { useTransition } from "react";
import { updateOrderStatus, markOrderPaid, confirmCODOrder, markCODPaid } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  paymentProofUrl: string | null;
  paymentMethodType?: string | null;
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped:    ["delivered", "cancelled"],
  delivered:  [],
  cancelled:  [],
};

export function OrderStatusActions({
  orderId,
  paymentStatus,
  orderStatus,
  paymentProofUrl,
  paymentMethodType,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string; success?: boolean }>) =>
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast.error(result.error);
      else router.refresh();
    });

  const isCash = paymentMethodType === "cash";
  const nextStatuses = NEXT_STATUSES[orderStatus] ?? [];
  const isTerminal = orderStatus === "delivered" || orderStatus === "cancelled";

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Bank transfer: verify payment proof */}
      {!isCash && paymentStatus === "pending_verification" && (
        <Button
          size="sm"
          onClick={() => run(() => markOrderPaid(orderId))}
          disabled={isPending}
          className="h-7 text-xs bg-green-600 hover:bg-green-700"
        >
          ✓ Mark Paid
        </Button>
      )}

      {/* COD: confirm order (no payment proof needed) */}
      {isCash && orderStatus === "pending" && (
        <Button
          size="sm"
          onClick={() => run(() => confirmCODOrder(orderId))}
          disabled={isPending}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
        >
          ✓ Confirm Order
        </Button>
      )}

      {/* COD: mark cash collected */}
      {isCash && orderStatus !== "pending" && orderStatus !== "cancelled" && paymentStatus !== "paid" && (
        <Button
          size="sm"
          onClick={() => run(() => markCODPaid(orderId))}
          disabled={isPending}
          variant="outline"
          className="h-7 text-xs"
        >
          💵 Cash Collected
        </Button>
      )}

      {/* Status progression (available for bank if paid, or COD any non-terminal) */}
      {!isTerminal && nextStatuses.length > 0 && (paymentStatus === "paid" || isCash) && orderStatus !== "pending" && (
        <Select
          onValueChange={(s) => run(() => updateOrderStatus(orderId, s))}
          disabled={isPending}
        >
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue placeholder="Update status" />
          </SelectTrigger>
          <SelectContent>
            {nextStatuses.map((s) => (
              <SelectItem key={s} value={s} className="text-xs capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {paymentProofUrl && (
        <a
          href={paymentProofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline"
        >
          View Proof
        </a>
      )}
    </div>
  );
}
