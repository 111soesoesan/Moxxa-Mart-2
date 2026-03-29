"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  updateConversationStatus,
  setConversationAIActive,
  type MessagingConversation,
  type MessagingMessage,
  type MessagingPlatform,
} from "@/actions/messaging";
import { uploadChatImage } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  MessageSquare,
  X,
  Filter,
  MoreVertical,
  CheckCheck,
  Archive,
  RefreshCw,
  Paperclip,
  User,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PLATFORM_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  telegram: { label: "Telegram", color: "text-sky-600", bg: "bg-sky-100" },
  viber:    { label: "Viber",    color: "text-violet-600", bg: "bg-violet-100" },
  webchat:  { label: "Web Chat", color: "text-blue-600",   bg: "bg-blue-100" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Props = {
  shopId: string;
};

export function OmniInbox({ shopId }: Props) {
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [draftText, setDraftText] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<MessagingPlatform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "archived">("open");
  const [aiToggleBusy, setAiToggleBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;
  const channelAiOn = !!activeConv?.channel?.ai_enabled;
  const aiAutoReplies =
    channelAiOn && !!activeConv?.ai_active;

  const loadConversations = useCallback(async () => {
    const data = await getConversations(shopId, {
      platform: platformFilter === "all" ? undefined : platformFilter,
      status: statusFilter,
    });
    setConversations(data);
    setLoadingConvs(false);
  }, [shopId, platformFilter, statusFilter]);

  useEffect(() => {
    setLoadingConvs(true);
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const channel = supabase
      .channel(`inbox-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messaging_conversations",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId, loadConversations]);

  useEffect(() => {
    if (!activeConvId) return;

    setLoadingMsgs(true);
    getMessages(activeConvId).then((data) => {
      setMessages(data);
      setLoadingMsgs(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    markConversationRead(activeConvId);

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, unread_count: 0 } : c))
    );

    // Reset composer attachment when switching conversations.
    setAttachedImage(null);
    setImagePreviewUrl(null);

    const channel = supabase
      .channel(`messages-${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaging_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessagingMessage]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvId]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleSend = async () => {
    if (!activeConvId || sending) return;

    const caption = draftText.trim();

    // Send image when attached.
    if (attachedImage) {
      setSending(true);
      try {
        const imageUrl = await uploadChatImage(attachedImage, shopId, activeConvId);
        await sendMessage(activeConvId, {
          content: imageUrl,
          contentType: "image",
          caption: caption || undefined,
        });

        setDraftText("");
        setAttachedImage(null);
        setImagePreviewUrl(null);
      } finally {
        setSending(false);
      }
      return;
    }

    // Send text when no image is attached.
    if (!caption) return;
    setSending(true);
    try {
      await sendMessage(activeConvId, {
        content: caption,
        contentType: "text",
      });
      setDraftText("");
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

  const handleStatusChange = async (
    convId: string,
    status: "open" | "resolved" | "archived"
  ) => {
    await updateConversationStatus(convId, status);
    loadConversations();
    if (convId === activeConvId) setActiveConvId(null);
  };

  const handleConversationAiToggle = async (checked: boolean) => {
    if (!activeConvId || !activeConv) return;
    setAiToggleBusy(true);
    const prev = activeConv.ai_active;
    setConversations((p) =>
      p.map((c) => (c.id === activeConvId ? { ...c, ai_active: checked } : c))
    );
    const res = await setConversationAIActive(activeConvId, checked);
    if (res.error) {
      setConversations((p) =>
        p.map((c) => (c.id === activeConvId ? { ...c, ai_active: prev } : c))
      );
      toast.error(res.error);
    }
    setAiToggleBusy(false);
  };

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-background">
      {/* ── Conversation list (left panel) ── */}
      <div className="w-80 border-r flex flex-col shrink-0">
        {/* Filter bar */}
        <div className="p-3 border-b flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                {platformFilter === "all" ? "All Channels" : PLATFORM_META[platformFilter]?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setPlatformFilter("all")}>All Channels</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlatformFilter("telegram")}>Telegram</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlatformFilter("viber")}>Viber</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlatformFilter("webchat")}>Web Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs capitalize">
                {statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatusFilter("open")}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("resolved")}>Resolved</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={loadConversations}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Connect a channel to start receiving messages</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const meta = PLATFORM_META[conv.platform] ?? PLATFORM_META.webchat;
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
                    isActive && "bg-muted"
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                    <AvatarImage src={conv.customer_avatar ?? undefined} alt="" />
                    <AvatarFallback className="text-xs font-semibold">
                      {(conv.customer_name ?? "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate">
                        {conv.customer_name ?? "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", meta.bg, meta.color)}>
                        {meta.label}
                      </span>
                      {conv.channel?.ai_enabled && conv.ai_active && (
                        <Badge className="h-4 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5" />
                          AI
                        </Badge>
                      )}
                      {conv.channel?.ai_enabled && !conv.ai_active && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[10px] text-muted-foreground inline-flex items-center gap-1"
                        >
                          <User className="h-3 w-3" />
                          You
                        </Badge>
                      )}
                      {conv.unread_count > 0 && (
                        <Badge className="h-4 px-1.5 text-[10px]">{conv.unread_count}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.last_message_preview ?? "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* ── Chat panel (right) ── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activeConv.customer_avatar ?? undefined} alt="" />
              <AvatarFallback className="text-xs font-semibold">
                {(activeConv.customer_name ?? "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{activeConv.customer_name ?? "Unknown"}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground capitalize">{activeConv.platform}</p>
                {!channelAiOn ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Channel AI off
                  </Badge>
                ) : aiAutoReplies ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    <Bot className="h-3 w-3 mr-1" />
                    AI auto-replies
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                    <User className="h-3 w-3 mr-1" />
                    You&apos;re handling
                  </Badge>
                )}
              </div>
            </div>
            {channelAiOn ? (
              <div className="flex items-center gap-2 shrink-0 mr-1">
                <Switch
                  id={`ai-toggle-${activeConv.id}`}
                  checked={activeConv.ai_active}
                  disabled={aiToggleBusy}
                  onCheckedChange={handleConversationAiToggle}
                  aria-label="Let AI handle this conversation"
                />
                <Label
                  htmlFor={`ai-toggle-${activeConv.id}`}
                  className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap hidden sm:inline"
                >
                  AI replies
                </Label>
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeConv.status !== "resolved" && (
                  <DropdownMenuItem onClick={() => handleStatusChange(activeConv.id, "resolved")}>
                    <CheckCheck className="mr-2 h-4 w-4" /> Mark as Resolved
                  </DropdownMenuItem>
                )}
                {activeConv.status !== "open" && (
                  <DropdownMenuItem onClick={() => handleStatusChange(activeConv.id, "open")}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reopen
                  </DropdownMenuItem>
                )}
                {activeConv.status !== "archived" && (
                  <DropdownMenuItem onClick={() => handleStatusChange(activeConv.id, "archived")}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4">
            {loadingMsgs ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-10 rounded-2xl bg-muted animate-pulse max-w-xs",
                      i % 2 === 0 ? "mr-auto" : "ml-auto"
                    )}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                No messages in this conversation yet.
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  const isImage =
                    msg.content_type === "image" &&
                    typeof msg.content === "string" &&
                    /^https?:\/\//i.test(msg.content);
                  const caption =
                    (msg.metadata as { caption?: string | null } | null | undefined)?.caption ??
                    null;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex", isOutbound ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm",
                          isOutbound
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
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
                            {caption ? (
                              <p className="whitespace-pre-wrap break-words">{caption}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isOutbound ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
                          )}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Compose */}
          <div className="p-3 border-t flex items-end gap-2">
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
              className="flex-1"
              disabled={sending}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending}
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
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background/90"
                  onClick={() => {
                    setAttachedImage(null);
                    setImagePreviewUrl(null);
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                  disabled={sending}
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(attachedImage ? false : !draftText.trim()) || sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <MessageSquare className="h-12 w-12 opacity-20" />
          <p className="text-sm">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  );
}
