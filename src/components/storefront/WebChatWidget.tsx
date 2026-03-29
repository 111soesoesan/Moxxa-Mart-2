"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageSquare, X, Send, Minimize2, Paperclip } from "lucide-react";

type ChatMessage = {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  content_type: "text" | "image" | "file" | "sticker";
  created_at: string;
  metadata?: {
    caption?: string | null;
  } | null;
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

function getMessagesCacheKey(shopSlug: string) {
  return `webchat_messages_cache_${shopSlug}`;
}

function loadCachedMessages(shopSlug: string, sessionId: string): ChatMessage[] {
  const raw = localStorage.getItem(getMessagesCacheKey(shopSlug));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as { sessionId?: string; messages?: ChatMessage[] };
    if (parsed.sessionId !== sessionId) return [];
    if (!Array.isArray(parsed.messages)) return [];
    return parsed.messages;
  } catch {
    return [];
  }
}

function persistCachedMessages(shopSlug: string, sessionId: string, messages: ChatMessage[]) {
  localStorage.setItem(
    getMessagesCacheKey(shopSlug),
    JSON.stringify({
      sessionId,
      // Keep cache small for fast storefront load.
      messages: messages
        .slice(-5)
        .map((m) => ({
          id: m.id,
          direction: m.direction,
          content: m.content,
          content_type: m.content_type,
          created_at: m.created_at,
          metadata: m.metadata ? { caption: m.metadata.caption ?? null } : null,
        })),
    })
  );
}

