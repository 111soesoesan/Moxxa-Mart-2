"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { submitBillingProof } from "@/actions/admin";
import { uploadBillingProof } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, CreditCard } from "lucide-react";

export default function BillingPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);

  const loadShopId = async () => {
    if (shopId) return shopId;
    const { getMyShops } = await import("@/actions/shops");
    const shops = await getMyShops();
    const shop = shops.find((s) => s.slug === shopSlug);
    const id = shop?.id ?? null;
    setShopId(id);
    return id;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!screenshotFile) { setError("Please select a payment screenshot."); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    setError(null);

    startTransition(async () => {
      const id = await loadShopId();
      if (!id) { setError("Shop not found"); return; }

      try {
        const url = await uploadBillingProof(screenshotFile, id);
        const result = await submitBillingProof(id, parseFloat(amount), url);
        if (result.error) { setError(result.error); return; }
        toast.success("Billing proof submitted! Admin will verify within 24 hours.");
        setAmount("");
        setScreenshotFile(null);
      } catch {
        setError("Upload failed. Please try again.");
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-xl font-bold mb-2">Billing & Subscription</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Submit your subscription payment proof for admin verification. Once verified, your shop subscription will be extended.
      </p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment Instructions</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Send your payment to the following account:</p>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm">
            <p>GCash: 09XX XXX XXXX (Admin)</p>
            <p>BDO: 0000-0000-0000 (Platform Name)</p>
          </div>
          <p>Monthly subscription: <strong className="text-foreground">₱299/month</strong></p>
          <p>After payment, upload your screenshot below.</p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount Paid (₱) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="299.00"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Payment Screenshot *</Label>
          <label className="block">
            <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {screenshotFile ? (
                <p className="text-sm font-medium">{screenshotFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit Payment Proof"}
        </Button>
      </form>
    </div>
  );
}
