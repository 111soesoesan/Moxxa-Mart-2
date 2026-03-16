import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Zap } from 'lucide-react';

interface PromotionalBannerProps {
  shopSlug: string;
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function PromotionalBanner({
  shopSlug,
  title = 'Exclusive Offers',
  description = 'Browse all products and find great deals',
  ctaText = 'Shop Now',
  ctaHref,
}: PromotionalBannerProps) {
  const defaultHref = `/shop/${shopSlug}/products`;

  return (
    <section className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/10 rounded-lg p-8 my-8">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href={ctaHref || defaultHref}>{ctaText}</Link>
        </Button>
      </div>
    </section>
  );
}
