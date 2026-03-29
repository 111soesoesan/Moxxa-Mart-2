import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

/** Marketplace-style hero photo (Unsplash); left overlay keeps copy readable. */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80";

export function ExploreHero() {
  return (
    <section className="mb-6 md:mb-8">
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[350px] sm:min-h-[400px] md:min-h-[500px] shadow-md ring-1 ring-border/60">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Primary wash from the left for text; image shows through on the right */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary from-[8%] via-primary/88 via-[42%] to-primary/25 md:to-primary/15"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 md:from-black/20" aria-hidden />
        <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-8 sm:py-12 md:px-12 md:py-16 lg:py-20 text-primary-foreground">
          <div className="min-w-0 max-w-2xl lg:max-w-3xl">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80 mb-3 md:mb-4">
              Marketplace
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.1] drop-shadow-sm">
              Discover products &amp; shops
            </h1>
            <p className="mt-4 md:mt-6 text-sm md:text-base lg:text-lg text-primary-foreground/90 leading-relaxed drop-shadow-sm">
              Curated essentials and unique finds from independent merchants. Start with the catalog or explore
              storefronts.
            </p>

            <div className="mt-8 md:mt-10 flex flex-wrap gap-3 sm:gap-4 shrink-0">
              <Button
                size="lg"
                className="h-11 md:h-12 px-6 md:px-8 font-bold bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-md rounded-full transition-all hover:scale-105 active:scale-95"
                asChild
              >
                <Link href="/products">Browse products</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 md:h-12 px-6 md:px-8 font-bold border-primary-foreground/55 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 hover:text-primary-foreground backdrop-blur-[2px] rounded-full transition-all hover:scale-105 active:scale-95"
                asChild
              >
                <Link href="/shops">Shop directory</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
