import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/actions/auth";
import { getMyProfilePageData } from "@/actions/profile";
import { ProfileForm } from "./ProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Shield } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [result, profileRow] = await Promise.all([getMyProfilePageData(), getProfile()]);
  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-destructive text-sm">
        Could not load your profile. Please try again later.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      {profileRow && (
        <Card className="md:hidden mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seller &amp; platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/vendor"
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5 text-primary shrink-0" />
              Vendor Hub
            </Link>
            {profileRow.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <Shield className="h-5 w-5 text-primary shrink-0" />
                Admin dashboard
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <ProfileForm userId={user.id} initial={result.data} />
    </div>
  );
}
