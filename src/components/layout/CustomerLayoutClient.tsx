"use client";

import { CartProvider } from "@/context/CartContext";
import { CustomerFloatingUiProvider } from "@/context/CustomerFloatingUiContext";
import { CustomerHeaderSentinel } from "@/components/layout/CustomerHeaderSentinel";
import { Header } from "@/components/layout/Header";
import { CustomerAppChrome } from "@/components/layout/CustomerAppChrome";

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
} | null;

export function CustomerLayoutClient({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <CustomerFloatingUiProvider>
        <div className="customer-site flex min-h-screen flex-col">
          <CustomerHeaderSentinel />
          <Header profile={profile} />
          <CustomerAppChrome profile={profile}>{children}</CustomerAppChrome>
        </div>
      </CustomerFloatingUiProvider>
    </CartProvider>
  );
}
