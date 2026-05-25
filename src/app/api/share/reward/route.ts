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

  // Atomically: check rate limit + award GC + log tx
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: remaining, error: rewardErr } = await supabase.rpc("share_reward_atomic", {
    p_user_id:     user.id,
    p_gc_amount:   SHARE_GC,
    p_max_per_day: MAX_PER_DAY,
    p_since:       since,
    p_desc:        `Share reward${shareUrl ? `: ${shareUrl}` : ""}`,
  });

  if (rewardErr) {
    return NextResponse.json({ error: rewardErr.message }, { status: 500 });
  }

  if (remaining === -1) {
    return NextResponse.json({
      awarded: 0,
      remaining: 0,
      message: "Daily share limit reached",
    });
  }

  return NextResponse.json({
    awarded:   SHARE_GC,
    remaining: remaining as number,
  });
}
