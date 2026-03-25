"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { upsertAIPersona, type AIPersona, type UpsertPersonaInput } from "@/actions/ai-personas";
import {
  Bot,
  Sparkles,
  MessageSquare,
  Settings2,
  Gauge,
} from "lucide-react";

const TEMPLATES = [
  {
    value: "professional",
    label: "Professional Assistant",
    description: "Clear, concise, and business-focused",
    emoji: "💼",
  },
  {
    value: "friendly",
    label: "Friendly Helper",
    description: "Warm, casual, and conversational",
    emoji: "😊",
  },
  {
    value: "streetwear",
    label: "Streetwear Expert",
    description: "Trendy, uses slang, knows the culture",
    emoji: "🧢",
  },
  {
    value: "tech",
    label: "Tech Enthusiast",
    description: "Spec-focused, precise, and informative",
    emoji: "💻",
  },
  {
    value: "luxury",
    label: "Luxury Boutique",
    description: "Sophisticated, elegant, and exclusive",
    emoji: "✨",
  },
] as const;

interface Props {
  shopId: string;
  shopSlug: string;
  initial: AIPersona | null;
}

export function PersonaConfigForm({ shopId, shopSlug, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<UpsertPersonaInput>({
    name: initial?.name ?? "Aria",
    description_template: initial?.description_template ?? "professional",
    system_prompt: initial?.system_prompt ?? "",
    greeting_message:
      initial?.greeting_message ?? "Hi! How can I help you find something today? 😊",
    temperature: initial?.temperature ?? 0.7,
    top_p: initial?.top_p ?? 1.0,
    is_active: initial?.is_active ?? false,
  });

  const selectedTemplate = TEMPLATES.find((t) => t.value === form.description_template);

  function handleSave() {
    startTransition(async () => {
      const result = await upsertAIPersona(shopId, form);
      if (result.success) {
        toast.success("AI Assistant saved!");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ── Left: identity + personality ── */}
      <div className="xl:col-span-2 space-y-6">

        {/* Persona identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Persona Identity</CardTitle>
            </div>
            <CardDescription>Give your AI assistant a name and personality.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Assistant Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Aria, Jake, Nova"
                maxLength={30}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Personality Template</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, description_template: t.value }))
                    }
                    className={[
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      form.description_template === t.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    ].join(" ")}
                  >
                    <span className="text-xl mt-0.5">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Greeting + Extra Instructions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Messages & Instructions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="greeting">Greeting Message</Label>
              <Input
                id="greeting"
                value={form.greeting_message}
                onChange={(e) => setForm((f) => ({ ...f, greeting_message: e.target.value }))}
                placeholder="What the AI says when a customer opens the chat"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Shown as the first message when a customer opens the chat.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="system_prompt">Extra Instructions</Label>
              <Textarea
                id="system_prompt"
                value={form.system_prompt}
                onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                placeholder={`e.g. "Always mention our free shipping on orders over ₱1,500. Promote the Summer Collection first."`}
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                Custom rules and talking points layered on top of the base personality. Max 2,000 characters.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced tuning */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Advanced Tuning</CardTitle>
            </div>
            <CardDescription>
              Control how creative vs. predictable the AI is.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {form.temperature.toFixed(2)}
                </span>
              </div>
              <Slider
                min={0}
                max={1.5}
                step={0.05}
                value={[form.temperature]}
                onValueChange={([v]) => setForm((f) => ({ ...f, temperature: v }))}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Predictable (0.0)</span>
                <span>Balanced (0.7)</span>
                <span>Creative (1.5)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Top P</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {form.top_p.toFixed(2)}
                </span>
              </div>
              <Slider
                min={0.1}
                max={1}
                step={0.05}
                value={[form.top_p]}
                onValueChange={([v]) => setForm((f) => ({ ...f, top_p: v }))}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Focused (0.1)</span>
                <span>Diverse (1.0)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Right: status + save ── */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enable AI Chat</p>
                <p className="text-xs text-muted-foreground">
                  Show AI widget on your storefront
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            {form.is_active && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 dark:bg-green-950/20 dark:border-green-900 dark:text-green-300">
                Your AI assistant will be visible to customers when they visit your shop.
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isPending ? "Saving…" : "Save Assistant"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>How your assistant will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{form.name || "Aria"}</p>
                  <Badge variant="secondary" className="text-xs">
                    {selectedTemplate?.emoji} {selectedTemplate?.label}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                {form.greeting_message || "Hi! How can I help you today?"}
              </div>

              <div className="flex justify-end">
                <div className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm">
                  Tell me about your products
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
