"use client";

import { useState, useTransition } from "react";
import { approveShop, rejectShop } from "@/actions/shops";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  shopId: string;
  shopName: string;
};

export function ShopApprovalActions({ shopId, shopName }: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveShop(shopId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`${shopName} approved and is now active.`);
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    startTransition(async () => {
      const result = await rejectShop(shopId, rejectReason.trim());
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`${shopName} has been rejected.`);
        setRejectOpen(false);
        setRejectReason("");
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />Reject
        </Button>
      </div>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!open) { setRejectOpen(false); setRejectReason(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {shopName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for rejection (sent to vendor)</Label>
            <Textarea
              placeholder="e.g. Please upload a clearer shop logo. Your product descriptions need more detail."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectOpen(false); setRejectReason(""); }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              Reject Shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
