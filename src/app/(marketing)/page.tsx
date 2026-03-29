import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ShoppingBag,
  ShieldCheck,
  Zap,
  BarChart3,
  Headphones,
  ArrowRight,
  Check,
} from "lucide-react";

const FEATURES = [
  {
    icon: Store,
    title: "Multi-vendor marketplace",
    description: "Each seller gets a storefront, catalog, and orders in one place—shoppers discover everything in a single app.",
  },
  {
    icon: ShieldCheck,
    title: "Verified shops",
    description: "Platform oversight and structured payments help buyers trust who they’re buying from.",
  },
  {
    icon: Zap,
    title: "Fast setup for sellers",
    description: "Onboard, list products (including variations), and start selling without a separate storefront build.",
  },
  {
    icon: BarChart3,
    title: "Built-in operations",
    description: "Inventory, customer records, messaging, and blogs—tools vendors need day to day.",
  },
  {
    icon: ShoppingBag,
    title: "Frictionless checkout",
    description: "Guests or signed-in shoppers with saved profile details and cart flows tuned for conversion.",
  },
  {
    icon: Headphones,
    title: "Web chat & AI-ready",
    description: "Conversations tied to shops so support stays in context—extend with AI when you’re ready.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free to list",
    detail: "Commission or fees per your agreement",
    bullets: ["Shop profile & catalog", "Orders & basic analytics", "Marketplace discovery"],
    cta: "Open a shop",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "Scale as you sell",
    detail: "Ideal for active sellers",
    bullets: ["Everything in Starter", "Inventory & variants", "Customer CRM & messaging", "Blog & storefront pages"],
    cta: "Start selling",
    href: "/vendor/onboarding",
    highlighted: true,
  },
];

export default function MarketingHomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/15 via-background to-background py-16 md:py-24">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl space-y-6">
            <Badge variant="secondary" className="w-fit">
              Marketplace + vendor platform
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Sell and shop on one trusted platform
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty max-w-2xl">
              Moxxa Mart is a hybrid marketplace: customers explore curated shops and products, while vendors run
              their business with storefronts, inventory, orders, and messaging—without stitching tools together.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/signup">
                  Start selling <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link href="/explore">
                  Start shopping <ShoppingBag className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[min(100%,28rem)] h-[min(100%,28rem)] bg-primary/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20" id="features">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Built for both sides of the market</h2>
          <p className="text-muted-foreground mt-3">
            Whether you’re launching a shop or hunting for your next purchase, the same platform keeps experience
            consistent.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-muted/80">
              <CardHeader className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 border-y py-16 md:py-20" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Pricing for vendors</h2>
            <p className="text-muted-foreground mt-3">
              Start in the marketplace, then scale with tools for inventory, customers, and growth. Final billing
              terms are set with your organization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted ? "border-primary shadow-md ring-2 ring-primary/20" : "border-muted"
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.highlighted ? <Badge>Popular</Badge> : null}
                  </CardTitle>
                  <p className="text-2xl font-bold">{plan.price}</p>
                  <p className="text-sm text-muted-foreground">{plan.detail}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold max-w-xl mx-auto text-balance">
          Ready to shop the marketplace or open your shop?
        </h2>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Jump into the consumer app to browse, or create an account to start selling on Moxxa Mart.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button size="lg" asChild>
            <Link href="/explore">Browse marketplace</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">Create seller account</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
