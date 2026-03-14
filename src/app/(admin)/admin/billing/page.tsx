"use client";

import { useEffect, useState, useTransition } from "react";
import { getPendingBillingProofs, verifyBillingProof, rejectBillingProof, getAllBillingProofs } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type PendingProof = Awaited<ReturnType<typeof getPendingBillingProofs>>[number];
type AllProof = Awaited<ReturnType<typeof getAllBillingProofs>>[number];

function ProofCard({
  proof,
  onVerify,
  onReject,
  isPending,
  showActions = true,
}: {
  proof: PendingProof | AllProof;
  onVerify?: (proof: PendingProof) => void;
  onReject?: (proof: PendingProof) => void;
  isPending: boolean;
  showActions?: boolean;
}) {
  const shop = proof.shops as { name: string; slug: string } | null;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-sm">{shop?.name ?? "Unknown shop"}</p>
            <p className="text-xs text-muted-foreground">Submitted {formatDateTime(proof.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-green-700">{formatCurrency(proof.amount)}</p>
            <StatusBadge type="billing" value={proof.status} />
          </div>
        </div>

        <a
          href={proof.screenshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />View payment screenshot
        </a>

        {proof.admin_notes && (
          <div className="text-xs bg-muted rounded p-2 text-muted-foreground">
            <span className="font-medium">Admin notes: </span>{proof.admin_notes}
          </div>
        )}

        {proof.verified_at && (
          <p className="text-xs text-muted-foreground">Verified at {formatDateTime(proof.verified_at)}</p>
        )}

        {showActions && onVerify && onReject && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onVerify(proof as PendingProof)}
              disabled={isPending}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Verify & Activate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(proof as PendingProof)}
              disabled={isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminBillingPage() {
  const [pending, setPending] = useState<PendingProof[]>([]);
  const [all, setAll] = useState<AllProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<PendingProof | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const reload = () => {
    setLoading(true);
    Promise.all([getPendingBillingProofs(), getAllBillingProofs()]).then(([p, a]) => {
      setPending(p);
      setAll(a);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, []);

  const handleVerify = (proof: PendingProof) => {
    const shop = proof.shops as { name: string; slug: string; owner_id?: string } | null;
    startTransition(async () => {
      const result = await verifyBillingProof(proof.id, proof.shop_id);
      if ("error" in result && result.error) { toast.error(result.error as string); return; }
      toast.success(`Payment verified — ${shop?.name ?? "shop"} subscription extended.`);
      reload();
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    if (!rejectNotes.trim()) { toast.error("Please add a rejection note."); return; }
    startTransition(async () => {
      const result = await rejectBillingProof(rejectTarget.id, rejectNotes.trim());
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Billing proof rejected.");
      setRejectTarget(null);
      setRejectNotes("");
      reload();
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Verify vendor payment screenshots to activate shops.</p>
        </div>
        {!loading && <Badge variant="secondary">{pending.length} pending</Badge>}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border rounded-xl">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No pending proofs</p>
              <p className="text-sm mt-1">All billing submissions have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((proof) => (
                <ProofCard
                  key={proof.id}
                  proof={proof}
                  onVerify={handleVerify}
                  onReject={setRejectTarget}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : all.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No billing history yet.</p>
          ) : (
            <div className="space-y-3">
              {all.map((proof) => (
                <ProofCard key={proof.id} proof={proof} isPending={isPending} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Billing Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason / admin note</Label>
            <Textarea
              placeholder="e.g. Screenshot is unclear. Please re-upload with the full receipt visible."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectNotes(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
