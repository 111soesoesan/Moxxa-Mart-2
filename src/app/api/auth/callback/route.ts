import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(raw: string | null): string {
  if (raw == null) return "/explore";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/explore";
  return t;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
