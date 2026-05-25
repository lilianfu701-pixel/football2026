import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Column name mapping ──────────────────────────────────────────────────────
// Actual DB columns:  choice, amount_gc, bet_type, odds_at_bet, payout_gc
// API surface names:  prediction, gc_amount, (hidden), odds, potential_payout

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { match_id, prediction, gc_amount } = body;

    if (!match_id || !prediction || !gc_amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!["home", "draw", "away"].includes(prediction)) {
      return NextResponse.json({ error: "Invalid prediction" }, { status: 400 });
    }
    const amount = parseInt(gc_amount, 10);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const numericMatchId = parseInt(String(match_id), 10);
    if (isNaN(numericMatchId)) {
      return NextResponse.json({ error: "Invalid match_id" }, { status: 400 });
    }

    // Validate match exists + not started
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, status")
      .eq("id", numericMatchId)
      .single();

    if (matchError || !match) {
      console.error("[bets] match lookup failed:", matchError?.message, "id:", numericMatchId);
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status === "finished" || match.status === "live") {
      return NextResponse.json({ error: "Predictions are closed for this match" }, { status: 400 });
    }

    // Check duplicate bet
    const { data: existingBet } = await supabase
      .from("bets")
      .select("id")
      .eq("user_id", user.id)
      .eq("match_id", numericMatchId)
      .single();

    if (existingBet) {
      return NextResponse.json({ error: "You already predicted this match" }, { status: 409 });
    }

    // Atomically deduct GC (prevents concurrent double-spend)
    const { error: deductError } = await supabase.rpc("gc_deduct_atomic", {
      p_user_id: user.id,
      p_amount:  amount,
      p_tx_type: "bet_placed",
      p_desc:    `Match ${numericMatchId} prediction: ${prediction}`,
    });

    if (deductError) {
      if (deductError.message?.includes("insufficient_balance")) {
        return NextResponse.json({ error: "Insufficient GoalCoins" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to deduct GoalCoins" }, { status: 500 });
    }

    // Insert via RPC function — bypasses PostgREST schema cache column validation
    const { data: betId, error: betError } = await supabase
      .rpc("place_match_bet", {
        p_user_id:    user.id,
        p_match_id:   numericMatchId,
        p_prediction: prediction,
        p_amount:     amount,
      });

    if (betError) {
      console.error("[bets] insert error:", betError.message, betError.details, betError.hint);
      // Refund GC atomically since bet insert failed
      await supabase.rpc("gc_credit_atomic", {
        p_user_id: user.id,
        p_amount:  amount,
        p_tx_type: "bet_refunded",
        p_desc:    `Refund: failed bet insert on match ${numericMatchId}`,
      });
      return NextResponse.json({ error: "Failed to save prediction", detail: betError.message }, { status: 500 });
    }

    // Best-effort: increment pool column
    const poolField =
      prediction === "home" ? "pool_home" :
      prediction === "draw" ? "pool_draw" : "pool_away";

    const { data: poolRow } = await supabase
      .from("matches").select(poolField).eq("id", numericMatchId).single();
    const currentPool = poolRow ? ((poolRow as Record<string, number>)[poolField] ?? 0) : 0;
    await supabase
      .from("matches")
      .update({ [poolField]: currentPool + amount })
      .eq("id", numericMatchId);

    return NextResponse.json({ success: true, bet_id: betId });
  } catch (err) {
    console.error("Bets API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { bet_id } = body;
    if (!bet_id) return NextResponse.json({ error: "bet_id required" }, { status: 400 });

    // select("*") bypasses PostgREST schema cache column validation
    const { data: bet } = await supabase
      .from("bets")
      .select("*")
      .eq("id", bet_id)
      .eq("user_id", user.id)
      .single();

    if (!bet) return NextResponse.json({ error: "Bet not found" }, { status: 404 });
    if (bet.status !== "pending") return NextResponse.json({ error: "Cannot cancel a settled bet" }, { status: 400 });

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

    const { error: deleteErr } = await supabase
      .from("bets")
      .delete()
      .eq("id", bet_id)
      .eq("user_id", user.id);

    if (deleteErr) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

    // Refund GC atomically
    const refundAmount = Number((bet as Record<string, unknown>).amount_gc ?? 0);
    if (refundAmount > 0) {
      await supabase.rpc("gc_credit_atomic", {
        p_user_id: user.id,
        p_amount:  refundAmount,
        p_tx_type: "bet_refunded",
        p_desc:    `Cancelled bet on match ${bet.match_id}`,
      });
    }

    return NextResponse.json({ ok: true, refunded: refundAmount });
  } catch (err) {
    console.error("Bets DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("match_id");

    let query = supabase
      .from("bets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    const { data: bets, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch bets" }, { status: 500 });
    }

    return NextResponse.json({ bets: bets ?? [] });
  } catch (err) {
    console.error("Bets GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
