import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

export function ShopHeader({ shop }: Props) {
  const bannerUrl = shop.banner_image_url ?? shop.cover_url;
  const profileUrl = shop.profile_image_url ?? shop.logo_url;
  const isApproved = shop.status === "active";

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-primary/30 overflow-hidden">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={`${shop.name} banner`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
      </div>

      {/* Profile row */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-end gap-4 -mt-10 mb-4 pt-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-md shrink-0">
              <AvatarImage src={profileUrl ?? undefined} alt={shop.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {shop.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1 flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{shop.name}</h1>
              {shop.shop_bio && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{shop.shop_bio}</p>
              )}
              {!isApproved && (
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                    {shop.status === "pending" ? "Pending Review" : "Draft"}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {!isApproved && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-800" />
              <AlertDescription className="text-sm text-yellow-800">
                This shop is {shop.status === "pending" ? "pending approval" : "not yet published"}.
                You can browse products but purchases may not be available yet.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
