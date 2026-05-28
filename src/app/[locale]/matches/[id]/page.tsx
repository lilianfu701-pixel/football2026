import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFlagUrl, isTBD, getTeamDisplayName } from "@/lib/flags";
import { getTeamColor } from "@/lib/teamColors";
import PredictionPanel from "./PredictionPanel";
import ScorePredictionPanel from "./ScorePredictionPanel";
import MatchHero from "@/components/forum/MatchHero";
import ShareButtons from "@/components/forum/ShareButtons";
import MatchFollowButton from "@/components/matches/MatchFollowButton";
import MatchFanSection from "@/components/matches/MatchFanSection";
import AiPredictions from "@/components/matches/AiPredictions";
import { getH2H } from "@/lib/h2h";
import { AI_MODELS } from "@/lib/aiModels";
import type { AiPredictions as AiPredictionsType } from "@/lib/aiModels";
import type { AiSuccessRates } from "@/components/matches/AiPredictions";

interface MatchPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const STAGE_LABELS: Record<string, { en: string; zh: string }> = {
  group:   { en: "Group Stage",   zh: "小组赛" },
  round32: { en: "Round of 32",   zh: "32强" },
  round16: { en: "Round of 16",   zh: "16强" },
  quarter: { en: "Quarterfinal",  zh: "四分之一决赛" },
  semi:    { en: "Semifinal",     zh: "半决赛" },
  third:   { en: "3rd Place",     zh: "季军赛" },
  final:   { en: "Final",         zh: "决赛" },
};


