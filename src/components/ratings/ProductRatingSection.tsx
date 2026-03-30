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
    return <p className="text-xs text-muted-foreground">Loading ratings…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Ratings
        </p>
        <StarSummary avg={ratingAvg ?? null} count={ratingCount ?? 0} compact />
      </div>

      {viewer === "owner" && (
        <p className="text-xs leading-relaxed text-muted-foreground">Buyer ratings will show here.</p>
      )}

      {viewer === "guest" && (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <Link href={loginHref} className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to rate this product.
          </p>
          <StarPicker
            value={null}
            onSelect={() => {
              router.push(loginHref);
            }}
            size="sm"
            accent="primary"
          />
        </div>
      )}

      {viewer === "rater" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{myStars ? "Update your rating" : "Your rating"}</p>
          <StarPicker value={myStars} onSelect={onSelect} disabled={pending} size="sm" accent="primary" />
        </div>
      )}
    </div>
  );
}
