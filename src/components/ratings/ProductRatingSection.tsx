"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarSummary, StarPicker } from "@/components/ratings/StarRating";
import { getViewerProductRatingState, setProductRating } from "@/actions/ratings";
import { toast } from "sonner";

export function ProductRatingSection({
  productId,
  ratingAvg,
  ratingCount,
  signInNextPath,
}: {
  productId: string;
  ratingAvg: number | null | undefined;
  ratingCount: number | null | undefined;
  signInNextPath: string;
}) {
  const router = useRouter();
  const [myStars, setMyStars] = useState<number | null>(null);
  const [viewer, setViewer] = useState<"guest" | "owner" | "rater" | "loading">("loading");
  const [pending, startTransition] = useTransition();
  const loginHref = `/login?next=${encodeURIComponent(signInNextPath)}`;

  useEffect(() => {
    let cancelled = false;
    getViewerProductRatingState(productId).then((s) => {
      if (cancelled) return;
      setViewer(s.kind);
      setMyStars(s.myStars);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const onSelect = (stars: number) => {
    startTransition(async () => {
      const res = await setProductRating(productId, stars);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Thanks for your rating!");
      setMyStars(stars);
      router.refresh();
    });
  };

  if (viewer === "loading") {
    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Loading ratings…</div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-card px-4 py-3 space-y-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Rate this product</p>
        <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} />
      </div>
      {viewer === "owner" && (
        <p className="text-xs text-muted-foreground">Ratings from buyers appear here.</p>
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
          <StarPicker
            value={null}
            onSelect={(_stars: number) => {
              router.push(loginHref);
            }}
            size="md"
          />
        </div>
      )}
      {viewer === "rater" && (
        <div className="space-y-1.5 pt-0.5">
          <p className="text-sm text-muted-foreground">{myStars ? "Update your rating" : "Your rating"}</p>
          <StarPicker value={myStars} onSelect={onSelect} disabled={pending} size="md" />
        </div>
      )}
    </div>
  );
}
