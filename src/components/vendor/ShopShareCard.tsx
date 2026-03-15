"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Share2 } from "lucide-react";

interface ShopShareCardProps {
  shopSlug: string;
  shopName: string;
  status: "draft" | "pending" | "active" | "rejected" | "suspended";
}

export function ShopShareCard({ shopSlug, shopName, status }: ShopShareCardProps) {
  const [copied, setCopied] = useState(false);
  const shopUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/shop/${shopSlug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shopName,
          text: `Check out my shop on Moxxa Mart!`,
          url: shopUrl,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    }
  };

  const isPublished = status === "active";

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Share Your Shop</CardTitle>
            <CardDescription>
              {isPublished
                ? "Your shop is live! Share it with customers."
                : "Share your shop URL even while pending approval."}
            </CardDescription>
          </div>
          <Share2 className="h-5 w-5 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPublished && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-900">
              💡 Your shop is {status === "pending" ? "pending approval" : "in draft"}. Customers can still view your shop and products with this link.
            </p>
          </div>
        )}

        {/* Shop URL */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Shop URL</label>
          <div className="flex gap-2">
            <Input
              value={shopUrl}
              readOnly
              className="bg-white text-sm"
            />
            <Button
              onClick={handleCopy}
              size="sm"
              variant="outline"
              className="shrink-0"
              title={copied ? "Copied!" : "Copy URL"}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {copied ? "✓ Copied to clipboard!" : "Click to copy your shop URL"}
          </p>
        </div>

        {/* Status Badge */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Status</label>
          <div className="flex items-center gap-2">
            <Badge
              variant={isPublished ? "default" : "outline"}
              className={isPublished ? "bg-green-600" : "bg-yellow-600 text-white"}
            >
              {status === "active" ? "Active" : status === "pending" ? "Pending" : "Draft"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {isPublished ? "Your shop is publicly visible" : "Your shop is visible to preview"}
            </span>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Share</label>
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              onClick={() => {
                const text = `Check out my shop "${shopName}" on Moxxa Mart: ${shopUrl}`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Message
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-2 bg-white rounded border">
            <p className="text-xs text-muted-foreground">Direct Link</p>
            <p className="text-sm font-semibold">/shop/{shopSlug}</p>
          </div>
          <div className="p-2 bg-white rounded border">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-semibold capitalize">{status}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
