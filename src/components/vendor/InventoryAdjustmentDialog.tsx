"use client";

import { useState } from "react";
import { updateInventoryManual } from "@/actions/inventory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, AlertCircle } from "lucide-react";

type InventoryAdjustmentDialogProps = {
  productId: string;
  productName: string;
  currentQuantity: number;
  onSuccess?: () => void;
};

export function InventoryAdjustmentDialog({
  productId,
  productName,
  currentQuantity,
  onSuccess,
}: InventoryAdjustmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState(currentQuantity.toString());
  const [reason, setReason] = useState("restock");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quantityChange = parseInt(newQuantity) - currentQuantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await updateInventoryManual(
        productId,
        parseInt(newQuantity),
        reason,
        notes || undefined
      );

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        onSuccess?.();
      }
    } catch (err) {
      setError("Failed to update inventory");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="h-4 w-4 mr-2" />
          Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Inventory</DialogTitle>
          <DialogDescription>Update stock quantity for {productName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Quantity Display */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Current Stock</p>
            <p className="text-2xl font-bold">{currentQuantity}</p>
          </div>

          {/* New Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">New Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="text-lg"
            />
            {quantityChange !== 0 && (
              <p
                className={`text-sm ${
                  quantityChange > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {quantityChange > 0 ? "+" : ""}{quantityChange} items
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="damage">Damage/Loss</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
                <SelectItem value="return">Return from Customer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any details about this adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button disabled={loading}>
              {loading ? "Updating..." : "Update Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
