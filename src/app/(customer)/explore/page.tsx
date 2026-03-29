import { Suspense } from "react";
import { ExploreHero } from "@/components/explore/ExploreHero";
import { BentoNavGrid } from "@/components/explore/BentoNavGrid";
import {
  FeaturedShopsExplore,
  FeaturedShopsExploreSkeleton,
} from "@/components/explore/FeaturedShopsExplore";
import { FreshPicksExplore, FreshPicksExploreSkeleton } from "@/components/explore/FreshPicksExplore";

export default function ExplorePage() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-6">
      <ExploreHero />
      <BentoNavGrid />

      <Suspense fallback={<FeaturedShopsExploreSkeleton />}>
        <FeaturedShopsExplore />
      </Suspense>

      <Suspense fallback={<FreshPicksExploreSkeleton />}>
        <FreshPicksExplore />
      </Suspense>
    </div>
  );
}
