"use client";

import { useState, useEffect } from "react";
import {
  getShopChannels,
  upsertChannelSettings,
  type MessagingChannel,
  type MessagingPlatform,
} from "@/actions/messaging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Copy, ExternalLink } from "lucide-react";

type Props = {
  shopId: string;
  shopSlug: string;
};

const PLATFORMS: { key: MessagingPlatform; label: string; description: string; color: string }[] = [
  {
    key: "telegram",
    label: "Telegram Bot",
    description: "Connect a Telegram bot to receive and reply to customer messages directly from your inbox.",
    color: "text-sky-600",
  },
  {
    key: "viber",
    label: "Viber Bot",
    description: "Connect a Viber business bot to handle customer enquiries from Viber users.",
    color: "text-violet-600",
  },
  {
    key: "webchat",
    label: "Web Chat Widget",
    description: "Embed a live chat widget on your storefront so customers can message you directly.",
    color: "text-blue-600",
  },
];

function getWebhookUrl(platform: MessagingPlatform, channelId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/functions/v1/uma-webhook?platform=${platform}&channel_id=${channelId}`;
}

function TelegramForm({
  channel,
  shopId,
  onSave,
}: {
  channel: MessagingChannel | undefined;
  shopId: string;
  onSave: () => void;
}) {
  const [botToken, setBotToken] = useState(
    (channel?.config as Record<string, string>)?.bot_token ?? ""
  );
  const [isActive, setIsActive] = useState(channel?.is_active ?? false);
  const [saving, setSaving] = useState(false);

  const webhookUrl = channel?.id ? getWebhookUrl("telegram", channel.id) : null;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await upsertChannelSettings(shopId, "telegram", { bot_token: botToken }, isActive);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Telegram settings saved");
      onSave();
    }
  };

  const copyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="telegram-active" className="font-medium">Enable Telegram Bot</Label>
        <Switch
          id="telegram-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bot-token">Bot Token</Label>
        <Input
          id="bot-token"
          type="password"
          placeholder="123456789:ABCDefgh..."
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Get this from{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            @BotFather
          </a>{" "}
          on Telegram.
        </p>
      </div>

      {webhookUrl && (
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
            <Button variant="outline" size="icon" onClick={copyWebhook}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Register this URL as your Telegram webhook using the Telegram API or via BotFather.
          </p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !botToken}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Telegram Settings
      </Button>
    </div>
  );
}

function ViberForm({
  channel,
  shopId,
  onSave,
}: {
  channel: MessagingChannel | undefined;
  shopId: string;
  onSave: () => void;
}) {
  const [authToken, setAuthToken] = useState(
    (channel?.config as Record<string, string>)?.auth_token ?? ""
  );
  const [isActive, setIsActive] = useState(channel?.is_active ?? false);
  const [saving, setSaving] = useState(false);

  const webhookUrl = channel?.id ? getWebhookUrl("viber", channel.id) : null;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await upsertChannelSettings(shopId, "viber", { auth_token: authToken }, isActive);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Viber settings saved");
      onSave();
    }
  };

  const copyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="viber-active" className="font-medium">Enable Viber Bot</Label>
        <Switch
          id="viber-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="viber-token">Auth Token</Label>
        <Input
          id="viber-token"
          type="password"
          placeholder="Your Viber bot auth token"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Find this in your{" "}
          <a
            href="https://partners.viber.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Viber Admin Panel
          </a>
          .
        </p>
      </div>

      {webhookUrl && (
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
            <Button variant="outline" size="icon" onClick={copyWebhook}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Set this as your Viber webhook URL in the Viber Admin Panel.
          </p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !authToken}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Viber Settings
      </Button>
    </div>
  );
}

function WebChatForm({
  channel,
  shopId,
  shopSlug,
  onSave,
}: {
  channel: MessagingChannel | undefined;
  shopId: string;
  shopSlug: string;
  onSave: () => void;
}) {
  const [isActive, setIsActive] = useState(channel?.is_active ?? false);
  const [saving, setSaving] = useState(false);

  const embedSnippet = `<script
  src="${typeof window !== "undefined" ? window.location.origin : ""}/webchat-widget.js"
  data-shop-slug="${shopSlug}"
></script>`;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await upsertChannelSettings(shopId, "webchat", {}, isActive);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Web Chat settings saved");
      onSave();
    }
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    toast.success("Embed snippet copied");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="webchat-active" className="font-medium">Enable Web Chat Widget</Label>
        <Switch
          id="webchat-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        When enabled, a chat bubble will appear on your public storefront for customers to contact you directly.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Embed Snippet</Label>
          <Button variant="ghost" size="sm" onClick={copySnippet} className="gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>
        <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {embedSnippet}
        </pre>
        <p className="text-xs text-muted-foreground">
          Paste this before the closing{" "}
          <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag of your storefront.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Web Chat Settings
      </Button>
    </div>
  );
}

export function ChannelSettings({ shopId, shopSlug }: Props) {
  const [channels, setChannels] = useState<MessagingChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await getShopChannels(shopId);
    setChannels(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shopId]);

  const getChannel = (platform: MessagingPlatform) =>
    channels.find((c) => c.platform === platform);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((p) => {
        const channel = getChannel(p.key);
        return (
          <Card key={p.key}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className={`text-base flex items-center gap-2 ${p.color}`}>
                    {p.label}
                    {channel?.is_active && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">{p.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {p.key === "telegram" && (
                <TelegramForm channel={channel} shopId={shopId} onSave={load} />
              )}
              {p.key === "viber" && (
                <ViberForm channel={channel} shopId={shopId} onSave={load} />
              )}
              {p.key === "webchat" && (
                <WebChatForm channel={channel} shopId={shopId} shopSlug={shopSlug} onSave={load} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
