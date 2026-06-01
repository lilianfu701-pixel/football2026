"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Gift,
  Home,
  MessageCircle,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGcBalance } from "@/context/GcBalance";
import { getFlagUrl } from "@/lib/flags";
import MobileInstallPrompt from "@/components/mobile/MobileInstallPrompt";
import MobileScheduleDetails from "@/components/mobile/MobileScheduleDetails";
import { redirectToMobileLogin } from "@/components/mobile/mobileAuth";

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export type MobileMatch = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  groupName: string | null;
  stage: string | null;
  venue: string | null;
  city: string | null;
  status: string | null;
  poolHome: number | null;
  poolDraw: number | null;
  poolAway: number | null;
  oddsHome: number | null;
  oddsDraw: number | null;
  oddsAway: number | null;
  followCount: number;
  isFollowing: boolean;
};

export type MobileTopScorer = {
  id: number;
  playerName: string;
  playerNameZh: string | null;
  team: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
};

interface MobileHomeProps {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userEmail?: string;
  userDisplayName?: string;
  profileBalance: number;
  daysLeft: string;
  upcomingMatches: MobileMatch[];
  featuredMatches: MobileMatch[];
  scheduleMatches: MobileMatch[];
  topScorers: MobileTopScorer[];
}

type MobileView = "home" | "matches" | "predict" | "forum" | "mine";
type PredictionChoice = "home" | "draw" | "away";

const copy = {
  zh: {
    appTitle: "Football2026",
    badge: "世界杯开幕倒计时",
    title: "世界杯竞猜",
    subtitle: "比赛、赛程、赔率和竞猜信息集中查看。",
    register: "注册领 10万 GC",
    predict: "马上竞猜",
    login: "登录",
    loggedIn: "已登录",
    balance: "GC 余额",
    guestBalance: "新用户礼包",
    prizePool: "奖池",
    odds: "赔率",
    kickoff: "开赛",
    group: "小组",
    noMatches: "暂无可显示比赛",
    installOnlyTitle: "先把 Football2026 添加到桌面",
    installOnlySubtitle: "浏览器模式只用于安装。添加后像 App 一样从桌面图标打开，才能使用完整竞猜、签到和消息功能。",
    iconPreview: "桌面图标预览",
    openFromIcon: "安装后从这个图标进入",
    browserLimited: "当前网页版功能已精简，请优先添加桌面快捷方式。",
    checkin: "每日签到",
    checking: "领取中",
    checked: "今日已领",
    checkinDone: "签到成功，GC 已到账",
    checkinAgain: "今天已经领取过",
    checkinLogin: "登录后领取",
    matches: "赛程",
    myBets: "我的竞猜",
    leaderboard: "排行榜",
    forum: "社区",
    invite: "邀请",
    awards: "冠军竞猜",
    bottomHome: "首页",
    bottomMatches: "赛程",
    bottomPredict: "竞猜",
    bottomForum: "社区",
    bottomMine: "我的",
    upcomingMatches: "即将到来的四场比赛",
    upcomingHint: "按数据库 kickoff_time 升序",
    mostFollowedMatches: "关注最多的四场比赛",
    followedHint: "暂按后台比赛代码占位展示",
    followers: "关注",
    featuredByCode: "后台指定",
    chooseMatch: "选择比赛",
    chooseResult: "选择结果",
    homeWin: "主胜",
    draw: "平局",
    awayWin: "客胜",
    exactScore: "比分",
    stake: "投入 GC",
    submit: "进入真实赛程提交",
    forumHot: "热门讨论",
    mineTitle: "我的 Football2026",
    account: "账户",
    appStatus: "快捷方式状态",
  },
  en: {
    appTitle: "Football2026",
    badge: "World Cup kickoff in",
    title: "World Cup Predictions",
    subtitle: "View matches, schedules, odds, and predictions in one place.",
    register: "Claim 100K GC",
    predict: "Predict Now",
    login: "Login",
    loggedIn: "Signed in",
    balance: "GC Balance",
    guestBalance: "New user gift",
    prizePool: "Prize pool",
    odds: "Odds",
    kickoff: "Kickoff",
    group: "Group",
    noMatches: "No matches available",
    installOnlyTitle: "Add Football2026 to your Home Screen first",
    installOnlySubtitle: "Browser mode is only for installation. Open from the phone icon to use predictions, check-ins, and messages.",
    iconPreview: "Home icon preview",
    openFromIcon: "Open from this icon after install",
    browserLimited: "The browser version is intentionally limited. Add the shortcut for the full experience.",
    checkin: "Daily Check-in",
    checking: "Claiming",
    checked: "Claimed",
    checkinDone: "Check-in complete. GC added.",
    checkinAgain: "Already claimed today",
    checkinLogin: "Login to claim",
    matches: "Matches",
    myBets: "My Bets",
    leaderboard: "Leaderboard",
    forum: "Forum",
    invite: "Invite",
    awards: "Awards",
    bottomHome: "Home",
    bottomMatches: "Matches",
    bottomPredict: "Predict",
    bottomForum: "Forum",
    bottomMine: "Me",
    upcomingMatches: "Next 4 Matches",
    upcomingHint: "Sorted by database kickoff_time",
    mostFollowedMatches: "Top 4 Followed Matches",
    followedHint: "Temporarily filled by backend match-code slots",
    followers: "following",
    featuredByCode: "Admin selected",
    chooseMatch: "Choose match",
    chooseResult: "Choose result",
    homeWin: "Home",
    draw: "Draw",
    awayWin: "Away",
    exactScore: "Score",
    stake: "GC stake",
    submit: "Open live matches",
    forumHot: "Hot discussions",
    mineTitle: "My Football2026",
    account: "Account",
    appStatus: "Shortcut status",
  },
};

