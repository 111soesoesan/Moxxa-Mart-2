"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, X, Send, Minimize2 } from "lucide-react";

type LocalMessage = {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  created_at: string;
};

type Props = {
  shopSlug: string;
  shopName?: string;
};

function getSessionId(): string {
  const key = `webchat_session_${typeof window !== "undefined" ? location.hostname : ""}`;
  const existing = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  if (existing) return existing;
  const id = crypto.randomUUID();
  if (typeof localStorage !== "undefined") localStorage.setItem(key, id);
  return id;
}

export function WebChatWidget({ shopSlug, shopName = "Support" }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const sessionId = useRef(getSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!draftText.trim() || sending) return;
    const text = draftText.trim();
    setDraftText("");
    setSending(true);

    const localMsg: LocalMessage = {
      id: crypto.randomUUID(),
      direction: "inbound",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localMsg]);

    try {
      await fetch(`/api/webchat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_slug: shopSlug,
          session_id: sessionId.current,
          sender_name: name || "Guest",
          content: text,
        }),
      });
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

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl shadow-2xl border bg-background flex flex-col overflow-hidden"
          style={{ height: "480px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{shopName}</p>
              <p className="text-[11px] text-primary-foreground/80">We typically reply within minutes</p>
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
                  if (e.key === "Enter" && name.trim()) setNameConfirmed(true);
                }}
                className="text-center"
                autoFocus
              />
              <Button
                className="w-full"
                onClick={() => setNameConfirmed(true)}
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
                      const isOutbound = msg.direction === "outbound";
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isOutbound ? "justify-start" : "justify-end")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                              isOutbound
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

      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-xl"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
