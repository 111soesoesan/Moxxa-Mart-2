import Link from "next/link";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function OpenShopPromoCard({ className }: { className?: string }) {
  return (
    <Link
      href="/vendor/onboarding"
      className={cn(
        "flex min-h-[280px] flex-col justify-between rounded-xl bg-primary p-5 text-primary-foreground shadow-md transition-[transform,box-shadow] hover:shadow-lg active:scale-[0.99]",
        className
      )}
    >
      <Store className="h-11 w-11 opacity-95" strokeWidth={1.5} aria-hidden />
      <div className="space-y-2">
        <p className="text-lg font-bold leading-tight">Open your shop</p>
        <p className="text-sm leading-relaxed text-primary-foreground/90">
          Reach customers on Moxxa Mart—list products and grow your business.
        </p>
      </div>
      <span className="mt-6 inline-flex h-10 min-h-10 w-full items-center justify-center rounded-lg bg-background text-sm font-semibold text-primary shadow-sm">
        Get started
      </span>
    </Link>
  );
}
