import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      userId: null, gcBalance: 0, nickname: "",
      existingBet: null, myScoreBets: [], isFollowing: false, myVote: null,
    });
  }

  const [profileRes, betRes, followRes, voteRes, scoreBetsRes] = await Promise.all([
    supabase.from("users").select("gc_balance, nickname").eq("id", user.id).single(),
    supabase.from("bets")
      .select("id, prediction, gc_amount, status, potential_payout")
      .eq("user_id", user.id).eq("match_id", id).maybeSingle(),
    supabase.from("match_follows")
      .select("match_id").eq("user_id", user.id).eq("match_id", id).maybeSingle(),
    supabase.from("match_votes")
      .select("vote").eq("user_id", user.id).eq("match_id", id).maybeSingle(),
    supabase.from("score_bets")
      .select("id, score_home, score_away, gc_amount, odds_multiplier, status")
      .eq("user_id", user.id).eq("match_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const profile = profileRes.data as { gc_balance: number; nickname: string } | null;
  type RawBet = { id: string; score_home: number; score_away: number; gc_amount: number; odds_multiplier: number; status: string };

  return NextResponse.json({
    userId:      user.id,
    gcBalance:   profile?.gc_balance ?? 0,
    nickname:    profile?.nickname ?? "",
    existingBet: betRes.data ?? null,
    myScoreBets: ((scoreBetsRes.data ?? []) as RawBet[]).map((b) => ({
      id:             b.id,
      scoreHome:      b.score_home,
      scoreAway:      b.score_away,
      gcAmount:       Number(b.gc_amount),
      oddsMultiplier: Number(b.odds_multiplier),
      status:         b.status,
    })),
    isFollowing: !!followRes.data,
    myVote:      (voteRes.data as { vote: string } | null)?.vote ?? null,
  });
}
