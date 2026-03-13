import { getProfile } from "@/actions/auth";
import { CartProvider } from "@/context/CartContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Header profile={profile} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
