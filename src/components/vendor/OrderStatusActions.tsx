"use client";

import { useTransition } from "react";
import { updateOrderStatus, markOrderPaid } from "@/actions/orders";
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
};

export function OrderStatusActions({ orderId, paymentStatus, orderStatus, paymentProofUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkPaid = () => {
    startTransition(async () => {
      const result = await markOrderPaid(orderId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Order marked as paid.");
        router.refresh();
      }
    });
  };

  const handleStatusUpdate = (status: string) => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Order status updated to ${status}.`);
        router.refresh();
      }
    });
  };

  const canUpdateStatus =
    paymentStatus === "paid" &&
    orderStatus !== "delivered" &&
    orderStatus !== "cancelled";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {paymentStatus === "pending_verification" && (
        <Button
          size="sm"
          onClick={handleMarkPaid}
          disabled={isPending}
          className="h-7 text-xs bg-green-600 hover:bg-green-700"
        >
          ✓ Mark Paid
        </Button>
      )}

      {canUpdateStatus && (
        <Select onValueChange={handleStatusUpdate} disabled={isPending}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue placeholder="Update status" />
          </SelectTrigger>
          <SelectContent>
            {["processing", "shipped", "delivered", "cancelled"].map((s) => (
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
