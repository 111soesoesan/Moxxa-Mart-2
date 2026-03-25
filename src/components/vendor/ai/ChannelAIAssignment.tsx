"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { MessagingChannel } from "@/actions/messaging";
import { setChannelAIEnabled } from "@/actions/ai-personas";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLATFORM_META: Record<
  MessagingChannel["platform"],
  { label: string; icon: ReactNode }
> = {
  webchat: { label: "Web Chat", icon: <MessageSquare className="h-4 w-4" /> },
  telegram: { label: "Telegram", icon: <Send className="h-4 w-4" /> },
  viber: { label: "Viber", icon: <Zap className="h-4 w-4" /> },
};

type Props = {
  shopId: string;
  channels: MessagingChannel[];
};

export function ChannelAIAssignment({ shopId, channels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const disabled = isPending;

  async function handleToggle(channelId: string, enabled: boolean) {
    startTransition(async () => {
      const res = await setChannelAIEnabled(shopId, channelId, enabled);
      if (!res.success) {
        toast.error(res.error ?? "Failed to update channel AI settings");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Channel AI Assignment
            </CardTitle>
            <CardDescription>
              Enable AI auto-replies for inbound messages on selected channels.
            </CardDescription>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
            Routed by channel
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messaging channels found.</p>
        ) : (
          channels.map((ch) => {
            const meta = PLATFORM_META[ch.platform];

            return (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {ch.platform === "webchat"
                        ? "Controls AI replies in the storefront chat widget."
                        : "Controls AI replies for inbound customer messages."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={ch.ai_enabled ? "border-primary/30 text-primary" : ""}
                  >
                    {ch.ai_enabled ? "AI Enabled" : "AI Disabled"}
                  </Badge>
                  <Switch
                    checked={ch.ai_enabled}
                    onCheckedChange={(v) => handleToggle(ch.id, v)}
                    disabled={disabled}
                    aria-label={`Toggle AI for ${meta.label}`}
                  />
                </div>
              </div>
            );
          })
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => router.refresh()}
            disabled={disabled}
          >
            Refresh
          </Button>
          <span>AI also stops when vendors take over a conversation.</span>
        </div>
      </CardContent>
    </Card>
  );
}
