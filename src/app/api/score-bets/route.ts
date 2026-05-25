import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcScoreOdds } from "@/lib/scoreOdds";

// GET /api/score-bets?match_id=123
// Returns all of the current user's bets for this match
export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("match_id");
  if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ myBets: [] });

  const { data: bets } = await supabase
    .from("score_bets")
    .select("id, score_home, score_away, gc_amount, odds_multiplier, status")
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    myBets: (bets ?? []).map((b) => ({
      id:             b.id,
      scoreHome:      b.score_home,
      scoreAway:      b.score_away,
      gcAmount:       Number(b.gc_amount),
      oddsMultiplier: Number(b.odds_multiplier),
      status:         b.status,
    })),
  });
}

// POST /api/score-bets
// Body: { match_id, score_home, score_away, gc_amount }
// Each (user, match, score_home, score_away) is a separate bet slot.
// Betting the same score again adds to that slot's amount.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { match_id, score_home, score_away, gc_amount } = body;

  if (!match_id || score_home == null || score_away == null || !gc_amount) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const h      = Number(score_home);
  const a      = Number(score_away);
  const amount = Number(gc_amount);

  if (isNaN(amount) || amount <= 0)                              return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return NextResponse.json({ error: "Invalid score" }, { status: 400 });

  // Odds always calculated server-side
  const oddsMultiplier = calcScoreOdds(h, a);

  // Validate match — cast to number so PostgREST type-matches integer PK
  const numericMatchId = parseInt(String(match_id), 10);
  if (isNaN(numericMatchId)) return NextResponse.json({ error: "Invalid match_id" }, { status: 400 });

  const { data: match, error: matchErr } = await supabase
    .from("matches").select("id, status").eq("id", numericMatchId).single();
  if (matchErr || !match) {
    console.error("[score-bets] match lookup:", matchErr?.message, "id:", numericMatchId);
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status === "finished" || match.status === "live") {
    return NextResponse.json({ error: "Match already started" }, { status: 400 });
  }

  // Check balance
  const { data: profile } = await supabase
    .from("users").select("gc_balance").eq("id", user.id).single();
  if (!profile) {
    return NextResponse.json({ error: "Insufficient GC" }, { status: 400 });
  }

  // Handle NULL gc_balance: initialise to 100 M GC (OAuth / trigger sign-ups)
  let currentBalance: number = profile.gc_balance ?? 0;
  if (profile.gc_balance == null) {
    const INITIAL_GC = 100_000_000;
    await supabase.from("users")
      .update({ gc_balance: INITIAL_GC, gc_total: INITIAL_GC })
      .eq("id", user.id);
    currentBalance = INITIAL_GC;
  }

  if (currentBalance < amount) {
    return NextResponse.json({ error: "Insufficient GC" }, { status: 400 });
  }

  // Check if this exact score was already bet (upsert)
  const { data: existing } = await supabase
    .from("score_bets")
    .select("id, gc_amount")
    .eq("user_id", user.id)
    .eq("match_id", numericMatchId)
    .eq("score_home", h)
    .eq("score_away", a)
    .maybeSingle();

  // Deduct GC first
  const { error: deductErr } = await supabase
    .from("users")
    .update({ gc_balance: currentBalance - amount })
    .eq("id", user.id);
  if (deductErr) return NextResponse.json({ error: "GC deduction failed" }, { status: 500 });

  if (existing) {
    // Add to existing bet on this score
    const { error: updateErr } = await supabase
      .from("score_bets")
      .update({
        gc_amount:       existing.gc_amount + amount,
        odds_multiplier: oddsMultiplier,  // refresh odds at current rate
        status:          "pending",
      })
      .eq("id", existing.id);

    if (updateErr) {
      await supabase.from("users").update({ gc_balance: currentBalance }).eq("id", user.id);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  } else {
    // New bet on a new score
    const { error: insertErr } = await supabase
      .from("score_bets")
      .insert({
        user_id:         user.id,
        match_id:        numericMatchId,
        score_home:      h,
        score_away:      a,
        gc_amount:       amount,
        odds_multiplier: oddsMultiplier,
      });

    if (insertErr) {
      await supabase.from("users").update({ gc_balance: currentBalance }).eq("id", user.id);
      console.error("[score-bets] insert error:", insertErr);
      return NextResponse.json({ error: "Insert failed", detail: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, oddsMultiplier });
}

// DELETE /api/score-bets
// Body: { bet_id }
// Cancels a pending bet and refunds GC (only allowed > 1 hour before kickoff)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { bet_id } = body;
  if (!bet_id) return NextResponse.json({ error: "bet_id required" }, { status: 400 });

  // Fetch the bet — verify ownership + status
  const { data: bet } = await supabase
    .from("score_bets")
    .select("id, gc_amount, match_id, status")
    .eq("id", bet_id)
    .eq("user_id", user.id)
    .single();

  if (!bet) return NextResponse.json({ error: "Bet not found" }, { status: 404 });
  if (bet.status !== "pending") return NextResponse.json({ error: "Cannot cancel a settled bet" }, { status: 400 });

  // Check kickoff time — must be more than 1 hour away
  const { data: match } = await supabase
    .from("matches")
    .select("kickoff_time")
    .eq("id", bet.match_id)
    .single();

  if (!match?.kickoff_time) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const kickoff = new Date(match.kickoff_time).getTime();
  if (kickoff - Date.now() < 60 * 60 * 1000) {
    return NextResponse.json({ error: "Cancel window closed (within 1 hour of kickoff)" }, { status: 400 });
  }

  // Delete the bet
  const { error: deleteErr } = await supabase
    .from("score_bets")
    .delete()
    .eq("id", bet_id)
    .eq("user_id", user.id);

  if (deleteErr) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

  // Refund GC
  const { data: profile } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", user.id)
    .single();

  if (profile) {
    await supabase
      .from("users")
      .update({ gc_balance: profile.gc_balance + Number(bet.gc_amount) })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true, refunded: Number(bet.gc_amount) });
}
