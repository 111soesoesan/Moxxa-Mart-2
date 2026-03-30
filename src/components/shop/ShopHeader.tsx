import Image from "next/image";
import { AlertCircle, Check, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Shop = {
  name: string;
  slug: string;
  status: string;
  logo_url?: string | null;
  cover_url?: string | null;
  profile_image_url?: string | null;
  banner_image_url?: string | null;
  shop_bio?: string | null;
};

type Props = {
  shop: Shop;
};

function LogoBox({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-full border-[3px] border-background bg-background",
        "shadow-md ring-1 ring-border/70 md:h-[5.25rem] md:w-[5.25rem]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ShopHeader({ shop }: Props) {
  const bannerUrl = shop.banner_image_url ?? shop.cover_url;
  const profileUrl = shop.profile_image_url ?? shop.logo_url;
  const isApproved = shop.status === "active";
  const hasBio = Boolean(shop.shop_bio?.trim());

  const logoInner = profileUrl ? (
    <Image
      src={profileUrl}
      alt=""
      fill
      className="object-cover"
      sizes="(max-width: 768px) 68px, 84px"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-muted/80">
      <Store className="h-9 w-9 text-primary/45 md:h-11 md:w-11" strokeWidth={1.25} aria-hidden />
    </div>
  );

  const titleRow = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h1
        className={cn(
          "min-w-0 max-w-full truncate text-xl font-bold tracking-tight md:text-2xl sm:text-white",
          hasBio ? "text-foreground" : "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
        )}
      >
        {shop.name}
      </h1>
      {isApproved ? (
        <span
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-md",
            hasBio
              ? "bg-primary text-primary-foreground ring-1 ring-primary/25"
              : "bg-white/95 text-primary ring-2 ring-white/40"
          )}
          title="Verified shop"
          aria-label="Verified shop"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </span>
      ) : null}
    </div>
  );

  return (
    <header className="border-b border-border/50 bg-background">
      <div className="w-full pt-2 sm:pt-3">
        <div className="px-0 sm:px-2 md:px-3">
          <div
            className={cn(
              "relative overflow-hidden bg-muted",
              "rounded-b-2xl sm:rounded-2xl",
              "shadow-sm ring-1 ring-border/25 dark:ring-border/40"
            )}
          >
          <div
            className={cn(
              "relative w-full max-h-[min(42vh,22rem)] min-h-[10.5rem]",
              "aspect-[2.2/1] md:aspect-[2.5/1] md:min-h-[12.5rem] md:max-h-[min(38vh,26rem)]"
            )}
          >
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-muted via-muted to-primary/12"
                aria-hidden
              />
            )}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-t",
                hasBio
                  ? "from-black/50 via-black/12 to-transparent"
                  : "from-black/75 via-black/40 to-black/15"
              )}
              aria-hidden
            />

            {!hasBio ? (
              <div className="absolute inset-x-0 bottom-0 z-[2]">
                <div className="flex items-end gap-4 px-4 pb-5 pt-12 md:gap-5 md:pb-6 md:pt-16">
                  <div
                    className={cn(
                      "relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-full border-[3px] border-white/90 bg-background/10 shadow-lg backdrop-blur-[2px] md:h-[5.25rem] md:w-[5.25rem]",
                      "ring-1 ring-white/25"
                    )}
                  >
                    {logoInner}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 pb-0.5">
                    {titleRow}
                    {!isApproved ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="outline"
                          className="border-yellow-200/90 bg-yellow-50/95 text-xs text-yellow-900 backdrop-blur-sm"
                        >
                          {shop.status === "pending" ? "Pending review" : "Draft"}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        {hasBio ? (
          <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-4 -mt-11 pb-5 pt-0 md:-mt-14 md:pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <LogoBox>{logoInner}</LogoBox>
              <div className="min-w-0 flex-1 space-y-1 sm:pb-1">
                {titleRow}
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-2 md:line-clamp-3">
                  {shop.shop_bio}
                </p>
                {!isApproved ? (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <Badge
                      variant="outline"
                      className="border-yellow-200 bg-yellow-50 text-xs text-yellow-800"
                    >
                      {shop.status === "pending" ? "Pending review" : "Draft"}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>

            {!isApproved ? (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-800" />
                <AlertDescription className="text-sm text-yellow-800">
                  This shop is {shop.status === "pending" ? "pending approval" : "not yet published"}. You
                  can browse products but purchases may not be available yet.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

      {!hasBio ? (
        <div className="mx-auto max-w-7xl px-3 pb-3 sm:px-4">
          {!isApproved ? (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-800" />
              <AlertDescription className="text-sm text-yellow-800">
                This shop is {shop.status === "pending" ? "pending approval" : "not yet published"}. You
                can browse products but purchases may not be available yet.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
      </div>
    </header>
  );
}
