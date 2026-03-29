"use client";

import { useEffect, useTransition, useRef, useState } from "react";
import { getActiveBrowseCategories } from "@/actions/browseCategories";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { getMyShops, updateShop, requestInspection, deleteShop } from "@/actions/shops";
import { uploadShopProfileImage, uploadShopBanner } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ClipboardCheck, Upload, ImageIcon, X, Trash2, TriangleAlert } from "lucide-react";
import Image from "next/image";

// --- Schemas per tab ---

const generalSchema = z.object({
  name: z.string().min(1, "Shop name is required"),
  description: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  delivery_policy: z.string().optional(),
  shop_bio: z.string().max(200, "Shop bio must be 200 characters or fewer").optional(),
  browse_category_id: z.union([z.literal(""), z.string().uuid()]).optional(),
});

const promotionsSchema = z.object({
  promotion_enabled: z.boolean(),
  promotion_title: z.string().optional(),
  promotion_body: z.string().optional(),
  promotion_button_text: z.string().optional(),
  promotion_button_link: z.string().optional(),
});

type GeneralSchema = z.infer<typeof generalSchema>;
type PromotionsSchema = z.infer<typeof promotionsSchema>;
type Shop = Awaited<ReturnType<typeof getMyShops>>[number];

export default function ShopSettingsPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getMyShops().then((shops) => {
      const s = shops.find((s) => s.slug === shopSlug);
      if (s) setShop(s);
      setLoading(false);
    });
  }, [shopSlug]);

  const handleReInspection = () => {
    if (!shop) return;
    startTransition(async () => {
      const result = await requestInspection(shop.id);
      if (result.error) toast.error(result.error);
      else toast.success("Inspection requested!");
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
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

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-5 mb-6 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="checkout">Checkout</TabsTrigger>
          <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">
            Danger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab shop={shop} onSaved={(updated) => setShop(updated)} />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab shop={shop} onSaved={(updated) => setShop(updated)} />
        </TabsContent>

        <TabsContent value="promotions">
          <PromotionsTab shop={shop} onSaved={(updated) => setShop(updated)} />
        </TabsContent>

        <TabsContent value="checkout">
          <CheckoutTab shop={shop} onSaved={(updated) => setShop(updated)} />
        </TabsContent>

        <TabsContent value="danger">
          <DangerTab shop={shop} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── General Tab ─────────────────────────────────────────────────────────────

function GeneralTab({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: (updated: Shop) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [browseCategories, setBrowseCategories] = useState<{ id: string; name: string }[]>([]);

  const form = useForm<GeneralSchema>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: shop.name,
      description: shop.description ?? "",
      phone: shop.phone ?? "",
      location: shop.location ?? "",
      delivery_policy: shop.delivery_policy ?? "",
      shop_bio: shop.shop_bio ?? "",
      browse_category_id: shop.browse_category_id ?? "",
    },
  });

  useEffect(() => {
    getActiveBrowseCategories().then((rows) =>
      setBrowseCategories(rows.map((r) => ({ id: r.id, name: r.name })))
    );
  }, []);

  const errors = form.formState.errors;
  const bioValue = form.watch("shop_bio") ?? "";

  const onSubmit = (values: GeneralSchema) => {
    startTransition(async () => {
      const result = await updateShop(shop.id, {
        name: values.name,
        description: values.description,
        phone: values.phone,
        location: values.location,
        delivery_policy: values.delivery_policy,
        shop_bio: values.shop_bio,
        browse_category_id: values.browse_category_id || null,
      });
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      toast.success("General settings saved.");
      if (result.data) onSaved(result.data as unknown as Shop);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {errors.root?.message && <Alert variant="destructive">{errors.root.message}</Alert>}

      <Card>
        <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field error={errors.name?.message}>
            <FieldLabel required>Shop Name</FieldLabel>
            <FieldControl>
              <Input {...form.register("name")} />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={errors.description?.message}>
            <FieldLabel>About</FieldLabel>
            <FieldControl>
              <Textarea rows={3} {...form.register("description")} />
            </FieldControl>
            <FieldDescription>Internal description shown in the About page.</FieldDescription>
            <FieldError />
          </Field>

          <Field error={errors.shop_bio?.message}>
            <div className="flex items-end justify-between">
              <FieldLabel>Shop Bio</FieldLabel>
              <span className={`text-xs ${bioValue.length > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                {bioValue.length}/200
              </span>
            </div>
            <FieldControl>
              <Input
                placeholder="Short tagline shown on your public storefront…"
                maxLength={200}
                {...form.register("shop_bio")}
              />
            </FieldControl>
            <FieldDescription>Displayed under your shop name. Max 200 characters.</FieldDescription>
            <FieldError />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contact & Fulfillment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field error={errors.phone?.message}>
            <FieldLabel>Phone</FieldLabel>
            <FieldControl>
              <Input type="tel" {...form.register("phone")} />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={errors.location?.message}>
            <FieldLabel>Location</FieldLabel>
            <FieldControl>
              <Input {...form.register("location")} />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={errors.delivery_policy?.message}>
            <FieldLabel>Delivery & Refund Policy</FieldLabel>
            <FieldControl>
              <Textarea rows={4} {...form.register("delivery_policy")} />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={errors.browse_category_id?.message}>
            <FieldLabel>Browse category</FieldLabel>
            <FieldDescription>Used for marketplace discovery (shop directory and filters).</FieldDescription>
            <FieldControl>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("browse_category_id")}
              >
                <option value="">None</option>
                {browseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FieldControl>
            <FieldError />
          </Field>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save General Settings"}
      </Button>
    </form>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────

function AppearanceTab({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: (updated: Shop) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const profileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const existingProfile = shop.profile_image_url ?? shop.logo_url;
  const existingBanner = shop.banner_image_url ?? shop.cover_url;

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSave = () => {
    startTransition(async () => {
      const updates: Record<string, string> = {};

      try {
        if (profileFile) {
          const url = await uploadShopProfileImage(profileFile, shop.id);
          updates.profile_image_url = url;
        }
        if (bannerFile) {
          const url = await uploadShopBanner(bannerFile, shop.id);
          updates.banner_image_url = url;
        }
      } catch {
        toast.error("Failed to upload images. Please try again.");
        return;
      }

      if (Object.keys(updates).length === 0) {
        toast.info("No new images selected.");
        return;
      }

      const result = await updateShop(shop.id, updates);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Appearance updated.");
      setProfileFile(null);
      setBannerFile(null);
      if (result.data) onSaved(result.data as unknown as Shop);
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Banner Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/30 border">
            {(bannerPreview ?? existingBanner) && (
              <Image
                src={(bannerPreview ?? existingBanner) || ""}
                alt="Banner preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            )}
            {!bannerPreview && !existingBanner && (
              <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                <ImageIcon className="h-6 w-6" />
                <span className="text-sm">No banner set</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bannerRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {existingBanner ? "Change Banner" : "Upload Banner"}
            </Button>
            {bannerPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setBannerFile(null); setBannerPreview(null); }}
              >
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Recommended: 1200×400px or wider. JPG or PNG.</p>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerChange}
          />
        </CardContent>
      </Card>

      {/* Profile Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={profilePreview ?? existingProfile ?? undefined} alt="Profile" />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                {shop.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => profileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {existingProfile ? "Change Photo" : "Upload Photo"}
              </Button>
              {profilePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="block"
                  onClick={() => { setProfileFile(null); setProfilePreview(null); }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Recommended: 400×400px. JPG or PNG.</p>
            </div>
          </div>
          <input
            ref={profileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfileChange}
          />
        </CardContent>
      </Card>

      <Button
        type="button"
        className="w-full"
        onClick={handleSave}
        disabled={isPending || (!profileFile && !bannerFile)}
      >
        {isPending ? "Uploading…" : "Save Appearance"}
      </Button>
    </div>
  );
}

// ─── Promotions Tab ───────────────────────────────────────────────────────────

function PromotionsTab({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: (updated: Shop) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<PromotionsSchema>({
    resolver: zodResolver(promotionsSchema),
    defaultValues: {
      promotion_enabled: shop.promotion_enabled ?? false,
      promotion_title: shop.promotion_title ?? "",
      promotion_body: shop.promotion_body ?? "",
      promotion_button_text: shop.promotion_button_text ?? "",
      promotion_button_link: shop.promotion_button_link ?? "",
    },
  });

  const promotionEnabled = form.watch("promotion_enabled");

  const onSubmit = (values: PromotionsSchema) => {
    startTransition(async () => {
      const result = await updateShop(shop.id, {
        promotion_enabled: values.promotion_enabled,
        promotion_title: values.promotion_title,
        promotion_body: values.promotion_body,
        promotion_button_text: values.promotion_button_text,
        promotion_button_link: values.promotion_button_link,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Promotion settings saved.");
      if (result.data) onSaved(result.data as unknown as Shop);
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable Promotion Bar</p>
              <p className="text-xs text-muted-foreground">
                Display a promotional message at the top of your shop page
              </p>
            </div>
            <Controller
              control={form.control}
              name="promotion_enabled"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promotion Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>Title</FieldLabel>
            <FieldControl>
              <Input
                placeholder="Summer Sale!"
                {...form.register("promotion_title")}
              />
            </FieldControl>
            <FieldDescription>Short attention-grabbing headline.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Message</FieldLabel>
            <FieldControl>
              <Textarea
                rows={2}
                placeholder="Get 20% off all items this weekend only."
                {...form.register("promotion_body")}
              />
            </FieldControl>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Button Text</FieldLabel>
              <FieldControl>
                <Input
                  placeholder="Shop Now"
                  {...form.register("promotion_button_text")}
                />
              </FieldControl>
              <FieldDescription>Optional CTA button label.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Button Link</FieldLabel>
              <FieldControl>
                <Input
                  placeholder="/shop/my-shop/products"
                  {...form.register("promotion_button_link")}
                />
              </FieldControl>
              <FieldDescription>Where the button leads.</FieldDescription>
            </Field>
          </div>
        </CardContent>
      </Card>

      {promotionEnabled && (
        <div className="rounded-lg border bg-primary text-primary-foreground p-3 text-sm">
          <p className="font-semibold text-xs uppercase tracking-wide opacity-70 mb-1">Preview</p>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{form.watch("promotion_title") || "Your Title"}</span>
            <span className="opacity-80">{form.watch("promotion_body") || "Your message here"}</span>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Save Promotion Settings"}
      </Button>
    </form>
  );
}

// ─── Danger Tab ───────────────────────────────────────────────────────────────

function DangerTab({ shop }: { shop: Shop }) {
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();
  const nameMatches = confirmName === shop.name;

  const handleDelete = () => {
    if (!nameMatches) return;
    startTransition(async () => {
      const result = await deleteShop(shop.id);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <p className="font-semibold text-sm">This action is permanent and cannot be undone.</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Deleting your shop will permanently erase:
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5 ml-1">
          <li>All products, categories, attributes, and variations</li>
          <li>All orders and customer records</li>
          <li>All blog posts, likes, and comments</li>
          <li>All payment methods and billing history</li>
          <li>All uploaded images and files in storage</li>
        </ul>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Delete Shop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>
              Type <span className="font-semibold text-foreground">{shop.name}</span> to confirm
            </FieldLabel>
            <FieldControl>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={shop.name}
                autoComplete="off"
                spellCheck={false}
              />
            </FieldControl>
            <FieldDescription>
              This must match your shop name exactly.
            </FieldDescription>
          </Field>

          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={!nameMatches || isPending}
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isPending ? "Deleting shop…" : "Permanently Delete Shop"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Checkout Tab ─────────────────────────────────────────────────────────────

function CheckoutTab({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: (updated: Shop) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [guestEnabled, setGuestEnabled] = useState(shop.allow_guest_purchase);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateShop(shop.id, { allow_guest_purchase: guestEnabled });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Checkout settings saved.");
      if (result.data) onSaved(result.data as unknown as Shop);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Allow Guest Checkout</p>
              <p className="text-xs text-muted-foreground">
                Let customers buy without creating an account
              </p>
            </div>
            <Switch
              checked={guestEnabled}
              onCheckedChange={setGuestEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        When disabled, customers must sign in or create an account before placing an order.
      </p>

      <Button type="button" className="w-full" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save Checkout Settings"}
      </Button>
    </div>
  );
}
