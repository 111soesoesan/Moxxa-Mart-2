import { getProfile } from "@/actions/auth";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/layout/Header";
import { CustomerAppChrome } from "@/components/layout/CustomerAppChrome";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return (
    <CartProvider>
      <div className="customer-site min-h-screen flex flex-col">
        <Header profile={profile} />
        <CustomerAppChrome profile={profile}>{children}</CustomerAppChrome>
      </div>
    </CartProvider>
  );
}
