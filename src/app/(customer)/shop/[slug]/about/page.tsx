import { notFound } from "next/navigation";
import { getShopBySlug } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export default async function ShopAboutPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const paymentInfo = shop.payment_info as Record<string, string> | null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">About {shop.name}</h1>
          <p className="text-muted-foreground">Learn more about this shop and how to connect</p>
        </div>

        {shop.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Our Story</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {shop.description}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shop.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Location</p>
                  <p className="text-muted-foreground text-sm">{shop.location}</p>
                </div>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Phone</p>
                  <p className="text-muted-foreground text-sm">{shop.phone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {shop.delivery_policy && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery & Returns Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {shop.delivery_policy}
              </p>
            </CardContent>
          </Card>
        )}

        {paymentInfo && Object.keys(paymentInfo).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accepted Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(paymentInfo).map(([method, detail]) => (
                  <div key={method} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{method}</p>
                      <p className="text-muted-foreground text-sm">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shop Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={shop.status === "active" ? "default" : "outline"}>
                {shop.status === "active"
                  ? "Active"
                  : shop.status === "pending"
                    ? "Pending Review"
                    : "Draft"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm font-medium">
                {new Date(shop.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
