"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarSummary, StarPicker } from "@/components/ratings/StarRating";
import { setShopRating } from "@/actions/ratings";
import { toast } from "sonner";

type Viewer = "guest" | "owner" | "rater";

export function ShopRatingSection({
  shopId,
  ratingAvg,
  ratingCount,
  initialMyStars,
  viewer,
  signInNextPath,
}: {
  shopId: string;
  ratingAvg: number | null | undefined;
  ratingCount: number | null | undefined;
  initialMyStars: number | null;
  viewer: Viewer;
  /** Return URL after login when a guest taps stars */
  signInNextPath: string;
}) {
  const router = useRouter();
  const [myStars, setMyStars] = useState(initialMyStars);
  const [pending, startTransition] = useTransition();

  const loginHref = `/login?next=${encodeURIComponent(signInNextPath)}`;

  const onSelect = (stars: number) => {
    startTransition(async () => {
      const res = await setShopRating(shopId, stars);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Thanks for rating this shop!");
      setMyStars(stars);
      router.refresh();
    });
  };

  const onGuestSelect = (_stars: number) => {
    router.push(loginHref);
  };

  return (
    <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-card p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold">Rate this shop</h2>
        <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} className="text-sm" />
      </div>
      {viewer === "owner" && (
        <p className="text-xs text-muted-foreground">Customer ratings appear here. You can&apos;t rate your own shop.</p>
      )}
      {viewer === "guest" && (
        <div className="space-y-2 pt-0.5">
          <p className="text-xs text-muted-foreground">
            Tap a star to{" "}
            <Link href={loginHref} className="text-primary font-medium underline-offset-2 hover:underline">
              sign in
            </Link>{" "}
            and submit your rating.
          </p>
          <StarPicker value={null} onSelect={onGuestSelect} size="md" />
        </div>
      )}
      {viewer === "rater" && (
        <div className="space-y-2 pt-0.5">
          <p className="text-sm text-muted-foreground">{myStars ? "Update your rating" : "Your rating"}</p>
          <StarPicker value={myStars} onSelect={onSelect} disabled={pending} size="md" />
        </div>
      )}
    </div>
  );
}
