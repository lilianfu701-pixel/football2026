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
    .select("id, gc_balance, wealth_level")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Check if already checked in today (UTC date)
  const today = new Date().toISOString().split("T")[0];
  const { data: existingCheckin } = await supabase
    .from("daily_checkins")
    .select("id, streak")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (existingCheckin) {
    return NextResponse.json(
      { error: "already_claimed", message: "Already checked in today" },
      { status: 400 }
    );
  }

  // Determine streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const { data: yesterdayCheckin } = await supabase
    .from("daily_checkins")
    .select("streak")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .single();

  const streak = yesterdayCheckin ? (yesterdayCheckin.streak + 1) : 1;

  // Get daily GC amount based on wealth level
  const wealthLevel = getWealthLevel(profile.gc_balance);
  let dailyGc = wealthLevel.dailyFreeGc;

  // Streak bonus: +1% per consecutive day, up to +30%
  const streakBonus = Math.min(streak - 1, 30) * 0.01;
  dailyGc = Math.floor(dailyGc * (1 + streakBonus));

  // Record check-in
  const { error: checkinError } = await supabase.from("daily_checkins").insert({
    user_id: user.id,
    date: today,
    gc_amount: dailyGc,
    streak,
  });

  if (checkinError) {
    return NextResponse.json({ error: checkinError.message }, { status: 500 });
  }

  // Update GC balance
  const newBalance = profile.gc_balance + dailyGc;
  const newWealthLevel = getWealthLevel(newBalance);

  await supabase
    .from("users")
    .update({
      gc_balance: newBalance,
      wealth_level: newWealthLevel.name,
      last_checkin: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Record transaction
  await supabase.from("transactions").insert({
    user_id: user.id,
    type: "daily_checkin",
    amount: dailyGc,
    balance_after: newBalance,
    description: `Daily check-in (Day ${streak} streak${streak > 1 ? ` +${Math.round(streakBonus * 100)}% bonus` : ""})`,
  });

  return NextResponse.json({
    success: true,
    gc_earned: dailyGc,
    new_balance: newBalance,
    streak,
    level_up: newWealthLevel.name !== profile.wealth_level,
    new_level: newWealthLevel.name,
  });
}
