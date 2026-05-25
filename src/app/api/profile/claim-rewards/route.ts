import { NextResponse } from "next/server";
import { createClient }  from "@/lib/supabase/server";
import { computeNewRewards, PROFILE_REWARDS, ALL_COMPLETE_BONUS } from "@/lib/profileRewards";

/**
 * POST /api/profile/claim-rewards
 * Checks which profile fields are newly completed and awards GC for each.
 * Idempotent — fields already rewarded are tracked in `users.profile_rewards`.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the full profile row
  const { data: profile, error: fetchErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (fetchErr || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const alreadyRewarded = (profile.profile_rewards ?? {}) as Record<string, boolean>;
  const { newKeys, gcTotal } = computeNewRewards(
    profile as unknown as Record<string, unknown>,
    alreadyRewarded,
  );

  if (newKeys.length === 0) {
    return NextResponse.json({ awarded: 0, newKeys: [] });
  }

  // Build updated rewards map
  const updatedRewards = { ...alreadyRewarded };
  for (const k of newKeys) updatedRewards[k] = true;

  // Award GC + update rewards map
  const { error: updateErr } = await supabase
    .from("users")
    .update({
      gc_balance: (profile.gc_balance ?? 0) + gcTotal,
      profile_rewards: updatedRewards,
    })
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Insert transaction logs
  const txRows = newKeys.map((key) => {
    const isBonus = key === "__all_complete";
    const field = PROFILE_REWARDS.find((r) => r.key === key);
    return {
      user_id: user.id,
      type: "profile_reward",
      amount: isBonus ? ALL_COMPLETE_BONUS : (field?.gc ?? 0),
      description: isBonus
        ? "Profile 100% complete bonus 🎉"
        : `Profile: ${field?.labelEn ?? key}`,
    };
  });

  await supabase.from("transactions").insert(txRows);

  return NextResponse.json({ awarded: gcTotal, newKeys });
}
