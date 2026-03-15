"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { getMyShops, updateShop, requestInspection } from "@/actions/shops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldLabel, FieldControl, FieldError, FieldGroup } from "@/components/ui/field";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Shop name is required"),
  description: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  delivery_policy: z.string().optional(),
  allow_guest_purchase: z.boolean(),
});

type SettingsSchema = z.infer<typeof schema>;

type Shop = Awaited<ReturnType<typeof getMyShops>>[number];

export default function ShopSettingsPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      phone: "",
      location: "",
      delivery_policy: "",
      allow_guest_purchase: true,
    },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;

  useEffect(() => {
    getMyShops().then((shops) => {
      const s = shops.find((s) => s.slug === shopSlug);
      if (s) {
        setShop(s);
        form.reset({
          name: s.name,
          description: s.description ?? "",
          phone: s.phone ?? "",
          location: s.location ?? "",
          delivery_policy: s.delivery_policy ?? "",
          allow_guest_purchase: s.allow_guest_purchase,
        });
      }
      setLoading(false);
    });
  }, [shopSlug, form]);

  const onSubmit = (values: SettingsSchema) => {
    if (!shop) return;

    startTransition(async () => {
      const result = await updateShop(shop.id, {
        name: values.name,
        description: values.description,
        phone: values.phone,
        location: values.location,
        delivery_policy: values.delivery_policy,
        allow_guest_purchase: values.allow_guest_purchase,
      });
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Skeleton className="h-48 w-full" />
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

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {rootError && <Alert variant="destructive">{rootError}</Alert>}

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
          </CardContent>
        </Card>



        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Allow Guest Checkout</p>
                <p className="text-xs text-muted-foreground">Let customers buy without an account</p>
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
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
