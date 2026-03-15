import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShopBannerSectionProps {
  title: string;
  description?: string;
  bannerUrl?: string;
}

export function ShopBannerSection({ title, description, bannerUrl }: ShopBannerSectionProps) {
  return (
    <Card className="overflow-hidden mb-8">
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/20 overflow-hidden">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2">🏪</div>
              <p className="text-muted-foreground text-sm">Shop Banner</p>
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-6 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="w-fit">
          Shop Information
        </Badge>
      </CardContent>
    </Card>
  );
}
