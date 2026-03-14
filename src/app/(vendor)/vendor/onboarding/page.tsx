"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createShop } from "@/actions/shops";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Field, FieldLabel, FieldControl, FieldError, FieldDescription, FieldGroup } from "@/components/ui/field";
import { toast } from "sonner";

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
  payment_bank: z.string().optional(),
  payment_wallet: z.string().optional(),
  allow_guest_purchase: z.boolean(),
});

type OnboardingSchema = z.infer<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<OnboardingSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      phone: "",
      location: "",
      delivery_policy: "",
      payment_bank: "",
      payment_wallet: "",
      allow_guest_purchase: true,
    },
  });

  const rootError = form.formState.errors.root?.message;
  const errors = form.formState.errors;

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    form.setValue("slug", slugify(name), { shouldValidate: true });
  };

  const onSubmit = (values: OnboardingSchema) => {
    const paymentInfo: Record<string, string> = {};
    if (values.payment_bank) paymentInfo["Bank Transfer"] = values.payment_bank;
    if (values.payment_wallet) paymentInfo["Mobile Wallet"] = values.payment_wallet;

    startTransition(async () => {
      const result = await createShop({
        name: values.name,
        slug: values.slug,
        description: values.description,
        phone: values.phone,
        location: values.location,
        delivery_policy: values.delivery_policy,
        allow_guest_purchase: values.allow_guest_purchase,
        payment_info: paymentInfo,
      });

      if (!result.data) {
        form.setError("root", { message: result.error ?? "Failed to create shop" });
        return;
      }
      toast.success("Shop created! Add products to request inspection.");
      router.push(`/vendor/${result.data.slug}/products/new`);
    });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Open Your Shop</h1>
          <p className="text-muted-foreground">Fill in your shop details. You can always edit them later.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {rootError && <Alert variant="destructive">{rootError}</Alert>}

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
            <CardHeader><CardTitle className="text-base">Payment Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating shop…" : "Create Shop & Add Products"}
          </Button>
        </form>
      </div>
    </div>
  );
}
