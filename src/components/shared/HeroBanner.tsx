import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroBannerProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  secondaryCta?: {
    text: string;
    href: string;
  };
  backgroundGradient?: string;
}

export function HeroBanner({
  title,
  subtitle,
  ctaText,
  ctaHref,
  secondaryCta,
  backgroundGradient = "from-primary/20 to-primary/40",
}: HeroBannerProps) {
  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${backgroundGradient} py-20 md:py-32`}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance">
            {subtitle}
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button size="lg" asChild>
              <Link href={ctaHref}>{ctaText}</Link>
            </Button>
            {secondaryCta && (
              <Button size="lg" variant="outline" asChild>
                <Link href={secondaryCta.href}>{secondaryCta.text}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
    </section>
  );
}