export function WebChatWidget({ shopSlug, shopName = "Support" }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<"cached" | "realtime">("cached");
  const sessionId = useRef<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  const refreshHistory = useCallback(async () => {
    const histRes = await fetch(
      `/api/webchat?shop_slug=${encodeURIComponent(shopSlug)}&session_id=${encodeURIComponent(
        sessionId.current
      )}`
    );
    const histData = (await histRes.json()) as {
      active?: boolean;
      conversation_id?: string | null;
      customer_name?: string | null;
      profile?: { full_name?: string | null } | null;
      history?: ChatMessage[];
    };

    if (histData.conversation_id) {
      setConversationId(histData.conversation_id);
    }

    const profileName = histData.profile?.full_name?.trim();
    if (profileName) {
      setName(profileName);
      setNameConfirmed(true);
      saveName(shopSlug, profileName);
    } else if (histData.customer_name?.trim()) {
      const n = histData.customer_name.trim();
      setName(n);
      setNameConfirmed(true);
      saveName(shopSlug, n);
    }

    if (histData.active && Array.isArray(histData.history)) {
      setMessages(
        histData.history.map((m) => ({
          ...m,
          content_type: ((m as unknown as { content_type?: ChatMessage["content_type"] }).content_type ??
            "text") as ChatMessage["content_type"],
          metadata: (m as unknown as { metadata?: { caption?: string | null } | null }).metadata
            ? {
                caption:
                  (m as unknown as { metadata?: { caption?: string | null } | null }).metadata
                    ?.caption ?? null,
              }
            : null,
        }))
      );
    }
  }, [shopSlug]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    let cancelled = false;

    setActive(null);
    setConversationId(null);
    setMessages([]);
    setHistoryLoading(true);
    setRealtimeStatus("cached");
    setAttachedImage(null);
    setImagePreviewUrl(null);

    const sid = getOrCreateSessionId(shopSlug);
    sessionId.current = sid;

    const savedName = getSavedName(shopSlug);
    if (savedName) {
      setName(savedName);
      setNameConfirmed(true);
    }

    // Instant UI: show last cached messages while the server history loads.
    const cached = loadCachedMessages(shopSlug, sid);
    if (cached.length > 0) {
      setMessages(cached);
      setRealtimeStatus("cached");
    }

    fetch(
      `/api/webchat?shop_slug=${encodeURIComponent(shopSlug)}&session_id=${encodeURIComponent(sid)}`
    )
      .then((r) => r.json())
      .then(
        (d: {
          active?: boolean;
          conversation_id?: string | null;
          customer_name?: string | null;
          profile?: { full_name?: string | null } | null;
          history?: ChatMessage[];
        }) => {
          if (cancelled) return;

          setActive(d.active ?? false);
          const profileName = d.profile?.full_name?.trim();
          if (profileName) {
            setName(profileName);
            setNameConfirmed(true);
            saveName(shopSlug, profileName);
          } else if (d.customer_name?.trim()) {
            const n = d.customer_name.trim();
            setName(n);
            setNameConfirmed(true);
            saveName(shopSlug, n);
          }

          if (!d.active) {
            setHistoryLoading(false);
            return;
          }

          if (Array.isArray(d.history)) {
            setMessages(
              d.history.map((m) => ({
                ...m,
                content_type: ((m as unknown as { content_type?: ChatMessage["content_type"] }).content_type ??
                  "text") as ChatMessage["content_type"],
                metadata: (m as unknown as { metadata?: { caption?: string | null } | null }).metadata
                  ? {
                      caption: (m as unknown as { metadata?: { caption?: string | null } | null }).metadata
                        ?.caption ?? null,
                    }
                  : null,
              }))
            );
          } else {
            setMessages([]);
          }

          if (d.conversation_id) setConversationId(d.conversation_id);
          setRealtimeStatus("cached");
          setHistoryLoading(false);
        }
      )
      .catch(() => {
        if (cancelled) return;
        setActive(false);
        setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shopSlug]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open]);

  // Persist the latest storefront-visible chat messages per shop to keep history across refreshes.
  useEffect(() => {
    if (!active) return;
    const sid = sessionId.current;
    if (!sid) return;
    try {
      persistCachedMessages(shopSlug, sid, messages);
    } catch {
      // Ignore storage errors (private mode, quota, etc).
    }
  }, [messages, shopSlug, active]);

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
            content_type?: ChatMessage["content_type"];
            metadata?: { caption?: string | null } | null;
            created_at: string;
          };
          if (msg.direction === "outbound") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [
                ...prev,
                {
                  id: msg.id,
                  direction: "outbound" as const,
                  content: msg.content,
                  content_type: (msg.content_type ?? "text") as ChatMessage["content_type"],
                  metadata: msg.metadata ? { caption: msg.metadata.caption ?? null } : null,
                  created_at: msg.created_at,
                },
              ].slice(-20);
            });
            setTimeout(
              () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
              50
            );
          }
        }
      )
      .subscribe();

    // Transition from cached history -> real-time stream once subscription is established.
    setRealtimeStatus("realtime");

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
    if (sending || historyLoading) return;

    const caption = draftText.trim();

    // Image send (customer -> vendor) via multipart upload.
    if (attachedImage) {
      setSending(true);
      const formData = new FormData();
      formData.append("shop_slug", shopSlug);
      formData.append("session_id", sessionId.current);
      formData.append("sender_name", name || "Guest");
      formData.append("content_type", "image");
      formData.append("caption", caption);
      formData.append("image", attachedImage);

      // Clear inputs optimistically; we'll refresh server history to ensure the first image arrives.
      setDraftText("");
      setAttachedImage(null);
      if (imagePreviewUrl) setImagePreviewUrl(null);

      try {
        const res = await fetch("/api/webchat", { method: "POST", body: formData });
        const data = (await res.json()) as {
          ok?: boolean;
          conversation_id?: string;
          ai_outcome?: string;
          ai_diagnostics?: unknown;
        };
        if (data.ai_outcome != null) {
          console.info("[Moxxa Webchat] ai_outcome:", data.ai_outcome);
        }
        if (data.ai_diagnostics != null) {
          console.info("[Moxxa Webchat] ai_diagnostics (WEBCHAT_AI_DIAGNOSTICS=1):", data.ai_diagnostics);
        }
        if (data.conversation_id && data.conversation_id !== conversationId) {
          setConversationId(data.conversation_id);
        }

        // Refresh history so the first response is visible even before realtime subscribes.
        await refreshHistory();
      } catch {
        // ignore; sending false below
      } finally {
        setSending(false);
      }

      return;
    }

    // Text send via JSON; keep optimistic inbound message to match existing realtime behavior.
    if (!caption) return;

    setSending(true);
    const text = caption;
    setDraftText("");

    const optimisticMsg: ChatMessage = {
      id: crypto.randomUUID(),
      direction: "inbound",
      content: text,
      content_type: "text",
      metadata: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg].slice(-20));

    try {
      const res = await fetch("/api/webchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_slug: shopSlug,
          session_id: sessionId.current,
          sender_name: name || "Guest",
          content_type: "text",
          content: text,
        }),
      });

      const data = (await res.json()) as {
        conversation_id?: string;
        ai_outcome?: string;
        ai_diagnostics?: unknown;
      };
      if (data.ai_outcome != null) {
        console.info("[Moxxa Webchat] ai_outcome:", data.ai_outcome);
      }
      if (data.ai_diagnostics != null) {
        console.info("[Moxxa Webchat] ai_diagnostics (WEBCHAT_AI_DIAGNOSTICS=1):", data.ai_diagnostics);
      }
      if (data.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id);
      }

      // Refresh history so the first AI reply is not missed on a new conversation.
      await refreshHistory();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
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
                {historyLoading || realtimeStatus !== "realtime"
                  ? "Connecting..."
                  : "We typically reply within minutes"}
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
                      const isImage =
                        msg.content_type === "image" &&
                        typeof msg.content === "string" &&
                        /^https?:\/\//i.test(msg.content);
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
                            {isImage ? (
                              <div className="space-y-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={msg.content}
                                  alt="Attachment"
                                  className="max-w-full max-h-56 object-cover rounded-xl"
                                />
                                {msg.metadata?.caption ? (
                                  <p className="whitespace-pre-wrap break-words">
                                    {msg.metadata.caption}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-3 border-t flex gap-2">
                {/* Image attachment */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAttachedImage(f);
                    if (f) setImagePreviewUrl(URL.createObjectURL(f));
                    else setImagePreviewUrl(null);
                  }}
                />
                <Input
                  placeholder="Type a message…"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending || historyLoading}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={sending || historyLoading}
                  title="Attach image"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                {imagePreviewUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover border bg-background"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background/90"
                      onClick={() => {
                        setAttachedImage(null);
                        setImagePreviewUrl(null);
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }}
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={(attachedImage ? false : !draftText.trim()) || sending || historyLoading}
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
