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
import { gcTransactionLabel } from "@/lib/gcTransactionLabels";
import DailyCheckin from "@/components/DailyCheckin";
import ProfileCompletion from "@/components/ProfileCompletion";
import { PROFILE_REWARDS } from "@/lib/profileRewards";
import { AWARD_META, dbToAwardKey } from "@/data/players";
import Link from "next/link";
import Image from "next/image";

interface ProfilePageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string; betsTab?: string; ratingsDir?: string }>;
}

const ITEMS_PER_PAGE = 10;

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { locale } = await params;
  const { tab = "overview", page: pageStr = "1", betsTab = "match", ratingsDir = "given" } = await searchParams;
  const itemPage = Math.max(1, parseInt(pageStr, 10));
  const itemFrom = (itemPage - 1) * ITEMS_PER_PAGE;
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

  // Fetch today's check-in status — table: check_ins, columns: date, streak, gc_earned
  const today = new Date().toISOString().split("T")[0];
  const { data: todayCheckin } = await supabase
    .from("check_ins")
    .select("id, streak, gc_earned")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  // Fetch recent bets
  const { data: recentBets } = await supabase
    .from("bets")
    .select(`
      id, gc_amount, potential_payout, status, created_at,
      matches(home_team, away_team, kickoff_time)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent GC transactions
  const { data: recentTx } = await supabase
    .from("gc_transactions")
    .select("id, type, amount, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch followed players (overview section)
  const { data: followedRows } = await supabase
    .from("player_follows")
    .select("player_id, created_at, players(id, name, name_zh, team, position, shirt_number, photo_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  interface FollowedPlayer {
    id:           number;
    name:         string;
    name_zh:      string | null;
    team:         string;
    position:     string | null;
    shirt_number: number | null;
    photo_url:    string | null;
  }
  const followedPlayers: FollowedPlayer[] = (followedRows ?? [])
    .map((r) => (Array.isArray(r.players) ? r.players[0] : r.players) as FollowedPlayer | null)
    .filter((p): p is FollowedPlayer => p != null);

  const wealthLevel = getWealthLevel(profile.gc_balance ?? 0);
  const honorLevel = getHonorLevel(profile.honor_points ?? 0);
  const nextWealthLevel = getNextWealthLevel(profile.gc_balance ?? 0);
  const wealthProgress = getWealthProgress(profile.gc_balance ?? 0);
  const honorProgress = getHonorProgress(profile.honor_points ?? 0);
  const country = profile.country_code ? getCountryByCode(profile.country_code.trim()) : null;
  const zh = locale === "zh";

  // Profile completion data
  const profileRecord = profile as unknown as Record<string, unknown>;
  const filledFields: Record<string, boolean> = {};
  for (const field of PROFILE_REWARDS) {
    filledFields[field.key] = field.isFilled(profileRecord);
  }
  const rewardedFields = (profile.profile_rewards ?? {}) as Record<string, boolean>;

  // Calculate daily GC with streak bonus
  const currentStreak = todayCheckin?.streak ?? 0;
  const bonusPct = Math.min(Math.max(0, currentStreak - 1), 30) * 0.01;
  const dailyBase = wealthLevel.dailyFreeGc;
  const dailyWithBonus = Math.floor(dailyBase * (1 + bonusPct));

  // Bet stats
  const { data: betStats } = await supabase
    .from("bets")
    .select("status, gc_amount")
    .eq("user_id", user.id);

  const totalBets = betStats?.length ?? 0;
  const wonBets = betStats?.filter((b) => b.status === "won").length ?? 0;
  const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;
  const totalWagered = betStats?.reduce((sum, b) => sum + (b.gc_amount ?? 0), 0) ?? 0;

  // ── Score Bets (two-step) ─────────────────────────────────────────────────
  type MatchStub = { id: string; home_team: string; away_team: string; kickoff_time: string; stage: string; status: string; home_score: number | null; away_score: number | null };

  const { data: scoreBetsRaw } = await supabase
    .from("score_bets")
    .select("id, match_id, score_home, score_away, gc_amount, odds_multiplier, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const scoreMatchIds = [...new Set((scoreBetsRaw ?? []).map((b) => b.match_id).filter(Boolean))];
  const { data: scoreMatchesRaw } = scoreMatchIds.length
    ? await supabase.from("matches")
        .select("id, home_team, away_team, kickoff_time, stage, status, home_score, away_score")
        .in("id", scoreMatchIds)
    : { data: [] as MatchStub[] };
  const scoreMatchMap: Record<string, MatchStub> = {};
  (scoreMatchesRaw ?? []).forEach((m) => { scoreMatchMap[m.id] = m as MatchStub; });
  const scoreBets = (scoreBetsRaw ?? []).map((b) => ({
    ...b,
    match: (scoreMatchMap[b.match_id] ?? null) as MatchStub | null,
  }));

  // ── Award Bets ────────────────────────────────────────────────────────────
  const { data: awardBets } = await supabase
    .from("award_bets")
    .select("id, award_type, player_id, player_name, player_name_zh, gc_amount, odds_multiplier, bet_phase, result, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // ── Full Match Bets (two-step) ─────────────────────────────────────────────
  const { data: allBetsRaw } = await supabase
    .from("bets")
    .select("id, match_id, prediction, gc_amount, odds, potential_payout, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const allBetMatchIds = [...new Set((allBetsRaw ?? []).map((b) => b.match_id).filter(Boolean))];
  const { data: allBetMatchesRaw } = allBetMatchIds.length
    ? await supabase.from("matches")
        .select("id, home_team, away_team, kickoff_time, stage, status, home_score, away_score")
        .in("id", allBetMatchIds)
    : { data: [] as MatchStub[] };
  const allBetMatchMap: Record<string, MatchStub> = {};
  (allBetMatchesRaw ?? []).forEach((m) => { allBetMatchMap[m.id] = m as MatchStub; });
  const allBets = (allBetsRaw ?? []).map((b) => ({
    ...b,
    match: (allBetMatchMap[b.match_id] ?? null) as MatchStub | null,
  }));

  // ── Forum Counts ──────────────────────────────────────────────────────────
  const [
    { count: postCount },
    { count: replyCount },
    { count: bookmarkCount },
    { count: ratingsGivenCount },
  ] = await Promise.all([
    supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_deleted", false),
    supabase.from("forum_replies").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_deleted", false),
    supabase.from("forum_bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("forum_ratings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  // ── My Posts / My Replies ─────────────────────────────────────────────────
  type MyPostRow = {
    id: number; title: string; reply_count: number; like_count: number;
    view_count: number; created_at: string;
    forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                    | { slug: string; name: string; name_zh: string; icon: string }[];
  };
  type MyReplyRow = {
    id: number; content: string; like_count: number; created_at: string;
    post_id: number;
    forum_posts: { id: number; title: string;
      forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                      | { slug: string; name: string; name_zh: string; icon: string }[];
    } | { id: number; title: string;
      forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                      | { slug: string; name: string; name_zh: string; icon: string }[];
    }[];
  };

  type MyRatingRow = {
    id: number; gc_amount: number; reason: string | null; created_at: string;
    post_id: number; reply_id: number | null; recipient_id: string | null; user_id: string;
    forum_posts: { id: number; title: string } | { id: number; title: string }[] | null;
    recipient: { nickname: string | null; username: string | null } | null;
    giver: { nickname: string | null; username: string | null } | null;
  };

  type MyBookmarkRow = {
    id: number; created_at: string;
    post_id: number;
    forum_posts: {
      id: number; title: string; reply_count: number; like_count: number; view_count: number; created_at: string;
      forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                      | { slug: string; name: string; name_zh: string; icon: string }[];
    } | null;
  };

  let myPosts: MyPostRow[] = [];
  let myReplies: MyReplyRow[] = [];
  let myBookmarks: MyBookmarkRow[] = [];
  let myRatings: MyRatingRow[] = [];
  let itemTotalCount = 0;

  if (tab === "my-posts") {
    const { data, count } = await supabase
      .from("forum_posts")
      .select("id, title, reply_count, like_count, view_count, created_at, forum_categories(slug, name, name_zh, icon)", { count: "exact" })
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(itemFrom, itemFrom + ITEMS_PER_PAGE - 1);
    myPosts = (data ?? []) as unknown as MyPostRow[];
    itemTotalCount = count ?? 0;
  } else if (tab === "my-replies") {
    const { data, count } = await supabase
      .from("forum_replies")
      .select("id, content, like_count, created_at, post_id, forum_posts!inner(id, title, forum_categories(slug, name, name_zh, icon))", { count: "exact" })
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(itemFrom, itemFrom + ITEMS_PER_PAGE - 1);
    myReplies = (data ?? []) as unknown as MyReplyRow[];
    itemTotalCount = count ?? 0;
  } else if (tab === "my-ratings") {
    const isGiven = ratingsDir !== "received";
    const field = isGiven ? "user_id" : "recipient_id";
    const { data, count } = await supabase
      .from("forum_ratings")
      .select(
        `id, gc_amount, reason, created_at, post_id, reply_id, recipient_id, user_id,
         forum_posts(id, title),
         recipient:users!forum_ratings_recipient_id_fkey(nickname, username),
         giver:users!forum_ratings_user_id_fkey(nickname, username)`,
        { count: "exact" }
      )
      .eq(field, user.id)
      .order("created_at", { ascending: false })
      .range(itemFrom, itemFrom + ITEMS_PER_PAGE - 1);
    myRatings = (data ?? []) as unknown as MyRatingRow[];
    itemTotalCount = count ?? 0;
  } else if (tab === "bookmarks") {
    const { data, count } = await supabase
      .from("forum_bookmarks")
      .select("id, created_at, post_id, forum_posts(id, title, reply_count, like_count, view_count, created_at, forum_categories(slug, name, name_zh, icon))", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(itemFrom, itemFrom + ITEMS_PER_PAGE - 1);
    myBookmarks = (data ?? []) as unknown as MyBookmarkRow[];
    itemTotalCount = count ?? 0;
  }

  const itemTotalPages = Math.ceil(itemTotalCount / ITEMS_PER_PAGE);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return zh ? "刚刚"      : "just now";
    if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
    if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
    if (d < 30) return zh ? `${d}天前`   : `${d}d ago`;
    return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  }

  function snippet(html: string, max = 120): string {
    const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  return (
    <div className="text-white space-y-6">

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
                    {profile.nickname?.[0]?.toUpperCase() ?? "?"}
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
                  {profile.nickname}
                </h1>
                {country && (
                  <span className="text-xl" title={country.name}>
                    {country.flag}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5 truncate">{user.email}</p>

              {/* Slogan */}
              {profile.slogan && (
                <p className="text-gray-400 text-xs italic mt-1.5 truncate">
                  &ldquo;{profile.slogan}&rdquo;
                </p>
              )}

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
                {/* Favorite Team */}
                {profile.favorite_team && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border border-[#1E3A5F] text-gray-300 bg-[#1E3A5F]/40">
                    ⚽ {profile.favorite_team}
                  </span>
                )}
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-xs">GoalCoin Balance</p>
              <Link
                href={`/${locale}/profile/topup`}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#FFD700]/15 hover:bg-[#FFD700]/25 border border-[#FFD700]/40 hover:border-[#FFD700]/70 text-[#FFD700] text-[11px] font-black rounded-lg transition-all"
              >
                <span>＋</span>
                <span>{locale === "zh" ? "充值" : "Top Up"}</span>
              </Link>
            </div>
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

        {/* Bio */}
        {profile.bio && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-6">
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
              {zh ? "自我介绍" : "Bio"}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Profile Completion Card */}
        <div className="mb-6">
          <ProfileCompletion
            filledFields={filledFields}
            rewardedFields={rewardedFields}
            locale={locale}
            zh={zh}
          />
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
            <h3 className="text-white font-bold text-base mb-4">预测统计</h3>
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
            <Link
              href={`/${locale}/profile/transactions`}
              className="text-[#FFD700] text-xs hover:underline"
            >
              {zh ? "全部记录 →" : "View All →"}
            </Link>
          </div>

          {recentTx && recentTx.length > 0 ? (
            <div className="space-y-2">
              {recentTx.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 border-b border-[#1E3A5F] last:border-0"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {gcTransactionLabel(tx.type, zh)}
                      </p>
                      <p className="text-xs text-gray-500">{tx.note}</p>
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
            <h3 className="text-white font-bold">预测历史</h3>
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
                const match = bet.matches as unknown as { home_team: string; away_team: string; kickoff_time: string } | null;
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
                        Wagered: {formatGc(bet.gc_amount)} GC
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        bet.status === "won"
                          ? "bg-green-500/20 text-green-400"
                          : bet.status === "lost"
                          ? "bg-red-500/20 text-red-400"
                          : bet.status === "refunded"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-[#FFD700]/20 text-[#FFD700]"
                      }`}
                    >
                      {bet.status === "pending" ? "Pending" : bet.status === "won" ? "Won" : bet.status === "lost" ? "Lost" : "Refunded"}
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

        {/* ── Forum Summary (overview only) ── */}
        {tab === "overview" && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">💬 {zh ? "论坛活动" : "Forum Activity"}</h3>
              <Link href={`/${locale}/forum`} className="text-[#FFD700] text-xs hover:underline">
                {zh ? "去论坛 →" : "Browse →"}
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: zh ? "发帖" : "Posts",    value: postCount ?? 0,    icon: "📝", tab: "my-posts" },
                { label: zh ? "回复" : "Replies",   value: replyCount ?? 0,   icon: "💬", tab: "my-replies" },
                { label: zh ? "收藏" : "Bookmarks", value: bookmarkCount ?? 0, icon: "🔖", tab: "bookmarks" },
                { label: zh ? "加减分" : "Ratings",  value: ratingsGivenCount ?? 0, icon: "⭐", tab: "my-ratings" },
              ].map((s) => (
                <Link key={s.tab} href={`/${locale}/profile?tab=${s.tab}`}
                  className="bg-[#0A1628] rounded-xl p-3 hover:border-[#FFD700]/30 border border-transparent transition-all text-center">
                  <p className="text-lg mb-0.5">{s.icon}</p>
                  <p className="text-white font-bold text-lg">{s.value}</p>
                  <p className="text-gray-500 text-xs">{s.label}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Followed Players (overview only) ── */}
        {tab === "overview" && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">⭐ {zh ? "关注的球员" : "Followed Players"}</h3>
              <Link href={`/${locale}/players`} className="text-[#FFD700] text-xs hover:underline">
                {zh ? "浏览球员 →" : "Browse →"}
              </Link>
            </div>
            {followedPlayers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {followedPlayers.map((fp) => {
                  const name = zh && fp.name_zh ? fp.name_zh : fp.name;
                  return (
                    <Link key={fp.id} href={`/${locale}/players/${fp.id}`}
                      className="flex items-center gap-3 bg-[#0A1628] rounded-xl p-3 border border-transparent hover:border-[#FFD700]/30 transition-all">
                      {fp.photo_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#1E3A5F] relative shrink-0">
                          <Image src={fp.photo_url} alt={fp.name} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border border-[#1E3A5F] shrink-0 bg-gradient-to-br ${
                          fp.position === "GK" ? "from-yellow-700 to-yellow-900" :
                          fp.position === "DF" ? "from-blue-700 to-blue-900" :
                          fp.position === "MF" ? "from-green-700 to-green-900" :
                          "from-red-700 to-red-900"
                        }`}>
                          {fp.shirt_number ?? (fp.name[0] ?? "?")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{name}</p>
                        <p className="text-gray-500 text-xs truncate">{fp.team}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                {zh ? "还没有关注的球员，去球员页关注你喜欢的球星吧。" : "No followed players yet — browse and follow your favorites."}
              </p>
            )}
          </div>
        )}

        {/* ── My Posts / My Replies Tabs ── */}
        <div className="mt-6">
          <div className="flex gap-2 mb-4">
            {(["overview", "bets", "my-posts", "my-replies", "bookmarks", "my-ratings"] as const).map((t) => {
              const labels = {
                "overview":   zh ? "📊 概览"    : "📊 Overview",
                "bets":       zh ? "🎯 预测"    : "🎯 Bets",
                "my-posts":   zh ? "📝 主题"    : "📝 Posts",
                "my-replies": zh ? "💬 回复"    : "💬 Replies",
                "bookmarks":  zh ? "🔖 收藏"    : "🔖 Saved",
                "my-ratings": zh ? "⭐ 加减分"  : "⭐ Ratings",
              };
              return (
                <Link
                  key={t}
                  href={`/${locale}/profile?tab=${t}`}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    tab === t
                      ? "bg-[#FFD700] text-[#0A1628]"
                      : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
                  }`}
                >
                  {labels[t]}{t !== "overview" && tab === t ? ` (${itemTotalCount})` : ""}
                </Link>
              );
            })}
          </div>

          {/* ── Bets Tab ── */}
          {tab === "bets" && (
            <div className="space-y-4">
              {/* Sub-tabs */}
              <div className="flex gap-1 bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-1">
                {(["match", "score", "award"] as const).map((bt) => {
                  const btLabels = {
                    match: zh ? "比赛预测" : "Match Bets",
                    score: zh ? "比分预测" : "Score Bets",
                    award: zh ? "大奖预测" : "Award Bets",
                  };
                  const counts = { match: allBets.length, score: scoreBets.length, award: awardBets?.length ?? 0 };
                  return (
                    <Link key={bt} href={`/${locale}/profile?tab=bets&betsTab=${bt}`}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                        betsTab === bt ? "bg-[#FFD700] text-[#0A1628]" : "text-gray-500 hover:text-white"
                      }`}>
                      {btLabels[bt]}
                      {counts[bt] > 0 && (
                        <span className={`ml-1 text-[10px] px-1 rounded-full ${betsTab === bt ? "bg-[#0A1628]/20 text-[#0A1628]" : "bg-[#1E3A5F] text-gray-400"}`}>
                          {counts[bt]}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Match Bets */}
              {betsTab === "match" && (
                allBets.length === 0 ? (
                  <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-12 text-center">
                    <p className="text-gray-500 text-sm">{zh ? "还没有比赛预测记录" : "No match bets yet"}</p>
                    <Link href={`/${locale}/predict`} className="inline-block mt-3 text-[#FFD700] text-xs hover:underline">{zh ? "去预测 →" : "Place a bet →"}</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allBets.map((bet) => {
                      const m = bet.match;
                      const isWon = bet.status === "won";
                      const isLost = bet.status === "lost";
                      const pickLbl = bet.prediction === "home"
                        ? (zh ? `${m?.home_team ?? ""} 胜` : `${m?.home_team ?? ""} Win`)
                        : bet.prediction === "away"
                        ? (zh ? `${m?.away_team ?? ""} 胜` : `${m?.away_team ?? ""} Win`)
                        : (zh ? "平局" : "Draw");
                      return (
                        <div key={bet.id} className={`bg-[#0F2040] border rounded-xl p-3.5 ${isWon ? "border-green-500/20" : isLost ? "border-red-500/20" : "border-[#1E3A5F]"}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{m ? `${m.home_team} vs ${m.away_team}` : "—"}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-gray-400">{pickLbl}</span>
                                <span className="text-[10px] text-gray-600">{formatGc(bet.gc_amount)} GC · ×{bet.odds?.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWon ? "bg-green-500/15 text-green-400" : isLost ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>
                                {isWon ? (zh ? "🎉 赢" : "🎉 Won") : isLost ? (zh ? "💔 输" : "💔 Lost") : (zh ? "⏳ 待结算" : "⏳ Pending")}
                              </span>
                              <p className={`text-xs font-black mt-1 ${isWon ? "text-green-400" : isLost ? "text-red-400" : "text-gray-500"}`}>
                                {isWon ? `+${formatGc(bet.potential_payout ?? 0)}` : isLost ? `-${formatGc(bet.gc_amount)}` : `→ ${formatGc(bet.potential_payout ?? 0)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Score Bets */}
              {betsTab === "score" && (
                scoreBets.length === 0 ? (
                  <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-12 text-center">
                    <p className="text-gray-500 text-sm">{zh ? "还没有比分预测记录" : "No score bets yet"}</p>
                    <Link href={`/${locale}/predict`} className="inline-block mt-3 text-[#FFD700] text-xs hover:underline">{zh ? "去预测 →" : "Place a bet →"}</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scoreBets.map((bet) => {
                      const m = bet.match;
                      const isWon = bet.status === "won";
                      const isLost = bet.status === "lost";
                      const potential = Math.round(Number(bet.gc_amount) * Number(bet.odds_multiplier));
                      return (
                        <div key={bet.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{m ? `${m.home_team} vs ${m.away_team}` : "—"}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs font-bold text-[#FFD700]">{zh ? "比分：" : "Score: "}{bet.score_home} – {bet.score_away}</span>
                                <span className="text-[10px] text-gray-600">{formatGc(Number(bet.gc_amount))} GC · ×{bet.odds_multiplier}</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWon ? "bg-green-500/15 text-green-400" : isLost ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>
                                {isWon ? (zh ? "🎉 赢" : "🎉 Won") : isLost ? (zh ? "💔 输" : "💔 Lost") : (zh ? "⏳ 待结算" : "⏳ Pending")}
                              </span>
                              <p className={`text-xs font-black mt-1 ${isWon ? "text-green-400" : isLost ? "text-red-400" : "text-gray-500"}`}>
                                {isWon ? `+${formatGc(potential)}` : isLost ? `-${formatGc(Number(bet.gc_amount))}` : `→ ${formatGc(potential)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* Award Bets */}
              {betsTab === "award" && (
                (awardBets?.length ?? 0) === 0 ? (
                  <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-12 text-center">
                    <p className="text-gray-500 text-sm">{zh ? "还没有大奖预测记录" : "No award bets yet"}</p>
                    <Link href={`/${locale}/awards`} className="inline-block mt-3 text-[#FFD700] text-xs hover:underline">{zh ? "去预测 →" : "Place a bet →"}</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(awardBets ?? []).map((bet) => {
                      const awardKey = dbToAwardKey(bet.award_type);
                      const meta = awardKey ? AWARD_META[awardKey] : null;
                      const isWon = bet.result === "won";
                      const isLost = bet.result === "lost";
                      const potential = Math.round(Number(bet.gc_amount) * Number(bet.odds_multiplier));
                      return (
                        <div key={bet.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-base">{meta?.icon ?? "🏅"}</span>
                                <span className="text-xs text-gray-400 font-semibold">{zh ? (meta?.nameZh ?? bet.award_type) : (meta?.name ?? bet.award_type)}</span>
                              </div>
                              <p className="text-sm font-bold text-white truncate">{zh ? bet.player_name_zh : bet.player_name}</p>
                              <span className="text-[10px] text-gray-600">{formatGc(Number(bet.gc_amount))} GC · ×{bet.odds_multiplier}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWon ? "bg-green-500/15 text-green-400" : isLost ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>
                                {isWon ? (zh ? "🎉 赢" : "🎉 Won") : isLost ? (zh ? "💔 输" : "💔 Lost") : (zh ? "⏳ 待结算" : "⏳ Pending")}
                              </span>
                              <p className={`text-xs font-black mt-1 ${isWon ? "text-green-400" : isLost ? "text-red-400" : "text-gray-500"}`}>
                                {isWon ? `+${formatGc(potential)}` : isLost ? `-${formatGc(Number(bet.gc_amount))}` : `→ ${formatGc(potential)}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* My Posts list */}
          {tab === "my-posts" && (
            <>
              {myPosts.length === 0 ? (
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 text-sm mb-3">{zh ? "还没有发布主题" : "No posts yet"}</p>
                  <Link href={`/${locale}/forum/new`}
                    className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-5 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
                    ✏️ {zh ? "发帖" : "New Post"}
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {myPosts.map((p) => {
                    const cat = Array.isArray(p.forum_categories) ? p.forum_categories[0] : p.forum_categories;
                    return (
                      <Link key={p.id} href={`/${locale}/forum/thread/${p.id}`}
                        className="block bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30 rounded-2xl p-4 transition-all group">
                        <div className="flex items-center gap-2 mb-1.5">
                          {cat && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-400">
                              {cat.icon} {zh ? cat.name_zh : cat.name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-600">{timeAgo(p.created_at)}</span>
                        </div>
                        <h3 className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors leading-snug mb-2">{p.title}</h3>
                        <div className="flex items-center gap-3 text-[10px] text-gray-600">
                          <span>👁 {p.view_count.toLocaleString()}</span>
                          <span>💬 {p.reply_count}</span>
                          <span>❤️ {p.like_count}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* My Replies list */}
          {tab === "my-replies" && (
            <>
              {myReplies.length === 0 ? (
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 text-sm">{zh ? "还没有回复" : "No replies yet"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myReplies.map((r) => {
                    const fp = Array.isArray(r.forum_posts) ? r.forum_posts[0] : r.forum_posts;
                    const cat = fp
                      ? (Array.isArray(fp.forum_categories) ? fp.forum_categories[0] : fp.forum_categories)
                      : null;
                    return (
                      <Link key={r.id} href={`/${locale}/forum/thread/${fp?.id ?? r.post_id}`}
                        className="block bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30 rounded-2xl p-4 transition-all group">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {cat && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-400">
                              {cat.icon} {zh ? cat.name_zh : cat.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 font-semibold truncate">
                            {zh ? "回复：" : "Re: "}{fp?.title ?? ""}
                          </span>
                          <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{snippet(r.content)}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-2">
                          <span>❤️ {r.like_count}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Bookmarks ── */}
          {tab === "bookmarks" && (
            <>
              {myBookmarks.length === 0 ? (
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                  <div className="text-4xl mb-3">🔖</div>
                  <p className="text-gray-500 text-sm">{zh ? "还没有收藏帖子" : "No bookmarks yet"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myBookmarks.map((bm) => {
                    const fp = bm.forum_posts;
                    if (!fp) return null;
                    const cat = Array.isArray(fp.forum_categories) ? fp.forum_categories[0] : fp.forum_categories;
                    return (
                      <Link key={bm.id} href={`/${locale}/forum/thread/${fp.id}`}
                        className="block bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30 rounded-2xl p-4 transition-all group">
                        <div className="flex items-center gap-2 mb-1.5">
                          {cat && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-400">
                              {cat.icon} {zh ? cat.name_zh : cat.name}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-600 ml-auto">{timeAgo(bm.created_at)}</span>
                        </div>
                        <p className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors line-clamp-2 mb-2">
                          {fp.title}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-600">
                          <span>💬 {fp.reply_count}</span>
                          <span>❤️ {fp.like_count}</span>
                          <span>👁 {fp.view_count}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── My Ratings ── */}
          {tab === "my-ratings" && (
            <>
              {/* Direction sub-tabs */}
              <div className="flex gap-1 bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-1 mb-4">
                {(["given", "received"] as const).map((dir) => (
                  <Link key={dir} href={`/${locale}/profile?tab=my-ratings&ratingsDir=${dir}`}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                      ratingsDir === dir ? "bg-[#FFD700] text-[#0A1628]" : "text-gray-500 hover:text-white"
                    }`}>
                    {dir === "given" ? (zh ? "我给出的" : "Given") : (zh ? "我收到的" : "Received")}
                  </Link>
                ))}
              </div>

              {myRatings.length === 0 ? (
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-gray-500 text-sm">
                    {ratingsDir === "given"
                      ? (zh ? "还没有给过加减分" : "No ratings given yet")
                      : (zh ? "还没有收到加减分" : "No ratings received yet")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myRatings.map((r) => {
                    const fp = Array.isArray(r.forum_posts) ? r.forum_posts[0] : r.forum_posts;
                    const isPositive = r.gc_amount > 0;
                    const isGiven = ratingsDir === "given";
                    const otherUser = isGiven
                      ? (Array.isArray(r.recipient) ? r.recipient[0] : r.recipient)
                      : (Array.isArray(r.giver) ? r.giver[0] : r.giver);
                    const otherName = otherUser?.nickname ?? otherUser?.username ?? "—";
                    return (
                      <div key={r.id} className={`bg-[#0F2040] border rounded-xl p-3.5 ${isPositive ? "border-green-500/20" : "border-red-500/20"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-black ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                {isPositive ? "+" : ""}{r.gc_amount.toLocaleString()} GC
                              </span>
                              <span className="text-xs text-gray-500">
                                {isGiven ? (zh ? "→ " : "→ ") : (zh ? "← " : "← ")}{otherName}
                              </span>
                            </div>
                            {fp && (
                              <Link href={`/${locale}/forum/thread/${fp.id}`}
                                className="text-xs text-gray-400 hover:text-[#FFD700] transition-colors truncate block mt-0.5">
                                📄 {fp.title}
                              </Link>
                            )}
                            {r.reason && (
                              <p className="text-xs text-gray-600 mt-0.5 italic truncate">&ldquo;{r.reason}&rdquo;</p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(r.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Pagination for my-posts / my-replies / bookmarks */}
          {(tab === "my-posts" || tab === "my-replies" || tab === "bookmarks" || tab === "my-ratings") && itemTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {itemPage > 1 && (
                <Link href={`/${locale}/profile?tab=${tab}&page=${itemPage - 1}${tab === "my-ratings" ? `&ratingsDir=${ratingsDir}` : ""}`}
                  className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                  {zh ? "上一页" : "Prev"}
                </Link>
              )}
              <span className="text-xs text-gray-500">{itemPage} / {itemTotalPages}</span>
              {itemPage < itemTotalPages && (
                <Link href={`/${locale}/profile?tab=${tab}&page=${itemPage + 1}${tab === "my-ratings" ? `&ratingsDir=${ratingsDir}` : ""}`}
                  className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                  {zh ? "下一页" : "Next"}
                </Link>
              )}
            </div>
          )}
        </div>

    </div>
  );
}
