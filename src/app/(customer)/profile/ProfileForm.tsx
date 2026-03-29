"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react";
import { updateMyProfile } from "@/actions/profile";
import { uploadProfileAvatar } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldControl, FieldError } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account</CardTitle>
        <p className="text-sm text-muted-foreground">
          This name and photo appear on blog comments, web chat, and checkout can use your saved
          details.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <input type="hidden" {...form.register("avatar_url")} />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarDisplay} alt="" />
              <AvatarFallback>
                <User className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  Change photo
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
              </Button>
              {(savedAvatarUrl || file) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setSavedAvatarUrl(null);
                    form.setValue("avatar_url", "");
                  }}
                >
                  Remove photo
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{initial.email}</p>
            <p className="text-xs text-muted-foreground">Email is managed through your sign-in account.</p>
          </div>

          <Field error={form.formState.errors.full_name?.message}>
            <FieldLabel required>Display name</FieldLabel>
            <FieldControl>
              <Input autoComplete="name" {...form.register("full_name")} />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={form.formState.errors.phone?.message}>
            <FieldLabel>Phone</FieldLabel>
            <FieldControl>
              <Input type="tel" autoComplete="tel" {...form.register("phone")} />
            </FieldControl>
            <FieldError />
          </Field>

          <Field error={form.formState.errors.default_address?.message}>
            <FieldLabel>Default delivery address</FieldLabel>
            <FieldControl>
              <Textarea
                rows={4}
                placeholder={"Used to pre-fill checkout when you're signed in."}
                {...form.register("default_address")}
              />
            </FieldControl>
            <FieldError />
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
