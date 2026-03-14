"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { submitBillingProof } from "@/actions/admin";
import { uploadBillingProof } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { toast } from "sonner";
import { Upload, CreditCard } from "lucide-react";

const schema = z.object({
  amount: z.coerce.number().min(1, "Amount must be at least ₱1"),
});

type BillingSchema = z.infer<typeof schema>;

export default function BillingPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [isPending, startTransition] = useTransition();
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);

  const form = useForm<BillingSchema>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0 },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;

  const loadShopId = async () => {
    if (shopId) return shopId;
    const { getMyShops } = await import("@/actions/shops");
    const shops = await getMyShops();
    const shop = shops.find((s) => s.slug === shopSlug);
    const id = shop?.id ?? null;
    setShopId(id);
    return id;
  };

  const onSubmit = (values: BillingSchema) => {
    if (!screenshotFile) {
      setScreenshotError("Please select a payment screenshot.");
      return;
    }
    setScreenshotError(null);

    startTransition(async () => {
      const id = await loadShopId();
      if (!id) { form.setError("root", { message: "Shop not found" }); return; }

      try {
        const url = await uploadBillingProof(screenshotFile, id);
        const result = await submitBillingProof(id, values.amount, url);
        if (result.error) { form.setError("root", { message: result.error }); return; }
        toast.success("Billing proof submitted! Admin will verify within 24 hours.");
        form.reset({ amount: 0 });
        setScreenshotFile(null);
      } catch {
        form.setError("root", { message: "Upload failed. Please try again." });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-xl font-bold mb-2">Billing & Subscription</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Submit your subscription payment proof for admin verification. Once verified, your shop
        subscription will be extended.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />Payment Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Send your payment to the following account:</p>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm">
            <p>GCash: 09XX XXX XXXX (Admin)</p>
            <p>BDO: 0000-0000-0000 (Platform Name)</p>
          </div>
          <p>
            Monthly subscription:{" "}
            <strong className="text-foreground">₱299/month</strong>
          </p>
          <p>After payment, upload your screenshot below.</p>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {rootError && <Alert variant="destructive">{rootError}</Alert>}

        <Field error={errors.amount?.message}>
          <FieldLabel required>Amount Paid (₱)</FieldLabel>
          <FieldControl>
            <Input
              type="number"
              step="0.01"
              min="1"
              placeholder="299.00"
              {...form.register("amount")}
            />
          </FieldControl>
          <FieldDescription>Enter the exact amount you sent.</FieldDescription>
          <FieldError />
        </Field>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium leading-none">
            Payment Screenshot <span className="text-destructive ml-0.5" aria-hidden>*</span>
          </label>
          <label className="block">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                screenshotError ? "border-destructive" : "hover:border-primary"
              }`}
            >
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
              onChange={(e) => {
                setScreenshotFile(e.target.files?.[0] ?? null);
                setScreenshotError(null);
              }}
            />
          </label>
          {screenshotError && (
            <p role="alert" className="text-sm font-medium text-destructive">{screenshotError}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit Payment Proof"}
        </Button>
      </form>
    </div>
  );
}
