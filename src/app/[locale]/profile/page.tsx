import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getWealthLevel,
  getHonorLevel,
  getNextWealthLevel,
  getWealthProgress,
  getHonorProgress,
  formatGc,
} from "@/lib/levels";
import { getCountryByCode } from "@/lib/countries";
import DailyCheckin from "@/components/DailyCheckin";
import Link from "next/link";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch full profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}`);
  }

  // Fetch today's check-in status
  const today = new Date().toISOString().split("T")[0];
  const { data: todayCheckin } = await supabase
    .from("daily_checkins")
    .select("id, streak, gc_amount")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  // Fetch recent bets
  const { data: recentBets } = await supabase
    .from("bets")
    .select(`
      id, amount, potential_win, outcome, created_at,
      matches(home_team, away_team, match_date)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent transactions
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("id, type, amount, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const wealthLevel = getWealthLevel(profile.gc_balance);
  const honorLevel = getHonorLevel(profile.honor_points ?? 0);
  const nextWealthLevel = getNextWealthLevel(profile.gc_balance);
  const wealthProgress = getWealthProgress(profile.gc_balance);
  const honorProgress = getHonorProgress(profile.honor_points ?? 0);
  const country = profile.country_code ? getCountryByCode(profile.country_code) : null;

  // Calculate daily GC with streak bonus
  const currentStreak = todayCheckin?.streak ?? 0;
  const bonusPct = Math.min(Math.max(0, currentStreak - 1), 30) * 0.01;
  const dailyBase = wealthLevel.dailyFreeGc;
  const dailyWithBonus = Math.floor(dailyBase * (1 + bonusPct));

  // Bet stats
  const { data: betStats } = await supabase
    .from("bets")
    .select("outcome, amount")
    .eq("user_id", user.id);

  const totalBets = betStats?.length ?? 0;
  const wonBets = betStats?.filter((b) => b.outcome === "win").length ?? 0;
  const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
  const totalWagered = betStats?.reduce((sum, b) => sum + (b.amount ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#0F2040] to-[#0A1628] border border-[#1E3A5F] rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1E3A5F] flex items-center justify-center">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-[#FFD700]">
                    {profile.username?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              {/* Wealth level badge */}
              <div
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-base border-2 border-[#0A1628]"
                style={{ backgroundColor: wealthLevel.bgColor }}
              >
                {wealthLevel.icon}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white truncate">
                  {profile.username}
                </h1>
                {country && (
                  <span className="text-xl" title={country.name}>
                    {country.flag}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5 truncate">{user.email}</p>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {/* Wealth Level */}
                <span
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border"
                  style={{
                    color: wealthLevel.color,
                    borderColor: wealthLevel.color + "40",
                    backgroundColor: wealthLevel.bgColor + "40",
                  }}
                >
                  {wealthLevel.icon} {wealthLevel.name}
                </span>
                {/* Honor Level */}
                <span
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border"
                  style={{
                    color: honorLevel.color,
                    borderColor: honorLevel.color + "40",
                    backgroundColor: honorLevel.color + "15",
                  }}
                >
                  {honorLevel.icon} {honorLevel.name}
                </span>
              </div>
            </div>

            {/* Edit button */}
            <Link
              href={`/${locale}/profile/settings`}
              className="shrink-0 p-2.5 border border-[#1E3A5F] rounded-xl hover:border-[#FFD700]/50 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Link>
          </div>

          {/* GC Balance */}
          <div className="mt-5 bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-1">GoalCoin Balance</p>
            <p className="text-3xl font-black text-[#FFD700]">
              🪙 {formatGc(profile.gc_balance)} GC
            </p>
            {/* Wealth progress */}
            {nextWealthLevel && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{wealthLevel.name}</span>
                  <span>
                    {formatGc(nextWealthLevel.minGc - profile.gc_balance)} GC to{" "}
                    {nextWealthLevel.name}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${wealthProgress}%`,
                      backgroundColor: wealthLevel.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grid: Stats + Check-in */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Daily Check-in */}
          <DailyCheckin
            hasClaimed={!!todayCheckin}
            streak={todayCheckin?.streak ?? 0}
            dailyAmount={dailyWithBonus}
          />

          {/* Bet Stats */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <h3 className="text-white font-bold text-base mb-4">竞猜统计</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Bets", value: totalBets, icon: "🎯" },
                { label: "Win Rate", value: `${winRate}%`, icon: "✅" },
                { label: "Won", value: wonBets, icon: "🏆" },
                { label: "Wagered", value: formatGc(totalWagered), icon: "🪙" },
              ].map((stat, i) => (
                <div key={i} className="bg-[#0A1628] rounded-xl p-3">
                  <p className="text-lg mb-0.5">{stat.icon}</p>
                  <p className="text-white font-bold">{stat.value}</p>
                  <p className="text-gray-500 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Honor Level */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-bold">荣誉等级</h3>
              <p className="text-gray-500 text-xs">Honor Level</p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border"
              style={{
                color: honorLevel.color,
                borderColor: honorLevel.color + "40",
                backgroundColor: honorLevel.color + "15",
              }}
            >
              {honorLevel.icon} {honorLevel.name}
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{profile.honor_points ?? 0} pts</span>
            {honorLevel.maxPoints && (
              <span>Next: {honorLevel.maxPoints + 1} pts</span>
            )}
          </div>
          <div className="h-2 bg-[#1E3A5F] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${honorProgress}%`,
                backgroundColor: honorLevel.color,
              }}
            />
          </div>
          <p className="text-gray-600 text-xs mt-2">
            Earn honor points by making accurate predictions
          </p>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">GC 流水</h3>
            <span className="text-gray-500 text-xs">Recent Transactions</span>
          </div>

          {recentTx && recentTx.length > 0 ? (
            <div className="space-y-2">
              {recentTx.map((tx) => {
                const isPositive = tx.amount > 0;
                const typeLabels: Record<string, string> = {
                  daily_checkin: "Daily Check-in",
                  welcome_bonus: "Welcome Bonus",
                  bet_place: "Bet Placed",
                  bet_win: "Bet Won",
                  bet_refund: "Bet Refund",
                  tip_sent: "Tip Sent",
                  tip_received: "Tip Received",
                };
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 border-b border-[#1E3A5F] last:border-0"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {typeLabels[tx.type] ?? tx.type}
                      </p>
                      <p className="text-xs text-gray-500">{tx.description}</p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {formatGc(tx.amount)} GC
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-600 text-sm">
              No transactions yet. Claim your daily GC to get started!
            </div>
          )}
        </div>

        {/* Recent Bets */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">竞猜历史</h3>
            <Link
              href={`/${locale}/profile/bets`}
              className="text-[#FFD700] text-xs hover:underline"
            >
              View All →
            </Link>
          </div>

          {recentBets && recentBets.length > 0 ? (
            <div className="space-y-2">
              {recentBets.map((bet) => {
                const match = bet.matches as unknown as { home_team: string; away_team: string; match_date: string } | null;
                return (
                  <div
                    key={bet.id}
                    className="flex items-center justify-between py-2.5 border-b border-[#1E3A5F] last:border-0"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {match ? `${match.home_team} vs ${match.away_team}` : "Match"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Wagered: {formatGc(bet.amount)} GC
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        bet.outcome === "win"
                          ? "bg-green-500/20 text-green-400"
                          : bet.outcome === "loss"
                          ? "bg-red-500/20 text-red-400"
                          : bet.outcome === "refund"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-[#FFD700]/20 text-[#FFD700]"
                      }`}
                    >
                      {bet.outcome ?? "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-600 text-sm">
              No predictions yet.{" "}
              <Link href={`/${locale}/matches`} className="text-[#FFD700] hover:underline">
                Browse matches →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
