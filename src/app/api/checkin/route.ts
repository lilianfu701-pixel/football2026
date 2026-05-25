import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWealthLevel } from "@/lib/levels";

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current balance + wealth level for streak/GC calculation
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("gc_balance, gc_total, wealth_level")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const currentBalance: number = profile.gc_balance ?? 100_000_000;
  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  // Determine streak from yesterday's row
  const { data: yesterdayCheckin } = await supabase
    .from("check_ins")
    .select("streak")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .maybeSingle();

  const streak      = yesterdayCheckin ? (yesterdayCheckin.streak + 1) : 1;
  const wealthLevel = getWealthLevel(currentBalance);
  const streakBonus = Math.min(streak - 1, 30) * 0.01;
  const dailyGc     = Math.floor(wealthLevel.dailyFreeGc * (1 + streakBonus));
  const newWealthLevel = getWealthLevel(currentBalance + dailyGc);

  // Atomic: insert check_in (UNIQUE prevents duplicate) + credit GC + log tx
  const { data: newBalance, error: checkinError } = await supabase
    .rpc("daily_checkin_atomic", {
      p_user_id:     user.id,
      p_date:        today,
      p_gc_amount:   dailyGc,
      p_streak:      streak,
      p_wealth_rank: newWealthLevel.rank,
    });

  if (checkinError) {
    if (checkinError.message?.includes("already_claimed")) {
      return NextResponse.json(
        { error: "already_claimed", message: "Already checked in today" },
        { status: 400 }
      );
    }
    console.error("[checkin] atomic error:", checkinError.message);
    return NextResponse.json({ error: checkinError.message }, { status: 500 });
  }

  return NextResponse.json({
    success:     true,
    gc_earned:   dailyGc,
    new_balance: newBalance,
    streak,
    level_up:    newWealthLevel.name !== profile.wealth_level,
    new_level:   newWealthLevel.name,
  });
}
