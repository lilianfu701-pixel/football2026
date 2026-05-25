import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Grant GC to a user for forum activity, capped at `dailyMax` times per day.
 *
 * @param supabase   - Server Supabase client (already authenticated)
 * @param userId     - Recipient user ID
 * @param type       - Transaction type: "forum_post" | "forum_reply"
 * @param amount     - GC to grant per action
 * @param dailyMax   - Max number of rewards of this type per day
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

  // Count today's rewards of this type
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= dailyMax) return; // daily cap reached

  // Fetch current balance
  const { data: profile } = await supabase
    .from("users")
    .select("gc_balance")
    .eq("id", userId)
    .single();

  const currentBalance = (profile?.gc_balance as number) ?? 0;
  const newBalance     = currentBalance + amount;

  // Update balance + insert transaction atomically (best-effort)
  await Promise.all([
    supabase.from("users").update({ gc_balance: newBalance }).eq("id", userId),
    supabase.from("transactions").insert({
      user_id:       userId,
      type,
      amount,
      balance_after: newBalance,
      description:   type === "forum_post"
        ? `Forum post reward (+${(amount / 1_000_000).toFixed(0)}M GC)`
        : `Forum reply reward (+${(amount / 1_000_000).toFixed(0)}M GC)`,
    }),
  ]);
}
