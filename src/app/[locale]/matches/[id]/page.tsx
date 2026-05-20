import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFlagUrl, isTBD } from "@/lib/flags";
import PredictionPanel from "./PredictionPanel";

interface MatchPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage",
  round32: "Round of 32",
  round16: "Round of 16",
  quarter: "Quarterfinal",
  semi: "Semifinal",
  third: "3rd Place",
  final: "Final",
};

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    full: d.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }),
  };
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Fetch match
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (!match) notFound();

  // Fetch user
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { gc_balance: number; nickname: string } | null = null;
  let existingBet: { prediction: string; gc_amount: number; status: string; potential_payout: number } | null = null;

  if (user) {
    const { data: p } = await supabase
      .from("users")
      .select("gc_balance, nickname")
      .eq("id", user.id)
      .single();
    profile = p;

    const { data: bet } = await supabase
      .from("bets")
      .select("prediction, gc_amount, status, potential_payout")
      .eq("user_id", user.id)
      .eq("match_id", id)
      .single();
    existingBet = bet;
  }

  // Fetch prediction stats for this match
  const { data: betStats } = await supabase
    .from("bets")
    .select("prediction")
    .eq("match_id", id);

  const total = betStats?.length ?? 0;
  const homeCount = betStats?.filter((b) => b.prediction === "home").length ?? 0;
  const drawCount = betStats?.filter((b) => b.prediction === "draw").length ?? 0;
  const awayCount = betStats?.filter((b) => b.prediction === "away").length ?? 0;

  const homePct = total > 0 ? Math.round((homeCount / total) * 100) : 33;
  const drawPct = total > 0 ? Math.round((drawCount / total) * 100) : 34;
  const awayPct = total > 0 ? Math.round((awayCount / total) * 100) : 33;

  const { full: fullDate, time } = formatMatchDate(match.kickoff_time);
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const canPredict = !isFinished && !isLive && user;

  // Odds (default if not set)
  const oddsHome = match.odds_home ?? 2.00;
  const oddsDraw = match.odds_draw ?? 3.20;
  const oddsAway = match.odds_away ?? 2.80;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Back */}
        <Link
          href={`/${locale}/matches${match.stage === "group" ? `?stage=group&group=${match.group_name?.toLowerCase()}` : `?stage=${match.stage}`}`}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Back to matches
        </Link>

        {/* Match Header Card */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 mb-4">
          {/* Stage + Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {match.match_number && (
                <span className="text-xs font-black text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded-md">
                  {match.match_number}
                </span>
              )}
              <span className="text-xs text-gray-500 font-medium">
                {match.group_name ? `Group ${match.group_name}` : STAGE_LABELS[match.stage] ?? match.stage}
              </span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isLive ? "text-green-400 bg-green-400/10 animate-pulse" :
              isFinished ? "text-gray-500 bg-gray-500/10" :
              "text-blue-400 bg-blue-400/10"
            }`}>
              {isLive ? "🔴 LIVE" : isFinished ? "Full Time" : "Upcoming"}
            </span>
          </div>

          {/* Teams + Score */}
          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex-1 text-center">
              {isTBD(match.home_team) ? (
                <div className="w-20 h-14 rounded-md bg-[#1E3A5F] flex items-center justify-center mx-auto mb-2">
                  <span className="text-gray-400 text-lg font-black">{match.home_team}</span>
                </div>
              ) : (
                <div className="w-20 h-14 relative overflow-hidden rounded-md shadow-lg mx-auto mb-2">
                  <Image src={getFlagUrl(match.home_team, 160)} alt={match.home_team} fill className="object-cover" unoptimized />
                </div>
              )}
              <p className="text-white font-bold text-base leading-tight">{match.home_team}</p>
              <p className="text-xs text-gray-500 mt-0.5">Home</p>
            </div>

            {/* Score / VS */}
            <div className="text-center px-2">
              {isFinished || isLive ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-white">{match.home_score ?? 0}</span>
                  <span className="text-2xl text-gray-600 font-bold">:</span>
                  <span className="text-4xl font-black text-white">{match.away_score ?? 0}</span>
                </div>
              ) : (
                <div>
                  <p className="text-[#FFD700] font-black text-2xl">VS</p>
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex-1 text-center">
              {isTBD(match.away_team) ? (
                <div className="w-20 h-14 rounded-md bg-[#1E3A5F] flex items-center justify-center mx-auto mb-2">
                  <span className="text-gray-400 text-lg font-black">{match.away_team}</span>
                </div>
              ) : (
                <div className="w-20 h-14 relative overflow-hidden rounded-md shadow-lg mx-auto mb-2">
                  <Image src={getFlagUrl(match.away_team, 160)} alt={match.away_team} fill className="object-cover" unoptimized />
                </div>
              )}
              <p className="text-white font-bold text-base leading-tight">{match.away_team}</p>
              <p className="text-xs text-gray-500 mt-0.5">Away</p>
            </div>
          </div>

          {/* Match Info */}
          <div className="mt-5 pt-4 border-t border-[#1E3A5F] flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <span>📅</span>
              <span>{fullDate}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <span>🕐</span>
              <span>{time}</span>
            </div>
            {match.venue && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <span>📍</span>
                <span>{match.venue}, {match.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fan Poll */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">
            📊 Fan Predictions {total > 0 ? `· ${total} votes` : ""}
          </h3>
          <div className="space-y-3">
            {[
              { label: match.home_team, pct: homePct, key: "home" },
              { label: "Draw", pct: drawPct, key: "draw" },
              { label: match.away_team, pct: awayPct, key: "away" },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {item.key === "draw" ? (
                      <span className="text-base">🤝</span>
                    ) : isTBD(item.label) ? (
                      <span className="text-xs font-bold text-gray-500">?</span>
                    ) : (
                      <div className="w-6 h-4 relative overflow-hidden rounded-sm inline-block">
                        <Image src={getFlagUrl(item.label, 40)} alt={item.label} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <span className="text-xs text-gray-400">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-white">{item.pct}%</span>
                </div>
                <div className="h-2 bg-[#0A1628] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.key === "home" ? "bg-[#FFD700]" :
                      item.key === "draw" ? "bg-blue-500" : "bg-purple-500"
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction Panel */}
        {isFinished ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">🏁</div>
            <p className="text-gray-400 text-sm">This match has ended. Predictions are closed.</p>
            {existingBet && (
              <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                existingBet.status === "won" ? "bg-green-500/20 text-green-400" :
                existingBet.status === "lost" ? "bg-red-500/20 text-red-400" :
                "bg-gray-500/20 text-gray-400"
              }`}>
                {existingBet.status === "won" ? "🎉 You won!" :
                 existingBet.status === "lost" ? "😔 Better luck next time" :
                 "⏳ Result pending"}
              </div>
            )}
          </div>
        ) : !user ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <p className="text-white font-bold mb-1">Login to Predict</p>
            <p className="text-gray-500 text-sm mb-5">Sign in to place your prediction and earn GoalCoins</p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/${locale}/auth/login`}
                className="px-6 py-2.5 bg-[#FFD700] text-[#0A1628] font-bold rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
              >
                Login
              </Link>
              <Link
                href={`/${locale}/auth/register`}
                className="px-6 py-2.5 border border-[#1E3A5F] text-gray-300 font-semibold rounded-xl text-sm hover:border-[#FFD700]/50 hover:text-white transition-colors"
              >
                Register Free
              </Link>
            </div>
          </div>
        ) : (
          <PredictionPanel
            matchId={id}
            locale={locale}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
            homeFlag={match.home_flag ?? "🏳️"}
            awayFlag={match.away_flag ?? "🏳️"}
            oddsHome={oddsHome}
            oddsDraw={oddsDraw}
            oddsAway={oddsAway}
            gcBalance={profile?.gc_balance ?? 0}
            existingBet={existingBet}
          />
        )}

      </div>
    </div>
  );
}