type MobileCopy = typeof copy.zh;

const TEAM_ZH: Record<string, string> = {
  Mexico: "墨西哥",
  "South Africa": "南非",
  "South Korea": "韩国",
  Czechia: "捷克",
  Canada: "加拿大",
  "Bosnia & Herzegovina": "波黑",
  USA: "美国",
  Paraguay: "巴拉圭",
  Qatar: "卡塔尔",
  Switzerland: "瑞士",
  Brazil: "巴西",
  Morocco: "摩洛哥",
  Haiti: "海地",
  Scotland: "苏格兰",
  Australia: "澳大利亚",
  "Türkiye": "土耳其",
  Turkey: "土耳其",
  Germany: "德国",
  "Curaçao": "库拉索",
  Curacao: "库拉索",
  "Ivory Coast": "科特迪瓦",
  Ecuador: "厄瓜多尔",
  Netherlands: "荷兰",
  Japan: "日本",
  Sweden: "瑞典",
  Tunisia: "突尼斯",
  Belgium: "比利时",
  Egypt: "埃及",
  Iran: "伊朗",
  "New Zealand": "新西兰",
  Spain: "西班牙",
  "Cape Verde": "佛得角",
  "Saudi Arabia": "沙特阿拉伯",
  Uruguay: "乌拉圭",
  France: "法国",
  Senegal: "塞内加尔",
  Iraq: "伊拉克",
  Norway: "挪威",
  Argentina: "阿根廷",
  Algeria: "阿尔及利亚",
  Austria: "奥地利",
  Jordan: "约旦",
  Portugal: "葡萄牙",
  "DR Congo": "刚果（金）",
  Uzbekistan: "乌兹别克斯坦",
  Colombia: "哥伦比亚",
  England: "英格兰",
  Croatia: "克罗地亚",
  Ghana: "加纳",
  Panama: "巴拿马",
};

const CITY_ZH: Record<string, string> = {
  "Mexico City": "墨西哥城",
  Guadalajara: "瓜达拉哈拉",
  Monterrey: "蒙特雷",
  Toronto: "多伦多",
  Vancouver: "温哥华",
  "New York": "纽约",
  "Los Angeles": "洛杉矶",
  Dallas: "达拉斯",
  Houston: "休斯敦",
  Atlanta: "亚特兰大",
  Seattle: "西雅图",
  Philadelphia: "费城",
  Miami: "迈阿密",
  "Kansas City": "堪萨斯城",
  "Santa Clara": "圣克拉拉",
  "San Francisco": "旧金山",
  Boston: "波士顿",
};

function getCopy(locale: string) {
  return locale === "zh" ? copy.zh : copy.en;
}

function isMobileView(value: string | null): value is MobileView {
  return value === "home" || value === "matches" || value === "predict" || value === "forum" || value === "mine";
}

function formatBalance(balance: number) {
  if (balance >= 1_000_000_000) return `${(balance / 1_000_000_000).toFixed(1)}B`;
  if (balance >= 1_000_000) return `${Math.round(balance / 1_000_000)}M`;
  return balance.toLocaleString();
}

function formatNumber(value: number, locale: string) {
  return value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}

function getTeamName(team: string, locale: string) {
  return locale === "zh" ? TEAM_ZH[team] ?? team : team;
}

function getMatchTeams(locale: string, match: MobileMatch) {
  return `${getTeamName(match.homeTeam, locale)} vs ${getTeamName(match.awayTeam, locale)}`;
}

function getStageLabel(match: MobileMatch, locale: string) {
  if (match.stage === "group") {
    return locale === "zh" ? `${match.groupName ?? "-"}组` : `Group ${match.groupName ?? "-"}`;
  }
  return match.stage ?? "-";
}

function getLocation(match: MobileMatch, locale: string) {
  const city = match.city ? (locale === "zh" ? CITY_ZH[match.city] ?? match.city : match.city) : "";
  return city || match.venue || "-";
}

