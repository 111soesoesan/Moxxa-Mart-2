import { getProfile } from "@/actions/auth";
import { CustomerLayoutClient } from "@/components/layout/CustomerLayoutClient";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return <CustomerLayoutClient profile={profile}>{children}</CustomerLayoutClient>;
}
