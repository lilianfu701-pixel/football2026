export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ locale: string }>;
}

interface BetRow {
  id:         number;
  user_id:    string;
  match_id:   number;
  prediction: string;
  status:     string;
  gc_amount:  number;
  created_at: string;
}

interface MatchRow {
  id:           number;
  home_team:    string;
  away_team:    string;
  home_score:   number | null;
  away_score:   number | null;
  kickoff_time: string;
  status:       string;
  group_name:   string | null;
}

interface ProfileRow {
  id:       string;
  nickname: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, zh: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return zh ? "刚刚"       : "just now";
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  return zh ? `${d}天前` : `${d}d ago`;
}

function predLabel(prediction: string, home: string, away: string, locale: string): string {
  if (prediction === "home") return getTeamDisplayName(home, locale);
  if (prediction === "away") return getTeamDisplayName(away, locale);
  return locale === "zh" ? "平局" : "Draw";
}

function fmtGc(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: zh ? "好友动态 | Football2026" : "Following Feed | Football2026",
    description: zh
      ? "查看你关注的用户的最新预测动态。"
      : "See the latest prediction activity from people you follow.",
  };
}

// ── Shared empty state UI ─────────────────────────────────────────────────────

function EmptyState({ zh, locale, icon, title, body, cta, ctaHref }: {
  zh: boolean; locale: string;
  icon: string; title: string; body: string; cta: string; ctaHref: string;
}) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white">🌐 {zh ? "好友动态" : "Following Feed"}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {zh ? "查看你关注的用户的最新预测" : "Latest predictions from users you follow"}
        </p>
      </div>
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <p className="text-white font-bold text-base mb-2">{title}</p>
        <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto">{body}</p>
        <Link
          href={ctaHref}
          className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-6 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FeedPage({ params }: Props) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <EmptyState
        zh={zh} locale={locale}
        icon="🔐"
        title={zh ? "登录后查看好友动态" : "Log in to see your feed"}
        body={zh ? "登录后即可查看你关注的用户的最新预测记录。" : "Log in to see the latest predictions from users you follow."}
        cta={zh ? "立即登录" : "Log In"}
        ctaHref={`/${locale}/auth/login`}
      />
    );
  }

  // Step 1 — get following list
  const { data: followData } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (followData ?? []).map((f: { following_id: string }) => f.following_id);

  if (followingIds.length === 0) {
    return (
      <EmptyState
        zh={zh} locale={locale}
        icon="👥"
        title={zh ? "还没有关注任何人" : "No one followed yet"}
        body={zh ? "去排行榜发现感兴趣的预测达人，关注后就能在这里看到他们的动态。" : "Discover top predictors on the leaderboard and follow them to see their activity here."}
        cta={zh ? "查看排行榜 →" : "View Leaderboard →"}
        ctaHref={`/${locale}/leaderboard`}
      />
    );
  }

  // Step 2 — recent bets from followed users
  const { data: betsData } = await supabase
    .from("bets")
    .select("id, user_id, match_id, prediction, status, gc_amount, created_at")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(60);

  const bets = (betsData ?? []) as BetRow[];

  // Step 3 — batch fetch matches + profiles
  const matchIds  = [...new Set(bets.map((b) => b.match_id))];
  const userIds   = [...new Set(bets.map((b) => b.user_id))];

  const [matchesRes, profilesRes] = await Promise.all([
    matchIds.length > 0
      ? supabase.from("matches")
          .select("id, home_team, away_team, home_score, away_score, kickoff_time, status, group_name")
          .in("id", matchIds)
      : Promise.resolve({ data: [] as MatchRow[] }),
    userIds.length > 0
      ? supabase.from("users")
          .select("id, nickname")
          .in("id", userIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
  ]);

  const matchMap: Record<number, MatchRow> = {};
  for (const m of (matchesRes.data ?? []) as MatchRow[]) matchMap[m.id] = m;

  const profileMap: Record<string, ProfileRow> = {};
  for (const p of (profilesRes.data ?? []) as ProfileRow[]) profileMap[p.id] = p;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white">🌐 {zh ? "好友动态" : "Following Feed"}</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {zh
            ? `关注了 ${followingIds.length} 人 · 最新预测动态`
            : `Following ${followingIds.length} ${followingIds.length === 1 ? "user" : "users"} · Latest predictions`}
        </p>
      </div>

      {bets.length === 0 ? (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">😴</div>
          <p className="text-gray-400 text-sm">
            {zh ? "你关注的用户还没有发起预测" : "Users you follow haven't made any predictions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => {
            const match   = matchMap[bet.match_id];
            const profile = profileMap[bet.user_id];
            if (!match) return null;

            const label = predLabel(bet.prediction, match.home_team, match.away_team, locale);
            const homeFlag = getFlagUrl(match.home_team, 40);
            const awayFlag = getFlagUrl(match.away_team, 40);
            const won  = bet.status === "won";
            const lost = bet.status === "lost";

            return (
              <div key={bet.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">

                {/* User row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center text-[#0A1628] font-black text-sm shrink-0">
                      {(profile?.nickname ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{profile?.nickname ?? (zh ? "用户" : "User")}</p>
                      <p className="text-[10px] text-gray-600">{timeAgo(bet.created_at, zh)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black ${won ? "text-green-400" : lost ? "text-red-400" : "text-gray-500"}`}>
                      {won ? (zh ? "✓ 胜" : "✓ Won") : lost ? (zh ? "✗ 负" : "✗ Lost") : (zh ? "待定" : "Pending")}
                    </span>
                    {bet.gc_amount > 0 && (
                      <p className="text-[10px] text-[#FFD700] font-semibold">
                        {won ? "+" : ""}{fmtGc(bet.gc_amount)} GC
                      </p>
                    )}
                  </div>
                </div>

                {/* Match card */}
                <Link
                  href={`/${locale}/matches/${match.id}`}
                  className="flex items-center gap-2 bg-[#0A1628] rounded-lg px-3 py-2.5 hover:bg-[#1E3A5F]/40 transition-colors mb-2"
                >
                  {/* Home team */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {homeFlag && (
                      <div className="w-5 h-3.5 relative overflow-hidden rounded-sm shrink-0">
                        <Image src={homeFlag} alt={match.home_team} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <span className="text-xs text-white font-medium truncate">
                      {getTeamDisplayName(match.home_team, locale)}
                    </span>
                  </div>
                  {/* Score */}
                  <div className="px-2 shrink-0 text-center">
                    {match.status === "finished" && match.home_score !== null ? (
                      <span className="text-xs font-black text-white">
                        {match.home_score}–{match.away_score}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-600">vs</span>
                    )}
                  </div>
                  {/* Away team */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-xs text-white font-medium truncate">
                      {getTeamDisplayName(match.away_team, locale)}
                    </span>
                    {awayFlag && (
                      <div className="w-5 h-3.5 relative overflow-hidden rounded-sm shrink-0">
                        <Image src={awayFlag} alt={match.away_team} fill className="object-cover" unoptimized />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Prediction pill */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">{zh ? "预测：" : "Picked:"}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                    won  ? "bg-green-500/15 text-green-400" :
                    lost ? "bg-red-500/15   text-red-400"   :
                           "bg-[#1E3A5F]   text-[#FFD700]"
                  }`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
