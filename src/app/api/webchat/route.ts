import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const shopSlug = req.nextUrl.searchParams.get("shop_slug");
  if (!shopSlug) {
    return NextResponse.json({ active: false });
  }
  try {
    const supabase = await createServiceClient();

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", shopSlug)
      .single();

    if (!shop) return NextResponse.json({ active: false });

    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("id, is_active")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .single();

    return NextResponse.json({ active: channel?.is_active ?? false });
  } catch {
    return NextResponse.json({ active: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      shop_slug: string;
      session_id: string;
      sender_name: string;
      content: string;
    };

    const { shop_slug, session_id, sender_name, content } = body;

    if (!shop_slug || !session_id || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", shop_slug)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("id")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .eq("is_active", true)
      .single();

    if (!channel) {
      return NextResponse.json({ error: "Web chat not enabled for this shop" }, { status: 404 });
    }

    const { data: existingConv } = await supabase
      .from("messaging_conversations")
      .select("id")
      .eq("channel_id", channel.id)
      .eq("platform_conversation_id", session_id)
      .single();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("messaging_conversations")
        .insert({
          shop_id: shop.id,
          channel_id: channel.id,
          platform: "webchat",
          platform_conversation_id: session_id,
          customer_name: sender_name || "Guest",
          status: "open",
        })
        .select("id")
        .single();

      if (convErr || !newConv) {
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }

      conversationId = newConv.id;
    }

    await supabase.from("messaging_messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      sender_id: session_id,
      sender_name: sender_name || "Guest",
      content,
      content_type: "text",
    });

    return NextResponse.json({ ok: true, conversation_id: conversationId });
  } catch (err) {
    console.error("Webchat API error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
