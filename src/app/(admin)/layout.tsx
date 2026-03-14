import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LayoutDashboard, Store, CreditCard, LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-sm text-primary flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              Admin Hub
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/admin" className="text-sm px-3 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />Overview
              </Link>
              <Link href="/admin/shops" className="text-sm px-3 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />Shops
              </Link>
              <Link href="/admin/billing" className="text-sm px-3 py-1.5 rounded-md hover:bg-muted transition-colors flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />Billing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{profile?.full_name ?? user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                <LogOut className="h-3 w-3 mr-1" />Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted/20">{children}</main>
    </div>
  );
}
