import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight endpoint that returns the navbar essentials for the current
// session. Used by the client navbar to hydrate auth state on statically
// generated / ISR pages (e.g. /[locale]/matches, /[locale]/matches/[id]),
// where the shared layout renders with no request session and therefore
// passes user=null. Without this, switching locale on a static page makes
// the navbar appear logged-out even though the session cookie is valid.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  const [profileRes, unreadRes] = await Promise.all([
    supabase.from("users").select("gc_balance, nickname, is_admin").eq("id", user.id).single(),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false),
  ]);

  return NextResponse.json({
    authenticated: true,
    id: user.id,
    email: user.email ?? "",
    nickname: profileRes.data?.nickname ?? null,
    gcBalance: profileRes.data?.gc_balance ?? 0,
    isAdmin: profileRes.data?.is_admin ?? false,
    unreadMessages: unreadRes.count ?? 0,
  });
}
