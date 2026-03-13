"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { getMyShops, updateShop, requestInspection } from "@/actions/shops";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";

type Shop = Awaited<ReturnType<typeof getMyShops>>[number];

export default function ShopSettingsPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allowGuest, setAllowGuest] = useState(true);
  const [paymentBank, setPaymentBank] = useState("");
  const [paymentWallet, setPaymentWallet] = useState("");

  useEffect(() => {
    getMyShops().then((shops) => {
      const s = shops.find((s) => s.slug === shopSlug);
      if (s) {
        setShop(s);
        setAllowGuest(s.allow_guest_purchase);
        const pi = s.payment_info as Record<string, string> | null;
        if (pi) {
          setPaymentBank(pi["Bank Transfer"] ?? "");
          setPaymentWallet(pi["Mobile Wallet"] ?? "");
        }
      }
      setLoading(false);
    });
  }, [shopSlug]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shop) return;
    const fd = new FormData(e.currentTarget);
    const paymentInfo: Record<string, string> = {};
    if (paymentBank) paymentInfo["Bank Transfer"] = paymentBank;
    if (paymentWallet) paymentInfo["Mobile Wallet"] = paymentWallet;

    startTransition(async () => {
      const result = await updateShop(shop.id, {
        name: fd.get("name") as string,
        description: fd.get("description") as string,
        phone: fd.get("phone") as string,
        location: fd.get("location") as string,
        delivery_policy: fd.get("delivery_policy") as string,
        allow_guest_purchase: allowGuest,
        payment_info: paymentInfo,
      });
      if (result.error) { setError(result.error); return; }
      toast.success("Settings saved.");
    });
  };

  const handleReInspection = () => {
    if (!shop) return;
    startTransition(async () => {
      const result = await requestInspection(shop.id);
      if (result.error) toast.error(result.error);
      else toast.success("Inspection requested!");
    });
  };

  if (loading) return <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4"><Skeleton className="h-48 w-full" /></div>;
  if (!shop) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-xl font-bold mb-6">Shop Settings</h1>

      {shop.status === "rejected" && (
        <Alert variant="destructive" className="mb-6">
          <p className="font-medium">Shop Rejected: {shop.rejection_reason}</p>
          <Button size="sm" className="mt-2" onClick={handleReInspection} disabled={isPending}>
            <ClipboardCheck className="mr-2 h-4 w-4" />Re-submit for Inspection
          </Button>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

        <Card>
          <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Shop Name</Label>
              <Input name="name" defaultValue={shop.name} required />
            </div>
            <div className="space-y-1.5">
              <Label>About</Label>
              <Textarea name="description" defaultValue={shop.description ?? ""} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact & Fulfillment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input name="phone" type="tel" defaultValue={shop.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input name="location" defaultValue={shop.location ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery & Refund Policy</Label>
              <Textarea name="delivery_policy" defaultValue={shop.delivery_policy ?? ""} rows={4} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bank Account Number</Label>
              <Input value={paymentBank} onChange={(e) => setPaymentBank(e.target.value)} placeholder="Bank name + Account number" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Wallet (GCash / Maya)</Label>
              <Input value={paymentWallet} onChange={(e) => setPaymentWallet(e.target.value)} placeholder="09XX XXX XXXX" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Allow Guest Checkout</p>
                <p className="text-xs text-muted-foreground">Let customers buy without an account</p>
              </div>
              <Switch checked={allowGuest} onCheckedChange={setAllowGuest} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
