import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PredictClient from "./PredictClient";
import AwardBettingUI from "@/app/[locale]/awards/AwardBettingUI";
import { getBetPhase } from "@/lib/awardPhase";
import { getTeamColor } from "@/lib/teamColors";

interface PageProps {
  params: Promise<{ locale: string }>;
}

const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage", round32: "Round of 32", round16: "Round of 16",
  quarter: "Quarterfinal", semi: "Semifinal", third: "3rd Place", final: "Final",
};
const STAGE_LABELS_ZH: Record<string, string> = {
  group: "小组赛", round32: "三十二强赛", round16: "十六强赛",
  quarter: "四分之一决赛", semi: "半决赛", third: "季军赛", final: "决赛",
};

export default async function PredictPage({ params }: PageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // ── Profile ──────────────────────────────────────────────────────────────
  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("gc_balance, username, nickname, honor_points")
        .eq("id", user.id)
        .single()
    : { data: null };

  const gcBalance = profile?.gc_balance ?? 0;
  const username  = profile?.username
    ?? user?.user_metadata?.display_name
    ?? user?.email?.split("@")[0]
    ?? "Player";

  // ── Upcoming matches (next 72h + live) for quick-bet ─────────────────────
  const now72h = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const { data: upcomingRaw } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_time, stage, group_name, match_number, pool_home, pool_draw, pool_away, odds_home, odds_draw, odds_away, status, home_score, away_score")
    .in("status", ["upcoming", "live"])
    .lte("kickoff_time", now72h)
    .order("kickoff_time", { ascending: true })
    .limit(6);

  // If less than 3, grab next upcoming regardless of time window
  const { data: nextUpcoming } = (upcomingRaw?.length ?? 0) < 3
    ? await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_time, stage, group_name, match_number, pool_home, pool_draw, pool_away, odds_home, odds_draw, odds_away, status, home_score, away_score")
        .eq("status", "upcoming")
        .order("kickoff_time", { ascending: true })
        .limit(4)
    : { data: [] };

  const quickMatches = upcomingRaw?.length
    ? upcomingRaw
    : (nextUpcoming ?? []);

  // ── User's existing bets on quick matches ─────────────────────────────────
  const quickMatchIds = quickMatches.map((m) => m.id);
  const { data: existingBetsRaw } = user && quickMatchIds.length
    ? await supabase
        .from("bets")
        .select("match_id, prediction, gc_amount, odds, potential_payout, status")
        .eq("user_id", user.id)
        .in("match_id", quickMatchIds)
    : { data: [] };

  const existingBetsMap: Record<string, {
    prediction: string; gc_amount: number; odds: number;
    potential_payout: number; status: string;
  }> = {};
  (existingBetsRaw ?? []).forEach((b) => {
    existingBetsMap[b.match_id] = b;
  });

  // ── Full bet history (two-step to avoid silent JOIN failures) ───────────────
  const { data: betsRaw } = user
    ? await supabase
        .from("bets")
        .select("id, match_id, prediction, gc_amount, odds, potential_payout, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  // Fetch match details for those bets
  type PredictMatchStub = { id: string; home_team: string; away_team: string; kickoff_time: string; stage: string; group_name?: string | null; status: string; home_score: number | null; away_score: number | null };

  const betMatchIds = [...new Set((betsRaw ?? []).map((b) => b.match_id).filter(Boolean))];
  const { data: betMatchesRaw } = betMatchIds.length
    ? await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_time, stage, group_name, status, home_score, away_score")
        .in("id", betMatchIds)
    : { data: [] as PredictMatchStub[] };

  const betMatchesMap: Record<string, PredictMatchStub> = {};
  (betMatchesRaw ?? []).forEach((m) => { betMatchesMap[m.id] = m as PredictMatchStub; });

  const betHistory = (betsRaw ?? []).map((b) => ({
    ...b,
    matches: betMatchesMap[b.match_id] ?? null,
  }));

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalBets    = betHistory?.length ?? 0;
  const wonBets      = betHistory?.filter((b) => b.status === "won").length  ?? 0;
  const lostBets     = betHistory?.filter((b) => b.status === "lost").length ?? 0;
  const pendingBets  = betHistory?.filter((b) => b.status === "pending").length ?? 0;
  const winRate      = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
  const totalWon     = betHistory?.filter((b) => b.status === "won")
    .reduce((s, b) => s + (b.potential_payout ?? 0), 0) ?? 0;
  const totalStaked  = betHistory?.reduce((s, b) => s + b.gc_amount, 0) ?? 0;

  // ── Score bet history ─────────────────────────────────────────────────────
  const { data: scoreBetsRaw } = user
    ? await supabase
        .from("score_bets")
        .select("id, match_id, score_home, score_away, gc_amount, odds_multiplier, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  type PredictScoreMatchStub = { id: string; home_team: string; away_team: string; kickoff_time: string; stage: string; status: string; home_score: number | null; away_score: number | null };

  const scoreMatchIds = [...new Set((scoreBetsRaw ?? []).map((b) => b.match_id).filter(Boolean))];
  const { data: scoreMatchesRaw } = scoreMatchIds.length
    ? await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff_time, stage, status, home_score, away_score")
        .in("id", scoreMatchIds)
    : { data: [] as PredictScoreMatchStub[] };

  const scoreMatchesMap: Record<string, PredictScoreMatchStub> = {};
  (scoreMatchesRaw ?? []).forEach((m) => { scoreMatchesMap[m.id] = m as PredictScoreMatchStub; });

  const scoreBetHistory = (scoreBetsRaw ?? []).map((b) => ({
    ...b,
    match: scoreMatchesMap[b.match_id] ?? null,
  }));

  // ── Award bets (full fields for AwardBettingUI) ───────────────────────────
  const { data: awardBets } = user
    ? await supabase
        .from("award_bets")
        .select("id, award_type, player_id, player_name, player_name_zh, gc_amount, odds_multiplier, bet_phase, result")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { phase: awardPhase, odds: awardOdds, goldenBootClosed } = getBetPhase();

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">
            🎯 {zh ? "竞猜中心" : "Prediction Hub"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {zh ? "押注比赛、追踪战绩、赢取 GoalCoin" : "Place bets, track results, win GoalCoins"}
          </p>
        </div>

        {/* Guest banner */}
        {!user && (
          <div className="bg-[#0F2040] border border-[#FFD700]/20 rounded-2xl p-6 text-center mb-6">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-white font-bold text-lg mb-1">
              {zh ? "登录后开始竞猜" : "Login to Start Predicting"}
            </p>
            <p className="text-gray-500 text-sm mb-5">
              {zh ? "注册免费领取 10 万 GC，马上开始押注！" : "Register free, get 100K GC, start betting now!"}
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`/${locale}/auth/login`}
                className="px-6 py-2.5 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
                {zh ? "登录" : "Login"}
              </Link>
              <Link href={`/${locale}/auth/register`}
                className="px-6 py-2.5 border border-[#1E3A5F] text-gray-300 font-semibold rounded-xl text-sm hover:border-[#FFD700]/50 hover:text-white transition-colors">
                {zh ? "免费注册" : "Register Free"}
              </Link>
            </div>
          </div>
        )}

        <PredictClient
          locale={locale}
          user={user ? { id: user.id } : null}
          gcBalance={gcBalance}
          username={username}
          stats={{ totalBets, wonBets, lostBets, pendingBets, winRate, totalWon, totalStaked }}
          quickMatches={quickMatches.map((m) => ({
            id:          m.id,
            homeTeam:    m.home_team,
            awayTeam:    m.away_team,
            kickoffTime: m.kickoff_time,
            stage:       m.stage,
            stageLabel:  zh ? (STAGE_LABELS_ZH[m.stage] ?? m.stage) : (STAGE_LABELS[m.stage] ?? m.stage),
            groupName:   m.group_name ?? null,
            matchNumber: m.match_number ?? null,
            poolHome:    (m.pool_home  ?? 0) as number,
            poolDraw:    (m.pool_draw  ?? 0) as number,
            poolAway:    (m.pool_away  ?? 0) as number,
            refOddsHome: (m.odds_home  ?? 2.00) as number,
            refOddsDraw: (m.odds_draw  ?? 3.20) as number,
            refOddsAway: (m.odds_away  ?? 2.80) as number,
            status:      m.status,
            homeScore:   m.home_score ?? null,
            awayScore:   m.away_score ?? null,
            homeColors:  getTeamColor(m.home_team),
            awayColors:  getTeamColor(m.away_team),
            existingBet: existingBetsMap[m.id] ?? null,
          }))}
          betHistory={(betHistory ?? []).map((b) => {
            const match = b.matches;
            return {
              id:             b.id,
              prediction:     b.prediction,
              gcAmount:       b.gc_amount,
              odds:           b.odds,
              potentialPayout: b.potential_payout ?? 0,
              status:         b.status,
              createdAt:      b.created_at,
              match: match ? {
                id:          match.id,
                homeTeam:    match.home_team,
                awayTeam:    match.away_team,
                kickoffTime: match.kickoff_time,
                stage:       match.stage,
                stageLabel:  zh ? (STAGE_LABELS_ZH[match.stage] ?? match.stage) : (STAGE_LABELS[match.stage] ?? match.stage),
                status:      match.status,
                homeScore:   match.home_score ?? null,
                awayScore:   match.away_score ?? null,
              } : null,
            };
          })}
          scoreBetHistory={scoreBetHistory.map((b) => {
            const m = b.match;
            return {
              id:             b.id,
              scoreHome:      b.score_home,
              scoreAway:      b.score_away,
              gcAmount:       Number(b.gc_amount),
              oddsMultiplier: Number(b.odds_multiplier),
              status:         b.status,
              createdAt:      b.created_at,
              match: m ? {
                id:          m.id,
                homeTeam:    m.home_team,
                awayTeam:    m.away_team,
                kickoffTime: m.kickoff_time,
                stage:       m.stage,
                stageLabel:  zh ? (STAGE_LABELS_ZH[m.stage] ?? m.stage) : (STAGE_LABELS[m.stage] ?? m.stage),
                status:      m.status,
                homeScore:   m.home_score ?? null,
                awayScore:   m.away_score ?? null,
              } : null,
            };
          })}
        />

        {/* ── 大奖竞猜 — 直接嵌入 ───────────────────────────────────────────── */}
        <AwardBettingUI
          locale={locale}
          userId={user?.id ?? null}
          userGc={gcBalance}
          existingBets={(awardBets ?? []) as import("@/app/[locale]/awards/AwardBettingUI").AwardBet[]}
          phase={awardPhase}
          odds={awardOdds}
          goldenBootClosed={goldenBootClosed}
        />
      </div>
    </div>
  );
}
