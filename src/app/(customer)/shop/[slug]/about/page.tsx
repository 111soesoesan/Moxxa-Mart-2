import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getShopBySlug } from "@/actions/shops";
import { getShopPaymentMethodsForCustomers } from "@/actions/paymentMethods";
import { Badge } from "@/components/ui/badge";
import { Banknote, BookOpen, Landmark, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

function shopOwnerDisplayName(shop: { profiles?: unknown }): string | null {
  const p = shop.profiles;
  if (!p || typeof p !== "object") return null;
  if (Array.isArray(p)) {
    const row = p[0] as { full_name?: string | null } | undefined;
    return row?.full_name?.trim() || null;
  }
  const row = p as { full_name?: string | null };
  return row.full_name?.trim() || null;
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending review";
    case "suspended":
      return "Suspended";
    case "rejected":
      return "Rejected";
    default:
      return "Draft";
  }
}

export default async function ShopAboutPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const { data: paymentMethods } = await getShopPaymentMethodsForCustomers(shop.id);
  const curator = shopOwnerDisplayName(shop);
  const storyContent = shop.description?.trim() || shop.shop_bio?.trim() || null;
  const heroTagline =
    shop.shop_bio?.trim() ||
    (shop.description?.trim()
      ? "Our story, location, policies, and how to shop with us."
      : "Learn how we work, where we operate, and how to get in touch.");
  const established = format(new Date(shop.created_at), "MMMM yyyy");
  const isActive = shop.status === "active";

  const deliveryBlocks =
    shop.delivery_policy
      ?.split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean) ?? [];

  return (
    <div className="bg-muted/25">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        {/* Intro */}
        <header className="mb-12 md:mb-16">
          <span className="inline-block rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-foreground">
            Shop information
          </span>
          <div className="mt-5 flex flex-wrap items-baseline gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-[2.5rem] lg:leading-tight">
              {shop.name}
            </h1>
            {isActive ? (
              <span
                className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary"
                title="Verified shop"
                aria-label="Verified shop"
              />
            ) : null}
          </div>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {heroTagline}
          </p>
        </header>

        <div className="space-y-8 md:space-y-10">
          {/* Our story */}
          {storyContent ? (
            <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-foreground md:text-xl">Our story</h2>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base md:leading-relaxed">
                    {storyContent.split(/\n\s*\n/).map((para, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {para.trim()}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Shop information — left accent */}
          <section
            className={cn(
              "rounded-xl border border-border/60 bg-card py-6 pl-5 pr-6 shadow-sm md:py-8 md:pl-6 md:pr-8",
              "border-l-[3px] border-l-primary md:border-l-4"
            )}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground md:text-xl">Shop information</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                Status: {statusLabel(shop.status)}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Location
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground md:text-base">
                  {shop.location?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Established
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground md:text-base">{established}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Curation
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground md:text-base">
                  {curator || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Guest checkout
                </dt>
                <dd className="mt-2 text-sm font-medium text-foreground md:text-base">
                  {shop.allow_guest_purchase ? "Allowed" : "Account required"}
                </dd>
              </div>
            </dl>
            {!isActive ? (
              <div className="mt-6 border-t border-border/60 pt-6">
                <Badge variant="outline" className="text-xs">
                  {shop.status === "pending"
                    ? "This shop is awaiting approval."
                    : "This shop is not fully live on the marketplace yet."}
                </Badge>
              </div>
            ) : null}
          </section>

          {/* Contact */}
          {(shop.location || shop.phone) && (
            <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-bold text-foreground md:text-xl">Contact information</h2>
              <ul className="mt-6 space-y-5">
                {shop.location ? (
                  <li className="flex items-start gap-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Address
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground md:text-base">
                        {shop.location}
                      </p>
                    </div>
                  </li>
                ) : null}
                {shop.phone ? (
                  <li className="flex items-start gap-4">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Phone
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground md:text-base">{shop.phone}</p>
                    </div>
                  </li>
                ) : null}
              </ul>
            </section>
          )}

          {/* Delivery & returns */}
          {shop.delivery_policy?.trim() ? (
            <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-bold text-foreground md:text-xl">Delivery &amp; returns policy</h2>
              {deliveryBlocks.length >= 2 ? (
                <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
                  {deliveryBlocks.slice(0, 2).map((block, i) => {
                    const lines = block.split("\n");
                    const first = lines[0]?.trim() ?? "";
                    const rest = lines.slice(1).join("\n").trim();
                    const useHead =
                      first.length > 0 &&
                      first.length <= 48 &&
                      first === first.toUpperCase() &&
                      /^[A-Z0-9\s\-—&:]+$/.test(first);
                    return (
                      <div key={i}>
                        {useHead ? (
                          <>
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                              {first}
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                              {rest || first}
                            </p>
                          </>
                        ) : (
                          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base">
                            {block}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base">
                  {shop.delivery_policy.trim()}
                </p>
              )}
              {deliveryBlocks.length > 2 ? (
                <div className="mt-8 border-t border-border/60 pt-8">
                  {deliveryBlocks.slice(2).map((block, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base"
                    >
                      {block}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Payment methods — dark band */}
          {paymentMethods && paymentMethods.length > 0 ? (
            <section className="rounded-xl bg-foreground px-6 py-8 text-background shadow-md md:px-10 md:py-10">
              <h2 className="text-lg font-bold tracking-tight text-background md:text-xl">
                Accepted payment methods
              </h2>
              <p className="mt-2 max-w-xl text-sm text-background/70">
                Available options when you check out with this shop.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 md:gap-8">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/12 text-background ring-1 ring-background/20">
                      {pm.type === "cash" ? (
                        <Banknote className="h-6 w-6" aria-hidden />
                      ) : (
                        <Landmark className="h-6 w-6" aria-hidden />
                      )}
                    </div>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-background/90">
                      {pm.name}
                    </p>
                    {pm.description ? (
                      <p className="mt-1 text-xs leading-snug text-background/60">{pm.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
