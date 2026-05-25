import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWealthLevel } from "@/lib/levels";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, gc_balance, gc_total, wealth_level")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Handle NULL gc_balance (OAuth sign-ups)
  let currentBalance: number = profile.gc_balance ?? 0;
  if (profile.gc_balance == null) {
    const INITIAL_GC = 100_000_000;
    await supabase.from("users")
      .update({ gc_balance: INITIAL_GC, gc_total: INITIAL_GC })
      .eq("id", user.id);
    currentBalance = INITIAL_GC;
  }

  // Table: check_ins  (columns: user_id, date DATE, streak, gc_earned, created_at)
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Check if already checked in today
  const { data: existingCheckin } = await supabase
    .from("check_ins")
    .select("id, streak")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (existingCheckin) {
    return NextResponse.json(
      { error: "already_claimed", message: "Already checked in today" },
      { status: 400 }
    );
  }

  // Determine streak — look for yesterday's row
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const { data: yesterdayCheckin } = await supabase
    .from("check_ins")
    .select("streak")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .maybeSingle();

  const streak = yesterdayCheckin ? (yesterdayCheckin.streak + 1) : 1;

  // Daily GC based on wealth level + streak bonus (+1%/day, max +30%)
  const wealthLevel  = getWealthLevel(currentBalance);
  const streakBonus  = Math.min(streak - 1, 30) * 0.01;
  const dailyGc      = Math.floor(wealthLevel.dailyFreeGc * (1 + streakBonus));

  // Insert check-in row
  const { error: checkinError } = await supabase.from("check_ins").insert({
    user_id:    user.id,
    date:       today,
    gc_earned:  dailyGc,
    streak,
  });

  if (checkinError) {
    console.error("[checkin] insert error:", checkinError.message, checkinError.details);
    return NextResponse.json({ error: checkinError.message }, { status: 500 });
  }

  // Update GC balance
  const newBalance     = currentBalance + dailyGc;
  const newWealthLevel = getWealthLevel(newBalance);

  await supabase
    .from("users")
    .update({
      gc_balance:   newBalance,
      gc_total:     (profile.gc_total ?? currentBalance) + dailyGc,
      wealth_level: newWealthLevel.rank,
    })
    .eq("id", user.id);

  // Record transaction
  await supabase.from("transactions").insert({
    user_id:       user.id,
    type:          "daily_checkin",
    amount:        dailyGc,
    balance_after: newBalance,
    description:   `Daily check-in (Day ${streak} streak${streak > 1 ? ` +${Math.round(streakBonus * 100)}% bonus` : ""})`,
  });

  return NextResponse.json({
    success:     true,
    gc_earned:   dailyGc,
    new_balance: newBalance,
    streak,
    level_up:    newWealthLevel.name !== profile.wealth_level,
    new_level:   newWealthLevel.name,
  });
}
