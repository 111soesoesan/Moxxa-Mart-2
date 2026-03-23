"use client";

import { useState, useEffect } from "react";
import {
  getShopChannels,
  upsertChannelSettings,
  testChannelConnection,
  type MessagingChannel,
  type MessagingPlatform,
} from "@/actions/messaging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

type Props = {
  shopId: string;
  shopSlug: string;
};

const PLATFORMS: { key: MessagingPlatform; label: string; description: string; colorClass: string }[] = [
  {
    key: "telegram",
    label: "Telegram Bot",
    description: "Paste your bot token below. When you enable and save, the webhook is registered automatically — no manual setup needed.",
    colorClass: "text-sky-600",
  },
  {
    key: "viber",
    label: "Viber Bot",
    description: "Paste your Viber auth token below. When you enable and save, the webhook is registered with Viber automatically.",
    colorClass: "text-violet-600",
  },
  {
    key: "webchat",
    label: "Web Chat Widget",
    description: "Toggle this on to make the chat bubble appear on your public storefront. Customers can message you directly from any product page.",
    colorClass: "text-blue-600",
  },
];

function TelegramForm({
  channel,
  shopId,
  onSave,
}: {
  channel: MessagingChannel | undefined;
  shopId: string;
  onSave: () => void;
}) {
  const config = channel?.config as Record<string, string> | undefined;
  const [botToken, setBotToken] = useState(config?.bot_token ?? "");
  const [isActive, setIsActive] = useState(channel?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; info?: string; error?: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    const existingSecret = config?.webhook_secret;
    const { error, webhookStatus } = await upsertChannelSettings(
      shopId,
      "telegram",
      { bot_token: botToken, ...(existingSecret ? { webhook_secret: existingSecret } : {}) },
      isActive
    );
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(webhookStatus ?? "Telegram settings saved");
      onSave();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await testChannelConnection(shopId, "telegram");
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="telegram-active" className="font-medium">Enable Telegram Bot</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controls whether the bot responds to messages from customers
          </p>
        </div>
        <Switch id="telegram-active" checked={isActive} onCheckedChange={setIsActive} />
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
          <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">
            @BotFather
          </a>{" "}
          on Telegram. Saving will automatically register the webhook.
        </p>
      </div>

      {testResult && (
        <Alert className={testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-green-700" : "text-red-700"}`}>
            {testResult.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            {testResult.info ?? testResult.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !botToken}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save &amp; Register
        </Button>
        {channel && (
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
        )}
      </div>
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
  const config = channel?.config as Record<string, string> | undefined;
  const [authToken, setAuthToken] = useState(config?.auth_token ?? "");
  const [isActive, setIsActive] = useState(channel?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; info?: string; error?: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    const { error, webhookStatus } = await upsertChannelSettings(
      shopId,
      "viber",
      { auth_token: authToken },
      isActive
    );
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(webhookStatus ?? "Viber settings saved");
      onSave();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await testChannelConnection(shopId, "viber");
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="viber-active" className="font-medium">Enable Viber Bot</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controls whether the bot responds to messages from Viber customers
          </p>
        </div>
        <Switch id="viber-active" checked={isActive} onCheckedChange={setIsActive} />
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
          <a href="https://partners.viber.com" target="_blank" rel="noopener noreferrer" className="underline">
            Viber Admin Panel
          </a>
          . Saving will automatically register the webhook.
        </p>
      </div>

      {testResult && (
        <Alert className={testResult.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-green-700" : "text-red-700"}`}>
            {testResult.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            {testResult.info ?? testResult.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !authToken}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save &amp; Register
        </Button>
        {channel && (
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
        )}
      </div>
    </div>
  );
}

function WebChatForm({
  channel,
  shopId,
  onSave,
}: {
  channel: MessagingChannel | undefined;
  shopId: string;
  onSave: () => void;
}) {
  const [isActive, setIsActive] = useState(channel?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; info?: string; error?: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    const { error } = await upsertChannelSettings(shopId, "webchat", {}, isActive);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(isActive ? "Web chat enabled on your storefront" : "Web chat hidden from storefront");
      onSave();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await testChannelConnection(shopId, "webchat");
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="webchat-active" className="font-medium">Show chat widget on storefront</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            When on, a chat bubble appears on your public shop pages for customers to message you
          </p>
        </div>
        <Switch id="webchat-active" checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {testResult && (
        <Alert className={testResult.ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <AlertDescription className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-green-700" : "text-amber-700"}`}>
            {testResult.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <XCircle className="h-4 w-4 shrink-0" />}
            {testResult.info ?? testResult.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
        {channel && (
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Check Status
          </Button>
        )}
      </div>
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
          <div key={i} className="h-44 rounded-lg bg-muted animate-pulse" />
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
                  <CardTitle className={`text-base flex items-center gap-2 ${p.colorClass}`}>
                    {p.label}
                    {channel?.is_active && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-200 bg-green-50 text-[10px]"
                      >
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
                <WebChatForm channel={channel} shopId={shopId} onSave={load} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
