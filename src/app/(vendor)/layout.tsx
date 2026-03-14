import { redirect } from "next/navigation";
import { getUser } from "@/actions/auth";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return <>{children}</>;
}
