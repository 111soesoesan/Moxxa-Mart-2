import Link from "next/link";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <Store className="h-5 w-5 text-primary" />
              <span>Moxxa Mart</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your trusted multi-vendor marketplace. Shop from verified local vendors.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-3 text-sm">Shop</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground">Browse All</Link></li>
              <li><Link href="/search" className="hover:text-foreground">Search</Link></li>
              <li><Link href="/orders" className="hover:text-foreground">My Orders</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3 text-sm">Sell</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/vendor" className="hover:text-foreground">Vendor Hub</Link></li>
              <li><Link href="/vendor/onboarding" className="hover:text-foreground">Open a Shop</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3 text-sm">Account</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
              <li><Link href="/signup" className="hover:text-foreground">Sign Up</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Moxxa Mart. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
