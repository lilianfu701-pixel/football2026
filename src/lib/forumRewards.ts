import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Grant GC to a user for forum activity, capped at `dailyMax` times per day.
 * Uses atomic DB function to prevent concurrent double-awards.
 */
export async function grantForumGc(
  supabase: SupabaseClient,
  userId:   string,
  type:     "forum_post" | "forum_reply",
  amount:   number,
  dailyMax: number,
): Promise<void> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const desc = type === "forum_post"
    ? `Forum post reward (+${(amount / 1_000_000).toFixed(0)}M GC)`
    : `Forum reply reward (+${(amount / 1_000_000).toFixed(0)}M GC)`;

  await supabase.rpc("grant_forum_gc_atomic", {
    p_user_id:   userId,
    p_tx_type:   type,
    p_amount:    amount,
    p_daily_max: dailyMax,
    p_since:     todayStart.toISOString(),
    p_desc:      desc,
  });
}
