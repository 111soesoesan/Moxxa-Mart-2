"use client";

import { useTransition, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createShop, getMyShops, updateShop } from "@/actions/shops";
import { createPaymentMethod } from "@/actions/paymentMethods";
import { uploadShopProfileImage, uploadShopBanner } from "@/lib/supabase/storage";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup } from "@/components/ui/field";
import { toast } from "sonner";
import { Check, ChevronRight, Upload, ImageIcon, Landmark } from "lucide-react";
import Image from "next/image";

const TOTAL_STEPS = 4;

const schema = z.object({
  name: z.string().min(1, "Shop name is required"),
  slug: z
    .string()
    .min(1, "Shop URL is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and dashes"),
  description: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  delivery_policy: z.string().optional(),
  allow_guest_purchase: z.boolean(),
  setup_payment_methods: z.boolean().default(false),
  payment_method_name: z.string().optional(),
  payment_method_description: z.string().optional(),
  bank_name: z.string().optional(),
  account_holder: z.string().optional(),
  account_number: z.string().optional(),
  proof_required: z.boolean().default(false),
});

type OnboardingSchema = z.input<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);

  // Branding state (step 3) — stored as Files, uploaded after shop creation
  const profileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const form = useForm<OnboardingSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      phone: "",
      location: "",
      delivery_policy: "",
      allow_guest_purchase: true,
      setup_payment_methods: false,
      payment_method_name: "",
      payment_method_description: "",
      bank_name: "",
      account_holder: "",
      account_number: "",
      proof_required: false,
    },
  });

  const rootError = form.formState.errors.root?.message;
  const errors = form.formState.errors;
  const setupPaymentMethods = form.watch("setup_payment_methods");

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    form.setValue("slug", slugify(name), { shouldValidate: true });
  };

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

  const onSubmit = (values: OnboardingSchema) => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }

    // Final step — create shop then upload branding if provided
    startTransition(async () => {
      const shopResult = await createShop({
        name: values.name,
        slug: values.slug,
        description: values.description,
        phone: values.phone,
        location: values.location,
        delivery_policy: values.delivery_policy,
        allow_guest_purchase: values.allow_guest_purchase,
      });

      if (!shopResult.data) {
        form.setError("root", { message: shopResult.error ?? "Failed to create shop" });
        return;
      }

      const shopId = shopResult.data.id;
      const shopSlug = shopResult.data.slug;

      // Upload branding images if provided
      const brandingUpdates: Record<string, string> = {};
      try {
        if (profileFile) {
          brandingUpdates.profile_image_url = await uploadShopProfileImage(profileFile, shopId);
        }
        if (bannerFile) {
          brandingUpdates.banner_image_url = await uploadShopBanner(bannerFile, shopId);
        }
      } catch {
        toast.error("Images couldn't be uploaded — you can add them later in Settings > Appearance.");
      }

      if (Object.keys(brandingUpdates).length > 0) {
        await updateShop(shopId, brandingUpdates);
      }

      // Optionally create additional payment methods
      if (values.setup_payment_methods && values.payment_method_name && values.account_number) {
        await createPaymentMethod(shopId, {
          type: "bank",
          name: values.payment_method_name,
          description: values.payment_method_description || null,
          bank_name: values.bank_name || null,
          account_holder: values.account_holder || null,
          account_number: values.account_number,
          proof_required: values.proof_required,
          is_active: true,
        });
      }

      toast.success("Shop created! Now let's add your first product.");
      router.push(`/vendor/${shopSlug}/products/new`);
    });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Open Your Shop</h1>
          <p className="text-muted-foreground">Let's set up your storefront in a few quick steps.</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-between">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${s < step
                  ? "bg-green-600 text-white"
                  : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < TOTAL_STEPS && (
                <div className={`flex-1 h-1 mx-2 ${s < step ? "bg-green-600" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {rootError && <Alert variant="destructive">{rootError}</Alert>}

          {/* STEP 1: Shop Identity */}
          {step >= 1 && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Step 1: Shop Identity</h2>
                <p className="text-sm text-muted-foreground">Create your shop name and URL</p>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Public Identity</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field error={errors.name?.message}>
                    <FieldLabel required>Shop Name</FieldLabel>
                    <FieldControl>
                      <Input
                        placeholder="My Awesome Shop"
                        value={form.watch("name")}
                        onChange={(e) => handleNameChange(e.target.value)}
                      />
                    </FieldControl>
                    <FieldError />
                  </Field>

                  <Field error={errors.slug?.message}>
                    <FieldLabel required>Shop URL</FieldLabel>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">moxxa.com/shop/</span>
                      <FieldControl>
                        <Input
                          placeholder="my-awesome-shop"
                          {...form.register("slug")}
                          onChange={(e) =>
                            form.setValue("slug", slugify(e.target.value), { shouldValidate: true })
                          }
                        />
                      </FieldControl>
                    </div>
                    <FieldDescription>This becomes your public shop link.</FieldDescription>
                    <FieldError />
                  </Field>

                  <Field error={errors.description?.message}>
                    <FieldLabel>About the Shop</FieldLabel>
                    <FieldControl>
                      <Textarea
                        placeholder="Tell customers what you sell…"
                        rows={3}
                        {...form.register("description")}
                      />
                    </FieldControl>
                    <FieldError />
                  </Field>
                </CardContent>
              </Card>
            </>
          )}

          {/* STEP 2: Contact & Fulfillment */}
          {step >= 2 && (
            <>
              <Separator className="my-6" />
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Step 2: Contact & Fulfillment</h2>
                <p className="text-sm text-muted-foreground">How will you deliver orders?</p>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Contact & Fulfillment</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field error={errors.phone?.message}>
                    <FieldLabel>Contact Phone</FieldLabel>
                    <FieldControl>
                      <Input type="tel" placeholder="09XX XXX XXXX" {...form.register("phone")} />
                    </FieldControl>
                    <FieldError />
                  </Field>

                  <Field error={errors.location?.message}>
                    <FieldLabel>Physical Location</FieldLabel>
                    <FieldControl>
                      <Input
                        placeholder="Barangay, City/Municipality, Province"
                        {...form.register("location")}
                      />
                    </FieldControl>
                    <FieldError />
                  </Field>

                  <Field error={errors.delivery_policy?.message}>
                    <FieldLabel>Delivery & Refund Policy</FieldLabel>
                    <FieldControl>
                      <Textarea
                        placeholder="Describe your delivery timeline, coverage, and refund policy…"
                        rows={4}
                        {...form.register("delivery_policy")}
                      />
                    </FieldControl>
                    <FieldError />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Guest Purchases</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Allow Guest Checkout</p>
                      <p className="text-xs text-muted-foreground">
                        Let customers buy without creating an account
                      </p>
                    </div>
                    <Controller
                      control={form.control}
                      name="allow_guest_purchase"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* STEP 3: Branding (optional) */}
          {step >= 3 && (
            <>
              <Separator className="my-6" />
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Step 3: Branding <span className="text-muted-foreground font-normal text-sm">(Optional)</span></h2>
                <p className="text-sm text-muted-foreground">Add a profile photo and banner image to make your shop stand out.</p>
              </div>

              {/* Banner */}
              <Card>
                <CardHeader><CardTitle className="text-base">Banner Image</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/30 border">
                    {bannerPreview ? (
                      <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" sizes="672px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-sm">No banner yet</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bannerRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {bannerPreview ? "Change Banner" : "Upload Banner"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Recommended: 1200×400px. JPG or PNG.</p>
                  <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </CardContent>
              </Card>

              {/* Profile Image */}
              <Card>
                <CardHeader><CardTitle className="text-base">Profile Image</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      <AvatarImage src={profilePreview ?? undefined} alt="Profile" />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                        {form.watch("name")?.[0] ?? "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => profileRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {profilePreview ? "Change Photo" : "Upload Photo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 400×400px. JPG or PNG.</p>
                    </div>
                  </div>
                  <input ref={profileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileChange} />
                </CardContent>
              </Card>
            </>
          )}

          {/* STEP 4: Payment Methods (Optional) */}
          {step >= 4 && (
            <>
              <Separator className="my-6" />
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Step 4: Additional Payment Methods <span className="text-muted-foreground font-normal text-sm">(Optional)</span></h2>
                <p className="text-sm text-muted-foreground">You already have "Cash on Delivery" enabled. Add more if you want.</p>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Set Up Payment Methods</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">Add Payment Methods Now</p>
                      <p className="text-xs text-muted-foreground">
                        You can add these anytime later in Payment Methods settings
                      </p>
                    </div>
                    <Controller
                      control={form.control}
                      name="setup_payment_methods"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>

                  {setupPaymentMethods && (
                    <div className="space-y-4 pt-2">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                        <div className="bg-blue-600 p-2 rounded-md h-fit">
                          <Landmark className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Bank Transfer</p>
                          <p className="text-xs text-blue-700">Add your bank details to receive payments via bank transfer.</p>
                        </div>
                      </div>

                      <FieldGroup>
                        <Field error={errors.payment_method_name?.message}>
                          <FieldLabel required>Payment Method Name</FieldLabel>
                          <FieldControl>
                            <Input
                              placeholder="e.g. BDO Bank, GCash, Maya"
                              {...form.register("payment_method_name")}
                            />
                          </FieldControl>
                          <FieldError />
                        </Field>

                        <Field error={errors.payment_method_description?.message}>
                          <FieldLabel>Description</FieldLabel>
                          <FieldControl>
                            <Textarea
                              placeholder="Brief instructions for the customer..."
                              rows={2}
                              {...form.register("payment_method_description")}
                            />
                          </FieldControl>
                          <FieldError />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field error={errors.bank_name?.message}>
                            <FieldLabel>Bank / Wallet Name</FieldLabel>
                            <FieldControl>
                              <Input
                                placeholder="e.g. BDO, GCash"
                                {...form.register("bank_name")}
                              />
                            </FieldControl>
                            <FieldError />
                          </Field>

                          <Field error={errors.account_holder?.message}>
                            <FieldLabel>Account Holder Name</FieldLabel>
                            <FieldControl>
                              <Input
                                placeholder="Full name"
                                {...form.register("account_holder")}
                              />
                            </FieldControl>
                            <FieldError />
                          </Field>
                        </div>

                        <Field error={errors.account_number?.message}>
                          <FieldLabel required>Account Number / Phone</FieldLabel>
                          <FieldControl>
                            <Input
                              placeholder="Account number or mobile number"
                              {...form.register("account_number")}
                            />
                          </FieldControl>
                          <FieldError />
                        </Field>

                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">Require Payment Proof</p>
                            <p className="text-xs text-muted-foreground">
                              Customers must upload a screenshot of the transfer
                            </p>
                          </div>
                          <Controller
                            control={form.control}
                            name="proof_required"
                            render={({ field }) => (
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                          />
                        </div>
                      </FieldGroup>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              disabled={isPending || (step === 1 && (!form.watch("name") || !form.watch("slug")))}
              className="flex-1"
            >
              {step < TOTAL_STEPS ? (
                <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
              ) : (
                isPending ? "Creating shop…" : "Create Shop"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
