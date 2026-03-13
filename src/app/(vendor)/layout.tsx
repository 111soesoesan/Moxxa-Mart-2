import { redirect } from "next/navigation";
import { getProfile } from "@/actions/auth";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/layout/Header";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Header profile={profile} />
        <main className="flex-1">{children}</main>
      </div>
    </CartProvider>
  );
}
