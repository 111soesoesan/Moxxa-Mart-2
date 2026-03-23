"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, X, Send, Minimize2 } from "lucide-react";

type ChatMessage = {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  created_at: string;
};

type Props = {
  shopSlug: string;
  shopName?: string;
};

function getOrCreateSessionId(shopSlug: string): string {
  const key = `webchat_session_${shopSlug}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function getSavedName(shopSlug: string): string {
  return localStorage.getItem(`webchat_name_${shopSlug}`) ?? "";
}

function saveName(shopSlug: string, name: string) {
  localStorage.setItem(`webchat_name_${shopSlug}`, name);
}

export function WebChatWidget({ shopSlug, shopName = "Support" }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const sessionId = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    sessionId.current = getOrCreateSessionId(shopSlug);
    const savedName = getSavedName(shopSlug);
    if (savedName) {
      setName(savedName);
      setNameConfirmed(true);
    }

    fetch(`/api/webchat?shop_slug=${encodeURIComponent(shopSlug)}`)
      .then((r) => r.json())
      .then((d: { active?: boolean }) => setActive(d.active ?? false))
      .catch(() => setActive(false));
  }, [shopSlug]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`webchat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaging_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as {
            id: string;
            direction: string;
            content: string;
            created_at: string;
          };
          if (msg.direction === "outbound") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [
                ...prev,
                {
                  id: msg.id,
                  direction: "outbound",
                  content: msg.content,
                  created_at: msg.created_at,
                },
              ];
            });
            setTimeout(
              () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
              50
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleConfirmName = useCallback(() => {
    if (!name.trim()) return;
    saveName(shopSlug, name.trim());
    setNameConfirmed(true);
  }, [name, shopSlug]);

  const handleSend = async () => {
    if (!draftText.trim() || sending) return;
    const text = draftText.trim();
    setDraftText("");
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: crypto.randomUUID(),
      direction: "inbound",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/webchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_slug: shopSlug,
          session_id: sessionId.current,
          sender_name: name || "Guest",
          content: text,
        }),
      });

      const data = await res.json() as { conversation_id?: string };
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
    } catch {
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (active === false) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-80 rounded-2xl shadow-2xl border bg-background flex flex-col overflow-hidden"
          style={{ height: "480px" }}
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{shopName}</p>
              <p className="text-[11px] text-primary-foreground/80">
                We typically reply within minutes
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setOpen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {!nameConfirmed ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
              <p className="text-sm text-center text-muted-foreground">
                Hello! Before we start, what&apos;s your name?
              </p>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmName();
                }}
                className="text-center"
                autoFocus
              />
              <Button
                className="w-full"
                onClick={handleConfirmName}
                disabled={!name.trim()}
              >
                Start Chat
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4 py-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground pt-6">
                    Send us a message and we&apos;ll get back to you!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => {
                      const isVendorReply = msg.direction === "outbound";
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isVendorReply ? "justify-start" : "justify-end"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                              isVendorReply
                                ? "bg-muted rounded-bl-sm"
                                : "bg-primary text-primary-foreground rounded-br-sm"
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Type a message…"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!draftText.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {active !== null && (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-xl"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </Button>
      )}
    </div>
  );
}
