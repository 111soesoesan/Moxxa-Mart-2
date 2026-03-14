"use client";

import { useEffect, useState, useTransition } from "react";
import { getPendingShops, approveShop, rejectShop } from "@/actions/shops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, ExternalLink, MapPin, Phone, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type Shop = Awaited<ReturnType<typeof getPendingShops>>[number];

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Shop | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const reload = () => {
    setLoading(true);
    getPendingShops().then((s) => { setShops(s); setLoading(false); });
  };

  useEffect(() => { reload(); }, []);

  const handleApprove = (shop: Shop) => {
    startTransition(async () => {
      const result = await approveShop(shop.id);
      if (result?.error) { toast.error(result.error); return; }
      toast.success(`${shop.name} approved and is now active.`);
      reload();
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason."); return; }
    startTransition(async () => {
      const result = await rejectShop(rejectTarget.id, rejectReason.trim());
      if (result?.error) { toast.error(result.error); return; }
      toast.success(`${rejectTarget.name} has been rejected.`);
      setRejectTarget(null);
      setRejectReason("");
      reload();
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shop Inspection Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review shops requesting to go live on the marketplace.</p>
        </div>
        {!loading && <Badge variant="secondary">{shops.length} pending</Badge>}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm mt-1">No shops are pending inspection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shops.map((shop) => {
            const profile = shop.profiles as { full_name?: string; avatar_url?: string } | null;
            const paymentInfo = shop.payment_info as Record<string, string> | null;

            return (
              <Card key={shop.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {shop.logo_url ? (
                        <Image src={shop.logo_url} alt={shop.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">🏪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{shop.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">by {profile?.full_name ?? "Unknown"}</p>
                        </div>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/shop/${shop.slug}`} target="_blank">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />Preview
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {shop.description && (
                    <p className="text-sm text-muted-foreground">{shop.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {shop.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{shop.location}</span>}
                    {shop.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{shop.phone}</span>}
                    {shop.inspection_requested_at && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Requested {formatDateTime(shop.inspection_requested_at)}</span>
                    )}
                  </div>
                  {shop.delivery_policy && (
                    <div className="text-xs bg-muted rounded p-2">
                      <span className="font-medium">Policy: </span>{shop.delivery_policy}
                    </div>
                  )}
                  {paymentInfo && Object.keys(paymentInfo).length > 0 && (
                    <div className="text-xs bg-muted rounded p-2 space-y-0.5">
                      <span className="font-medium">Payment Info:</span>
                      {Object.entries(paymentInfo).map(([k, v]) => (
                        <div key={k}>{k}: {v}</div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(shop)}
                      disabled={isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectTarget(shop)}
                      disabled={isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for rejection (sent to vendor)</Label>
            <Textarea
              placeholder="e.g. Please upload a clearer shop logo. Your product descriptions need more detail."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              Reject Shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
