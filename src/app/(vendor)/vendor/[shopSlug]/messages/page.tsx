"use client";

import { useState, useEffect } from "react";
import { getShopBySlug } from "@/actions/shops";
import { OmniInbox } from "@/components/vendor/messaging/OmniInbox";
import { ChannelSettings } from "@/components/vendor/messaging/ChannelSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Settings2 } from "lucide-react";

type Props = { params: Promise<{ shopSlug: string }> };

export default function MessagesPage({ params: paramsPromise }: Props) {
  const [shopSlug, setShopSlug] = useState("");
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { shopSlug: slug } = await paramsPromise;
      setShopSlug(slug);
      const shop = await getShopBySlug(slug);
      if (shop) {
        setShopId(shop.id);
      }
      setLoading(false);
    }
    init();
  }, [paramsPromise]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="flex-1 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Shop not found.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-0 p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage all your customer conversations across Telegram, Viber, and Web Chat.
        </p>
      </div>

      <Tabs defaultValue="inbox" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="inbox" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            Channels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="flex-1 mt-0 min-h-0" style={{ height: "calc(100vh - 220px)" }}>
          <OmniInbox shopId={shopId} />
        </TabsContent>

        <TabsContent value="channels" className="mt-0">
          <ChannelSettings shopId={shopId} shopSlug={shopSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
