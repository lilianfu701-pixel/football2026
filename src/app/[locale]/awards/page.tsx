import { createClient } from "@/lib/supabase/server";
import { getBetPhase } from "@/lib/awardPhase";
import AwardBettingUI from "./AwardBettingUI";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AwardsPage({ params }: Props) {
  const { locale } = await params;
  const supabase  = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("gc_balance")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: existingBets } = user
    ? await supabase
        .from("award_bets")
        .select("id, award_type, player_id, player_name, player_name_zh, gc_amount, odds_multiplier, bet_phase, result")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { phase, odds, goldenBootClosed } = getBetPhase();

  return (
    <AwardBettingUI
      locale={locale}
      userId={user?.id ?? null}
      userGc={profile?.gc_balance ?? 0}
      existingBets={existingBets ?? []}
      phase={phase}
      odds={odds}
      goldenBootClosed={goldenBootClosed}
    />
  );
}
