"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getPlayerById } from "@/data/players";
import { getBetPhase } from "@/lib/awardPhase";

// ── Place / top-up a bet ─────────────────────────────────────────────────────
export async function placeAwardBet(
  awardType: string,
  playerId: number,
  gcAmount: number
): Promise<{ success: boolean; error?: string }> {
  if (gcAmount <= 0) return { success: false, error: "invalid_amount" };

  const { phase, odds } = getBetPhase();
  if (phase === "closed") return { success: false, error: "betting_closed" };

  const player = getPlayerById(playerId);
  if (!player) return { success: false, error: "player_not_found" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  // Check GC balance
  const { data: profile } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", user.id)
    .single();

  const balance = profile?.gc_balance ?? 0;
  if (balance < gcAmount) return { success: false, error: "insufficient_gc" };

  // Check max 5 picks per award
  const { count } = await supabase
    .from("award_bets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("award_type", awardType);

  // Check if this player already has a bet (upsert case)
  const { data: existing } = await supabase
    .from("award_bets")
    .select("id")
    .eq("user_id", user.id)
    .eq("award_type", awardType)
    .eq("player_id", playerId)
    .maybeSingle();

  const isNew = !existing;
  const currentCount = count ?? 0;
  if (isNew && currentCount >= 5) return { success: false, error: "max_picks_reached" };

  // Deduct GC
  const { error: deductErr } = await supabase
    .from("users")
    .update({ gc_balance: balance - gcAmount })
    .eq("id", user.id);

  if (deductErr) return { success: false, error: "gc_deduction_failed" };

  // Map current phase to the two DB-allowed values: 'early' | 'live'
  const dbPhase = phase === "pre" ? "early" : "live";

  // Upsert bet (adds to existing gc_amount if player already picked)
  if (isNew) {
    const { error: insertErr } = await supabase
      .from("award_bets")
      .insert({
        user_id:        user.id,
        award_type:     awardType,
        player_id:      playerId,
        player_name:    player.name,
        player_name_zh: player.nameZh,
        country_code:   player.countryCode,
        gc_amount:      gcAmount,
        odds_multiplier: odds,
        bet_phase:      dbPhase,
      });
    if (insertErr) {
      // Refund
      await supabase.from("users").update({ gc_balance: balance }).eq("id", user.id);
      return { success: false, error: "insert_failed" };
    }
  } else {
    const { data: old } = await supabase
      .from("award_bets")
      .select("gc_amount")
      .eq("user_id", user.id)
      .eq("award_type", awardType)
      .eq("player_id", playerId)
      .single();

    const { error: updateErr } = await supabase
      .from("award_bets")
      .update({ gc_amount: (old?.gc_amount ?? 0) + gcAmount })
      .eq("user_id", user.id)
      .eq("award_type", awardType)
      .eq("player_id", playerId);

    if (updateErr) {
      await supabase.from("users").update({ gc_balance: balance }).eq("id", user.id);
      return { success: false, error: "update_failed" };
    }
  }

  revalidatePath("/[locale]/awards", "page");
  return { success: true };
}

// ── Cancel a bet (full refund while still open) ──────────────────────────────
export async function cancelAwardBet(
  betId: string
): Promise<{ success: boolean; error?: string }> {
  const { phase } = getBetPhase();
  if (phase === "closed") return { success: false, error: "betting_closed" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const { data: bet } = await supabase
    .from("award_bets")
    .select("gc_amount")
    .eq("id", betId)
    .eq("user_id", user.id)
    .single();

  if (!bet) return { success: false, error: "bet_not_found" };

  const { data: profile } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", user.id)
    .single();

  // Refund
  await supabase
    .from("users")
    .update({ gc_balance: (profile?.gc_balance ?? 0) + bet.gc_amount })
    .eq("id", user.id);

  await supabase.from("award_bets").delete().eq("id", betId).eq("user_id", user.id);

  revalidatePath("/[locale]/awards", "page");
  return { success: true };
}
