import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Parimutuel settlement ─────────────────────────────────────────────────────
async function settleMatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  matchId: number,
  homeScore: number,
  awayScore: number,
) {
  const actualResult: "home" | "draw" | "away" =
    homeScore > awayScore ? "home" : homeScore < awayScore ? "away" : "draw";

  // Fetch all pending bets for this match
  const { data: bets, error: betsError } = await supabase
    .from("bets")
    .select("id, user_id, prediction, gc_amount")
    .eq("match_id", matchId)
    .eq("status", "pending");

  if (betsError || !bets || bets.length === 0) return;

  const totalPool:   number = bets.reduce((s: number, b: { gc_amount: number }) => s + b.gc_amount, 0);
  const winners = bets.filter((b: { prediction: string }) => b.prediction === actualResult);
  const losers  = bets.filter((b: { prediction: string }) => b.prediction !== actualResult);
  const winningPool: number = winners.reduce((s: number, b: { gc_amount: number }) => s + b.gc_amount, 0);

  if (winningPool === 0) {
    // ── Edge case: nobody bet the correct outcome → full refund ──────────────
    for (const bet of bets as Array<{ id: number; user_id: string; gc_amount: number }>) {
      // Return stake to user
      const { data: prof } = await supabase
        .from("users")
        .select("gc_balance")
        .eq("id", bet.user_id)
        .single();
      if (prof) {
        await supabase
          .from("users")
          .update({ gc_balance: prof.gc_balance + bet.gc_amount })
          .eq("id", bet.user_id);
      }
      // Mark bet as refunded (use "lost" with payout = stake)
      await supabase
        .from("bets")
        .update({ status: "lost", potential_payout: bet.gc_amount })
        .eq("id", bet.id);
    }
    // No rake when refunding
    await supabase
      .from("matches")
      .update({ platform_rake: 0 })
      .eq("id", matchId);
    return;
  }

  // ── Normal settlement ─────────────────────────────────────────────────────
  const platformRake = Math.floor(totalPool * 0.05);

  // Pay winners
  for (const bet of winners as Array<{ id: number; user_id: string; gc_amount: number }>) {
    const payout = Math.floor((bet.gc_amount / winningPool) * totalPool * 0.95);

    const { data: prof } = await supabase
      .from("users")
      .select("gc_balance")
      .eq("id", bet.user_id)
      .single();
    if (prof) {
      await supabase
        .from("users")
        .update({ gc_balance: prof.gc_balance + payout })
        .eq("id", bet.user_id);
    }
    await supabase
      .from("bets")
      .update({ status: "won", potential_payout: payout })
      .eq("id", bet.id);
  }

  // Mark losers
  const loserIds = (losers as Array<{ id: number }>).map((b) => b.id);
  if (loserIds.length > 0) {
    await supabase
      .from("bets")
      .update({ status: "lost", potential_payout: 0 })
      .in("id", loserIds);
  }

  // Record platform rake on match
  await supabase
    .from("matches")
    .update({ platform_rake: platformRake })
    .eq("id", matchId);
}

// ── PATCH handler ─────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json()) as {
    home_score?:     number;
    away_score?:     number;
    status?:         string;
    ai_predictions?: Record<string, { home: number; away: number }>;
    odds_home?:      number;
    odds_draw?:      number;
    odds_away?:      number;
  };

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    const validStatuses = ["scheduled", "live", "finished"];
    if (!validStatuses.includes(body.status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    updates.status = body.status;
  }
  if (body.home_score !== undefined) updates.home_score = body.home_score;
  if (body.away_score !== undefined) updates.away_score = body.away_score;
  if (body.ai_predictions !== undefined) updates.ai_predictions = body.ai_predictions;
  if (body.odds_home !== undefined) updates.odds_home = body.odds_home;
  if (body.odds_draw !== undefined) updates.odds_draw = body.odds_draw;
  if (body.odds_away !== undefined) updates.odds_away = body.odds_away;

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await supabase.from("matches").update(updates).eq("id", matchId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Trigger parimutuel settlement when match is set to finished ───────────
  if (
    body.status === "finished" &&
    body.home_score !== undefined &&
    body.away_score !== undefined
  ) {
    try {
      await settleMatch(supabase, matchId, body.home_score, body.away_score);
    } catch (settleErr) {
      console.error("Settlement error for match", matchId, settleErr);
      // Match update already succeeded — log error but don't fail the request
    }
  }

  return NextResponse.json({ ok: true });
}
