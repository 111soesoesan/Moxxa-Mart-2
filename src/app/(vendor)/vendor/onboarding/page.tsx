"use client";

import { useTransition, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createShop, getMyShops } from "@/actions/shops";
import { createPaymentMethod } from "@/actions/paymentMethods";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup } from "@/components/ui/field";
import { toast } from "sonner";
import { Check, ChevronRight } from "lucide-react";

const schema = z.object({
  // Step 1: Shop Identity
  name: z.string().min(1, "Shop name is required"),
  slug: z
    .string()
    .min(1, "Shop URL is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and dashes"),
  description: z.string().optional(),
  
  // Step 2: Contact & Fulfillment
  phone: z.string().optional(),
  location: z.string().optional(),
  delivery_policy: z.string().optional(),
  allow_guest_purchase: z.boolean(),
  
  // Step 3: Payment Methods (optional)
  setup_payment_methods: z.boolean().default(false),
  payment_bank: z.string().optional(),
  payment_wallet: z.string().optional(),
});

type OnboardingSchema = z.infer<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [createdShopId, setCreatedShopId] = useState<string | null>(null);

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
      payment_bank: "",
      payment_wallet: "",
    },
  });

  const rootError = form.formState.errors.root?.message;
  const errors = form.formState.errors;
  const setupPaymentMethods = form.watch("setup_payment_methods");

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    form.setValue("slug", slugify(name), { shouldValidate: true });
  };

  const canProceedToStep2 = () => {
    return form.formState.isValid && form.watch("name") && form.watch("slug");
  };

  const onSubmit = (values: OnboardingSchema) => {
    if (step < 3) {
      // Move to next step without submitting
      if (step === 1) {
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      }
      return;
    }

    // Step 3 - Final submission
    startTransition(async () => {
      // Create shop
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

      setCreatedShopId(shopResult.data.id);

      // Optionally create additional payment methods
      if (values.setup_payment_methods) {
        if (values.payment_bank) {
          await createPaymentMethod(shopResult.data.id, {
            type: "bank",
            name: "Bank Transfer",
            description: values.payment_bank,
          });
        }
        if (values.payment_wallet) {
          await createPaymentMethod(shopResult.data.id, {
            type: "bank",
            name: "Mobile Wallet",
            description: values.payment_wallet,
          });
        }
      }

      toast.success("Shop created! Now let's add your first product.");
      router.push(`/vendor/${shopResult.data.slug}/products/new`);
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
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                  s < step
                    ? "bg-green-600 text-white"
                    : s === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
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

          {/* STEP 3: Payment Methods (Optional) */}
          {step >= 3 && (
            <>
              <Separator className="my-6" />
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Step 3: Additional Payment Methods (Optional)</h2>
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
                    <FieldGroup>
                      <Field error={errors.payment_bank?.message}>
                        <FieldLabel>Bank Account</FieldLabel>
                        <FieldControl>
                          <Input
                            placeholder="Bank name + Account number"
                            {...form.register("payment_bank")}
                          />
                        </FieldControl>
                        <FieldDescription>e.g. BDO 1234-5678-9012</FieldDescription>
                        <FieldError />
                      </Field>

                      <Field error={errors.payment_wallet?.message}>
                        <FieldLabel>Mobile Wallet (GCash / Maya)</FieldLabel>
                        <FieldControl>
                          <Input placeholder="09XX XXX XXXX" {...form.register("payment_wallet")} />
                        </FieldControl>
                        <FieldError />
                      </Field>
                    </FieldGroup>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Navigation Buttons */}
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
              disabled={isPending || (step === 1 && !canProceedToStep2())}
              className="flex-1"
            >
              {step < 3 ? (
                <>Next<ChevronRight className="h-4 w-4 ml-1" /></>
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
