import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyShops } from "@/actions/shops";
import { getAIPersona, getAIConversationStats } from "@/actions/ai-personas";
import { PersonaConfigForm } from "@/components/vendor/ai/PersonaConfigForm";
import { getShopChannels } from "@/actions/messaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Zap, TrendingUp } from "lucide-react";
import { ChannelAIAssignment } from "@/components/vendor/ai/ChannelAIAssignment";

type Props = {
  params: Promise<{ shopSlug: string }>;
};

export default async function AIAssistantPage({ params }: Props) {
  const { shopSlug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const shops = await getMyShops();
  const shop = shops.find((s) => s.slug === shopSlug);
  if (!shop) notFound();

  const [persona, stats] = await Promise.all([
    getAIPersona(shop.id),
    getAIConversationStats(shop.id),
  ]);

  const channels = await getShopChannels(shop.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">AI Assistant</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure your AI persona and assign it to the channels where it should auto-reply.
          </p>
        </div>
      </div>

      {/* Usage stats */}
      {persona && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total_sessions.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total_messages.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Tokens In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.tokens_input.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Tokens Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.tokens_output.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Config form */}
      <div className="space-y-6">
        {/* Channel assignment */}
        <ChannelAIAssignment
          shopId={shop.id}
          channels={channels}
        />

        {/* Config form */}
      <PersonaConfigForm shopId={shop.id} initial={persona} />
      </div>
    </div>
  );
}
