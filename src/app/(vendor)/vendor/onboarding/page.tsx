"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShop } from "@/actions/shops";
import { uploadShopLogo, uploadShopCover } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { useRef } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [allowGuest, setAllowGuest] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [paymentBank, setPaymentBank] = useState("");
  const [paymentWallet, setPaymentWallet] = useState("");

  const handleNameChange = (name: string) => {
    setShopName(name);
    setSlug(slugify(name));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const paymentInfo: Record<string, string> = {};
    if (paymentBank) paymentInfo["Bank Transfer"] = paymentBank;
    if (paymentWallet) paymentInfo["Mobile Wallet"] = paymentWallet;

    startTransition(async () => {
      const result = await createShop({
        name: shopName,
        slug,
        description: fd.get("description") as string,
        phone: fd.get("phone") as string,
        location: fd.get("location") as string,
        delivery_policy: fd.get("delivery_policy") as string,
        logo_url: logoUrl ?? undefined,
        cover_url: coverUrl ?? undefined,
        allow_guest_purchase: allowGuest,
        payment_info: paymentInfo,
      });

      if (result.error) { setError(result.error); return; }
      toast.success("Shop created! Add products to request inspection.");
      router.push(`/vendor/${result.data.slug}/products/new`);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!shopId) {
      toast.error("Save the shop first to upload images.");
      return;
    }
    try {
      const url = await uploadShopLogo(file, shopId);
      setLogoUrl(url);
      toast.success("Logo uploaded");
    } catch { toast.error("Upload failed"); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Open Your Shop</h1>
      <p className="text-muted-foreground mb-8">Fill in your shop details. You can always edit them later.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

        <Card>
          <CardHeader><CardTitle className="text-base">Public Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Shop Name *</Label>
              <Input id="name" value={shopName} onChange={(e) => handleNameChange(e.target.value)} placeholder="My Awesome Shop" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Shop URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">moxxa.com/shop/</span>
                <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="my-awesome-shop" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">About the Shop</Label>
              <Textarea id="description" name="description" placeholder="Tell customers what you sell…" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact & Fulfillment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="09XX XXX XXXX" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Physical Location</Label>
              <Input id="location" name="location" placeholder="Barangay, City/Municipality, Province" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery_policy">Delivery & Refund Policy</Label>
              <Textarea id="delivery_policy" name="delivery_policy" placeholder="Describe your delivery timeline, coverage, and refund policy…" rows={4} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Setup</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Guest Purchases</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Allow Guest Checkout</p>
                <p className="text-xs text-muted-foreground">Let customers buy without creating an account</p>
              </div>
              <Switch checked={allowGuest} onCheckedChange={setAllowGuest} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating shop…" : "Create Shop & Add Products"}
        </Button>
      </form>
    </div>
  );
}