function formatKickoff(kickoffTime: string, locale: string) {
  const date = new Date(kickoffTime);
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(kickoffTime: string, locale: string) {
  const diffMs = new Date(kickoffTime).getTime() - Date.now();
  if (diffMs <= 0) return locale === "zh" ? "即将开赛" : "Soon";
  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor(diffMs / 3_600_000);
  if (days >= 1) return locale === "zh" ? `${days} 天` : `${days}d`;
  return locale === "zh" ? `${Math.max(1, hours)} 小时` : `${Math.max(1, hours)}h`;
}

function formatPool(match: MobileMatch) {
  const total = (match.poolHome ?? 0) + (match.poolDraw ?? 0) + (match.poolAway ?? 0);
  if (total >= 1_000_000) return `${Math.round(total / 1_000_000)}M GC`;
  return `${total.toLocaleString()} GC`;
}

function formatOdds(match: MobileMatch) {
  const values = [match.oddsHome, match.oddsDraw, match.oddsAway].map((value) => value == null ? "-" : value.toFixed(2).replace(/\.00$/, ""));
  return values.join(" / ");
}

function mergeMatches(...groups: MobileMatch[][]) {
  const seen = new Set<number>();
  return groups.flat().filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

export default function MobileHome({
  locale,
  isLoggedIn,
  canPersistActions,
  userEmail,
  userDisplayName,
  profileBalance,
  daysLeft,
  upcomingMatches,
  featuredMatches,
  scheduleMatches,
  topScorers,
}: MobileHomeProps) {
  const t = getCopy(locale);
  const { balance, setBalance, refresh } = useGcBalance();
  const allMatches = useMemo(() => mergeMatches(upcomingMatches, featuredMatches), [upcomingMatches, featuredMatches]);
  const [checkinState, setCheckinState] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");
  const [isAppMode, setIsAppMode] = useState(false);
  const [modeReady, setModeReady] = useState(false);
  const [activeView, setActiveView] = useState<MobileView>("home");
  const [selectedMatch, setSelectedMatch] = useState(() => allMatches[0] ? getMatchTeams(locale, allMatches[0]) : "");
  const [prediction, setPrediction] = useState<PredictionChoice>("home");
  const [score, setScore] = useState("2-1");
  const [stake, setStake] = useState("10M");

  useEffect(() => {
    if (!selectedMatch && allMatches[0]) setSelectedMatch(getMatchTeams(locale, allMatches[0]));
  }, [allMatches, locale, selectedMatch]);

  useEffect(() => {
    if (isLoggedIn) setBalance(profileBalance);
  }, [isLoggedIn, profileBalance, setBalance]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const previewApp = query.get("preview") === "app";
    const media = window.matchMedia("(display-mode: standalone)");
    const updateMode = () => {
      setIsAppMode(previewApp || media.matches || navigator.standalone === true);
      setModeReady(true);
    };
    const updateView = () => {
      const view = new URLSearchParams(window.location.search).get("view");
      if (isMobileView(view)) setActiveView(view);
    };

    updateMode();
    updateView();
    media.addEventListener("change", updateMode);
    window.addEventListener("popstate", updateView);

    return () => {
      media.removeEventListener("change", updateMode);
      window.removeEventListener("popstate", updateView);
    };
  }, []);

  function openView(view: MobileView, match?: string) {
    setActiveView(view);
    if (match) setSelectedMatch(match);

    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (match) url.searchParams.set("match", match);
    window.history.pushState(null, "", url);
  }

  async function claimDaily() {
    if (!canPersistActions) {
      redirectToMobileLogin(locale);
      return;
    }
    if (checkinState === "loading" || checkinState === "done") return;
    setCheckinState("loading");
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCheckinState("done");
        await refresh();
        return;
      }
      setCheckinState(data.error === "already_claimed" ? "already" : "error");
    } catch {
      setCheckinState("error");
    }
  }

  const checkinLabel =
    checkinState === "loading" ? t.checking :
    checkinState === "done" || checkinState === "already" ? t.checked :
    canPersistActions ? t.checkin : t.checkinLogin;

  if (!modeReady) {
    return <main className="-mt-16 min-h-screen bg-[#081120]" />;
  }

  if (!isAppMode) {
    return <InstallOnlyHome locale={locale} t={t} />;
  }

  return (
    <main className="-mt-16 min-h-screen bg-[#081120] pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-white">
      {activeView !== "matches" && (
        <AppHeader locale={locale} t={t} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} userEmail={userEmail} userDisplayName={userDisplayName} balance={balance} />
      )}

      <section className="mx-auto max-w-md px-3 py-3">
        {activeView === "home" && (
          <HomeView locale={locale} t={t} daysLeft={daysLeft} upcomingMatches={upcomingMatches} featuredMatches={featuredMatches} topScorers={topScorers} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} />
        )}
        {activeView === "matches" && (
          <MatchesView locale={locale} t={t} matches={scheduleMatches} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} onOpenView={openView} />
        )}
        {activeView === "predict" && (
          <PredictView
            locale={locale}
            t={t}
            isLoggedIn={isLoggedIn}
            matches={allMatches}
            selectedMatch={selectedMatch}
            prediction={prediction}
            score={score}
            stake={stake}
            setPrediction={setPrediction}
            setScore={setScore}
            setStake={setStake}
            onOpenView={openView}
          />
        )}
        {activeView === "forum" && <ForumView locale={locale} t={t} />}
        {activeView === "mine" && (
          <MineView
            locale={locale}
            t={t}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            userEmail={userEmail}
            balance={balance}
            checkinLabel={checkinLabel}
            checkinState={checkinState}
            onCheckin={claimDaily}
          />
        )}
      </section>

      <BottomNav activeView={activeView} onChange={openView} t={t} />
    </main>
  );
}

