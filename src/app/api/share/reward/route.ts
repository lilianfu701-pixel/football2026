import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SHARE_GC       = 1_000_000;   // GC per share
const MAX_PER_DAY    = 5;           // max rewards per 24 h

/**
 * POST /api/share/reward
 * Awards 1M GC for sharing. Rate-limited to 5 times per 24 hours.
 * Body: { shareUrl: string }   (for logging only — not used for auth)
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse body (optional shareUrl for the log description)
  let shareUrl = "";
  try {
    const body = await req.json();
    shareUrl = typeof body?.shareUrl === "string" ? body.shareUrl.slice(0, 200) : "";
  } catch { /* ignore parse errors */ }

  // Count share_reward transactions in the past 24 h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "share_reward")
    .gte("created_at", since);

  const todayCount = count ?? 0;
  if (todayCount >= MAX_PER_DAY) {
    return NextResponse.json({
      awarded: 0,
      remaining: 0,
      message: "Daily share limit reached",
    });
  }

  // Award GC
  const { data: profile, error: fetchErr } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", user.id)
    .single();

  if (fetchErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({ gc_balance: (profile.gc_balance ?? 0) + SHARE_GC })
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log transaction
  await supabase.from("transactions").insert({
    user_id:     user.id,
    type:        "share_reward",
    amount:      SHARE_GC,
    description: `Share reward${shareUrl ? `: ${shareUrl}` : ""}`,
  });

  return NextResponse.json({
    awarded:   SHARE_GC,
    remaining: MAX_PER_DAY - todayCount - 1,
  });
}
