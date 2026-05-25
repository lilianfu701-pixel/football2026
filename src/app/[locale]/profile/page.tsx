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
import ProfileCompletion from "@/components/ProfileCompletion";
import { PROFILE_REWARDS } from "@/lib/profileRewards";
import Link from "next/link";

interface ProfilePageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}

const ITEMS_PER_PAGE = 10;

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { locale } = await params;
  const { tab = "overview", page: pageStr = "1" } = await searchParams;
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

  // Fetch recent transactions
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("id, type, amount, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

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
                  transfer_sent: zh ? "转出 GC" : "GC Sent",
                  transfer_received: zh ? "收到 GC" : "GC Received",
                  profile_reward: zh ? "资料奖励" : "Profile Reward",
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

        {/* ── My Posts / My Replies Tabs ── */}
        <div className="mt-6">
          <div className="flex gap-2 mb-4">
            {(["overview", "my-posts", "my-replies", "bookmarks"] as const).map((t) => {
              const labels = {
                "overview":   zh ? "📊 概览"    : "📊 Overview",
                "my-posts":   zh ? "📝 我的主题" : "📝 My Posts",
                "my-replies": zh ? "💬 我的回复" : "💬 My Replies",
                "bookmarks":  zh ? "🔖 收藏"    : "🔖 Saved",
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

          {/* Pagination for my-posts / my-replies / bookmarks */}
          {(tab === "my-posts" || tab === "my-replies" || tab === "bookmarks") && itemTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {itemPage > 1 && (
                <Link href={`/${locale}/profile?tab=${tab}&page=${itemPage - 1}`}
                  className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                  {zh ? "上一页" : "Prev"}
                </Link>
              )}
              <span className="text-xs text-gray-500">{itemPage} / {itemTotalPages}</span>
              {itemPage < itemTotalPages && (
                <Link href={`/${locale}/profile?tab=${tab}&page=${itemPage + 1}`}
                  className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                  {zh ? "下一页" : "Next"}
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
