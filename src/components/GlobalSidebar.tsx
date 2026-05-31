import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { getWealthLevel, getHonorLevel, formatGc } from "@/lib/levels";
import { getBetPhase } from "@/lib/awardPhase";
import AwardSidebarCard from "@/app/[locale]/matches/AwardSidebarCard";
import FavoritesCard from "@/app/[locale]/matches/FavoritesCard";
import InviteCard from "@/app/[locale]/matches/InviteCard";
import SidebarGcBalance from "@/components/SidebarGcBalance";

interface Props { locale: string }

const STAGE_LABELS: Record<string, string> = {
  group: "Group Stage", round32: "R32", round16: "R16",
  quarter: "QF", semi: "SF", third: "3rd", final: "Final",
};


export default async function GlobalSidebar({ locale }: Props) {
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const headersList = await headers();
  const host  = headersList.get("host") ?? "football2026.net";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${proto}://${host}`;

  // ── Parallel DB fetches ──────────────────────────────────────────────────
  const [
    profileRes, userBetsRes, awardBetsRes, allMatchesRes, followsRes,
  ] = await Promise.all([
    user
      ? supabase.from("users")
          .select("nickname, avatar_url, country_code, gc_balance, honor_points, invite_count")
          .eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("bets").select("id, status").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("award_bets")
          .select("award_type, player_id, player_name, player_name_zh, gc_amount, odds_multiplier")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase.from("matches")
      .select("id, home_team, away_team, kickoff_time, status, home_score, away_score")
      .order("kickoff_time", { ascending: true }),
    user
      ? supabase.from("match_follows").select("match_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const profile         = profileRes.data;
  const userBets        = userBetsRes.data;
  const awardBets       = awardBetsRes.data;
  const allMatchesBrief = allMatchesRes.data;

  // Get followed match IDs from DB, handle error gracefully
  let dbFollowedIds: number[] = [];
  if (user) {
    // Check for query error first
    if ((followsRes as any).error) {
      console.error("[GlobalSidebar] match_follows query error:", (followsRes as any).error);
    } else if (followsRes.data) {
      try {
        dbFollowedIds = (followsRes.data as { match_id: number }[]).map((r) => r.match_id);
      } catch (e) {
        console.error("[GlobalSidebar] Error parsing follows:", e);
      }
    }
  }
  const { phase: awardPhase } = getBetPhase();

  // ── Sidebar profile (sp) ──────────────────────────────────────────────────
  let sp: {
    wl: ReturnType<typeof getWealthLevel>;
    hl: ReturnType<typeof getHonorLevel>;
    gc: number; honor: number; username: string;
    avatarUrl: string | null; initials: string;
    flagUrl: string | null; countryName: string;
    inviteCount: number;
  } | null = null;

  if (user) {
    const gc    = profile?.gc_balance   ?? 0;
    const honor = profile?.honor_points ?? 0;
    const cc    = ((profile?.country_code ?? (user.user_metadata?.country_code as string | undefined) ?? "UN") as string).toUpperCase();
    let countryName = zh ? "未知" : "Unknown";
    try { if (cc !== "UN") countryName = new Intl.DisplayNames([zh ? "zh-CN" : "en"], { type: "region" }).of(cc) ?? cc; }
    catch { /* keep default */ }
    const username  = profile?.nickname
      ?? (user.user_metadata?.name as string | undefined)
      ?? (user.user_metadata?.full_name as string | undefined)
      ?? user.email?.split("@")[0] ?? "User";
    const avatarUrl = profile?.avatar_url
      ?? (user.user_metadata?.avatar_url as string | undefined)
      ?? (user.user_metadata?.picture as string | undefined) ?? null;
    sp = {
      wl: getWealthLevel(gc), hl: getHonorLevel(honor),
      gc, honor, username, avatarUrl,
      initials: username.slice(0, 2).toUpperCase(),
      flagUrl: cc !== "UN" ? `https://flagcdn.com/w40/${cc.toLowerCase()}.png` : null,
      countryName,
      inviteCount: (profile?.invite_count as number | undefined) ?? 0,
    };
  }

  const totalBets = userBets?.length ?? 0;
  const wonBets   = userBets?.filter((b) => b.status === "won").length ?? 0;
  const winRate   = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0;

  const t = await getTranslations({ locale, namespace: "matches" });

  return (
    <div className="flex flex-col gap-4">

      {/* ── Slot 1: Guest promo / Logged-in profile ── */}
      {!user ? (
        <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/40 bg-gradient-to-br from-[#1C2E50] via-[#0F1E38] to-[#0A1628]">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[#FFD700]/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-[#FF6B00]/10 blur-2xl pointer-events-none" />
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full shadow-lg shadow-[#FFD700]/20 shrink-0 overflow-hidden">
                <Image src="/icons/levels/GC.png" alt="GoalCoin" width={48} height={48} className="w-full h-full object-cover" unoptimized />
              </div>
              <div>
                <p className="text-[#FFD700] font-black text-sm tracking-wide">GOAL COIN</p>
                <p className="text-gray-400 text-xs">{zh ? "注册即送" : "Free on signup"}</p>
              </div>
            </div>
            <div className="bg-[#0A1628]/60 rounded-xl p-4 mb-4 border border-[#FFD700]/10">
              <p className="text-[#FFD700] font-black text-2xl text-center">100,000</p>
              <p className="text-gray-400 text-xs text-center mt-0.5">GC {zh ? "新用户礼包" : "Welcome Gift"}</p>
            </div>
            <div className="space-y-2">
              <Link href={`/${locale}/auth/register`}
                className="block w-full text-center bg-[#FFD700] text-[#0A1628] font-black py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
                🚀 {zh ? "免费注册领取" : "Register Free & Claim"}
              </Link>
              <Link href={`/${locale}/auth/login`}
                className="block w-full text-center border border-[#1E3A5F] text-gray-400 hover:text-white hover:border-[#FFD700]/30 font-semibold py-2 rounded-xl text-xs transition-colors">
                {zh ? "已有账号？登录" : "Already have an account? Login"}
              </Link>
            </div>
          </div>
        </div>
      ) : sp ? (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {/* Profile header */}
          <div className="relative bg-gradient-to-br from-[#1C2E50] to-[#0F2040] p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#FFD700]/30 shadow-lg">
                  {sp.avatarUrl
                    ? <Image src={sp.avatarUrl} alt={sp.username} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                    : <div className="w-full h-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center">
                        <span className="text-white font-black text-xl">{sp.initials}</span>
                      </div>
                  }
                </div>
                {sp.flagUrl && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-4 rounded-sm overflow-hidden border border-[#0F2040] shadow">
                    <Image src={sp.flagUrl} alt={sp.countryName} width={24} height={16} className="w-full h-full object-cover" unoptimized />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-base truncate">@{sp.username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-gray-500 text-xs truncate">{sp.countryName}</p>
                  <Link href={`/${locale}/profile`}
                    className="text-[10px] text-gray-600 hover:text-[#FFD700] transition-colors shrink-0">
                    {zh ? "编辑" : "Edit"} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{zh ? "财富值" : "Wealth"}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ color: sp.wl.color, backgroundColor: sp.wl.bgColor + "80" }}>
                {sp.wl.icon} {zh ? sp.wl.nameZh : sp.wl.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{zh ? "荣誉值" : "Honor"}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ color: sp.hl.color, backgroundColor: sp.hl.color + "22" }}>
                {sp.hl.icon} {zh ? sp.hl.nameZh : sp.hl.name}
              </span>
            </div>
            <div className="bg-[#0A1628] rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                  <Image src="/icons/levels/GC.png" alt="GoalCoin" width={28} height={28} className="w-full h-full object-cover" unoptimized />
                </div>
                <span className="text-xs text-gray-400">{zh ? "GC 余额" : "GC Balance"}</span>
              </div>
              <SidebarGcBalance zh={zh} />
            </div>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <Link href={`/${locale}/profile/topup`}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-b from-[#FFD700]/15 to-[#FF8C00]/10 border border-[#FFD700]/25 hover:border-[#FFD700]/60 hover:from-[#FFD700]/25 transition-all group">
                <span className="text-xl">💳</span>
                <span className="text-xs font-black text-[#FFD700] group-hover:text-[#FFC200] transition-colors">
                  {zh ? "充值" : "Top Up"}
                </span>
              </Link>
            </div>
            <Link href={`/${locale}/profile`}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1E3A5F]/60 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="text-sm">📜</span>
                <span className="text-xs text-gray-400 group-hover:text-white transition-colors font-medium">
                  {zh ? "GC 交易记录" : "GC History"}
                </span>
              </div>
              <svg className="w-3 h-3 text-gray-600 group-hover:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Slot 1b: My Predictions ── */}
      {user && sp && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-[#7C6FE0]/10 to-transparent border-b border-[#1E3A5F]">
            <p className="text-sm font-black text-white">🎯 {zh ? "我的竞猜" : "My Predictions"}</p>
            <p className="text-xs text-gray-500 mt-0.5">{zh ? "本届世界杯竞猜战绩" : "World Cup 2026 betting record"}</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0A1628] rounded-xl px-3 py-3 text-center border border-[#1E3A5F]">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 leading-none">{zh ? "押注场次" : "Total Bets"}</p>
                <p className="text-2xl font-black text-white leading-none">{totalBets}</p>
              </div>
              <div className="bg-[#0A1628] rounded-xl px-3 py-3 text-center border border-green-500/20">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 leading-none">{zh ? "赢得场次" : "Won"}</p>
                <p className="text-2xl font-black text-green-400 leading-none">{wonBets}</p>
              </div>
            </div>
            <div className="bg-[#0A1628] rounded-xl px-4 py-3 border border-[#1E3A5F]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">{zh ? "胜率" : "Win Rate"}</span>
                <span className="text-sm font-black text-[#FFD700]">{winRate}%</span>
              </div>
              <div className="h-2 bg-[#1E3A5F] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${winRate}%`,
                  background: winRate >= 60 ? "linear-gradient(to right,#22c55e,#16a34a)"
                    : winRate >= 40 ? "linear-gradient(to right,#FFD700,#FF8C00)"
                    : "linear-gradient(to right,#f87171,#ef4444)",
                }} />
              </div>
              {totalBets === 0 && (
                <p className="text-[10px] text-gray-600 mt-1.5 text-center">{zh ? "还没有竞猜记录" : "No bets placed yet"}</p>
              )}
            </div>
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs text-gray-500">{zh ? "当前荣誉积分" : "Honor Points"}</span>
              <span className="text-sm font-black" style={{ color: sp.hl.color }}>{sp.hl.icon} {sp.honor.toLocaleString()}</span>
            </div>
          </div>
          <div className="px-5 pb-4">
            <Link href={`/${locale}/predict`}
              className="block w-full text-center bg-[#1E3A5F] hover:bg-[#7C6FE0]/30 border border-[#1E3A5F] hover:border-[#7C6FE0]/50 text-gray-300 hover:text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
              📋 {zh ? "查看全部记录" : "View All Records"}
            </Link>
          </div>
        </div>
      )}

      {/* ── Slot 1d: Award Bets ── */}
      {user && sp && (
        <AwardSidebarCard locale={locale} bets={awardBets ?? []} phase={awardPhase} />
      )}

      {/* ── Slot 1c: My Favorites ── */}
      {user && sp && (
        <FavoritesCard matches={allMatchesBrief ?? []} locale={locale} dbFollowedIds={dbFollowedIds} />
      )}

      {/* ── Slot 2: Invite ── */}
      {user && sp && (
        <InviteCard username={sp.username} locale={locale} baseUrl={baseUrl} inviteCount={sp.inviteCount} />
      )}

      {/* ── Slot 3: Forum ── */}
      {(() => {
        const hotTopics = zh ? [
          { title: "阿根廷能否成功卫冕世界杯？",     href: "breaking", views: "2.4K" },
          { title: "梅西 C 罗最后一届世界杯？",       href: "stars",    views: "1.8K" },
          { title: "2026 金靴奖竞猜热门人选",         href: "predict",  views: "1.3K" },
          { title: "4-3-3 vs 5-3-2 谁更适合本届杯赛", href: "tactical", views: "980"  },
          { title: "你最期待哪场比赛？",              href: "match",    views: "762"  },
        ] : [
          { title: "Can Argentina defend the title?",   href: "breaking", views: "2.4K" },
          { title: "Messi & Ronaldo's last World Cup?",  href: "stars",    views: "1.8K" },
          { title: "Golden Boot 2026 — who's your pick?",href: "predict",  views: "1.3K" },
          { title: "4-3-3 vs 5-3-2: best system in 2026",href: "tactical", views: "980"  },
          { title: "Most anticipated match of the group stage?", href: "match", views: "762" },
        ];
        const myLinks = [
          { icon: "📝", label: zh ? "我的话题" : "My Topics",  href: `/${locale}/forum/my-topics`  },
          { icon: "💬", label: zh ? "我的跟帖" : "My Replies", href: `/${locale}/forum/my-replies` },
        ];
        return (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">💬 {zh ? "论坛" : "Forum"}</h3>
              <Link href={`/${locale}/forum`} className="text-xs text-[#7C6FE0] hover:text-white font-semibold transition-colors">
                {zh ? "进入论坛 →" : "Enter →"}
              </Link>
            </div>
            {user && (
              <>
                <div className="px-3 pb-2 space-y-0.5">
                  {myLinks.map(({ icon, label, href }) => (
                    <Link key={href} href={href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1E3A5F]/60 transition-colors group">
                      <span className="text-sm w-5 text-center shrink-0">{icon}</span>
                      <span className="text-gray-300 text-sm font-medium flex-1 group-hover:text-white transition-colors">{label}</span>
                      <svg className="w-3 h-3 text-gray-600 group-hover:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
                <div className="mx-5 h-px bg-[#1E3A5F] mb-3" />
              </>
            )}
            <div className="px-5 pb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🔥 {zh ? "热门话题" : "Hot Topics"}</p>
              <div className="space-y-2.5">
                {hotTopics.map((topic, i) => (
                  <Link key={i} href={`/${locale}/forum/${topic.href}`} className="flex items-start gap-2.5 group">
                    <span className={`text-xs font-black shrink-0 mt-0.5 w-4 text-center ${
                      i === 0 ? "text-red-400" : i === 1 ? "text-orange-400" : i === 2 ? "text-yellow-400" : "text-gray-600"
                    }`}>{i + 1}</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors leading-relaxed flex-1">{topic.title}</span>
                    <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{topic.views}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Slot 4: App QR ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📱</span>
          <div>
            <p className="text-sm font-black text-white">{zh ? "手机 App 安装" : "Mobile App"}</p>
            <p className="text-xs text-gray-400">{zh ? "iOS & Android 全平台支持" : "iOS & Android"}</p>
          </div>
        </div>
        <div className="flex justify-center mb-4">
          <div className="p-2.5 bg-white rounded-2xl inline-block shadow-lg">
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(baseUrl + "/download")}&margin=4`}
              alt="App download QR" width={150} height={150} className="rounded-xl" unoptimized />
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mb-3">{zh ? "扫描二维码立即安装" : "Scan QR code to install"}</p>
        <div className="flex gap-2">
          <a href={`/${locale}/download`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E3A5F] hover:bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-300 hover:text-white text-xs font-semibold transition-all">
            🍎 App Store
          </a>
          <a href={`/${locale}/download`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E3A5F] hover:bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-300 hover:text-white text-xs font-semibold transition-all">
            🤖 Google Play
          </a>
        </div>
      </div>


    </div>
  );
}