function AppHeader({
  locale,
  t,
  isLoggedIn,
  canPersistActions,
  userEmail,
  userDisplayName,
  balance,
}: {
  locale: string;
  t: MobileCopy;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userEmail?: string;
  userDisplayName?: string;
  balance: number;
}) {
  const displayName = userDisplayName ?? userEmail?.split("@")[0] ?? "User";
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081120]/95 px-3 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <Image src="/icons/levels/logo.png" alt={t.appTitle} fill className="object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-none">{t.appTitle}</p>
            <p className="mt-1 truncate text-[12px] leading-none text-slate-500">m.football2026.net</p>
          </div>
        </div>
        <Link href={canPersistActions ? `/${locale}/profile` : `/${locale}/m/login?next=${encodeURIComponent("/m?view=home")}`} className="shrink-0">
          {isLoggedIn ? (
            <span className="flex max-w-[10rem] items-center gap-1.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-sm font-black text-[#081120]">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 text-right">
                <span className="flex items-center justify-end gap-1 text-[12px] font-black leading-none text-white">
                  <span className="truncate">{displayName}</span>
                  {!canPersistActions && <span className="shrink-0 text-[10px] text-slate-500">{locale === "zh" ? "预览" : "Preview"}</span>}
                </span>
                <span className="mt-1 block text-[10px] font-bold leading-none text-[#FFD700]">{formatBalance(balance)} GC</span>
              </span>
            </span>
          ) : (
            <span className="rounded-lg border border-[#FFD700]/25 bg-[#FFD700]/10 px-2.5 py-1.5 text-[12px] font-black text-[#FFD700]">{t.login}</span>
          )}
        </Link>
      </div>
    </header>
  );
}

function HomeView({
  locale,
  t,
  daysLeft,
  upcomingMatches,
  featuredMatches,
  topScorers,
  isLoggedIn,
  canPersistActions,
}: {
  locale: string;
  t: MobileCopy;
  daysLeft: string;
  upcomingMatches: MobileMatch[];
  featuredMatches: MobileMatch[];
  topScorers: MobileTopScorer[];
  isLoggedIn: boolean;
  canPersistActions: boolean;
}) {
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const matchRefs = useRef(new Map<number, HTMLElement>());

  function toggleMatch(matchId: number) {
    setExpandedMatchId((current) => current === matchId ? null : matchId);
    window.setTimeout(() => {
      const node = matchRefs.current.get(matchId);
      if (!node) return;
      window.scrollTo({ top: Math.max(0, window.scrollY + node.getBoundingClientRect().top - 54), behavior: "smooth" });
    }, 80);
  }

  function setMatchRef(matchId: number, node: HTMLElement | null) {
    if (node) matchRefs.current.set(matchId, node);
    else matchRefs.current.delete(matchId);
  }

  return (
    <div className="grid gap-3">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#0d1a2b_0%,#10345b_58%,#14533b_100%)] p-3">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FFD700]/25 bg-[#FFD700]/10 px-2 py-1 text-[11px] font-black text-[#FFD700]">
          <Sparkles className="h-3.5 w-3.5" />
          {locale === "zh" ? `${t.badge} ${daysLeft} 天` : `${t.badge} ${daysLeft} days`}
        </div>
        <h1 className="text-lg font-black leading-tight">{t.title}</h1>
        <p className="mt-1 text-sm leading-5 text-slate-300">{t.subtitle}</p>
      </section>

      <HomeScheduleSection
        locale={locale}
        t={t}
        title={t.upcomingMatches}
        matches={upcomingMatches}
        isLoggedIn={isLoggedIn}
        canPersistActions={canPersistActions}
        expandedMatchId={expandedMatchId}
        onToggle={toggleMatch}
        setMatchRef={setMatchRef}
      />

      <HomeScheduleSection
        locale={locale}
        t={t}
        title={locale === "zh" ? "焦点对决" : "Featured Matches"}
        matches={featuredMatches}
        isLoggedIn={isLoggedIn}
        canPersistActions={canPersistActions}
        expandedMatchId={expandedMatchId}
        onToggle={toggleMatch}
        setMatchRef={setMatchRef}
      />

      <TopScorersSection locale={locale} scorers={topScorers} />
    </div>
  );
}

function HomeScheduleSection({
  locale,
  t,
  title,
  matches,
  isLoggedIn,
  canPersistActions,
  expandedMatchId,
  onToggle,
  setMatchRef,
}: {
  locale: string;
  t: MobileCopy;
  title: string;
  matches: MobileMatch[];
  isLoggedIn: boolean;
  canPersistActions: boolean;
  expandedMatchId: number | null;
  onToggle: (matchId: number) => void;
  setMatchRef: (matchId: number, node: HTMLElement | null) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black leading-tight text-white">{title}</h2>
        <span className="shrink-0 text-[12px] font-black text-[#FFD700]">{matches.length}</span>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400">{t.noMatches}</div>
      ) : (
        <div className="grid gap-2">
          {matches.map((match) => {
            const expanded = expandedMatchId === match.id;
            return (
            <ExpandableScheduleCard
              key={match.id}
              locale={locale}
              match={match}
              isLoggedIn={isLoggedIn}
              canPersistActions={canPersistActions}
              expanded={expanded}
              onToggle={() => onToggle(match.id)}
              setRef={(node) => setMatchRef(match.id, node)}
            />
            );
          })}
        </div>
      )}
    </section>
  );
}

