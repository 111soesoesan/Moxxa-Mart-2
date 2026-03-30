import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/actions/auth";
import { getMyProfilePageData } from "@/actions/profile";
import { ProfileForm } from "./ProfileForm";
import { LayoutDashboard, Shield } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [result, profileRow] = await Promise.all([getMyProfilePageData(), getProfile()]);
  if (!result.success || !result.data) {
    return (
      <div className="min-h-[50vh] bg-muted/20 px-4 py-16 text-center text-sm text-destructive">
        Could not load your profile. Please try again later.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account settings</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Manage your personal information and delivery details used across checkout and your orders.
        </p>

        {profileRow && (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-border/60 pb-6 text-sm">
            <Link
              href="/vendor"
              className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
            >
              <LayoutDashboard className="size-4 shrink-0" aria-hidden />
              Vendor hub
            </Link>
            {profileRow.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
              >
                <Shield className="size-4 shrink-0" aria-hidden />
                Admin dashboard
              </Link>
            )}
          </div>
        )}

        <div className={profileRow ? "pt-8" : "pt-6"}>
          <ProfileForm userId={user.id} initial={result.data} />
        </div>
      </div>
    </div>
  );
}
