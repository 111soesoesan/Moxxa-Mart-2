"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { upsertAIPersona, type AIPersona, type UpsertPersonaInput } from "@/actions/ai-personas";
import {
  Bot,
  Sparkles,
  MessageSquare,
  Settings2,
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
  initial: AIPersona | null;
}

export function PersonaConfigForm({ shopId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<UpsertPersonaInput>({
    name: initial?.name ?? "Aria",
    description_template: initial?.description_template ?? "professional",
    system_prompt: initial?.system_prompt ?? "",
    greeting_message:
      initial?.greeting_message ?? "Hi! How can I help you find something today? 😊",
  });

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

      </div>

      {/* ── Right: status + save ── */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Save Assistant</CardTitle>
            </div>
            <CardDescription>
              Save the persona here, then choose which channels it should handle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              The assistant no longer has a separate active status. Channel assignment now controls where it responds.
            </div>

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
      </div>
    </div>
  );
}
