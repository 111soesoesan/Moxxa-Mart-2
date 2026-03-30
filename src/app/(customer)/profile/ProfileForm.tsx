"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, ChevronRight, Lock } from "lucide-react";
import { updateMyProfile } from "@/actions/profile";
import { uploadProfileAvatar } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldControl, FieldError } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().max(40).optional(),
  default_address: z.string().max(2000).optional(),
  avatar_url: z.union([z.string().url(), z.literal("")]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  userId: string;
  initial: {
    full_name: string | null;
    phone: string | null;
    default_address: string | null;
    avatar_url: string | null;
    email: string;
  };
};

export function ProfileForm({ userId, initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(initial.avatar_url);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initial.full_name ?? "",
      phone: initial.phone ?? "",
      default_address: initial.default_address ?? "",
      avatar_url: initial.avatar_url ?? "",
    },
  });

  const displayName = form.watch("full_name");

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const avatarDisplay = objectUrl ?? savedAvatarUrl ?? undefined;

  const resetToInitial = () => {
    setFile(null);
    setSavedAvatarUrl(initial.avatar_url);
    form.reset({
      full_name: initial.full_name ?? "",
      phone: initial.phone ?? "",
      default_address: initial.default_address ?? "",
      avatar_url: initial.avatar_url ?? "",
    });
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      let nextAvatar: string | "" = values.avatar_url;
      if (file) {
        try {
          nextAvatar = await uploadProfileAvatar(file, userId);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not upload photo");
          return;
        }
      }

      const res = await updateMyProfile({
        full_name: values.full_name,
        phone: values.phone?.trim() || null,
        default_address: values.default_address?.trim() || null,
        avatar_url: nextAvatar === "" ? null : nextAvatar,
      });

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success("Profile saved");
      setFile(null);
      if (nextAvatar && nextAvatar !== "") {
        setSavedAvatarUrl(nextAvatar);
        form.setValue("avatar_url", nextAvatar);
      } else {
        setSavedAvatarUrl(null);
        form.setValue("avatar_url", "");
      }
    });
  };

  return (
    <div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <input type="hidden" {...form.register("avatar_url")} />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Avatar className="size-24 shrink-0 border border-border/60 shadow-sm">
            <AvatarImage src={avatarDisplay} alt="" className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User className="size-10" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-2">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {displayName?.trim() || "Your name"}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Change photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {(savedAvatarUrl || file) && (
                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    setFile(null);
                    setSavedAvatarUrl(null);
                    form.setValue("avatar_url", "");
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Field error={form.formState.errors.full_name?.message}>
            <FieldLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" required>
              Display name
            </FieldLabel>
            <FieldControl>
              <Input
                autoComplete="name"
                className="h-11 rounded-lg border-border/80 bg-background"
                {...form.register("full_name")}
              />
            </FieldControl>
            <FieldError />
          </Field>

          <Field>
            <FieldLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Email address
            </FieldLabel>
            <FieldControl>
              <Input
                value={initial.email}
                readOnly
                disabled
                className="h-11 rounded-lg border-border/60 bg-muted/40 text-muted-foreground"
              />
            </FieldControl>
            <p className="text-xs text-muted-foreground">Tied to your sign-in account.</p>
          </Field>

          <Field error={form.formState.errors.phone?.message}>
            <FieldLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Phone number
            </FieldLabel>
            <FieldControl>
              <Input
                type="tel"
                autoComplete="tel"
                className="h-11 rounded-lg border-border/80 bg-background"
                {...form.register("phone")}
              />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={form.formState.errors.default_address?.message}>
            <FieldLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Shipping address
            </FieldLabel>
            <FieldControl>
              <Textarea
                rows={4}
                placeholder="Used to pre-fill checkout when you're signed in."
                className="min-h-[7.5rem] resize-y rounded-lg border-border/80 bg-background"
                {...form.register("default_address")}
              />
            </FieldControl>
            <FieldError />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 sm:flex-none sm:min-w-[7.5rem]"
            onClick={resetToInitial}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-1 sm:min-w-[10rem] font-semibold" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <Separator className="my-10 opacity-60" />

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-card px-5 py-4 shadow-sm">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Security &amp; sign-in</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Your password is the one you use on the sign-in page. Email cannot be changed here.
            </p>
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
      </div>
    </div>
  );
}