export default async function MatchPage({ params }: MatchPageProps) {
  const { locale, id } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const [matchRes, userRes] = await Promise.all([
    supabase.from("matches").select("*").eq("id", id).single(),
    supabase.auth.getUser(),
  ]);

  const match = matchRes.data;
  if (!match) notFound();
  const user = userRes.data.user;

  // ── Parallel secondary fetches ─────────────────────────────────────────────
  const [
    profileRes, betRes, betStatsRes, fanVoteRes,
    myFollowRes, h2hRes, forumPostRes, siblingRes, navIndexRes, aiHistoryRes,
    scoreBetsRes,
  ] = await Promise.all([
    user
      ? supabase.from("users").select("gc_balance, nickname, username").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("bets").select("*")
          .eq("user_id", user.id).eq("match_id", id).single()
      : Promise.resolve({ data: null }),
    supabase.from("bets").select("prediction").eq("match_id", id),
    supabase.from("match_votes").select("vote, user_id").eq("match_id", id),
    user
      ? supabase.from("match_follows").select("match_id")
          .eq("user_id", user.id).eq("match_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    // H2H — fetched from external CSV dataset, cached in h2h_matches
    getH2H(match.home_team, match.away_team, 8),
    // Forum post associated with this match (for ShareButtons)
    supabase.from("forum_posts")
      .select("id, title, title_zh, like_count")
      .eq("match_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    // Sibling matches (same group or same stage for knockout)
    match.group_name
      ? supabase.from("matches")
          .select("id, home_team, away_team, home_flag, away_flag, kickoff_time, status, home_score, away_score")
          .eq("group_name", match.group_name)
          .order("kickoff_time", { ascending: true })
      : supabase.from("matches")
          .select("id, home_team, away_team, home_flag, away_flag, kickoff_time, status, home_score, away_score")
          .eq("stage", match.stage)
          .order("kickoff_time", { ascending: true }),
    // First match ID per group/stage for the navigation bar
    supabase.from("matches")
      .select("id, group_name, stage")
      .order("kickoff_time", { ascending: true }),
    // All finished matches with AI predictions for success-rate calculation
    supabase.from("matches")
      .select("ai_predictions, home_score, away_score")
      .eq("status", "finished")
      .not("ai_predictions", "is", null),
    // Score bets — all of the current user's bets for this match (multi-bet)
    user
      ? supabase.from("score_bets")
          .select("id, score_home, score_away, gc_amount, odds_multiplier, status")
          .eq("match_id", id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const profile = profileRes.data as { gc_balance: number; nickname: string; username: string } | null;
  const existingBet = betRes.data as { id: string; prediction: string; gc_amount: number; status: string; potential_payout: number } | null;

  // Score bets — all user bets for this match
  type ScoreBetRow = { id: string; score_home: number; score_away: number; gc_amount: number; odds_multiplier: number; status: string };
  const myScoreBets = (scoreBetsRes.data ?? [] as ScoreBetRow[]).map((b: ScoreBetRow) => ({
    id:             b.id,
    scoreHome:      b.score_home,
    scoreAway:      b.score_away,
    gcAmount:       Number(b.gc_amount),
    oddsMultiplier: Number(b.odds_multiplier),
    status:         b.status,
  }));
  const betStats    = (betStatsRes.data ?? []) as { prediction: string }[];
  const allVotes    = fanVoteRes.data ?? [];
  const isFollowing = !!myFollowRes.data;
  const h2hMatches  = h2hRes ?? [];
  const forumPost   = forumPostRes.data as { id: number; title: string; title_zh: string | null; like_count: number } | null;

  type SiblingMatch = {
    id: number; home_team: string; away_team: string;
    home_flag: string | null; away_flag: string | null;
    kickoff_time: string; status: string;
    home_score: number | null; away_score: number | null;
  };
  const siblingMatches = (siblingRes.data ?? []) as SiblingMatch[];

  // ── First match ID per group / per knockout stage (for top nav links) ─────
  type NavRow = { id: number; group_name: string | null; stage: string };
  const navRows = (navIndexRes.data ?? []) as NavRow[];
  // Build maps: first occurrence wins (rows are ordered by kickoff_time asc)
  const groupFirstId: Record<string, number> = {};
  const stageFirstId: Record<string, number> = {};
  for (const row of navRows) {
    if (row.group_name) {
      if (!(row.group_name in groupFirstId)) groupFirstId[row.group_name] = row.id;
    } else {
      if (!(row.stage in stageFirstId)) stageFirstId[row.stage] = row.id;
    }
  }

  // ── AI prediction success rates ────────────────────────────────────────────
  type AiHistRow = { ai_predictions: AiPredictionsType; home_score: number; away_score: number };
  const aiHistoryRows = (aiHistoryRes.data ?? []) as AiHistRow[];
  const aiSuccessRates: AiSuccessRates = {};
  for (const row of aiHistoryRows) {
    if (!row.ai_predictions || row.home_score == null || row.away_score == null) continue;
    const actualResult = row.home_score > row.away_score ? "home"
                       : row.home_score < row.away_score ? "away"
                       : "draw";
    for (const { key } of AI_MODELS) {
      const p = row.ai_predictions[key];
      if (!p) continue;
      const predResult = p.home > p.away ? "home" : p.home < p.away ? "away" : "draw";
      if (!aiSuccessRates[key]) aiSuccessRates[key] = { correct: 0, total: 0 };
      aiSuccessRates[key]!.total++;
      if (predResult === actualResult) aiSuccessRates[key]!.correct++;
    }
  }

  // (betStats kept for PredictionPanel — no distribution display)

  // ── Fan support vote counts ────────────────────────────────────────────────
  const fanCounts = { home: 0, neutral: 0, away: 0 };
  let myVote: "home" | "neutral" | "away" | null = null;
  for (const v of allVotes as { vote: string; user_id: string }[]) {
    if (v.vote === "home")    fanCounts.home++;
    else if (v.vote === "neutral") fanCounts.neutral++;
    else if (v.vote === "away")    fanCounts.away++;
    if (user && v.user_id === user.id) myVote = v.vote as "home" | "neutral" | "away";
  }

  // ── H2H stats ──────────────────────────────────────────────────────────────
  const h2hStats = { homeWins: 0, draws: 0, awayWins: 0 };
  for (const m of h2hMatches) {
    if (m.home_score === m.away_score) { h2hStats.draws++; continue; }
    const winner = m.home_score > m.away_score ? m.home_team : m.away_team;
    if (winner === match.home_team) h2hStats.homeWins++;
    else h2hStats.awayWins++;
  }

  const isFinished = match.status === "finished";
  const isLive     = match.status === "live";

  const stageObj   = STAGE_LABELS[match.stage];
  const stageLabel = match.group_name
    ? (zh ? `${match.group_name}组` : `Group ${match.group_name}`)
    : (zh ? (stageObj?.zh ?? match.stage) : (stageObj?.en ?? match.stage));

  const poolHome     = (match.pool_home  ?? 0) as number;
  const poolDraw     = (match.pool_draw  ?? 0) as number;
  const poolAway     = (match.pool_away  ?? 0) as number;
  const refOddsHome  = (match.odds_home  ?? 2.00) as number;
  const refOddsDraw  = (match.odds_draw  ?? 3.20) as number;
  const refOddsAway  = (match.odds_away  ?? 2.80) as number;

  const homeColors   = getTeamColor(match.home_team);
  const awayColors   = getTeamColor(match.away_team);

  const forumPostId = forumPost?.id ?? null;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-6 px-1">

        {/* ── Back + Group/Stage switcher ──────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/${locale}/matches${match.stage === "group" ? `?stage=group&group=${match.group_name?.toLowerCase()}` : `?stage=${match.stage}`}`}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-sm transition-colors shrink-0"
          >
            ← {zh ? "返回" : "Back"}
          </Link>
          <div className="w-px h-4 bg-[#1E3A5F] shrink-0" />
          {match.stage === "group" ? (
            /* Group A–L pills */
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {["A","B","C","D","E","F","G","H","I","J","K","L"].map((g) => {
                const firstId = groupFirstId[g];
                const href = firstId
                  ? `/${locale}/matches/${firstId}`
                  : `/${locale}/matches?stage=group&group=${g.toLowerCase()}`;
                return (
                  <Link
                    key={g}
                    href={href}
                    className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black transition-all ${
                      match.group_name === g
                        ? "bg-[#FFD700] text-[#0A1628]"
                        : "text-gray-500 hover:text-white hover:bg-[#1E3A5F]"
                    }`}
                  >
                    {g}
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Knockout stage pills */
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {(["round32","round16","quarter","semi","third","final"] as const).map((s) => {
                const lbl = { round32:"32强", round16:"16强", quarter:"八强", semi:"四强", third:"季军", final:"决赛" };
                const firstId = stageFirstId[s];
                const href = firstId
                  ? `/${locale}/matches/${firstId}`
                  : `/${locale}/matches?stage=${s}`;
                return (
                  <Link
                    key={s}
                    href={href}
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      match.stage === s
                        ? "bg-[#FFD700] text-[#0A1628]"
                        : "text-gray-500 hover:text-white hover:bg-[#1E3A5F]"
                    }`}
                  >
                    {lbl[s]}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Match strip: all matches in current group/stage ──────────────── */}
        {siblingMatches.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mb-4">
            <span className="text-[10px] font-bold text-gray-600 shrink-0">
              {match.group_name ? (zh ? `${match.group_name}组` : `Grp ${match.group_name}`) : (stageObj ? (zh ? stageObj.zh : stageObj.en) : match.stage)}
            </span>
            <div className="w-px h-3 bg-[#1E3A5F] shrink-0" />
            {siblingMatches.map((m, idx) => {
              const isCurrent = m.id === Number(id);
              const isLiveM   = m.status === "live";
              const isDoneM   = m.status === "finished";
              return (
                <Link
                  key={m.id}
                  href={`/${locale}/matches/${m.id}`}
                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                    isCurrent
                      ? "bg-[#FFD700]/15 text-[#FFD700] ring-1 ring-[#FFD700]/40"
                      : "text-gray-500 hover:text-gray-200 hover:bg-[#1E3A5F]/60"
                  }`}
                >
                  {m.home_flag && <span className="leading-none">{m.home_flag}</span>}
                  <span className={`mx-0.5 ${isLiveM ? "text-green-400" : ""}`}>
                    {isDoneM || isLiveM ? `${m.home_score ?? 0}:${m.away_score ?? 0}` : String(idx + 1)}
                  </span>
                  {m.away_flag && <span className="leading-none">{m.away_flag}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Forum-style Match Header ──────────────────────────────────────── */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">
          {/* Top accent line */}
          <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FFD700]/60 to-transparent" />

          <div className="px-5 py-4">
            {/* MatchHero embedded */}
            <MatchHero
              matchId={Number(id)}
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homeFlag={match.home_flag ?? "🏳️"}
              awayFlag={match.away_flag ?? "🏳️"}
              groupName={match.group_name}
              venue={match.venue}
              city={match.city}
              kickoff={match.kickoff_time}
              homeScore={match.home_score}
              awayScore={match.away_score}
              status={match.status ?? "upcoming"}
              votes={fanCounts}
              myVote={myVote}
              loggedIn={!!user}
              zh={zh}
              homeColors={homeColors}
              awayColors={awayColors}
              embedded
            />

            {/* ── Action bar ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#1E3A5F] gap-3 flex-wrap">
              {/* Left: share buttons */}
              <ShareButtons
                title={forumPost?.title ?? `${match.home_team} vs ${match.away_team}`}
                translatedTitle={forumPost?.title_zh ?? null}
                locale={locale}
                zh={zh}
                username={profile?.username ?? null}
              />

              {/* Right: follow match */}
              <MatchFollowButton
                matchId={Number(id)}
                initialFollowing={isFollowing}
                homeTeam={getTeamDisplayName(match.home_team, zh ? "zh" : "en")}
                awayTeam={getTeamDisplayName(match.away_team, zh ? "zh" : "en")}
                zh={zh}
              />
            </div>
          </div>
        </div>

        {/* ── H2H History ───────────────────────────────────────────────────── */}
        {(() => {
          const homeNameZh = getTeamDisplayName(match.home_team, zh ? "zh" : "en");
          const awayNameZh = getTeamDisplayName(match.away_team, zh ? "zh" : "en");

          // Translate tournament name to Chinese
          function tourZh(t: string): string {
            if (!zh || !t) return t;
            const s = t.toLowerCase();
            if (s.includes("world cup qual")) return "世界杯预选赛";
            if (s.includes("world cup")) return "世界杯";
            if (s.includes("friendly")) return "友谊赛";
            if (s.includes("euro")) return "欧洲杯";
            if (s.includes("copa am")) return "美洲杯";
            if (s.includes("africa cup") || s.includes("afcon")) return "非洲杯";
            if (s.includes("asian cup")) return "亚洲杯";
            if (s.includes("gold cup")) return "金杯赛";
            if (s.includes("nations league")) return "国家联赛";
            if (s.includes("nations cup")) return "国家杯";
            if (s.includes("olympic")) return "奥运会";
            if (s.includes("confed")) return "联合会杯";
            if (s.includes("qual")) return "预选赛";
            return t;
          }

          return (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">

              {/* ── Header row ── */}
              <div className="grid grid-cols-[2fr_3fr_3fr] gap-x-6 items-center px-4 py-2 border-b border-[#1E3A5F]">
                {/* Title */}
                <span className="text-sm font-bold text-gray-200">⚔️ {zh ? "交战历史" : "Head to Head"}</span>

                {/* Home team: flag → name (horizontal) */}
                <div className="flex items-center justify-center gap-1.5">
                  {!isTBD(match.home_team) && (
                    <div className="w-7 h-[18px] relative overflow-hidden rounded-sm shadow shrink-0">
                      <Image src={getFlagUrl(match.home_team, 40)} alt={match.home_team} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#FFD700] leading-none">{homeNameZh}</span>
                </div>

                {/* Away team: flag → name (horizontal) */}
                <div className="flex items-center justify-center gap-1.5">
                  {!isTBD(match.away_team) && (
                    <div className="w-7 h-[18px] relative overflow-hidden rounded-sm shadow shrink-0">
                      <Image src={getFlagUrl(match.away_team, 40)} alt={match.away_team} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <span className="text-xs font-bold text-purple-400 leading-none">{awayNameZh}</span>
                </div>
              </div>

              {/* ── Data rows ── */}
              {h2hMatches.length > 0 ? (
                <>
                  {h2hMatches.map((m) => {
                    // Always: left = match.home_team, right = match.away_team
                    const isForward = m.home_team === match.home_team;
                    const leftScore  = isForward ? m.home_score : m.away_score;
                    const rightScore = isForward ? m.away_score : m.home_score;
                    const leftWon    = leftScore > rightScore;
                    const rightWon   = rightScore > leftScore;
                    const yr         = m.match_date.slice(0, 4);

                    return (
                      <div
                        key={`${m.match_date}-${m.home_team}-${m.away_team}`}
                        className="grid grid-cols-[2fr_3fr_3fr] gap-x-6 items-center px-4 py-2 border-b border-[#1E3A5F]/30 last:border-0"
                      >
                        {/* Year + tournament */}
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-xs text-gray-500 font-mono shrink-0">{yr}</span>
                          <span className="text-[11px] text-gray-600 truncate">{tourZh(m.tournament)}</span>
                        </div>

                        {/* Home (left) score */}
                        <span className={`text-base font-black text-center block ${
                          leftWon ? "text-[#FFD700]" : leftScore === rightScore ? "text-gray-400" : "text-gray-600"
                        }`}>
                          {leftScore}
                        </span>

                        {/* Away (right) score */}
                        <span className={`text-base font-black text-center block ${
                          rightWon ? "text-purple-400" : leftScore === rightScore ? "text-gray-400" : "text-gray-600"
                        }`}>
                          {rightScore}
                        </span>
                      </div>
                    );
                  })}

                  {/* ── Stats footer ── */}
                  <div className="grid grid-cols-[2fr_6fr] gap-x-6 items-center px-4 py-3 bg-[#0A1628]/50 border-t border-[#1E3A5F]">
                    <span className="text-xs font-bold text-gray-500">{zh ? "统计" : "Record"}</span>
                    <div className="flex justify-evenly items-center">
                      <span className="text-sm font-black text-[#FFD700]">
                        {h2hStats.homeWins}{zh ? "赢" : "W"}
                      </span>
                      <span className="text-sm font-black text-blue-400">
                        {h2hStats.draws}{zh ? "平" : "D"}
                      </span>
                      <span className="text-sm font-black text-purple-400">
                        {h2hStats.awayWins}{zh ? "胜" : "W"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-5 gap-1.5">
                  <span className="text-2xl">🥇</span>
                  <p className="text-sm font-bold text-gray-400">{zh ? "首次交锋" : "First Ever Meeting"}</p>
                  <p className="text-xs text-gray-600 text-center px-4">
                    {zh
                      ? `${homeNameZh} 与 ${awayNameZh} 历史上首次正式交锋`
                      : `${match.home_team} and ${match.away_team} have never met in official competition`}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── AI Predictions ───────────────────────────────────────────────── */}
        <AiPredictions
          predictions={(match.ai_predictions as AiPredictionsType) ?? null}
          successRates={aiSuccessRates}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          locale={locale}
        />

        {/* ── Prediction Panel (above the map) ─────────────────────────────── */}
        {isFinished ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 text-center mb-4">
            <div className="text-3xl mb-2">🏁</div>
            <p className="text-gray-400 text-sm">
              {zh ? "比赛已结束，竞猜已关闭。" : "This match has ended. Predictions are closed."}
            </p>
            {existingBet && (
              <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                existingBet.status === "won" ? "bg-green-500/20 text-green-400" :
                existingBet.status === "lost" ? "bg-red-500/20 text-red-400" :
                "bg-gray-500/20 text-gray-400"
              }`}>
                {existingBet.status === "won" ? (zh ? "🎉 恭喜获奖！" : "🎉 You won!") :
                 existingBet.status === "lost" ? (zh ? "😔 下次加油" : "😔 Better luck") :
                 (zh ? "⏳ 等待结算" : "⏳ Pending")}
              </div>
            )}
          </div>
        ) : !user ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 text-center mb-4">
            <div className="text-3xl mb-3">🔒</div>
            <p className="text-white font-bold mb-1">{zh ? "登录即可参与竞猜" : "Login to Predict"}</p>
            <p className="text-gray-500 text-sm mb-5">
              {zh ? "注册账号，参与竞猜，赢取GoalCoin！" : "Sign in to place your prediction and earn GoalCoins"}
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`/${locale}/auth/login`}
                className="px-6 py-2.5 bg-[#FFD700] text-[#0A1628] font-bold rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
                {zh ? "登录" : "Login"}
              </Link>
              <Link href={`/${locale}/auth/register`}
                className="px-6 py-2.5 border border-[#1E3A5F] text-gray-300 font-semibold rounded-xl text-sm hover:border-[#FFD700]/50 hover:text-white transition-colors">
                {zh ? "免费注册" : "Register Free"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <PredictionPanel
              matchId={id}
              locale={locale}
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homeTeamZh={getTeamDisplayName(match.home_team, "zh")}
              awayTeamZh={getTeamDisplayName(match.away_team, "zh")}
              homeFlag={match.home_flag ?? "🏳️"}
              awayFlag={match.away_flag ?? "🏳️"}
              poolHome={poolHome}
              poolDraw={poolDraw}
              poolAway={poolAway}
              refOddsHome={refOddsHome}
              refOddsDraw={refOddsDraw}
              refOddsAway={refOddsAway}
              gcBalance={profile?.gc_balance ?? 0}
              username={profile?.nickname ?? user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "Player"}
              stageLabel={stageLabel}
              existingBet={existingBet}
              homeColors={homeColors}
              awayColors={awayColors}
              kickoffTime={match.kickoff_time}
            />
          </div>
        )}

        {/* ── Score Prediction Panel ────────────────────────────────────────── */}
        {!isFinished && user && (
          <ScorePredictionPanel
            matchId={id}
            locale={locale}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            homeColors={homeColors}
            awayColors={awayColors}
            gcBalance={profile?.gc_balance ?? 0}
            myBets={myScoreBets}
            kickoffTime={match.kickoff_time}
          />
        )}

        {/* ── Global Fan Map ────────────────────────────────────────────────── */}
        <MatchFanSection
          matchId={Number(id)}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          homeColors={homeColors}
          awayColors={awayColors}
          zh={zh}
          loggedIn={!!user}
          userVote={myVote}
        />

    </div>
  );
}
