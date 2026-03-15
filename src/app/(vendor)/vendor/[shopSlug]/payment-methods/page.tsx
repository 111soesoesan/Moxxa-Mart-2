"use client";

import { useEffect, useTransition, useState } from "react";
import { useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getMyShops } from "@/actions/shops";
import {
  getShopPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "@/actions/paymentMethods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldControl, FieldError, FieldGroup } from "@/components/ui/field";
import { toast } from "sonner";
import { Trash2, Plus, Edit2, Banknote, DollarSign, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const paymentMethodSchema = z.object({
  type: z.enum(["cash", "bank"]),
  name: z.string().min(1, "Payment method name is required"),
  description: z.string().optional(),
  bank_name: z.string().optional(),
  account_holder: z.string().optional(),
  account_number: z.string().optional(),
  proof_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type PaymentMethodSchema = z.infer<typeof paymentMethodSchema>;

type PaymentMethod = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  proof_required: boolean;
  is_active: boolean;
  created_at: string;
};

export default function PaymentMethodsPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  const form = useForm<PaymentMethodSchema>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: "cash",
      name: "",
      description: "",
      bank_name: "",
      account_holder: "",
      account_number: "",
      proof_required: false,
      is_active: true,
    },
  });

  const errors = form.formState.errors;
  const rootError = errors.root?.message;
  const isBank = form.watch("type") === "bank";

  useEffect(() => {
    (async () => {
      const shops = await getMyShops();
      const shop = shops.find((s) => s.slug === shopSlug);
      if (!shop) {
        setLoading(false);
        return;
      }

      setShopId(shop.id);
      const result = await getShopPaymentMethods(shop.id);
      if (result.data) {
        setMethods(result.data);
      }
      setLoading(false);
    })();
  }, [shopSlug]);

  const onSubmit = (values: PaymentMethodSchema) => {
    if (!shopId) return;

    startTransition(async () => {
      const data = {
        type: values.type,
        name: values.name,
        description: values.description || null,
        bank_name: values.type === "bank" ? values.bank_name || null : null,
        account_holder: values.type === "bank" ? values.account_holder || null : null,
        account_number: values.type === "bank" ? values.account_number || null : null,
        proof_required: values.type === "bank" ? values.proof_required : false,
        is_active: values.is_active,
      };

      let result;
      if (editingMethod) {
        result = await updatePaymentMethod(editingMethod.id, data);
      } else {
        result = await createPaymentMethod(shopId, data);
      }

      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }

      toast.success(editingMethod ? "Payment method updated!" : "Payment method created!");
      
      // Refresh methods list
      const updated = await getShopPaymentMethods(shopId);
      if (updated.data) {
        setMethods(updated.data);
      }

      form.reset();
      setEditingMethod(null);
      setIsDialogOpen(false);
    });
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    form.reset({
      type: method.type as "cash" | "bank",
      name: method.name,
      description: method.description ?? "",
      bank_name: method.bank_name ?? "",
      account_holder: method.account_holder ?? "",
      account_number: method.account_number ?? "",
      proof_required: method.proof_required,
      is_active: method.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (methodId: string) => {
    startTransition(async () => {
      const result = await deletePaymentMethod(methodId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment method deleted!");
      if (shopId) {
        const updated = await getShopPaymentMethods(shopId);
        if (updated.data) {
          setMethods(updated.data);
        }
      }
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setEditingMethod(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage payment methods for your products
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? "Edit Payment Method" : "Create Payment Method"}
              </DialogTitle>
              <DialogDescription>
                {editingMethod
                  ? "Update this payment method details"
                  : "Add a new cash or bank payment option"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {rootError && <Alert variant="destructive">{rootError}</Alert>}

              <Field error={errors.type?.message}>
                <FieldLabel required>Payment Type</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={!!errors.type}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash on Delivery</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError />
              </Field>

              <Field error={errors.name?.message}>
                <FieldLabel required>Payment Method Name</FieldLabel>
                <FieldControl>
                  <Input
                    placeholder={isBank ? "e.g. BDO Bank" : "e.g. Cash on Delivery"}
                    {...form.register("name")}
                  />
                </FieldControl>
                <FieldError />
              </Field>

              <Field error={errors.description?.message}>
                <FieldLabel>Description</FieldLabel>
                <FieldControl>
                  <Textarea
                    placeholder="Brief description shown to customers"
                    rows={2}
                    {...form.register("description")}
                  />
                </FieldControl>
                <FieldError />
              </Field>

              {isBank && (
                <>
                  <FieldGroup>
                    <Field error={errors.bank_name?.message}>
                      <FieldLabel>Bank Name</FieldLabel>
                      <FieldControl>
                        <Input placeholder="e.g. BDO, BPI, Metrobank" {...form.register("bank_name")} />
                      </FieldControl>
                      <FieldError />
                    </Field>

                    <Field error={errors.account_holder?.message}>
                      <FieldLabel>Account Holder Name</FieldLabel>
                      <FieldControl>
                        <Input placeholder="Full name" {...form.register("account_holder")} />
                      </FieldControl>
                      <FieldError />
                    </Field>

                    <Field error={errors.account_number?.message}>
                      <FieldLabel>Account Number</FieldLabel>
                      <FieldControl>
                        <Input placeholder="Account number" {...form.register("account_number")} />
                      </FieldControl>
                      <FieldError />
                    </Field>
                  </FieldGroup>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">Require Payment Proof</p>
                      <p className="text-xs text-muted-foreground">
                        Customers must upload proof for this method
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
                </>
              )}

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Customers can use this method
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? "Saving…" : editingMethod ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {methods.length === 0 ? (
        <Card className="text-center py-12">
          <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No payment methods yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first payment method to accept orders
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => (
            <Card key={method.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {method.type === "cash" ? (
                          <Wallet className="h-4 w-4 text-green-600" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        )}
                        <h3 className="font-semibold">{method.name}</h3>
                      </div>
                      {!method.is_active && (
                        <Badge variant="outline" className="bg-muted">
                          Inactive
                        </Badge>
                      )}
                      {method.proof_required && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          Proof Required
                        </Badge>
                      )}
                    </div>

                    {method.description && (
                      <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                    )}

                    {method.type === "bank" && (
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground p-3 bg-muted/30 rounded mb-3">
                        {method.bank_name && (
                          <div>
                            <p className="font-medium text-foreground">Bank</p>
                            <p>{method.bank_name}</p>
                          </div>
                        )}
                        {method.account_holder && (
                          <div>
                            <p className="font-medium text-foreground">Holder</p>
                            <p>{method.account_holder}</p>
                          </div>
                        )}
                        {method.account_number && (
                          <div className="col-span-2">
                            <p className="font-medium text-foreground">Account Number</p>
                            <p className="font-mono">{method.account_number}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(method)}
                      disabled={isPending}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending || method.name === "Cash on Delivery"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete payment method?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. Products using this method will remain unchanged.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(method.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert className="mt-8 bg-blue-50 border-blue-200 text-blue-900">
        <Banknote className="h-4 w-4" />
        <p className="text-sm">
          <strong>Tip:</strong> Assign at least one payment method to each product. Customers will see these options at checkout.
        </p>
      </Alert>
    </div>
  );
}
