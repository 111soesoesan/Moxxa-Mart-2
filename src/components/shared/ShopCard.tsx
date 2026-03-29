import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarSummary } from "@/components/ratings/StarRating";

type Shop = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  location?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

export function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link href={`/shop/${shop.slug}`}>
      <Card className="group overflow-hidden hover:shadow-md transition-shadow">
        <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/30 relative overflow-hidden">
          {shop.cover_url && (
            <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" sizes="400px" />
          )}
        </div>
        <CardContent className="p-4 -mt-6">
          <Avatar className="h-12 w-12 border-2 border-background shadow">
            <AvatarImage src={shop.logo_url ?? undefined} alt={shop.name} />
            <AvatarFallback>{shop.name[0]}</AvatarFallback>
          </Avatar>
          <p className="font-semibold mt-2 group-hover:text-primary transition-colors">{shop.name}</p>
          <StarSummary avg={shop.rating_avg ?? null} count={shop.rating_count ?? 0} className="text-xs mt-1" />
          {shop.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{shop.description}</p>
          )}
          {shop.location && (
            <p className="text-xs text-muted-foreground mt-1">📍 {shop.location}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