function TopScorersSection({ locale, scorers }: { locale: string; scorers: MobileTopScorer[] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <h2 className="mb-2 text-sm font-black text-white">{locale === "zh" ? "射手榜 Top 5" : "Top Scorers"}</h2>
      {scorers.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400">{locale === "zh" ? "暂无射手榜数据" : "No scorer data"}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
          <div className="grid grid-cols-[1.5rem_1fr_2.4rem_2.4rem] gap-1 border-b border-white/10 px-2 py-1 text-[10px] font-bold text-slate-500">
            <span>#</span><span>{locale === "zh" ? "球员" : "Player"}</span><span className="text-center">{locale === "zh" ? "进球" : "G"}</span><span className="text-center">{locale === "zh" ? "助攻" : "A"}</span>
          </div>
          {scorers.map((scorer, index) => (
            <div key={scorer.id} className="grid grid-cols-[1.5rem_1fr_2.4rem_2.4rem] items-center gap-1 border-b border-white/5 px-2 py-1.5 text-[11px] last:border-b-0">
              <span className={`font-black ${index === 0 ? "text-[#FFD700]" : "text-slate-500"}`}>{index + 1}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <img src={getFlagUrl(scorer.team, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-black text-white">{locale === "zh" && scorer.playerNameZh ? scorer.playerNameZh : scorer.playerName}</span>
                  <span className="block truncate text-[10px] text-slate-500">{getTeamName(scorer.team, locale)}</span>
                </span>
              </span>
              <span className="text-center font-black text-[#FFD700]">{scorer.goals}</span>
              <span className="text-center font-bold text-slate-400">{scorer.assists}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExpandableScheduleCard({
  locale,
  match,
  isLoggedIn,
  canPersistActions,
  expanded,
  onToggle,
  setRef,
}: {
  locale: string;
  match: MobileMatch;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  expanded: boolean;
  onToggle: () => void;
  setRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <article ref={setRef} className={`min-w-0 overflow-hidden rounded-lg border bg-white/[0.035] ${expanded ? "border-[#FFD700]/45" : "border-white/10"}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onToggle();
        }}
        className="grid w-full min-w-0 cursor-pointer gap-1 p-2.5 text-left active:bg-white/[0.06]"
      >
        <div className="min-w-0 text-left"><MatchAlignedRow locale={locale} match={match} /></div>
        <MatchMetaLine locale={locale} match={match} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} />
      </div>
      {expanded && <MobileScheduleDetails locale={locale} match={match} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} />}
    </article>
  );
}

function MatchesView({
  locale,
  t,
  matches,
  isLoggedIn,
  canPersistActions,
  onOpenView,
}: {
  locale: string;
  t: MobileCopy;
  matches: MobileMatch[];
  isLoggedIn: boolean;
  canPersistActions: boolean;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [teamFilters, setTeamFilters] = useState<string[]>([]);
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [timeSort, setTimeSort] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const firstUpcomingRef = useRef<HTMLElement | null>(null);
  const matchRefs = useRef(new Map<number, HTMLElement>());

  const groups = useMemo(() => Array.from(new Set(matches.map((match) => match.groupName).filter((group): group is string => Boolean(group)))).sort(), [matches]);
  const teams = useMemo(() => Array.from(new Set(matches.flatMap((match) => [match.homeTeam, match.awayTeam]).filter((team) => Boolean(TEAM_ZH[team])))).sort((a, b) => getTeamName(a, locale).localeCompare(getTeamName(b, locale))), [locale, matches]);
  const selectedTeamNames = teamFilters.map((team) => getTeamName(team, locale)).join(locale === "zh" ? "、" : ", ");
  const filteredMatches = useMemo(() => {
    const filtered = matches.filter((match) => {
      const groupOk = groupFilter === "all" || match.groupName === groupFilter;
      const teamOk = teamFilters.length === 0 || teamFilters.some((team) => team === match.homeTeam || team === match.awayTeam);
      return groupOk && teamOk;
    });
    return timeSort ? [...filtered].sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()) : filtered;
  }, [groupFilter, matches, teamFilters, timeSort]);
  const firstUpcoming = filteredMatches.find((match) => new Date(match.kickoffTime).getTime() >= Date.now());

  function applyGroupFilter(group: string) {
    setTeamFilters([]);
    setGroupFilter(group);
    setGroupPanelOpen(false);
    setTeamPanelOpen(false);
  }

  function toggleTeamFilter(team: string) {
    setGroupFilter("all");
    setTeamFilters((current) => current.includes(team) ? current.filter((item) => item !== team) : [...current, team]);
  }

  function toggleMatch(matchId: number) {
    setExpandedMatchId((current) => current === matchId ? null : matchId);
    window.setTimeout(() => {
      const node = matchRefs.current.get(matchId);
      if (!node) return;
      window.scrollTo({ top: Math.max(0, window.scrollY + node.getBoundingClientRect().top), behavior: "smooth" });
    }, 80);
  }

  function sortByTime() {
    setTimeSort(true);
    if (!firstUpcoming) return;
    window.setTimeout(() => firstUpcomingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  return (
    <div className="grid gap-2">
      <section className="sticky top-0 z-20 -mx-3 bg-[#081120]/95 px-3 pb-2 pt-1 backdrop-blur">
        <div className="grid grid-cols-[0.72fr_minmax(0,1.28fr)_3.2rem] gap-1.5">
          <div className="relative min-w-0">
            <button type="button" onClick={() => { setGroupPanelOpen((open) => !open); setTeamPanelOpen(false); }} className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-white/10 bg-[#0d1a2b] px-1.5 text-left text-[12px] font-black text-white">
              <span className="truncate">{groupFilter === "all" ? (locale === "zh" ? "全部组别" : "All groups") : (locale === "zh" ? `${groupFilter}组` : `Group ${groupFilter}`)}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${groupPanelOpen ? "rotate-180" : ""}`} />
            </button>
            {groupPanelOpen && (
              <div className="absolute left-0 right-0 top-9 z-40 rounded-lg border border-white/10 bg-[#0b1626] p-2 shadow-xl shadow-black/40">
                <button type="button" onClick={() => applyGroupFilter("all")} className="mb-1.5 h-7 w-full rounded-md border border-white/10 bg-white/[0.035] px-2 text-left text-[12px] font-black text-slate-300">{locale === "zh" ? "全部组别" : "All groups"}</button>
                <div className="grid grid-cols-2 gap-1.5">
                  {groups.map((group) => <button key={group} type="button" onClick={() => applyGroupFilter(group)} className="h-8 rounded-md border border-white/10 bg-white/[0.035] px-2 text-left text-[12px] font-black text-slate-300">{locale === "zh" ? `${group}组` : `Group ${group}`}</button>)}
                </div>
              </div>
            )}
          </div>
          <div className="relative min-w-0">
            <button type="button" onClick={() => { setTeamPanelOpen((open) => !open); setGroupPanelOpen(false); }} className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-white/10 bg-[#0d1a2b] px-1.5 text-left text-[12px] font-black text-white">
              <span className="truncate">{teamFilters.length === 0 ? (locale === "zh" ? "全部球队" : "All teams") : selectedTeamNames}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${teamPanelOpen ? "rotate-180" : ""}`} />
            </button>
            {teamPanelOpen && (
              <div className="absolute left-0 right-0 top-9 z-40 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#0b1626] p-2 shadow-xl shadow-black/40">
                <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => { setTeamFilters([]); setTeamPanelOpen(false); }} className="h-7 rounded-md border border-white/10 bg-white/[0.035] px-2 text-left text-[12px] font-black text-slate-300">{locale === "zh" ? "全部球队" : "All teams"}</button>
                  <button type="button" onClick={() => setTeamPanelOpen(false)} className="h-7 rounded-md bg-[#FFD700] px-2 text-[12px] font-black text-[#081120]">{locale === "zh" ? "完成" : "Done"}</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {teams.map((team) => <button key={team} type="button" onClick={() => toggleTeamFilter(team)} className={`h-8 min-w-0 truncate rounded-md border px-1.5 text-left text-[12px] font-black ${teamFilters.includes(team) ? "border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-white/[0.035] text-slate-300"}`}>{getTeamName(team, locale)}</button>)}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={sortByTime} className={`h-8 rounded-md border px-1 text-[12px] font-black ${timeSort ? "border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-[#0d1a2b] text-slate-300"}`}>{locale === "zh" ? "时间" : "Time"}</button>
        </div>
      </section>
      {filteredMatches.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400">{t.noMatches}</div>
      ) : (
        filteredMatches.map((match) => {
          const expanded = expandedMatchId === match.id;
          return (
            <ExpandableScheduleCard
              key={match.id}
              locale={locale}
              match={match}
              isLoggedIn={isLoggedIn}
              canPersistActions={canPersistActions}
              expanded={expanded}
              onToggle={() => toggleMatch(match.id)}
              setRef={(node) => {
                if (node) matchRefs.current.set(match.id, node);
                else matchRefs.current.delete(match.id);
                if (timeSort && firstUpcoming?.id === match.id) firstUpcomingRef.current = node;
              }}
            />
          );
        })
      )}
    </div>
  );
}

function MatchAlignedRow({ locale, match }: { locale: string; match: MobileMatch }) {
  return (
    <span className="grid min-w-0 grid-cols-[2.85rem_minmax(0,0.86fr)_2.35rem_minmax(0,0.86fr)] items-center gap-1 text-[12px] font-black text-white">
      <span className="rounded-full bg-[#FFD700]/10 px-1 py-0.5 text-center text-[10px] text-[#FFD700]">{getStageLabel(match, locale)}</span>
      <span className="flex min-w-0 items-center gap-1"><img src={getFlagUrl(match.homeTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" /><span className="truncate">{getTeamName(match.homeTeam, locale)}</span></span>
      <span className="text-center text-[10px] text-slate-500">VS</span>
      <span className="flex min-w-0 items-center justify-end gap-1"><img src={getFlagUrl(match.awayTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" /><span className="truncate text-right">{getTeamName(match.awayTeam, locale)}</span></span>
    </span>
  );
}

function MatchMetaLine({ locale, match, isLoggedIn, canPersistActions }: { locale: string; match: MobileMatch; isLoggedIn: boolean; canPersistActions: boolean }) {
  return <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] leading-4 text-slate-500"><span className="shrink-0">{formatKickoff(match.kickoffTime, locale)}</span><span className="min-w-0 truncate">{getLocation(match, locale)}</span><span className="shrink-0">{formatCountdown(match.kickoffTime, locale)}</span><MobileFollowButton locale={locale} match={match} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} /></span>;
}

function MobileFollowButton({ locale, match, isLoggedIn, canPersistActions }: { locale: string; match: MobileMatch; isLoggedIn: boolean; canPersistActions: boolean }) {
  const [following, setFollowing] = useState(match.isFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(match.isFollowing);
  }, [match.id, match.isFollowing]);

  async function toggleFollow(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!isLoggedIn || !canPersistActions) {
      redirectToMobileLogin(locale);
      return;
    }
    if (loading) return;
    const next = !following;
    setFollowing(next);
    setLoading(true);
    try {
      const response = await fetch("/api/match-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: match.id, following: next }),
      });
      if (!response.ok) throw new Error("follow failed");
    } catch {
      setFollowing(!next);
    } finally {
      setLoading(false);
    }
  }

  return <button type="button" onClick={toggleFollow} onKeyDown={(event) => event.stopPropagation()} disabled={loading} title={!canPersistActions ? (locale === "zh" ? "请先完成登录" : "Please sign in") : undefined} className="ml-auto h-5 shrink-0 rounded-full border border-[#FFD700]/60 bg-transparent px-2 text-[11px] font-black leading-none text-[#FFD700] disabled:opacity-50">{following ? (locale === "zh" ? "已关注比赛" : "Following") : (locale === "zh" ? "关注比赛" : "Follow match")}</button>;
}

function PredictView({
  locale,
  t,
  isLoggedIn,
  matches,
  selectedMatch,
  prediction,
  score,
  stake,
  setPrediction,
  setScore,
  setStake,
  onOpenView,
}: {
  locale: string;
  t: MobileCopy;
  isLoggedIn: boolean;
  matches: MobileMatch[];
  selectedMatch: string;
  prediction: PredictionChoice;
  score: string;
  stake: string;
  setPrediction: (value: PredictionChoice) => void;
  setScore: (value: string) => void;
  setStake: (value: string) => void;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <SectionTitle eyebrow={t.chooseMatch} title={t.predict} />

      <section className="grid gap-2 rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">{t.noMatches}</p>
        ) : (
          matches.map((match) => {
            const label = getMatchTeams(locale, match);
            return (
              <button
                key={match.id}
                type="button"
                onClick={() => onOpenView("predict", label)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left ${
                  selectedMatch === label
                    ? "border-[#FFD700]/45 bg-[#FFD700]/10 text-white"
                    : "border-white/10 bg-white/[0.035] text-slate-300"
                }`}
              >
                <span className="text-sm font-black">{label}</span>
                <span className="text-[12px] text-slate-500">{formatKickoff(match.kickoffTime, locale)}</span>
              </button>
            );
          })
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <p className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-[#FFD700]">{t.chooseResult}</p>
        <div className="grid grid-cols-3 gap-2">
          <ChoiceButton active={prediction === "home"} label={t.homeWin} onClick={() => setPrediction("home")} />
          <ChoiceButton active={prediction === "draw"} label={t.draw} onClick={() => setPrediction("draw")} />
          <ChoiceButton active={prediction === "away"} label={t.awayWin} onClick={() => setPrediction("away")} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <OptionGroup label={t.exactScore} options={["1-0", "2-1", "1-1", "3-2"]} value={score} onChange={setScore} />
          <OptionGroup label={t.stake} options={["5M", "10M", "20M", "50M"]} value={stake} onChange={setStake} />
        </div>

        <Link
          href={isLoggedIn ? `/${locale}/matches` : `/${locale}/auth/login`}
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FFD700] px-4 text-sm font-black text-[#081120]"
        >
          {isLoggedIn ? t.submit : t.login}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function ForumView({ locale, t }: { locale: string; t: MobileCopy }) {
  return (
    <div className="grid gap-3">
      <SectionTitle eyebrow={t.forumHot} title={t.forum} />
      <ForumCard title={locale === "zh" ? "赛前情报" : "Pre-match intel"} body={locale === "zh" ? "阵容、伤病、盘口变化集中查看。" : "Lineups, injuries, and market movement."} href={`/${locale}/forum`} />
      <ForumCard title={locale === "zh" ? "竞猜晒单" : "Prediction slips"} body={locale === "zh" ? "分享你的判断，也看高手怎么选。" : "Share your picks and follow sharp calls."} href={`/${locale}/forum`} />
      <ForumCard title={locale === "zh" ? "GoalCoin 攻略" : "GoalCoin tips"} body={locale === "zh" ? "签到、邀请、奖励和升级路线。" : "Check-ins, invites, rewards, and levels."} href={`/${locale}/forum`} />
    </div>
  );
}

function MineView({
  locale,
  t,
  isLoggedIn,
  canPersistActions,
  userEmail,
  balance,
  checkinLabel,
  checkinState,
  onCheckin,
}: {
  locale: string;
  t: MobileCopy;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userEmail?: string;
  balance: number;
  checkinLabel: string;
  checkinState: "idle" | "loading" | "done" | "already" | "error";
  onCheckin: () => void;
}) {
  return (
    <div className="grid gap-3">
      <SectionTitle eyebrow={t.account} title={t.mineTitle} />
      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        {isLoggedIn && userEmail && (
          <div className="mb-3 rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-2">
            <p className="text-[12px] font-black text-[#FFD700]">{canPersistActions ? t.loggedIn : (locale === "zh" ? "数据预览" : "Data preview")}</p>
            <p className="mt-1 truncate text-sm font-bold text-white">{userEmail}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">{isLoggedIn ? t.balance : t.guestBalance}</p>
            <p className="mt-1 text-2xl font-black text-[#FFD700]">{isLoggedIn ? `${formatBalance(balance)} GC` : "100M GC"}</p>
          </div>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onCheckin}
              disabled={checkinState === "loading" || checkinState === "done"}
              className="rounded-lg bg-emerald-400/15 px-3 py-2 text-sm font-black text-emerald-100 disabled:opacity-70"
            >
              {checkinLabel}
            </button>
          ) : (
            <Link href={`/${locale}/auth/register`} className="rounded-lg bg-[#FFD700] px-3 py-2 text-sm font-black text-[#081120]">
              {t.register}
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-2 rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#FFD700]">{t.appStatus}</p>
        <MobileInstallPrompt locale={locale} />
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <ActionLink href={`/${locale}/profile`} icon={UserRound} label={t.account} />
        <ActionLink href={`/${locale}/invite`} icon={Gift} label={t.invite} />
        <ActionLink href={`/${locale}/leaderboard`} icon={Trophy} label={t.leaderboard} />
        <ActionLink href={`/${locale}/awards`} icon={CircleDollarSign} label={t.awards} />
      </div>
    </div>
  );
}

function InstallOnlyHome({ locale, t }: { locale: string; t: MobileCopy }) {
  return (
    <main className="-mt-16 min-h-screen bg-[#081120] px-4 pb-8 pt-4 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col">
        <div className="mb-4 flex min-h-14 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <Image src="/icons/levels/logo.png" alt="Football2026" fill className="object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black leading-none text-white">Football2026</p>
            <p className="mt-1.5 text-sm leading-none text-slate-500">m.football2026.net</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0b1a2d_0%,#10345b_58%,#14533b_100%)] p-4 shadow-2xl shadow-black/30">
          <h1 className="text-2xl font-black leading-tight">{t.installOnlyTitle}</h1>
          <p className="mt-2 text-sm leading-5 text-slate-300">{t.installOnlySubtitle}</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#081120]/70 p-3">
            <p className="mb-3 text-[12px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{t.iconPreview}</p>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-black/25 p-1.5 shadow-lg shadow-black/20">
                <div className="relative h-11 w-11 overflow-hidden rounded-xl">
                  <Image src="/icons/levels/logo.png" alt="Football2026" fill className="object-cover" priority />
                </div>
                <span className="w-full truncate text-center text-[10px] font-bold leading-none text-white">Football2026</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white">Football2026</p>
                <p className="mt-1 text-sm leading-5 text-slate-300">{t.openFromIcon}</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <MobileInstallPrompt locale={locale} force allowDismiss={false} />
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-center text-[12px] leading-4 text-red-100">
          {t.browserLimited}
        </p>

        <div className="mt-auto pt-5 text-center text-[12px] text-slate-600">
          Football2026 · GoalCoin
        </div>
      </section>
    </main>
  );
}

function MatchCard({
  locale,
  t,
  match,
  onPredict,
}: {
  locale: string;
  t: MobileCopy;
  match: MobileMatch;
  onPredict: () => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{getStageLabel(match, locale)}</p>
          <h2 className="mt-1 text-base font-black">{getMatchTeams(locale, match)}</h2>
        </div>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-bold text-slate-300">
          {formatKickoff(match.kickoffTime, locale)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <InfoBox label={t.prizePool} value={formatPool(match)} />
        <InfoBox label={t.odds} value={formatOdds(match)} />
        <InfoBox label={t.kickoff} value={formatCountdown(match.kickoffTime, locale)} />
      </div>

      <button
        type="button"
        onClick={onPredict}
        className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#FFD700]/35 bg-[#FFD700]/12 text-sm font-black text-[#FFD700]"
      >
        <Flame className="h-4 w-4" />
        {t.predict}
      </button>
    </section>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{eyebrow}</p>
      <h1 className="mt-1 text-xl font-black leading-tight text-white">{title}</h1>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-2.5">
      <p className="text-[12px] leading-4 text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#0d1a2b] p-2.5 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD700]/12 text-[#FFD700]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-black leading-4 text-white">{label}</span>
    </Link>
  );
}

function ChoiceButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-2 text-sm font-black ${
        active ? "border-[#FFD700] bg-[#FFD700] text-[#081120]" : "border-white/10 bg-white/[0.045] text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-bold text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-8 rounded-md border px-2 text-sm font-black ${
              value === option ? "border-[#FFD700]/70 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-white/[0.035] text-slate-400"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ForumCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <p className="text-base font-black text-white">{title}</p>
      <p className="mt-1 text-sm leading-5 text-slate-400">{body}</p>
    </Link>
  );
}

function BottomNav({
  activeView,
  onChange,
  t,
}: {
  activeView: MobileView;
  onChange: (view: MobileView) => void;
  t: MobileCopy;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#081120]/95 px-3 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        <BottomItem view="home" icon={Home} label={t.bottomHome} active={activeView === "home"} onChange={onChange} />
        <BottomItem view="matches" icon={CalendarDays} label={t.bottomMatches} active={activeView === "matches"} onChange={onChange} />
        <BottomItem view="predict" icon={CheckCircle2} label={t.bottomPredict} active={activeView === "predict"} onChange={onChange} primary />
        <BottomItem view="forum" icon={MessageCircle} label={t.bottomForum} active={activeView === "forum"} onChange={onChange} />
        <BottomItem view="mine" icon={UserRound} label={t.bottomMine} active={activeView === "mine"} onChange={onChange} />
      </div>
    </nav>
  );
}

function BottomItem({
  view,
  icon: Icon,
  label,
  active = false,
  primary = false,
  onChange,
}: {
  view: MobileView;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  primary?: boolean;
  onChange: (view: MobileView) => void;
}) {
  if (primary) {
    return (
      <button type="button" onClick={() => onChange(view)} className="flex flex-col items-center gap-0.5 text-[11px] font-black text-[#FFD700]">
        <span className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xl ${
          active
            ? "border-[#FFD700] bg-[#FFD700] text-[#081120] shadow-[#FFD700]/25"
            : "border-[#FFD700]/45 bg-[#FFD700]/15 text-[#FFD700]"
        }`}>
          <Icon className="h-6 w-6" />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onChange(view)}
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-bold ${
        active ? "text-[#FFD700]" : "text-slate-500"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
