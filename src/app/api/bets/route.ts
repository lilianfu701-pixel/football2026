import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { match_id, prediction, gc_amount } = body;

    // Validate inputs
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

    // Fetch match (validate it exists + not finished)
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, status, odds_home, odds_draw, odds_away")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status === "finished" || match.status === "live") {
      return NextResponse.json({ error: "Predictions are closed for this match" }, { status: 400 });
    }

    // Check if user already has a bet on this match
    const { data: existingBet } = await supabase
      .from("bets")
      .select("id")
      .eq("user_id", user.id)
      .eq("match_id", match_id)
      .single();

    if (existingBet) {
      return NextResponse.json({ error: "You already predicted this match" }, { status: 409 });
    }

    // Fetch user GC balance
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("gc_balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.gc_balance < amount) {
      return NextResponse.json({ error: "Insufficient GoalCoins" }, { status: 400 });
    }

    // Get odds for selected prediction
    const odds =
      prediction === "home" ? (match.odds_home ?? 2.00) :
      prediction === "draw" ? (match.odds_draw ?? 3.20) :
      (match.odds_away ?? 2.80);

    // Deduct GC from user balance
    const { error: updateError } = await supabase
      .from("users")
      .update({ gc_balance: profile.gc_balance - amount })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to deduct GoalCoins" }, { status: 500 });
    }

    // Insert bet
    const { data: bet, error: betError } = await supabase
      .from("bets")
      .insert({
        user_id: user.id,
        match_id,
        prediction,
        gc_amount: amount,
        odds,
        status: "pending",
      })
      .select()
      .single();

    if (betError) {
      // Rollback GC deduction
      await supabase
        .from("users")
        .update({ gc_balance: profile.gc_balance })
        .eq("id", user.id);
      return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bet: {
        id: bet.id,
        prediction: bet.prediction,
        gc_amount: bet.gc_amount,
        odds: bet.odds,
        potential_payout: Math.round(amount * odds),
      },
    });
  } catch (err) {
    console.error("Bets API error:", err);
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
      .select("id, match_id, prediction, gc_amount, odds, potential_payout, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    const { data: bets, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch bets" }, { status: 500 });
    }

    return NextResponse.json({ bets });
  } catch (err) {
    console.error("Bets GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
