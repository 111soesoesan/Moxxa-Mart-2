"use client";

import { Footer } from "./Footer";
import { AppBottomNav } from "./AppBottomNav";

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
} | null;

export function CustomerAppChrome({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  return (
    <>
      <main className="flex-1 pb-[4.75rem] md:pb-0">{children}</main>
      <div className="hidden md:block mt-auto">
        <Footer />
      </div>
      <AppBottomNav profile={profile} />
    </>
  );
}
