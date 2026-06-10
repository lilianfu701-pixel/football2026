"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  Bell,
  Bookmark,
  Coins,
  Flag,
  Flame,
  Gift,
  Home,
  Languages,
  Loader2,
  LogOut,
  MessageCircle,
  Reply,
  Settings,
  Share2,
  Sparkles,
  ThumbsUp,
  Trophy,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGcBalance } from "@/context/GcBalance";
import { PLAYERS, AWARD_META, awardKeyToDb, dbToAwardKey, getPlayersByAward, type AwardKey, type Player } from "@/data/players";
import { cancelAwardBet, placeAwardBet } from "@/app/[locale]/awards/actions";
import { type AwardPhase } from "@/lib/awardPhase";
import { getFlagUrl } from "@/lib/flags";
import { formatGc, getWealthLevel } from "@/lib/levels";
import { getMaxAmount, makePresets } from "@/lib/forum/ratingCap";
import { needsTranslation } from "@/lib/languages";
import { lc } from "@/i18n/content";
import { MILESTONES, PER_INVITE_GC } from "@/lib/inviteMilestones";
import MobileInstallPrompt from "@/components/mobile/MobileInstallPrompt";
import MobileScheduleDetails from "@/components/mobile/MobileScheduleDetails";
import { redirectToMobileLogin } from "@/components/mobile/mobileAuth";

// ── Paddle.js global typing ──────────────────────────────────────────────────
// Kept structurally identical to the desktop topup page's declaration so the two
// `Window.Paddle` global augmentations don't clash (TS2717). The optional
// `settings` on Checkout.open is passed via a cast at the call site, exactly as
// the desktop page does, so both declarations stay the same shape.
interface PaddleEvent {
  name?: string;
  data?: { custom_data?: { gc_amount?: string | number } | null };
}
interface PaddleGlobal {
  Environment?: { set: (env: "sandbox" | "production") => void };
  Initialize: (opts: { token: string; eventCallback?: (e: PaddleEvent) => void }) => void;
  Checkout: { open: (opts: { transactionId: string }) => void };
}
declare global {
  interface Navigator {
    standalone?: boolean;
  }
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

// Inlined at build time; empty if NEXT_PUBLIC_PADDLE_CLIENT_TOKEN wasn't set when
// the bundle was built. Same client token the desktop topup page uses.
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";

// Wait up to tries*stepMs for the async Paddle.js script to attach to window.
function waitForPaddle(tries = 20, stepMs = 150): Promise<boolean> {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      if (typeof window !== "undefined" && window.Paddle) return resolve(true);
      if (n++ >= tries) return resolve(false);
      setTimeout(tick, stepMs);
    };
    tick();
  });
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

export type MobileForumCategory = {
  id: number;
  slug: string;
  name: string;
  nameZh: string | null;
  icon: string;
  description: string | null;
  descriptionZh: string | null;
  postCount: number;
  group: string | null;
  groupZh: string | null;
};

export type MobileForumReply = {
  id: number;
  authorId: string | null;
  content: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorBalance: number;
};

export type MobileForumPost = {
  id: number;
  authorId: string | null;
  title: string;
  content: string;
  replyCount: number;
  likeCount: number;
  isLiked: boolean;
  isFollowing: boolean;
  isBookmarked: boolean;
  viewCount: number;
  createdAt: string;
  lastActivityAt: string;
  categorySlug: string;
  categoryName: string;
  categoryNameZh: string;
  categoryIcon: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorBalance: number;
  replies: MobileForumReply[];
};

export type MobileForumTag = {
  id: number;
  name: string;
  nameZh: string | null;
  color: string | null;
  postCount: number;
};

export type MobileForumUserReply = {
  id: number;
  postId: number;
  postTitle: string;
  content: string;
  likeCount: number;
  createdAt: string;
};

export type MobileMinePrediction = {
  id: string;
  kind: "win" | "score";
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  prediction?: "home" | "draw" | "away";
  scoreHome?: number;
  scoreAway?: number;
  gcAmount: number;
  status: string;
  createdAt: string;
};

export type MobileAwardBet = {
  id: string;
  awardType: string;
  playerId: number;
  playerName: string;
  playerNameZh: string;
  gcAmount: number;
  oddsMultiplier: number;
  betPhase: string;
  result: string;
};

export type MobileCheckinRecord = {
  date: string;
  streak: number;
  gcEarned: number;
};

export type MobileInviteProfile = {
  username: string;
  referralCode: string | null;
  inviteCount: number;
  inviteGc: number;
  referredBy: string | null;
  gcBalance: number;
};

export type MobileInviteLeaderboardEntry = {
  username: string;
  inviteCount: number;
  inviteGc: number;
  countryCode: string | null;
  avatarUrl: string | null;
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
  forumCategories: MobileForumCategory[];
  forumHotPosts: MobileForumPost[];
  forumLatestPosts: MobileForumPost[];
  forumSelectedPost: MobileForumPost | null;
  forumMyPosts: MobileForumPost[];
  forumMyReplies: MobileForumUserReply[];
  forumTags: MobileForumTag[];
  minePredictions: MobileMinePrediction[];
  awardBets: MobileAwardBet[];
  awardPhase: AwardPhase;
  awardOdds: number;
  goldenBootClosed: boolean;
  checkinHistory: MobileCheckinRecord[];
  followedMatches: MobileMatch[];
  followedMatchCount: number;
  inviteProfile: MobileInviteProfile | null;
  inviteRank: number;
  inviteClaimedMilestones: number[];
  inviteLeaderboard: MobileInviteLeaderboardEntry[];
  inviteSiteUrl: string;
}

type MobileView = "home" | "matches" | "predict" | "forum" | "mine" | "topup" | "invite" | "profile" | "settings" | "leaderboard" | "awards" | "checkin";
type PredictionChoice = "home" | "draw" | "away";
type MobilePayMethod = "paddle" | "paypal" | "usdt";

type MobileTopupPackage = {
  id: string;
  gc: number;
  labelZh: string;
  labelEn: string;
  priceUsd: string;
  priceCny: string;
  priceUsdt: number;
  bonus: number;
  popular?: boolean;
  best?: boolean;
};

const TOPUP_PACKAGES: MobileTopupPackage[] = [
  { id: "s1", gc: 100_000, labelZh: "10万 GC", labelEn: "100K GC", priceUsd: "$1.99", priceCny: "约 ¥14", priceUsdt: 1.99, bonus: 0 },
  { id: "s2", gc: 300_000, labelZh: "30万 GC", labelEn: "300K GC", priceUsd: "$4.99", priceCny: "约 ¥34", priceUsdt: 4.99, bonus: 10 },
  { id: "s3", gc: 600_000, labelZh: "60万 GC", labelEn: "600K GC", priceUsd: "$8.99", priceCny: "约 ¥61", priceUsdt: 8.99, bonus: 20, popular: true },
  { id: "s4", gc: 1_000_000, labelZh: "100万 GC", labelEn: "1M GC", priceUsd: "$13.99", priceCny: "约 ¥95", priceUsdt: 13.99, bonus: 30 },
  { id: "s5", gc: 3_000_000, labelZh: "300万 GC", labelEn: "3M GC", priceUsd: "$34.99", priceCny: "约 ¥238", priceUsdt: 34.99, bonus: 50, best: true },
  { id: "s6", gc: 10_000_000, labelZh: "1000万 GC", labelEn: "10M GC", priceUsd: "$99.99", priceCny: "约 ¥680", priceUsdt: 99.99, bonus: 80 },
];

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

const copy = {
  zh: {
    appTitle: "Football2026",
    badge: "世界杯开幕倒计时",
    title: "世界杯助威",
    subtitle: "比赛、赛程和预测信息集中查看。",
    register: "注册领 10万 GC",
    predict: "马上预测",
    login: "登录",
    loggedIn: "已登录",
    balance: "GC 余额",
    guestBalance: "新用户礼包",
    prizePool: "奖池",
    odds: "倍率",
    kickoff: "开赛",
    group: "小组",
    noMatches: "暂无可显示比赛",
    installOnlyTitle: "先把 Football2026 添加到桌面",
    installOnlySubtitle: "浏览器模式只用于安装。添加后像 App 一样从桌面图标打开，才能使用完整预测、签到和消息功能。",
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
    myBets: "我的预测",
    leaderboard: "排行榜",
    forum: "社区",
    invite: "邀请",
    awards: "冠军预测",
    bottomHome: "首页",
    bottomMatches: "赛程",
    bottomPredict: "预测",
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
    matches: "Match Schedule",
    myBets: "My Predictions",
    leaderboard: "Leaderboard",
    forum: "Forum",
    invite: "Invite",
    awards: "Award Predictions",
    bottomHome: "Home",
    bottomMatches: "Matches",
    bottomPredict: "Predict",
    bottomForum: "Forum",
    bottomMine: "Me",
    upcomingMatches: "Upcoming Matches",
    upcomingHint: "Next four fixtures",
    mostFollowedMatches: "Featured Matches",
    followedHint: "Selected featured fixtures",
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
  return value === "home" || value === "matches" || value === "predict" || value === "forum" || value === "mine" || value === "topup" || value === "invite" || value === "profile" || value === "settings" || value === "leaderboard" || value === "awards" || value === "checkin";
}

function formatBalance(balance: number) {
  if (balance >= 1_000_000_000) return `${(balance / 1_000_000_000).toFixed(1)}B`;
  if (balance >= 1_000_000) return `${Math.round(balance / 1_000_000)}M`;
  return balance.toLocaleString();
}

function getTopupPackageTotal(pkg: MobileTopupPackage) {
  return Math.floor(pkg.gc * (1 + pkg.bonus / 100));
}

function formatNumber(value: number, locale: string) {
  return value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}

function formatCompactCount(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return value.toString();
}

function formatForumTime(dateStr: string, locale: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return lc(locale, "刚刚", "just now");
  if (minutes < 60) return locale === "zh" ? `${minutes}分钟前` : `${minutes}m ago`;
  if (hours < 24) return locale === "zh" ? `${hours}小时前` : `${hours}h ago`;
  if (days < 30) return locale === "zh" ? `${days}天前` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

function formatMobileWeekday(date: Date, locale: string) {
  const zhDays = ["日", "一", "二", "三", "四", "五", "六"];
  const enDays = ["S", "M", "T", "W", "T", "F", "S"];
  return locale === "zh" ? zhDays[date.getDay()] : enDays[date.getDay()];
}

function getTeamName(team: string, locale: string) {
  return locale === "zh" ? TEAM_ZH[team] ?? team : team;
}

function getMatchTeams(locale: string, match: MobileMatch) {
  return `${getTeamName(match.homeTeam, locale)} vs ${getTeamName(match.awayTeam, locale)}`;
}

function getStageLabel(match: MobileMatch, locale: string) {
  if (match.stage === "group") {
    return locale === "zh" ? `${match.groupName ?? "-"}组` : `${lc(locale, "组", "Group")} ${match.groupName ?? "-"}`;
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
  if (diffMs <= 0) return lc(locale, "即将开赛", "Soon");
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

function getForumCategoryName(category: Pick<MobileForumCategory, "name" | "nameZh">, locale: string) {
  return locale === "zh" ? (category.nameZh ?? category.name) : category.name;
}

function getForumPostCategoryName(post: MobileForumPost, locale: string) {
  return locale === "zh" ? (post.categoryNameZh ?? post.categoryName) : post.categoryName;
}

function getForumTagName(tag: MobileForumTag, locale: string) {
  return locale === "zh" ? (tag.nameZh ?? tag.name) : tag.name;
}

function getForumCategoryHref(locale: string, slug: string) {
  const params = new URLSearchParams({ view: "forum" });
  if (slug) params.set("board", slug);
  return `/${locale}/m?${params.toString()}`;
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
  forumCategories,
  forumHotPosts,
  forumLatestPosts,
  forumSelectedPost,
  forumMyPosts,
  forumMyReplies,
  forumTags,
  minePredictions,
  awardBets,
  awardPhase,
  awardOdds,
  goldenBootClosed,
  checkinHistory,
  followedMatches,
  followedMatchCount,
  inviteProfile,
  inviteRank,
  inviteClaimedMilestones,
  inviteLeaderboard,
  inviteSiteUrl,
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
    const media = window.matchMedia("(display-mode: standalone)");
    const updateMode = () => {
      const currentQuery = new URLSearchParams(window.location.search);
      const hasMobileView = isMobileView(currentQuery.get("view"));
      const isAppSource = currentQuery.get("source") === "pwa"
        || currentQuery.get("source") === "shortcut"
        || currentQuery.get("source") === "app";
      setIsAppMode(
        currentQuery.get("preview") === "app"
        || hasMobileView
        || isAppSource
        || media.matches
        || navigator.standalone === true,
      );
      setModeReady(true);
    };
    const updateView = () => {
      const view = new URLSearchParams(window.location.search).get("view");
      if (isMobileView(view)) setActiveView(view);
    };

    const updateRoute = () => {
      updateMode();
      updateView();
    };

    updateRoute();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMode);
    } else {
      media.addListener(updateMode);
    }
    window.addEventListener("popstate", updateRoute);

    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", updateMode);
      } else {
        media.removeListener(updateMode);
      }
      window.removeEventListener("popstate", updateRoute);
    };
  }, []);

  function openView(view: MobileView, match?: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (match) url.searchParams.set("match", match);
    window.location.assign(url.toString());
  }

  async function claimDaily() {
    if (!isLoggedIn) {
      redirectToMobileLogin(locale);
      return;
    }
    if (checkinState === "loading" || checkinState === "done") return;
    if (!canPersistActions) {
      setCheckinState("done");
      return;
    }
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
    isLoggedIn ? t.checkin : t.checkinLogin;

  if (!modeReady) {
    return <main className="-mt-16 min-h-screen bg-[#081120]" />;
  }

  if (!isAppMode) {
    return <InstallOnlyHome locale={locale} t={t} />;
  }

  return (
    <main className="-mt-16 min-h-screen bg-[#081120] pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-white">
      {activeView !== "matches" && activeView !== "forum" && activeView !== "mine" && activeView !== "topup" && activeView !== "invite" && activeView !== "profile" && activeView !== "settings" && activeView !== "leaderboard" && activeView !== "awards" && activeView !== "checkin" && (
        <AppHeader locale={locale} t={t} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} userEmail={userEmail} userDisplayName={userDisplayName} balance={balance} onOpenView={openView} />
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
            matches={scheduleMatches}
            minePredictions={minePredictions}
            awardBets={awardBets}
            awardPhase={awardPhase}
            awardOdds={awardOdds}
            goldenBootClosed={goldenBootClosed}
            userGc={balance}
            canPersistActions={canPersistActions}
            followedMatches={followedMatches}
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
        {activeView === "forum" && (
          <ForumView
            locale={locale}
            t={t}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            categories={forumCategories}
            hotPosts={forumHotPosts}
            latestPosts={forumLatestPosts}
            selectedThreadPost={forumSelectedPost}
            myPosts={forumMyPosts}
            myReplies={forumMyReplies}
            tags={forumTags}
          />
        )}
        {activeView === "mine" && (
          <MineView
            locale={locale}
            t={t}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            userEmail={userEmail}
            userDisplayName={userDisplayName}
            balance={balance}
            myPosts={forumMyPosts}
            myReplies={forumMyReplies}
            minePredictions={minePredictions}
            followedMatches={followedMatches}
            followedMatchCount={followedMatchCount}
            checkinLabel={checkinLabel}
            checkinState={checkinState}
            onCheckin={claimDaily}
            onOpenView={openView}
          />
        )}
        {activeView === "topup" && (
          <MobileTopupView
            locale={locale}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            balance={balance}
            refreshBalance={refresh}
            onOpenView={openView}
          />
        )}
        {activeView === "invite" && (
          <MobileInviteView
            locale={locale}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            profile={inviteProfile}
            rank={inviteRank}
            claimedMilestones={inviteClaimedMilestones}
            leaderboard={inviteLeaderboard}
            siteUrl={inviteSiteUrl}
            onOpenView={openView}
          />
        )}
        {activeView === "checkin" && (
          <MobileCheckinView
            locale={locale}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            balance={balance}
            initialHistory={checkinHistory}
            refreshBalance={refresh}
            onOpenView={openView}
          />
        )}
        {activeView === "profile" && (
          <MobileProfileView
            locale={locale}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            userEmail={userEmail}
            userDisplayName={userDisplayName}
            balance={balance}
            minePredictions={minePredictions}
            myPosts={forumMyPosts}
            myReplies={forumMyReplies}
            followedMatchCount={followedMatchCount}
            onOpenView={openView}
          />
        )}
        {activeView === "settings" && (
          <MobileSettingsView
            locale={locale}
            isLoggedIn={isLoggedIn}
            userEmail={userEmail}
            onOpenView={openView}
          />
        )}
        {activeView === "leaderboard" && (
          <MobileLeaderboardView
            locale={locale}
            topScorers={topScorers}
            inviteLeaderboard={inviteLeaderboard}
            onOpenView={openView}
          />
        )}
        {activeView === "awards" && (
          <MobileAwardsView
            locale={locale}
            isLoggedIn={isLoggedIn}
            canPersistActions={canPersistActions}
            userGc={balance}
            awardBets={awardBets}
            awardPhase={awardPhase}
            awardOdds={awardOdds}
            goldenBootClosed={goldenBootClosed}
            onOpenView={openView}
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
  onOpenView,
}: {
  locale: string;
  t: MobileCopy;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userEmail?: string;
  userDisplayName?: string;
  balance: number;
  onOpenView: (view: MobileView) => void;
}) {
  const displayName = userDisplayName ?? userEmail?.split("@")[0] ?? "User";
  const accountSummary = isLoggedIn ? (
    <span className="flex max-w-[10rem] items-center gap-1.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-[15px] font-black text-[#081120]">
        {displayName.slice(0, 1).toUpperCase()}
      </span>
        <span className="min-w-0 text-right">
          <span className="flex items-center justify-end gap-1 text-[13px] font-black leading-none text-white">
            <span className="truncate">{displayName}</span>
          </span>
          <span className="mt-1 block text-[11px] font-bold leading-none text-[#FFD700]">{formatBalance(balance)} GC</span>
        </span>
    </span>
  ) : (
    <span className="rounded-lg border border-[#FFD700]/25 bg-[#FFD700]/10 px-2.5 py-1.5 text-[13px] font-black text-[#FFD700]">{t.login}</span>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081120]/95 px-3 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <Image src="/icons/levels/logo.png" alt={t.appTitle} fill className="object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black leading-none">{t.appTitle}</p>
            <p className="mt-1 truncate text-[13px] leading-none text-slate-500">m.football2026.net</p>
          </div>
        </div>
        {isLoggedIn ? (
          <button type="button" onClick={() => onOpenView("mine")} className="shrink-0">
            {accountSummary}
          </button>
        ) : (
          <Link href={`/${locale}/m/login?next=${encodeURIComponent("/m?view=home")}`} className="shrink-0">
            {accountSummary}
          </Link>
        )}
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
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FFD700]/25 bg-[#FFD700]/10 px-2 py-1 text-[12px] font-black text-[#FFD700]">
          <Sparkles className="h-3.5 w-3.5" />
          {locale === "zh" ? `${t.badge} ${daysLeft} 天` : `${t.badge} ${daysLeft} days`}
        </div>
        <h1 className="text-lg font-black leading-tight">{t.title}</h1>
        <p className="mt-1 text-[15px] leading-5 text-slate-300">{t.subtitle}</p>
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
        title={lc(locale, "焦点对决", "Featured Matches")}
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
        <h2 className="text-[15px] font-black leading-tight text-white">{title}</h2>
        <span className="shrink-0 text-[13px] font-black text-[#FFD700]">{matches.length}</span>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-[15px] text-slate-400">{t.noMatches}</div>
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
      <h2 className="mb-2 text-[15px] font-black text-white">{lc(locale, "射手榜 Top 5", "Top Scorers")}</h2>
      {scorers.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-[15px] text-slate-400">{lc(locale, "暂无射手榜数据", "No scorer data")}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
          <div className="grid grid-cols-[1.5rem_1fr_2.4rem_2.4rem] gap-1 border-b border-white/10 px-2 py-1 text-[11px] font-bold text-slate-500">
            <span>#</span><span>{lc(locale, "球员", "Player")}</span><span className="text-center">{lc(locale, "进球", "G")}</span><span className="text-center">{lc(locale, "助攻", "A")}</span>
          </div>
          {scorers.map((scorer, index) => (
            <div key={scorer.id} className="grid grid-cols-[1.5rem_1fr_2.4rem_2.4rem] items-center gap-1 border-b border-white/5 px-2 py-1.5 text-[12px] last:border-b-0">
              <span className={`font-black ${index === 0 ? "text-[#FFD700]" : "text-slate-500"}`}>{index + 1}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <img src={getFlagUrl(scorer.team, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-black text-white">{locale === "zh" && scorer.playerNameZh ? scorer.playerNameZh : scorer.playerName}</span>
                  <span className="block truncate text-[11px] text-slate-500">{getTeamName(scorer.team, locale)}</span>
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
  const selectedTeamNames = teamFilters.map((team) => getTeamName(team, locale)).join(lc(locale, "、", ", "));
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
            <button type="button" onClick={() => { setGroupPanelOpen((open) => !open); setTeamPanelOpen(false); }} className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-white/10 bg-[#0d1a2b] px-1.5 text-left text-[13px] font-black text-white">
              <span className="truncate">{groupFilter === "all" ? (lc(locale, "全部组别", "All groups")) : (locale === "zh" ? `${groupFilter}组` : `${lc(locale, "组", "Group")} ${groupFilter}`)}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${groupPanelOpen ? "rotate-180" : ""}`} />
            </button>
            {groupPanelOpen && (
              <div className="absolute left-0 right-0 top-9 z-40 rounded-lg border border-white/10 bg-[#0b1626] p-2 shadow-xl shadow-black/40">
                <button type="button" onClick={() => applyGroupFilter("all")} className="mb-1.5 h-7 w-full rounded-md border border-white/10 bg-white/[0.035] px-2 text-left text-[13px] font-black text-slate-300">{lc(locale, "全部组别", "All groups")}</button>
                <div className="grid grid-cols-2 gap-1.5">
                  {groups.map((group) => <button key={group} type="button" onClick={() => applyGroupFilter(group)} className="h-8 rounded-md border border-white/10 bg-white/[0.035] px-2 text-left text-[13px] font-black text-slate-300">{locale === "zh" ? `${group}组` : `${lc(locale, "组", "Group")} ${group}`}</button>)}
                </div>
              </div>
            )}
          </div>
          <div className="relative min-w-0">
            <button type="button" onClick={() => { setTeamPanelOpen((open) => !open); setGroupPanelOpen(false); }} className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-white/10 bg-[#0d1a2b] px-1.5 text-left text-[13px] font-black text-white">
              <span className="truncate">{teamFilters.length === 0 ? (lc(locale, "全部球队", "All teams")) : selectedTeamNames}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${teamPanelOpen ? "rotate-180" : ""}`} />
            </button>
            {teamPanelOpen && (
              <div className="absolute left-0 right-0 top-9 z-40 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#0b1626] p-2 shadow-xl shadow-black/40">
                <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => { setTeamFilters([]); setTeamPanelOpen(false); }} className="h-7 rounded-md border border-white/10 bg-white/[0.035] px-2 text-left text-[13px] font-black text-slate-300">{lc(locale, "全部球队", "All teams")}</button>
                  <button type="button" onClick={() => setTeamPanelOpen(false)} className="h-7 rounded-md bg-[#FFD700] px-2 text-[13px] font-black text-[#081120]">{lc(locale, "完成", "Done")}</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {teams.map((team) => <button key={team} type="button" onClick={() => toggleTeamFilter(team)} className={`h-8 min-w-0 truncate rounded-md border px-1.5 text-left text-[13px] font-black ${teamFilters.includes(team) ? "border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-white/[0.035] text-slate-300"}`}>{getTeamName(team, locale)}</button>)}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={sortByTime} className={`h-8 rounded-md border px-1 text-[13px] font-black ${timeSort ? "border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-[#0d1a2b] text-slate-300"}`}>{lc(locale, "时间", "Time")}</button>
        </div>
      </section>
      {filteredMatches.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-[15px] text-slate-400">{t.noMatches}</div>
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
    <span className="grid min-w-0 grid-cols-[2.85rem_minmax(0,0.86fr)_2.35rem_minmax(0,0.86fr)] items-center gap-1 text-[13px] font-black text-white">
      <span className="rounded-full bg-[#FFD700]/10 px-1 py-0.5 text-center text-[11px] text-[#FFD700]">{getStageLabel(match, locale)}</span>
      <span className="flex min-w-0 items-center gap-1"><img src={getFlagUrl(match.homeTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" /><span className="truncate">{getTeamName(match.homeTeam, locale)}</span></span>
      <span className="text-center text-[11px] text-slate-500">VS</span>
      <span className="flex min-w-0 items-center justify-end gap-1"><img src={getFlagUrl(match.awayTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" /><span className="truncate text-right">{getTeamName(match.awayTeam, locale)}</span></span>
    </span>
  );
}

function MatchMetaLine({ locale, match, isLoggedIn, canPersistActions }: { locale: string; match: MobileMatch; isLoggedIn: boolean; canPersistActions: boolean }) {
  return <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[12px] leading-4 text-slate-500"><span className="shrink-0">{formatKickoff(match.kickoffTime, locale)}</span><span className="min-w-0 truncate">{getLocation(match, locale)}</span><span className="shrink-0">{formatCountdown(match.kickoffTime, locale)}</span><MobileFollowButton locale={locale} match={match} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} /></span>;
}

function MobileFollowButton({ locale, match, isLoggedIn, canPersistActions }: { locale: string; match: MobileMatch; isLoggedIn: boolean; canPersistActions: boolean }) {
  const [following, setFollowing] = useState(match.isFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(match.isFollowing);
  }, [match.id, match.isFollowing]);

  async function toggleFollow(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!isLoggedIn) {
      redirectToMobileLogin(locale);
      return;
    }
    if (loading) return;
    const next = !following;
    setFollowing(next);
    if (!canPersistActions) return;
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

  return <button type="button" onClick={toggleFollow} onKeyDown={(event) => event.stopPropagation()} disabled={loading} title={!isLoggedIn ? (lc(locale, "请先完成登录", "Please sign in")) : undefined} className="ml-auto h-5 shrink-0 rounded-full border border-[#FFD700]/60 bg-transparent px-2 text-[12px] font-black leading-none text-[#FFD700] disabled:opacity-50">{following ? (lc(locale, "已关注比赛", "Following")) : (lc(locale, "关注比赛", "Follow match"))}</button>;
}

function PredictView({
  locale,
  t,
  isLoggedIn,
  matches,
  minePredictions,
  awardBets,
  awardPhase,
  awardOdds,
  goldenBootClosed,
  userGc,
  canPersistActions,
  followedMatches,
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
  minePredictions: MobileMinePrediction[];
  awardBets: MobileAwardBet[];
  awardPhase: AwardPhase;
  awardOdds: number;
  goldenBootClosed: boolean;
  userGc: number;
  canPersistActions: boolean;
  followedMatches: MobileMatch[];
  selectedMatch: string;
  prediction: PredictionChoice;
  score: string;
  stake: string;
  setPrediction: (value: PredictionChoice) => void;
  setScore: (value: string) => void;
  setStake: (value: string) => void;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"events" | "awards" | "follow">("events");
  const winPredictions = minePredictions.filter((item) => item.kind === "win");
  const scorePredictions = minePredictions.filter((item) => item.kind === "score");
  const predictedMatchIds = new Set(minePredictions.map((item) => item.matchId));
  const suggestedMatches = matches.filter((match) => !predictedMatchIds.has(match.id)).slice(0, 4);
  const currentMatch = matches.find((match) => getMatchTeams(locale, match) === selectedMatch);
  const fallbackMatches = suggestedMatches.length > 0 ? suggestedMatches : matches.slice(0, 4);

  function openMatch(match: MobileMatch) {
    onOpenView("matches", getMatchTeams(locale, match));
  }

  return (
    <div className="grid gap-3 pb-2">
      <section className="sticky top-0 z-30 -mx-3 border-b border-white/10 bg-[#081120]/96 px-3 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1.5">
          {[
            { key: "events" as const, label: lc(locale, "赛事预测", "Matches") },
            { key: "awards" as const, label: lc(locale, "大奖预测", "Awards") },
            { key: "follow" as const, label: lc(locale, "我的关注", "Following") },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`h-8 rounded-md border px-2 text-[12px] font-black ${
                activeTab === item.key ? "border-[#FFD700]/60 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-[#0d1a2b] text-slate-400"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "events" && (
        <div className="grid gap-3">
          <PredictSummaryBar locale={locale} winCount={winPredictions.length} scoreCount={scorePredictions.length} followCount={followedMatches.length} />

          <PredictListSection
            locale={locale}
            title={lc(locale, "输赢预测", "Win Predictions")}
            predictions={winPredictions}
            emptyLabel={lc(locale, "还没有输赢预测", "No win predictions yet")}
            onOpenMatchId={(matchId) => {
              const match = matches.find((item) => item.id === matchId);
              if (match) openMatch(match);
            }}
          />

          <PredictListSection
            locale={locale}
            title={lc(locale, "比分预测", "Score Predictions")}
            predictions={scorePredictions}
            emptyLabel={lc(locale, "还没有比分预测", "No score predictions yet")}
            onOpenMatchId={(matchId) => {
              const match = matches.find((item) => item.id === matchId);
              if (match) openMatch(match);
            }}
          />

          <PredictSuggestedMatches locale={locale} matches={fallbackMatches} currentMatch={currentMatch} onOpenMatch={openMatch} />
        </div>
      )}

      {activeTab === "awards" && (
        <MobileAwardPredictionPanel
          locale={locale}
          isLoggedIn={isLoggedIn}
          canPersistActions={canPersistActions}
          userGc={userGc}
          initialBets={awardBets}
          phase={awardPhase}
          odds={awardOdds}
          goldenBootClosed={goldenBootClosed}
        />
      )}

      {activeTab === "follow" && (
        <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
          <ForumSectionHeader title={lc(locale, "我的关注比赛", "Followed Matches")} meta={`${followedMatches.length}`} />
          <MineFollowedMatchList
            locale={locale}
            matches={followedMatches}
            emptyLabel={lc(locale, "还没有关注比赛", "No followed matches yet")}
            onOpenMatch={openMatch}
          />
        </section>
      )}
    </div>
  );
}

function PredictSummaryBar({
  locale,
  winCount,
  scoreCount,
  followCount,
}: {
  locale: string;
  winCount: number;
  scoreCount: number;
  followCount: number;
}) {
  const items = [
    { label: lc(locale, "输赢", "Win"), value: winCount },
    { label: lc(locale, "比分", "Score"), value: scoreCount },
    { label: lc(locale, "关注", "Follow"), value: followCount },
  ];

  return (
    <section className="grid grid-cols-3 gap-1.5 rounded-xl border border-[#FFD700]/25 bg-[linear-gradient(180deg,rgba(255,215,0,0.1),rgba(13,26,43,0.96))] p-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.035] px-2 py-2 text-center">
          <p className="text-xl font-black leading-6 text-white">{item.value}</p>
          <p className="mt-0.5 text-[12px] font-bold text-slate-400">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

function PredictListSection({
  locale,
  title,
  predictions,
  emptyLabel,
  onOpenMatchId,
}: {
  locale: string;
  title: string;
  predictions: MobileMinePrediction[];
  emptyLabel: string;
  onOpenMatchId: (matchId: number) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <ForumSectionHeader title={title} meta={`${predictions.length}`} />
      {predictions.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-5 text-center text-[13px] font-bold text-slate-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid gap-1.5">
          {predictions.map((item) => (
            <PredictRecordRow key={`${item.kind}-${item.id}`} locale={locale} item={item} onOpen={() => onOpenMatchId(item.matchId)} />
          ))}
        </div>
      )}
    </section>
  );
}

function PredictRecordRow({
  locale,
  item,
  onOpen,
}: {
  locale: string;
  item: MobileMinePrediction;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid min-w-0 gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left active:bg-white/[0.06]"
    >
      <span className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <img src={getFlagUrl(item.homeTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
          <span className="min-w-0 truncate text-[13px] font-black text-white">{getTeamName(item.homeTeam, locale)}</span>
          <span className="shrink-0 text-[10px] font-bold text-slate-600">VS</span>
          <img src={getFlagUrl(item.awayTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
          <span className="min-w-0 truncate text-[13px] font-black text-white">{getTeamName(item.awayTeam, locale)}</span>
        </span>
        <span className="shrink-0 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-2 py-0.5 text-[11px] font-black text-[#FFD700]">
          {item.kind === "win" ? (lc(locale, "输赢", "Win")) : (lc(locale, "比分", "Score"))}
        </span>
      </span>
      <span className="flex min-w-0 items-center justify-between gap-2 text-[12px] font-bold text-slate-400">
        <span className="min-w-0 truncate">{getMinePredictionLabel(item, locale)}</span>
        <span className="shrink-0">{formatBalance(item.gcAmount)} GC</span>
      </span>
      <span className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-slate-600">
        <span className="min-w-0 truncate">{formatKickoff(item.kickoffTime, locale)}</span>
        <span className="shrink-0 text-slate-400">{getMinePredictionStatus(item.status, locale)}</span>
      </span>
    </button>
  );
}

function PredictSuggestedMatches({
  locale,
  matches,
  currentMatch,
  onOpenMatch,
}: {
  locale: string;
  matches: MobileMatch[];
  currentMatch?: MobileMatch;
  onOpenMatch: (match: MobileMatch) => void;
}) {
  const list = currentMatch ? [currentMatch, ...matches.filter((match) => match.id !== currentMatch.id)].slice(0, 4) : matches;

  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <ForumSectionHeader title={lc(locale, "可继续预测", "Continue Predicting")} meta={`${list.length}`} />
      {list.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-5 text-center text-[13px] font-bold text-slate-500">
          {lc(locale, "暂无可预测比赛", "No matches available")}
        </div>
      ) : (
        <div className="grid gap-1.5">
          {list.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => onOpenMatch(match)}
              className="grid min-w-0 gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left active:bg-white/[0.06]"
            >
              <span className="min-w-0 text-sm font-black leading-5 text-white">
                <MatchAlignedRow locale={locale} match={match} />
              </span>
              <span className="flex min-w-0 items-center justify-between gap-2 text-[12px] leading-4 text-slate-500">
                <span className="min-w-0 truncate">{formatKickoff(match.kickoffTime, locale)} · {getLocation(match, locale)}</span>
                <span className="shrink-0 rounded-full bg-[#FFD700] px-2 py-0.5 text-[11px] font-black text-[#081120]">
                  {lc(locale, "去预测", "Predict")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

const MOBILE_AWARD_MIN_BET = 10_000;
const MOBILE_AWARD_PRESETS = [10_000, 100_000, 1_000_000, 5_000_000];

const MOBILE_POSITION_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  GK: { zh: "门将", en: "GK", color: "#60A5FA" },
  DF: { zh: "后卫", en: "DF", color: "#34D399" },
  MF: { zh: "中场", en: "MF", color: "#FBBF24" },
  FW: { zh: "前锋", en: "FW", color: "#F87171" },
};

function parseMobileAwardAmount(value: string) {
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function MobileAwardPredictionPanel({
  locale,
  isLoggedIn,
  canPersistActions,
  userGc,
  initialBets,
  phase,
  odds,
  goldenBootClosed,
}: {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userGc: number;
  initialBets: MobileAwardBet[];
  phase: AwardPhase;
  odds: number;
  goldenBootClosed: boolean;
}) {
  const zh = locale === "zh";
  const [activeAward, setActiveAward] = useState<AwardKey>("goldenBoot");
  const [bets, setBets] = useState<MobileAwardBet[]>(initialBets);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [amount, setAmount] = useState(String(MOBILE_AWARD_MIN_BET));
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { balance, setBalance } = useGcBalance();
  const localGc = balance > 0 ? balance : userGc;
  const activeMeta = AWARD_META[activeAward];
  const players = getPlayersByAward(activeAward);
  const activeDbKey = awardKeyToDb(activeAward);
  const activeBets = bets.filter((bet) => dbToAwardKey(bet.awardType) === activeAward);
  const isClosed = phase === "closed" || (activeAward === "goldenBoot" && goldenBootClosed);
  const amountNum = parseMobileAwardAmount(amount);

  function getBetForPlayer(playerId: number) {
    return activeBets.find((bet) => bet.playerId === playerId);
  }

  function errorText(error?: string) {
    const map: Record<string, string> = {
      insufficient_gc: zh ? "GC 余额不足" : "Insufficient GC",
      max_picks_reached: zh ? "每项大奖最多预测 5 名球员" : "Max 5 picks per award",
      betting_closed: zh ? "预测已截止" : "Predictions closed",
      not_authenticated: zh ? "请先登录" : "Please log in",
      player_not_found: zh ? "球员数据异常" : "Player not found",
      gc_deduction_failed: zh ? "GC 扣除失败，请重试" : "GC deduction failed",
      insert_failed: zh ? "写入失败，请刷新后重试" : "Insert failed, please refresh",
      update_failed: zh ? "更新失败，请重试" : "Update failed, please retry",
      invalid_amount: zh ? "金额无效" : "Invalid amount",
    };
    return map[error ?? ""] ?? (zh ? "预测失败，请重试" : "Prediction failed, please retry");
  }

  function openPlayer(player: Player) {
    setSelectedPlayer(player);
    setAmount(String(MOBILE_AWARD_MIN_BET));
    setNotice(null);
  }

  function submitAwardBet() {
    if (!selectedPlayer) return;
    if (!isLoggedIn) {
      redirectToMobileLogin(locale);
      return;
    }
    if (isClosed) {
      setNotice({ type: "err", text: zh ? "预测已截止" : "Predictions closed" });
      return;
    }
    if (amountNum < MOBILE_AWARD_MIN_BET) {
      setNotice({ type: "err", text: zh ? `最低消耗 ${formatGc(MOBILE_AWARD_MIN_BET)} GC` : `Minimum ${formatGc(MOBILE_AWARD_MIN_BET)} GC` });
      return;
    }
    if (amountNum > localGc) {
      setNotice({ type: "err", text: zh ? "GC 余额不足" : "Insufficient GC" });
      return;
    }
    if (!canPersistActions) {
      setBets((current) => {
        const existing = current.find((bet) => bet.awardType === activeDbKey && bet.playerId === selectedPlayer.id);
        if (existing) {
          return current.map((bet) => bet.id === existing.id ? { ...bet, gcAmount: bet.gcAmount + amountNum } : bet);
        }
        return [
          ...current,
          {
            id: crypto.randomUUID(),
            awardType: activeDbKey,
            playerId: selectedPlayer.id,
            playerName: selectedPlayer.name,
            playerNameZh: selectedPlayer.nameZh,
            gcAmount: amountNum,
            oddsMultiplier: odds,
            betPhase: phase === "pre" ? "early" : "live",
            result: "pending",
          },
        ];
      });
      setNotice({ type: "ok", text: zh ? "已在本页显示，正式登录后会保存到数据库" : "Shown on this page. Sign in fully to save it." });
      window.setTimeout(() => {
        setSelectedPlayer(null);
        setNotice(null);
      }, 1200);
      return;
    }

    startTransition(async () => {
      const res = await placeAwardBet(activeDbKey, selectedPlayer.id, amountNum);
      if (!res.success) {
        setNotice({ type: "err", text: errorText(res.error) });
        return;
      }

      setBets((current) => {
        const existing = current.find((bet) => bet.awardType === activeDbKey && bet.playerId === selectedPlayer.id);
        if (existing) {
          return current.map((bet) => bet.id === existing.id ? { ...bet, gcAmount: bet.gcAmount + amountNum } : bet);
        }
        return [
          ...current,
          {
            id: crypto.randomUUID(),
            awardType: activeDbKey,
            playerId: selectedPlayer.id,
            playerName: selectedPlayer.name,
            playerNameZh: selectedPlayer.nameZh,
            gcAmount: amountNum,
            oddsMultiplier: odds,
            betPhase: phase === "pre" ? "early" : "live",
            result: "pending",
          },
        ];
      });
      setBalance(Math.max(0, localGc - amountNum));
      setNotice({ type: "ok", text: zh ? "预测成功" : "Prediction placed" });
      window.setTimeout(() => {
        setSelectedPlayer(null);
        setNotice(null);
      }, 900);
    });
  }

  function cancelBet(betId: string) {
    if (!canPersistActions || isClosed) return;
    startTransition(async () => {
      const bet = bets.find((item) => item.id === betId);
      const res = await cancelAwardBet(betId);
      if (!res.success) {
        setNotice({ type: "err", text: errorText(res.error) });
        return;
      }
      setBets((current) => current.filter((item) => item.id !== betId));
      if (bet) setBalance(localGc + bet.gcAmount);
    });
  }

  return (
    <section className="grid gap-3">
      <div className="rounded-xl border border-[#FFD700]/25 bg-[linear-gradient(180deg,rgba(255,215,0,0.1),rgba(13,26,43,0.96))] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{zh ? "大奖预测" : "Award Predictions"}</p>
            <h2 className="mt-1 text-lg font-black text-white">{zh ? "四项大奖" : "Four Awards"}</h2>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-bold text-slate-500">{zh ? "当前倍率" : "Multiplier"}</p>
            <p className="text-xl font-black text-[#FFD700]">{odds.toFixed(1)}x</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-slate-400">
          {zh ? `每项最多 5 名球员，最低消耗 ${formatGc(MOBILE_AWARD_MIN_BET)} GC。` : `Max 5 picks per award. Minimum ${formatGc(MOBILE_AWARD_MIN_BET)} GC.`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-[#0d1a2b] p-1">
        {(Object.keys(AWARD_META) as AwardKey[]).map((key) => {
          const meta = AWARD_META[key];
          const count = bets.filter((bet) => dbToAwardKey(bet.awardType) === key).length;
          const active = activeAward === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveAward(key)}
              className={`relative grid min-h-14 place-items-center rounded-lg px-1 py-1 text-center ${
                active ? "bg-[#FFD700] text-[#081120]" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{meta.icon}</span>
              <span className="text-[10px] font-black leading-3">{zh ? meta.nameZh : meta.name}</span>
              {count > 0 && (
                <span className={`absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-black ${active ? "bg-[#081120] text-[#FFD700]" : "bg-[#FFD700] text-[#081120]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <ForumSectionHeader title={`${activeMeta.icon} ${zh ? activeMeta.nameZh : activeMeta.name}`} meta={`${activeBets.length}/5`} />
        <p className="mb-2 text-[12px] leading-5 text-slate-500">{zh ? activeMeta.descZh : activeMeta.desc}</p>
        {activeBets.length > 0 ? (
          <div className="grid gap-1.5">
            {activeBets.map((bet) => {
              const player = PLAYERS.find((item) => item.id === bet.playerId);
              return (
                <div key={bet.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/10 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-white">{zh ? bet.playerNameZh : bet.playerName}</p>
                    <p className="truncate text-[11px] text-slate-500">{player?.club ?? ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-black text-[#FFD700]">{formatGc(bet.gcAmount)}</p>
                    <p className="text-[10px] text-slate-500">{bet.oddsMultiplier}x</p>
                  </div>
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => cancelBet(bet.id)}
                      disabled={isPending}
                      className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-slate-500 disabled:opacity-50"
                      title={zh ? "取消预测" : "Cancel"}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-4 text-center text-[12px] font-bold text-slate-500">
            {zh ? "还没有选择球员" : "No picks yet"}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <ForumSectionHeader title={zh ? "候选球员" : "Candidates"} meta={`${players.length}`} />
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => {
            const bet = getBetForPlayer(player.id);
            const pos = MOBILE_POSITION_LABELS[player.position];
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => openPlayer(player)}
                disabled={isClosed}
                className={`min-w-0 rounded-lg border p-2 text-left disabled:opacity-60 ${
                  bet ? "border-[#FFD700]/45 bg-[#FFD700]/10" : "border-white/10 bg-white/[0.035]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <img src={`https://flagcdn.com/w40/${player.countryCode}.png`} alt="" className="h-3.5 w-5 shrink-0 rounded-sm object-cover" />
                  <span className="rounded px-1 text-[9px] font-black" style={{ color: pos.color, backgroundColor: `${pos.color}22` }}>
                    {zh ? pos.zh : pos.en}
                  </span>
                </span>
                <span className="mt-1 block truncate text-[13px] font-black text-white">{zh ? player.nameZh : player.name}</span>
                {zh && <span className="mt-0.5 block truncate text-[10px] text-slate-500">{player.name}</span>}
                <span className="mt-1 block truncate text-[11px] text-slate-500">{player.club}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-600">{player.age}{zh ? "岁" : "y"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${bet ? "bg-[#FFD700] text-[#081120]" : "bg-white/[0.06] text-[#FFD700]"}`}>
                    {bet ? formatGc(bet.gcAmount) : (zh ? "预测" : "Pick")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedPlayer && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center p-3">
          <button type="button" aria-label="close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedPlayer(null)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a2b] shadow-2xl">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <img src={`https://flagcdn.com/w40/${selectedPlayer.countryCode}.png`} alt="" className="h-5 w-8 rounded-sm object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">{zh ? selectedPlayer.nameZh : selectedPlayer.name}</p>
                  <p className="truncate text-[12px] text-slate-500">{selectedPlayer.club} · {zh ? activeMeta.nameZh : activeMeta.name}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-3">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
                <div>
                  <p className="text-[12px] font-bold text-slate-500">{zh ? "当前倍率" : "Multiplier"}</p>
                  <p className="text-[11px] text-slate-600">{phase === "pre" ? (zh ? "开赛前" : "Pre-tournament") : phase}</p>
                </div>
                <p className="text-xl font-black text-[#FFD700]">{odds.toFixed(1)}x</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MOBILE_AWARD_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`h-8 rounded-lg text-[11px] font-black ${amountNum === preset ? "bg-[#FFD700] text-[#081120]" : "bg-white/[0.06] text-slate-300"}`}
                  >
                    {formatGc(preset)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="numeric"
                  className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#081120] px-3 text-[13px] font-black text-white outline-none"
                  placeholder={String(MOBILE_AWARD_MIN_BET)}
                />
                <span className="text-[12px] font-bold text-slate-500">GC</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-lg bg-white/[0.035] px-3 py-2">
                  <p className="font-bold text-slate-500">{zh ? "预计获得" : "Expected"}</p>
                  <p className="mt-1 font-black text-emerald-300">{formatGc(Math.floor(amountNum * odds))}</p>
                </div>
                <div className="rounded-lg bg-white/[0.035] px-3 py-2">
                  <p className="font-bold text-slate-500">{zh ? "余额" : "Balance"}</p>
                  <p className="mt-1 font-black text-[#FFD700]">{formatGc(localGc)}</p>
                </div>
              </div>
              {notice && (
                <div className={`rounded-lg border px-3 py-2 text-center text-[12px] font-black ${notice.type === "ok" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}>
                  {notice.text}
                </div>
              )}
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <button
                  type="button"
                  onClick={submitAwardBet}
                  disabled={isPending || isClosed}
                  className="h-10 rounded-lg bg-[#FFD700] text-[13px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500"
                >
                  {isPending ? "..." : (zh ? "确认预测" : "Confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="h-10 rounded-lg border border-white/10 text-[13px] font-black text-slate-400"
                >
                  {zh ? "取消" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ForumView({
  locale,
  t,
  isLoggedIn,
  canPersistActions,
  categories,
  hotPosts,
  latestPosts,
  selectedThreadPost,
  myPosts,
  myReplies,
  tags,
}: {
  locale: string;
  t: MobileCopy;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  categories: MobileForumCategory[];
  hotPosts: MobileForumPost[];
  latestPosts: MobileForumPost[];
  selectedThreadPost: MobileForumPost | null;
  myPosts: MobileForumPost[];
  myReplies: MobileForumUserReply[];
  tags: MobileForumTag[];
}) {
  const posts = useMemo(() => {
    const seen = new Set<number>();
    return [...(selectedThreadPost ? [selectedThreadPost] : []), ...hotPosts, ...myPosts, ...latestPosts].filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [hotPosts, latestPosts, myPosts, selectedThreadPost]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("thread");
    return value ? Number(value) : null;
  });
  const [translatedTitles, setTranslatedTitles] = useState<Record<number, string>>({});
  const selectedPost = posts.find((post) => post.id === selectedPostId) ?? null;

  useEffect(() => {
    setTranslatedTitles({});
    if (!isLoggedIn && !canPersistActions) return;

    let active = true;
    const targetLang = getForumTargetLang(locale);
    void Promise.all(posts.map(async (post) => {
      // Skip titles already in the target language (e.g. English titles on the
      // English site) — saves the per-user daily translate quota and avoids a
      // pointless round-trip that just echoes the original back.
      if (!needsTranslation(post.title, targetLang)) return null;
      try {
        const response = await fetch(getForumTranslateEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "post_title", id: post.id, target_lang: targetLang }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return [post.id, String(data.translated ?? post.title)] as const;
      } catch {
        return null;
      }
    })).then((entries) => {
      if (!active) return;
      setTranslatedTitles(Object.fromEntries(entries.filter((entry): entry is readonly [number, string] => entry !== null)));
    });

    return () => {
      active = false;
    };
  }, [canPersistActions, isLoggedIn, locale, posts]);

  useEffect(() => {
    if (!selectedPostId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("match")) {
      url.searchParams.set("view", "forum");
      url.searchParams.delete("match");
      window.history.replaceState(null, "", url);
    }
  }, [selectedPostId]);

  function openPost(postId: number) {
    setSelectedPostId(postId);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "forum");
    url.searchParams.set("thread", String(postId));
    url.searchParams.delete("match");
    if (!posts.some((post) => post.id === postId)) {
      window.location.assign(url.toString());
      return;
    }
    window.history.pushState(null, "", url);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
  }

  function closePost() {
    setSelectedPostId(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "forum");
    url.searchParams.delete("thread");
    url.searchParams.delete("match");
    window.history.pushState(null, "", url);
  }

  return (
    <div className="grid gap-3">
      {selectedPost && (
        <ForumThreadDetail locale={locale} post={selectedPost} isLoggedIn={isLoggedIn} canPersistActions={canPersistActions} onClose={closePost} />
      )}

      <section className="rounded-xl border border-[#FFD700]/25 bg-[linear-gradient(180deg,rgba(255,215,0,0.09),rgba(13,26,43,0.96))] p-3">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{t.forumHot}</p>
            <h1 className="mt-1 text-xl font-black leading-tight text-white">{lc(locale, "本周热帖", "Hot This Week")}</h1>
          </div>
          <p className="shrink-0 text-[13px] font-bold text-slate-500">
            {categories.length > 0
              ? locale === "zh" ? `${categories.length} 板块` : `${categories.length} boards`
              : lc(locale, "社区", "Community")}
          </p>
        </div>
        <ForumPostList locale={locale} posts={hotPosts} translatedTitles={translatedTitles} emptyLabel={lc(locale, "暂无热门帖子", "No hot posts")} onOpenPost={openPost} ranked />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <ForumSectionHeader
          title={lc(locale, "我的帖子", "My Posts")}
          meta={isLoggedIn ? `${myPosts.length}` : (lc(locale, "未登录", "Signed out"))}
        />
        <ForumPostList locale={locale} posts={myPosts} translatedTitles={translatedTitles} emptyLabel={isLoggedIn ? (lc(locale, "还没有发帖", "No posts yet")) : (lc(locale, "登录后显示我的帖子", "Sign in to see your posts"))} onOpenPost={openPost} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <ForumSectionHeader
          title={lc(locale, "我的回复", "My Replies")}
          meta={isLoggedIn ? `${myReplies.length}` : (lc(locale, "未登录", "Signed out"))}
        />
        <ForumReplyList locale={locale} replies={myReplies} translatedTitles={translatedTitles} emptyLabel={isLoggedIn ? (lc(locale, "还没有回复", "No replies yet")) : (lc(locale, "登录后显示我的回复", "Sign in to see your replies"))} onOpenPost={openPost} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <ForumSectionHeader
          title={lc(locale, "全部论坛", "All Forums")}
          meta={locale === "zh" ? `${categories.length} 个` : `${categories.length}`}
        />
        <ForumCategoryGrid locale={locale} categories={categories} />
      </section>
    </div>
  );
}

function ForumSectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-black text-white">{title}</h2>
      {meta && <span className="shrink-0 text-[13px] font-bold text-slate-500">{meta}</span>}
    </div>
  );
}

function ForumPostList({
  locale,
  posts,
  translatedTitles,
  emptyLabel,
  onOpenPost,
  ranked = false,
}: {
  locale: string;
  posts: MobileForumPost[];
  translatedTitles: Record<number, string>;
  emptyLabel: string;
  onOpenPost: (postId: number) => void;
  ranked?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-8 text-center text-[15px] font-bold text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
      {posts.map((post, index) => (
        <ForumPostRow key={post.id} locale={locale} post={post} title={translatedTitles[post.id] ?? post.title} index={index} ranked={ranked} onOpenPost={onOpenPost} />
      ))}
    </div>
  );
}

function ForumReplyList({
  locale,
  replies,
  translatedTitles,
  emptyLabel,
  onOpenPost,
}: {
  locale: string;
  replies: MobileForumUserReply[];
  translatedTitles: Record<number, string>;
  emptyLabel: string;
  onOpenPost: (postId: number) => void;
}) {
  if (replies.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-8 text-center text-[15px] font-bold text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          onClick={() => onOpenPost(reply.postId)}
          className="grid w-full min-w-0 gap-1 border-b border-white/10 px-2.5 py-2.5 text-left last:border-b-0 active:bg-white/[0.05]"
        >
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[15px] font-black text-white">{translatedTitles[reply.postId] ?? reply.postTitle}</span>
            <span className="shrink-0 text-[11px] font-bold text-slate-500">{formatForumTime(reply.createdAt, locale)}</span>
          </span>
          <ForumHtml html={reply.content} className="mobile-forum-content line-clamp-2 text-[13px] leading-5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-600">{lc(locale, "赞", "Like")} {formatCompactCount(reply.likeCount)}</span>
        </button>
      ))}
    </div>
  );
}

function ForumPostRow({
  locale,
  post,
  title,
  index,
  ranked,
  onOpenPost,
}: {
  locale: string;
  post: MobileForumPost;
  title: string;
  index: number;
  ranked: boolean;
  onOpenPost: (postId: number) => void;
}) {
  const rankColor = index === 0 ? "text-red-300" : index === 1 ? "text-orange-300" : index === 2 ? "text-[#FFD700]" : "text-slate-500";
  return (
    <button
      type="button"
      onClick={() => onOpenPost(post.id)}
      className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_3.2rem] items-center gap-2 border-b border-white/10 px-2.5 py-2.5 last:border-b-0 active:bg-white/[0.05]"
    >
      {ranked ? (
        <span className={`text-center text-[15px] font-black ${rankColor}`}>{index + 1}</span>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A5F] text-[13px] font-black text-white">
          {post.authorName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-black leading-5 text-white">{title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-bold leading-4 text-slate-500">
          <span className="shrink-0">{post.categoryIcon}</span>
          <span className="min-w-0 truncate">{getForumPostCategoryName(post, locale)}</span>
          <span className="shrink-0">·</span>
          <span className="min-w-0 truncate">@{post.authorName}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{formatForumTime(post.lastActivityAt, locale)}</span>
        </span>
      </span>
      <span className="shrink-0 text-right text-[12px] font-bold leading-4 text-slate-500">
        <span className="block">{lc(locale, "赞", "Like")} {formatCompactCount(post.likeCount)}</span>
        <span className="block">{lc(locale, "回", "Reply")} {formatCompactCount(post.replyCount)}</span>
      </span>
    </button>
  );
}

type ForumRewardTarget = {
  postId: number;
  replyId?: number;
  authorName: string;
  authorBalance: number;
};

type ForumReportTarget = {
  postId?: number;
  replyId?: number;
  label: string;
};

function getForumTargetLang(locale: string) {
  return locale === "zh" ? "zh" : locale || "en";
}

async function readForumApiError(response: Response) {
  try {
    const data = await response.json();
    return typeof data?.error === "string" ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function sanitizeClientForumHtml(html: string) {
  if (typeof window === "undefined") return html;
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  root.querySelectorAll<HTMLElement>("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || (name === "href" && value.startsWith("javascript:"))) {
        node.removeAttribute(attr.name);
      }
    }
    if (node.tagName.toLowerCase() === "a") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  return root.innerHTML;
}

function ForumThreadDetail({
  locale,
  post,
  isLoggedIn,
  canPersistActions,
  onClose,
}: {
  locale: string;
  post: MobileForumPost;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  onClose: () => void;
}) {
  const forumSignedIn = isLoggedIn || canPersistActions;
  const [replies, setReplies] = useState(post.replies);
  const [titleText, setTitleText] = useState(post.title);
  const [contentHtml, setContentHtml] = useState(post.content);
  const [translated, setTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likeCount);
  const [following, setFollowing] = useState(post.isFollowing);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [rewardTarget, setRewardTarget] = useState<ForumRewardTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<ForumReportTarget | null>(null);
  const translationRequestRef = useRef<string | null>(null);
  const statusLabel = forumSignedIn
    ? (lc(locale, "移动端已登录", "Signed in"))
    : (lc(locale, "未登录", "Signed out"));
  // Only auto-translate + show the translate toggle when the post is actually in
  // a different language than the UI (mirrors the desktop TranslatedContent).
  // An English post on the English site shows no toggle and burns no quota.
  const forumTargetLang = getForumTargetLang(locale);
  const needsForumTranslation =
    needsTranslation(post.title, forumTargetLang) ||
    needsTranslation(post.content, forumTargetLang);

  useEffect(() => {
    setReplies(post.replies);
    setTitleText(post.title);
    setContentHtml(post.content);
    setTranslated(false);
    setTranslating(false);
    setLiked(post.isLiked);
    setLikes(post.likeCount);
    setFollowing(post.isFollowing);
    setBookmarked(post.isBookmarked);
    setActionLoading(null);
    setShareMessage("");
    setActionMessage("");
    setRewardTarget(null);
    setReportTarget(null);
  }, [post.id, post.replies]);

  useEffect(() => {
    if (!forumSignedIn || !needsForumTranslation) return;
    void loadPostTranslation(true);
  }, [forumSignedIn, needsForumTranslation, locale, post.id]);

  function requireForumAction() {
    if (canPersistActions) return true;
    if (!isLoggedIn) {
      redirectToMobileLogin(locale);
      return false;
    }
    setActionMessage(lc(locale, "线上登录后可操作", "Sign in online to use this action."));
    return false;
  }

  function requireForumTranslateAction() {
    if (isLoggedIn || canPersistActions) return true;
    redirectToMobileLogin(locale);
    return false;
  }

  async function loadPostTranslation(automatic = false) {
    const requestKey = `${post.id}:${getForumTargetLang(locale)}`;
    if (translationRequestRef.current === requestKey) return;
    if (!forumSignedIn) {
      if (!automatic) requireForumTranslateAction();
      return;
    }
    translationRequestRef.current = requestKey;
    setTranslating(true);
    if (!automatic) setActionMessage("");
    try {
      const targetLang = getForumTargetLang(locale);
      const [titleResponse, contentResponse] = await Promise.all([
        fetch(getForumTranslateEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "post_title", id: post.id, target_lang: targetLang }),
        }),
        fetch(getForumTranslateEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "post_content", id: post.id, target_lang: targetLang }),
        }),
      ]);
      if (!titleResponse.ok) throw new Error(await readForumApiError(titleResponse));
      if (!contentResponse.ok) throw new Error(await readForumApiError(contentResponse));
      const titleData = await titleResponse.json();
      const contentData = await contentResponse.json();
      setTitleText(String(titleData.translated ?? post.title));
      setContentHtml(sanitizeClientForumHtml(String(contentData.translated ?? post.content)));
      setTranslated(true);
      if (!automatic) {
        setActionMessage(lc(locale, "已翻译为本地语言", "Translated"));
      }
    } catch (error) {
      if (!automatic) {
        setActionMessage(error instanceof Error ? error.message : (lc(locale, "翻译失败", "Translation failed")));
      }
    } finally {
      translationRequestRef.current = null;
      setTranslating(false);
    }
  }

  async function translatePost() {
    if (translating) return;
    if (translated) {
      setTitleText(post.title);
      setContentHtml(post.content);
      setTranslated(false);
      setActionMessage("");
      return;
    }
    await loadPostTranslation();
  }

  async function togglePostLike() {
    if (actionLoading || !requireForumAction()) return;
    const next = !liked;
    setLiked(next);
    setLikes((current) => Math.max(0, current + (next ? 1 : -1)));
    setActionLoading("like");
    setActionMessage("");
    try {
      const response = await fetch("/api/forum/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "post", target_id: post.id, liked: next }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
    } catch (error) {
      setLiked(!next);
      setLikes((current) => Math.max(0, current + (next ? -1 : 1)));
      setActionMessage(error instanceof Error ? error.message : (lc(locale, "推荐失败", "Recommend failed")));
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleBookmark() {
    if (actionLoading || !requireForumAction()) return;
    const next = !bookmarked;
    setBookmarked(next);
    setActionLoading("bookmark");
    setActionMessage("");
    try {
      const response = await fetch("/api/forum/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, bookmarked: next }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
    } catch (error) {
      setBookmarked(!next);
      setActionMessage(error instanceof Error ? error.message : (lc(locale, "收藏失败", "Bookmark failed")));
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleFollow() {
    if (actionLoading || !requireForumAction()) return;
    const next = !following;
    setFollowing(next);
    setActionLoading("follow");
    setActionMessage("");
    try {
      const response = await fetch("/api/forum/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, following: next }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
    } catch (error) {
      setFollowing(!next);
      setActionMessage(error instanceof Error ? error.message : (lc(locale, "关注失败", "Follow failed")));
    } finally {
      setActionLoading(null);
    }
  }

  function scrollToReplyBox() {
    document.getElementById("mobile-forum-reply")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyMobileLink() {
    const url = getMobileForumThreadUrl(locale, post.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: titleText, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage(lc(locale, "移动端链接已复制", "Mobile link copied"));
    } catch {
      setShareMessage(url);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#2D6A4F]/60 bg-[#0e1f2e] shadow-lg shadow-black/25">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0e1f2e]/95 p-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[13px] font-black text-slate-300">
            {lc(locale, "返回社区", "Back")}
          </button>
          <span className={`rounded-full border px-2 py-1 text-[12px] font-black ${
            forumSignedIn ? "border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]" : "border-white/10 bg-white/[0.04] text-slate-400"
          }`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <article className="p-3">
        <p className="text-[13px] font-black text-[#FFD700]">
          {post.categoryIcon} {getForumPostCategoryName(post, locale)}
        </p>
        <h1 className="mt-1 text-xl font-black leading-6 text-white">{titleText}</h1>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] font-bold text-slate-400">
          <span>@{post.authorName}</span>
          <span>·</span>
          <span>{formatForumTime(post.lastActivityAt, locale)}</span>
          <span>·</span>
          <span>{lc(locale, "浏览", "Views")} {formatCompactCount(post.viewCount + 1)}</span>
          <span>·</span>
          <span>{lc(locale, "推荐", "Recommend")} {formatCompactCount(likes)}</span>
          <span>·</span>
          <span>{lc(locale, "回复", "Replies")} {formatCompactCount(post.replyCount)}</span>
        </div>

        <div className="hidden">
          <MobileForumActionButton
            icon={translating ? Loader2 : Languages}
            label={translated ? (lc(locale, "原文", "Original")) : (lc(locale, "翻译", "Translate"))}
            onClick={translatePost}
            active={translated}
            primary
            loading={translating}
          />
          <MobileForumActionButton icon={Share2} label={lc(locale, "分享", "Share")} onClick={copyMobileLink} />
          <MobileForumActionButton
            icon={Bookmark}
            label={bookmarked ? (lc(locale, "已收藏", "Saved")) : (lc(locale, "收藏", "Save"))}
            onClick={toggleBookmark}
            active={bookmarked}
            loading={actionLoading === "bookmark"}
          />
          <MobileForumActionButton
            icon={Bell}
            label={following ? (lc(locale, "已关注", "Following")) : (lc(locale, "关注", "Follow"))}
            onClick={toggleFollow}
            active={following}
            loading={actionLoading === "follow"}
          />
          <MobileForumActionButton
            icon={ThumbsUp}
            label={`${lc(locale, "推荐", "Recommend")} ${formatCompactCount(likes)}`}
            onClick={togglePostLike}
            active={liked}
            loading={actionLoading === "like"}
          />
          <MobileForumActionButton icon={Reply} label={lc(locale, "回复", "Reply")} onClick={scrollToReplyBox} />
          <MobileForumActionButton
            icon={Coins}
            label={lc(locale, "打赏", "Tip")}
            onClick={() => {
              if (!forumSignedIn) {
                redirectToMobileLogin(locale);
                return;
              }
              setRewardTarget({ postId: post.id, authorName: post.authorName, authorBalance: post.authorBalance });
            }}
            reward
          />
          <MobileForumActionButton
            icon={Flag}
            label={lc(locale, "举报", "Report")}
            onClick={() => {
              if (!forumSignedIn) {
                redirectToMobileLogin(locale);
                return;
              }
              setReportTarget({ postId: post.id, label: titleText });
            }}
          />
        </div>
        {(shareMessage || actionMessage) && (
          <p className="mt-1.5 line-clamp-2 text-[12px] font-bold text-[#FFD700]">{shareMessage || actionMessage}</p>
        )}

        <div className="mt-3 rounded-lg border border-white/10 bg-[#081120]/75 p-3">
          <ForumHtml html={contentHtml || (lc(locale, "暂无正文", "No content yet"))} className="mobile-forum-content text-[15px] leading-6 text-slate-200" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {needsForumTranslation && (
            <MobileForumActionButton
              icon={translating ? Loader2 : Languages}
              label={translated ? (lc(locale, "原贴", "Original")) : (lc(locale, "翻译", "Translate"))}
              onClick={translatePost}
              active={translated}
              primary
              compact
              loading={translating}
            />
          )}
          <MobileForumActionButton icon={Share2} label={lc(locale, "分享", "Share")} onClick={copyMobileLink} compact />
          <MobileForumActionButton
            icon={Bookmark}
            label={bookmarked ? (lc(locale, "已收藏", "Saved")) : (lc(locale, "收藏", "Save"))}
            onClick={toggleBookmark}
            active={bookmarked}
            compact
            loading={actionLoading === "bookmark"}
          />
          <MobileForumActionButton
            icon={Bell}
            label={following ? (lc(locale, "已关注", "Following")) : (lc(locale, "关注", "Follow"))}
            onClick={toggleFollow}
            active={following}
            compact
            loading={actionLoading === "follow"}
          />
          <MobileForumActionButton
            icon={ThumbsUp}
            label={`${lc(locale, "推荐", "Like")} ${formatCompactCount(likes)}`}
            onClick={togglePostLike}
            active={liked}
            compact
            loading={actionLoading === "like"}
          />
          <MobileForumActionButton icon={Reply} label={lc(locale, "回复", "Reply")} onClick={scrollToReplyBox} compact />
          <MobileForumActionButton
            icon={Coins}
            label={lc(locale, "打赏", "Tip")}
            onClick={() => {
              if (!forumSignedIn) {
                redirectToMobileLogin(locale);
                return;
              }
              setRewardTarget({ postId: post.id, authorName: post.authorName, authorBalance: post.authorBalance });
            }}
            compact
            reward
          />
          <MobileForumActionButton
            icon={Flag}
            label={lc(locale, "举报", "Report")}
            onClick={() => {
              if (!forumSignedIn) {
                redirectToMobileLogin(locale);
                return;
              }
              setReportTarget({ postId: post.id, label: titleText });
            }}
            compact
          />
        </div>
      </article>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-black text-white">{lc(locale, "全部回复", "Replies")}</h2>
          <span className="text-[12px] font-bold text-slate-500">{formatCompactCount(post.replyCount)} {lc(locale, "条", "")}</span>
        </div>
        {replies.length > 0 ? (
          <div className="grid gap-1.5">
            {replies.map((reply, index) => (
              <ForumReplyRow
                key={reply.id}
                locale={locale}
                postId={post.id}
                reply={reply}
                floor={index + 2}
                canPersistActions={canPersistActions}
                isLoggedIn={isLoggedIn}
                onNeedActionMessage={setActionMessage}
                onReply={scrollToReplyBox}
                onReward={(target) => setRewardTarget(target)}
                onReport={(target) => setReportTarget(target)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-5 text-center text-[13px] font-bold text-slate-500">
            {lc(locale, "还没有回复", "No replies yet")}
          </div>
        )}
      </div>

      <ForumReplyComposer
        locale={locale}
        postId={post.id}
        canPersistActions={canPersistActions}
        onReply={(reply) => setReplies((current) => [...current, reply])}
      />
      {rewardTarget && (
        <MobileForumRewardModal
          locale={locale}
          target={rewardTarget}
          canPersistActions={canPersistActions}
          onClose={() => setRewardTarget(null)}
          onDone={() => {
            setRewardTarget(null);
            setActionMessage(lc(locale, "打赏成功", "Tip sent"));
          }}
        />
      )}
      {reportTarget && (
        <MobileForumReportModal
          locale={locale}
          target={reportTarget}
          canPersistActions={canPersistActions}
          onClose={() => setReportTarget(null)}
          onDone={() => {
            setReportTarget(null);
            setActionMessage(lc(locale, "举报已提交", "Report submitted"));
          }}
        />
      )}
    </section>
  );
}

function ForumReplyRow({
  locale,
  postId,
  reply,
  floor,
  canPersistActions,
  isLoggedIn,
  onNeedActionMessage,
  onReply,
  onReward,
  onReport,
}: {
  locale: string;
  postId: number;
  reply: MobileForumReply;
  floor: number;
  canPersistActions: boolean;
  isLoggedIn: boolean;
  onNeedActionMessage: (message: string) => void;
  onReply: () => void;
  onReward: (target: ForumRewardTarget) => void;
  onReport: (target: ForumReportTarget) => void;
}) {
  const [contentHtml, setContentHtml] = useState(reply.content);
  const [translated, setTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [liked, setLiked] = useState(reply.isLiked);
  const [likes, setLikes] = useState(reply.likeCount);
  const [loading, setLoading] = useState(false);
  const translationRequestRef = useRef<string | null>(null);
  // Mirror the post-level gate: only foreign-language replies get auto-translated
  // and show the translate toggle.
  const needsReplyTranslation = needsTranslation(reply.content, getForumTargetLang(locale));

  useEffect(() => {
    setContentHtml(reply.content);
    setTranslated(false);
    setTranslating(false);
    setLiked(reply.isLiked);
    setLikes(reply.likeCount);
    setLoading(false);
  }, [reply.id, reply.content, reply.isLiked, reply.likeCount]);

  useEffect(() => {
    if ((!isLoggedIn && !canPersistActions) || !needsReplyTranslation) return;
    void loadReplyTranslation(true);
  }, [canPersistActions, isLoggedIn, needsReplyTranslation, locale, reply.id]);

  function requireReplyAction() {
    if (canPersistActions) return true;
    if (!isLoggedIn) {
      redirectToMobileLogin(locale);
      return false;
    }
    onNeedActionMessage(lc(locale, "线上登录后可操作", "Sign in online to use this action."));
    return false;
  }

  function requireReplyTranslateAction() {
    if (isLoggedIn || canPersistActions) return true;
    redirectToMobileLogin(locale);
    return false;
  }

  async function loadReplyTranslation(automatic = false) {
    const requestKey = `${reply.id}:${getForumTargetLang(locale)}`;
    if (translationRequestRef.current === requestKey) return;
    if (!isLoggedIn && !canPersistActions) {
      if (!automatic) requireReplyTranslateAction();
      return;
    }
    translationRequestRef.current = requestKey;
    setTranslating(true);
    try {
      const response = await fetch(getForumTranslateEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reply_content", id: reply.id, target_lang: getForumTargetLang(locale) }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
      const data = await response.json();
      setContentHtml(sanitizeClientForumHtml(String(data.translated ?? reply.content)));
      setTranslated(true);
      if (!automatic) {
        onNeedActionMessage(lc(locale, "回复已翻译", "Reply translated"));
      }
    } catch (error) {
      if (!automatic) {
        onNeedActionMessage(error instanceof Error ? error.message : (lc(locale, "翻译失败", "Translation failed")));
      }
    } finally {
      translationRequestRef.current = null;
      setTranslating(false);
    }
  }

  async function translateReply() {
    if (translating) return;
    if (translated) {
      setContentHtml(reply.content);
      setTranslated(false);
      return;
    }
    await loadReplyTranslation();
  }

  async function toggleReplyLike() {
    if (loading || !requireReplyAction()) return;
    const next = !liked;
    setLiked(next);
    setLikes((current) => Math.max(0, current + (next ? 1 : -1)));
    setLoading(true);
    try {
      const response = await fetch("/api/forum/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "reply", target_id: reply.id, liked: next }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
    } catch (error) {
      setLiked(!next);
      setLikes((current) => Math.max(0, current + (next ? -1 : 1)));
      onNeedActionMessage(error instanceof Error ? error.message : (lc(locale, "点赞失败", "Like failed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-black text-white">@{reply.authorName}</span>
        <span className="shrink-0 text-[11px] font-bold text-slate-500">#{floor} · {formatForumTime(reply.createdAt, locale)}</span>
      </div>
      <ForumHtml html={contentHtml} className="mobile-forum-content text-[14px] leading-5 text-slate-300" />
      <div className="mt-2 flex flex-wrap gap-1">
        {needsReplyTranslation && (
          <MobileForumActionButton
            icon={translating ? Loader2 : Languages}
            label={translated ? (lc(locale, "原贴", "Original")) : (lc(locale, "翻译", "Translate"))}
            onClick={translateReply}
            active={translated}
            compact
            loading={translating}
          />
        )}
        <MobileForumActionButton icon={Reply} label={lc(locale, "回复", "Reply")} onClick={onReply} compact />
        <MobileForumActionButton
          icon={Coins}
          label={lc(locale, "打赏", "Tip")}
          onClick={() => {
            if (!isLoggedIn && !canPersistActions) {
              redirectToMobileLogin(locale);
              return;
            }
            onReward({ postId, replyId: reply.id, authorName: reply.authorName, authorBalance: reply.authorBalance });
          }}
          compact
          reward
        />
        <MobileForumActionButton
          icon={ThumbsUp}
          label={formatCompactCount(likes)}
          onClick={toggleReplyLike}
          active={liked}
          compact
          loading={loading}
        />
        <MobileForumActionButton
          icon={Flag}
          label={lc(locale, "举报", "Report")}
          onClick={() => {
            if (!isLoggedIn && !canPersistActions) {
              redirectToMobileLogin(locale);
              return;
            }
            onReport({ postId, replyId: reply.id, label: `#${floor} @${reply.authorName}` });
          }}
          compact
        />
      </div>
      <button
        type="button"
        onClick={() => {
          if (!isLoggedIn && !canPersistActions) {
            redirectToMobileLogin(locale);
            return;
          }
          onReport({ postId, replyId: reply.id, label: `#${floor} @${reply.authorName}` });
        }}
        className="hidden"
      >
        {lc(locale, "举报此回复", "Report reply")}
      </button>
    </div>
  );
}

function MobileForumActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  primary = false,
  reward = false,
  compact = false,
  loading = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
  reward?: boolean;
  compact?: boolean;
  loading?: boolean;
}) {
  const stateClass = reward
    ? "border-[#FFD700]/50 bg-[#FFD700] text-[#081120]"
    : primary || active
      ? "border-[#FFD700]/45 bg-[#FFD700]/15 text-[#FFD700]"
      : "border-white/10 bg-white/[0.04] text-slate-300";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
       className={`flex min-w-0 items-center justify-center gap-0.5 rounded-md border font-black leading-none disabled:opacity-60 ${
        compact ? "h-5 px-1 text-[10px]" : "h-6 px-1.5 text-[11px]"
      } ${stateClass}`}
    >
      <Icon className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} shrink-0 ${loading ? "animate-spin" : ""}`} />
      <span className="min-w-0 max-w-[3.25rem] truncate">{label}</span>
    </button>
  );
}

function parseForumGcAmount(value: string) {
  const normalized = value.trim().toUpperCase().replace(/,/g, "");
  const multiplier = normalized.endsWith("B") ? 1_000_000_000 : normalized.endsWith("M") ? 1_000_000 : normalized.endsWith("K") ? 1_000 : 1;
  const numberText = normalized.replace(/[BMK]$/, "");
  const parsed = Number(numberText);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * multiplier);
}

function MobileForumRewardModal({
  locale,
  target,
  canPersistActions,
  onClose,
  onDone,
}: {
  locale: string;
  target: ForumRewardTarget;
  canPersistActions: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const maxAmount = getMaxAmount(target.authorBalance);
  const presets = Array.from(new Set([10_000, 100_000, 1_000_000, ...makePresets(maxAmount)].filter((amount) => amount > 0 && amount <= maxAmount))).slice(0, 5);
  const [selectedAmount, setSelectedAmount] = useState(presets[0] ?? 10_000);
  const [customAmount, setCustomAmount] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const amount = customAmount.trim() ? Math.min(maxAmount, parseForumGcAmount(customAmount)) : selectedAmount;

  async function submit() {
    if (loading) return;
    if (!canPersistActions) {
      setMessage(lc(locale, "线上登录后可操作", "Sign in online to use this action."));
      return;
    }
    if (amount <= 0) {
      setMessage(lc(locale, "请输入有效 GC 数量", "Enter a valid GC amount"));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/forum/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: target.postId,
          reply_id: target.replyId,
          gc_amount: amount,
          reason: reason.trim() || null,
        }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (lc(locale, "打赏失败", "Tip failed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#FFD700]/25 bg-[#0d1a2b] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-[#FFD700]">{lc(locale, "打赏 GC", "Tip GC")}</p>
            <p className="mt-0.5 truncate text-[15px] font-black text-white">@{target.authorName}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-3">
          <div className="grid grid-cols-5 gap-1.5">
            {presets.map((amountOption) => (
              <button
                key={amountOption}
                type="button"
                onClick={() => {
                  setSelectedAmount(amountOption);
                  setCustomAmount("");
                }}
                className={`h-8 rounded-lg border text-[12px] font-black ${
                  !customAmount && selectedAmount === amountOption
                    ? "border-[#FFD700]/50 bg-[#FFD700]/15 text-[#FFD700]"
                    : "border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                {formatBalance(amountOption)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_4.75rem] gap-1.5">
            <input
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              placeholder={lc(locale, "自定义金额，例如 10K", "Custom, e.g. 10K")}
              className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#081120] px-3 text-[13px] font-bold text-white outline-none placeholder:text-slate-600"
            />
            <span className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-[12px] font-black text-slate-400">
              {formatBalance(amount)} GC
            </span>
          </div>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={lc(locale, "留言，可不填", "Message, optional")}
            className="h-9 rounded-lg border border-white/10 bg-[#081120] px-3 text-[13px] font-bold text-white outline-none placeholder:text-slate-600"
          />
          {message && <p className="text-[12px] font-bold text-red-300">{message}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading || amount <= 0}
            className="h-10 rounded-lg bg-[#FFD700] text-[14px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500"
          >
            {loading ? (lc(locale, "提交中", "Sending")) : (lc(locale, "确认打赏", "Send Tip"))}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileForumReportModal({
  locale,
  target,
  canPersistActions,
  onClose,
  onDone,
}: {
  locale: string;
  target: ForumReportTarget;
  canPersistActions: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const reasons = [
    { value: "spam", zh: "广告", en: "Spam" },
    { value: "abuse", zh: "辱骂", en: "Abuse" },
    { value: "misleading", zh: "误导", en: "Misleading" },
    { value: "illegal", zh: "违规", en: "Illegal" },
    { value: "other", zh: "其他", en: "Other" },
  ];
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    if (!canPersistActions) {
      setMessage(lc(locale, "线上登录后可操作", "Sign in online to use this action."));
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/forum/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: target.postId,
          reply_id: target.replyId,
          reason,
          detail: detail.trim() || null,
        }),
      });
      if (!response.ok) throw new Error(await readForumApiError(response));
      onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (lc(locale, "举报失败", "Report failed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a2b] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-red-300">{lc(locale, "举报内容", "Report")}</p>
            <p className="mt-0.5 truncate text-[15px] font-black text-white">{target.label}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 p-3">
          <div className="grid grid-cols-5 gap-1">
            {reasons.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setReason(item.value)}
                className={`h-8 rounded-lg border text-[12px] font-black ${
                  reason === item.value ? "border-red-300/50 bg-red-300/15 text-red-200" : "border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                {locale === "zh" ? item.zh : item.en}
              </button>
            ))}
          </div>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            rows={3}
            placeholder={lc(locale, "补充说明，可不填", "Details, optional")}
            className="min-h-20 resize-none rounded-lg border border-white/10 bg-[#081120] px-3 py-2 text-[13px] font-bold text-white outline-none placeholder:text-slate-600"
          />
          {message && <p className="text-[12px] font-bold text-red-300">{message}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="h-10 rounded-lg bg-red-300 text-[14px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500"
          >
            {loading ? (lc(locale, "提交中", "Submitting")) : (lc(locale, "提交举报", "Submit Report"))}
          </button>
        </div>
      </div>
    </div>
  );
}

function ForumReplyComposer({
  locale,
  postId,
  canPersistActions,
  onReply,
}: {
  locale: string;
  postId: number;
  canPersistActions: boolean;
  onReply: (reply: MobileForumReply) => void;
}) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!value.trim() || loading) return;
    if (!canPersistActions) {
      setMessage(lc(locale, "当前是移动端预览，线上登录后可回复", "Preview mode. Sign in online to reply."));
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/forum/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, content: value.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "reply_failed");
      onReply({
        id: data.id ?? Date.now(),
        authorId: null,
        content: value.trim(),
        likeCount: 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
        authorName: lc(locale, "我", "Me"),
        authorAvatarUrl: null,
        authorBalance: 0,
      });
      setValue("");
      setMessage(lc(locale, "回复成功", "Reply posted"));
    } catch {
      setMessage(lc(locale, "回复失败", "Reply failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="mobile-forum-reply" className="border-t border-white/10 bg-[#081120]/70 p-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={lc(locale, "写下你的回复", "Write a reply")}
        rows={3}
        className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-[#0d1a2b] px-3 py-2 text-[15px] leading-5 text-white outline-none placeholder:text-slate-600"
      />
      <div className="mt-1.5 grid grid-cols-[1fr_4.25rem] gap-1.5">
        <p className="min-w-0 truncate text-[12px] font-bold text-slate-500">
          {message || (lc(locale, "移动端内联回复", "Mobile inline reply"))}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || loading}
          className="h-8 rounded-lg bg-[#FFD700] text-[13px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500"
        >
          {lc(locale, "发布", "Post")}
        </button>
      </div>
    </div>
  );
}

function getMobileForumThreadUrl(locale: string, postId: number) {
  const path = `/${locale}/m`;
  if (typeof window === "undefined") return `${path}?view=forum&thread=${postId}`;
  const url = new URL(path, window.location.origin);
  const current = new URLSearchParams(window.location.search);
  const preview = current.get("preview");
  if (preview) url.searchParams.set("preview", preview);
  url.searchParams.set("view", "forum");
  url.searchParams.set("thread", String(postId));
  return url.toString();
}

function getForumTranslateEndpoint() {
  if (typeof window === "undefined") return "/api/forum/translate";
  const preview = new URLSearchParams(window.location.search).get("preview");
  return preview === "app" ? "/api/forum/translate?preview=app" : "/api/forum/translate";
}

function ForumHtml({ html, className }: { html: string; className: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ForumCategoryGrid({ locale, categories }: { locale: string; categories: MobileForumCategory[] }) {
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-6 text-center text-[15px] font-bold text-slate-500">
        {lc(locale, "暂无板块", "No boards")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {categories.map((category) => {
        const desc = locale === "zh" ? (category.descriptionZh ?? category.description ?? "") : (category.description ?? "");
        return (
          <div
            key={category.id}
            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-2.5"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFD700]/10 text-[15px]">{category.icon}</span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-black leading-4 text-white">{getForumCategoryName(category, locale)}</span>
                <span className="mt-0.5 block text-[12px] font-bold leading-4 text-slate-500">
                  {formatCompactCount(category.postCount)} {lc(locale, "帖", "posts")}
                </span>
              </span>
            </span>
            {desc && <span className="mt-1.5 line-clamp-2 block text-[12px] leading-4 text-slate-500">{desc}</span>}
          </div>
        );
      })}
    </div>
  );
}

function MobileTopupView({
  locale,
  isLoggedIn,
  canPersistActions,
  balance,
  refreshBalance,
  onOpenView,
}: {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  balance: number;
  refreshBalance: () => Promise<void>;
  onOpenView: (view: MobileView) => void;
}) {
  const zh = locale === "zh";
  const [selectedId, setSelectedId] = useState<string | null>(TOPUP_PACKAGES[2]?.id ?? null);
  const [payMethod, setPayMethod] = useState<MobilePayMethod>("paddle");
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usdtPaymentId, setUsdtPaymentId] = useState<string | null>(null);
  const [usdtAddress, setUsdtAddress] = useState<string | null>(null);
  const [usdtPayAmount, setUsdtPayAmount] = useState<number | null>(null);
  const [usdtStatus, setUsdtStatus] = useState<"idle" | "pending" | "completed">("idle");
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [usdtMin, setUsdtMin] = useState<number>(1.99);
  const usdtPollRef = useRef<number | null>(null);
  const verifiedCheckoutRef = useRef<string | null>(null);
  const selected = TOPUP_PACKAGES.find((pkg) => pkg.id === selectedId) ?? null;
  const selectedTotal = selected ? getTopupPackageTotal(selected) : 0;
  // true when the selected package's USDT price is below NOWPayments minimum
  const usdtTooSmall = !!selected && selected.priceUsdt < usdtMin;

  // Paddle.js readiness (mirrors the desktop topup page). Card payments go through
  // Paddle — the same gateway the desktop site uses — not Stripe.
  const paddleReady = useRef(false);
  // Paddle client token + sandbox flag resolved at runtime (build-time value as
  // fallback). NEXT_PUBLIC_* is inlined into the bundle at build time, so a token
  // added to Vercel afterwards is invisible here — /api/topup/paddle-config reads
  // the live value from the server env on every request.
  const paddleTokenRef   = useRef(PADDLE_CLIENT_TOKEN);
  const paddleSandboxRef = useRef(process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true");
  const paddleConfigRef  = useRef<Promise<void> | null>(null);
  function loadPaddleConfig(): Promise<void> {
    if (paddleConfigRef.current) return paddleConfigRef.current;
    paddleConfigRef.current = fetch("/api/topup/paddle-config")
      .then((r) => r.json())
      .then((d: { token?: string; sandbox?: boolean }) => {
        if (typeof d?.token === "string" && d.token) paddleTokenRef.current = d.token;
        if (typeof d?.sandbox === "boolean") paddleSandboxRef.current = d.sandbox;
      })
      .catch(() => { /* keep build-time fallback */ });
    return paddleConfigRef.current;
  }
  function initPaddle() {
    if (paddleReady.current || typeof window === "undefined" || !window.Paddle) return;
    if (!paddleTokenRef.current) return; // surfaced as an error when the user taps Pay
    if (paddleSandboxRef.current && window.Paddle.Environment) {
      window.Paddle.Environment.set("sandbox");
    }
    window.Paddle.Initialize({
      token: paddleTokenRef.current,
      // GC is credited by the Paddle webhook (source of truth); this callback only
      // refreshes the UI once the overlay reports completion.
      eventCallback: (event) => {
        if (event.name !== "checkout.completed") return;
        const gc = Number(event.data?.custom_data?.gc_amount ?? 0) || selectedTotal;
        setSuccess(zh ? `充值成功：${formatBalance(gc)} GC` : `Top-up successful: ${formatBalance(gc)} GC`);
        void refreshBalance();
      },
    });
    paddleReady.current = true;
  }

  // Prefetch the Paddle token so initPaddle (Script onLoad) can initialise early.
  useEffect(() => { void loadPaddleConfig(); }, []);

  useEffect(() => {
    setPayErr(null);
    setSuccess(null);
    setUsdtPaymentId(null);
    setUsdtAddress(null);
    setUsdtPayAmount(null);
    setUsdtStatus("idle");
    if (usdtPollRef.current) {
      window.clearInterval(usdtPollRef.current);
      usdtPollRef.current = null;
    }
  }, [selectedId, payMethod]);

  useEffect(() => () => {
    if (usdtPollRef.current) window.clearInterval(usdtPollRef.current);
  }, []);

  // Fetch the real NOWPayments minimum for USDT TRC-20 once on mount
  useEffect(() => {
    fetch("/api/topup/usdt-min")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { minAmount?: number } | null) => {
        if (d && typeof d.minAmount === "number" && d.minAmount > 0) setUsdtMin(d.minAmount);
      })
      .catch(() => {});
  }, []);

  // If the selected package is below the minimum, silently switch back to card payment
  useEffect(() => {
    if (usdtTooSmall && payMethod === "usdt") setPayMethod("paddle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdtTooSmall]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const cancelled = url.searchParams.get("cancelled");
    if (cancelled === "1") {
      setPayErr(zh ? "银行卡支付已取消。" : "Card payment was cancelled.");
      url.searchParams.delete("cancelled");
      window.history.replaceState(null, "", url);
    }
    if (!sessionId || verifiedCheckoutRef.current === sessionId) return;

    verifiedCheckoutRef.current = sessionId;
    let active = true;
    setPaying(true);
    fetch(`/api/topup/verify?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.paid) {
          throw new Error(data.error ?? (zh ? "支付尚未完成。" : "Payment is not complete."));
        }
        if (!active) return;
        setSuccess(zh
          ? `充值成功：${formatBalance(Number(data.gcAmount ?? 0))} GC`
          : `Top-up successful: ${formatBalance(Number(data.gcAmount ?? 0))} GC`);
        await refreshBalance();
      })
      .catch((error) => {
        if (!active) return;
        setPayErr(error instanceof Error ? error.message : (zh ? "支付验证失败。" : "Payment verification failed."));
      })
      .finally(() => {
        if (active) setPaying(false);
      });

    url.searchParams.delete("session_id");
    window.history.replaceState(null, "", url);
    return () => {
      active = false;
    };
  }, [refreshBalance, zh]);

  function requireRealLogin() {
    if (canPersistActions) return true;
    setPayErr(isLoggedIn
      ? (zh ? "当前是移动端预览状态，请用正式登录后再充值。" : "This is preview mode. Please sign in for real before topping up.")
      : (zh ? "请先登录移动端账号。" : "Please sign in first."));
    return false;
  }

  async function handleCardCheckout() {
    if (!selected || paying || !requireRealLogin()) return;
    setPaying(true);
    setPayErr(null);
    // Resolve the Paddle client token at runtime so card payment works even when
    // the token was added to Vercel after this bundle was built.
    await loadPaddleConfig();
    if (!paddleTokenRef.current) {
      setPayErr(zh ? "银行卡支付暂未开放，请选择其他方式。" : "Card payment is unavailable, please use another method.");
      setPaying(false);
      return;
    }
    // Paddle.js loads async (afterInteractive); a fast tap can beat it. Wait briefly.
    const ready = await waitForPaddle();
    initPaddle();
    if (!ready || !paddleReady.current || !window.Paddle) {
      setPayErr(zh ? "支付组件加载中，请稍后重试。" : "Checkout is loading, please retry in a moment.");
      setPaying(false);
      return;
    }
    try {
      const response = await fetch("/api/topup/paddle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id, locale }),
      });
      const data = await response.json();
      if (!response.ok || !data.transactionId) {
        setPayErr(data.error ?? (zh ? "创建订单失败，请重试。" : "Failed to create order."));
        setPaying(false);
        return;
      }
      // Force the overlay language to match the site locale. The cast keeps the
      // global Paddle type identical to the desktop declaration (avoids TS2717).
      window.Paddle.Checkout.open({
        transactionId: data.transactionId,
        settings: { locale: locale === "zh" ? "zh-Hans" : locale === "es" ? "es" : locale === "fr" ? "fr" : locale === "de" ? "de" : "en" },
      } as { transactionId: string });
      setPaying(false); // overlay is open; release the button
    } catch {
      setPayErr(zh ? "网络错误，请重试。" : "Network error, please retry.");
      setPaying(false);
    }
  }

  async function createPayPalOrder() {
    if (!selected || !requireRealLogin()) throw new Error("not ready");
    setPayErr(null);
    try {
      const response = await fetch("/api/topup/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.orderID) {
        const message = data.error ?? "Create order failed";
        setPayErr(zh ? `创建 PayPal 订单失败：${message}` : `PayPal order failed: ${message}`);
        throw new Error(message);
      }
      return data.orderID as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPayErr((current) => current ?? (zh ? `PayPal 网络错误：${message}` : `PayPal network error: ${message}`));
      throw error;
    }
  }

  async function capturePayPalOrder(approval: { orderID: string }) {
    if (!selected || !approval.orderID) return;
    setPaying(true);
    setPayErr(null);
    try {
      const response = await fetch("/api/topup/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: approval.orderID, packageId: selected.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        setPayErr(result.error ?? (zh ? "PayPal 支付确认失败，请联系客服。" : "PayPal capture failed. Please contact support."));
        return;
      }
      await refreshBalance();
      setSuccess(zh ? `充值成功：${formatBalance(result.gcAmount ?? selectedTotal)} GC` : `Top-up successful: ${formatBalance(result.gcAmount ?? selectedTotal)} GC`);
    } catch {
      setPayErr(zh ? "网络错误，请重试。" : "Network error, please retry.");
    } finally {
      setPaying(false);
    }
  }

  function startUsdtPolling(paymentId: string) {
    if (usdtPollRef.current) window.clearInterval(usdtPollRef.current);
    usdtPollRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/topup/usdt/status/${paymentId}`, { cache: "no-store" });
        const data = await response.json();
        if (response.ok && data.status === "completed") {
          if (usdtPollRef.current) window.clearInterval(usdtPollRef.current);
          usdtPollRef.current = null;
          setUsdtStatus("completed");
          setSuccess(zh
            ? `充值成功：${formatBalance(data.gcAmount ?? selectedTotal)} GC`
            : `Top-up successful: ${formatBalance(data.gcAmount ?? selectedTotal)} GC`);
          await refreshBalance();
        }
      } catch {
        // Keep polling; a temporary network failure should not interrupt payment detection.
      }
    }, 15_000);
  }

  async function createUsdtOrder() {
    if (!selected || paying || !requireRealLogin()) return;
    setPaying(true);
    setPayErr(null);
    try {
      const response = await fetch("/api/topup/usdt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selected.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.paymentId || !data.payAddress || !data.payAmount) {
        setPayErr(data.error ?? (zh ? "创建加密货币订单失败，请重试。" : "Failed to create crypto payment order."));
        return;
      }
      setUsdtPaymentId(String(data.paymentId));
      setUsdtAddress(String(data.payAddress));
      setUsdtPayAmount(Number(data.payAmount));
      setUsdtStatus("pending");
      startUsdtPolling(String(data.paymentId));
    } catch {
      setPayErr(zh ? "网络错误，请重试。" : "Network error, please retry.");
    } finally {
      setPaying(false);
    }
  }

  async function checkUsdtPayment() {
    if (!usdtPaymentId || paying) return;
    setPaying(true);
    setPayErr(null);
    try {
      const response = await fetch(`/api/topup/usdt/status/${usdtPaymentId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setPayErr(data.error ?? (zh ? "查询付款状态失败，请重试。" : "Failed to check payment status."));
        return;
      }
      if (data.status !== "completed") {
        setPayErr(zh ? "暂未检测到到账，通常需要 1-5 分钟。" : "Payment not detected yet. It usually takes 1-5 minutes.");
        return;
      }
      if (usdtPollRef.current) window.clearInterval(usdtPollRef.current);
      usdtPollRef.current = null;
      setUsdtStatus("completed");
      setSuccess(zh
        ? `充值成功：${formatBalance(data.gcAmount ?? selectedTotal)} GC`
        : `Top-up successful: ${formatBalance(data.gcAmount ?? selectedTotal)} GC`);
      await refreshBalance();
    } catch {
      setPayErr(zh ? "查询付款状态失败，请重试。" : "Failed to check payment status.");
    } finally {
      setPaying(false);
    }
  }

  function copyText(text: string, key: "address" | "amount") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    });
  }

  return (
    <div className="grid gap-3 pb-2">
      <section className="sticky top-0 z-20 -mx-3 border-b border-white/10 bg-[#081120]/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button type="button" onClick={() => onOpenView("mine")} className="h-8 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[12px] font-black text-slate-300">
            {zh ? "返回" : "Back"}
          </button>
          <div className="min-w-0 text-center">
            <h1 className="text-[16px] font-black leading-5 text-white">{zh ? "充值 GC" : "Top Up GC"}</h1>
            <p className="mt-0.5 text-[11px] font-bold text-[#FFD700]">{formatBalance(balance)} GC</p>
          </div>
          <span className="w-[3.25rem]" />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-black text-white">{zh ? "选择充值套餐" : "Choose Package"}</p>
            <p className="mt-1 text-[12px] leading-4 text-slate-500">
              {zh ? "GC 是平台虚拟娱乐积分，不具备现金价值。" : "GC is virtual entertainment points with no cash value."}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-black ${canPersistActions ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-200"}`}>
            {canPersistActions ? (zh ? "已登录" : "Signed in") : (zh ? "预览" : "Preview")}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {TOPUP_PACKAGES.map((pkg) => {
            const active = selectedId === pkg.id;
            const total = getTopupPackageTotal(pkg);
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedId(pkg.id)}
                className={`relative min-h-[6.25rem] rounded-lg border p-2 text-left active:bg-white/[0.05] ${
                  active ? "border-[#FFD700]/70 bg-[#FFD700]/10" : "border-white/10 bg-white/[0.035]"
                }`}
              >
                {(pkg.popular || pkg.best) && (
                  <span className="absolute right-2 top-2 rounded-full bg-[#FFD700] px-1.5 py-0.5 text-[10px] font-black text-[#081120]">
                    {pkg.best ? (zh ? "超值" : "Best") : (zh ? "热门" : "Hot")}
                  </span>
                )}
                <span className="block text-[17px] font-black leading-5 text-white">{zh ? pkg.labelZh : pkg.labelEn}</span>
                {pkg.bonus > 0 && <span className="mt-1 inline-block rounded-full border border-emerald-300/25 bg-emerald-300/10 px-1.5 py-0.5 text-[10px] font-black text-emerald-200">+{pkg.bonus}%</span>}
                <span className="mt-2 block text-[12px] font-bold text-slate-500">{zh ? "实得" : "Total"} {formatBalance(total)} GC</span>
                <span className="mt-1 block text-[16px] font-black text-[#FFD700]">{pkg.priceUsd}</span>
                <span className="text-[11px] font-bold text-slate-600">{pkg.priceCny}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        {/* Paddle.js — powers the card checkout overlay (same gateway as desktop topup) */}
        <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={initPaddle} />
        <p className="mb-2 text-[15px] font-black text-white">{zh ? "支付方式" : "Payment Method"}</p>
        <div className="grid grid-cols-3 gap-1.5">
          <MobilePayMethodButton active={payMethod === "paddle"} icon={CreditCard} label={zh ? "银行卡" : "Card"} onClick={() => setPayMethod("paddle")} />
          <MobilePayMethodButton active={payMethod === "paypal"} icon={CircleDollarSign} label="PayPal" onClick={() => setPayMethod("paypal")} />
          <MobilePayMethodButton
            active={payMethod === "usdt"}
            icon={Wallet}
            label="USDT"
            hint={usdtTooSmall ? (zh ? `最低 $${usdtMin.toFixed(2)}` : `Min $${usdtMin.toFixed(2)}`) : undefined}
            disabled={usdtTooSmall}
            onClick={() => setPayMethod("usdt")}
          />
        </div>

        {selected && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-slate-400">
              <span>{zh ? "本次获得" : "You receive"}</span>
              <span className="text-[15px] font-black text-[#FFD700]">{formatBalance(selectedTotal)} GC</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[12px] font-bold text-slate-500">
              <span>{zh ? "支付金额" : "Amount"}</span>
              <span>{selected.priceUsd} / {selected.priceUsdt.toFixed(2)} USDT</span>
            </div>
          </div>
        )}

        {payErr && (
          <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[12px] font-bold leading-4 text-rose-100">
            {payErr}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-[12px] font-bold leading-4 text-emerald-100">
            {success}
          </p>
        )}

        {payMethod === "paddle" && (
          <button
            type="button"
            onClick={handleCardCheckout}
            disabled={!selected || paying}
            className="mt-3 h-11 w-full rounded-lg bg-[#FFD700] text-[15px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500"
          >
            {paying ? (zh ? "创建订单中..." : "Creating order...") : (zh ? "银行卡支付" : "Pay by Card")}
          </button>
        )}

        {payMethod === "paypal" && (
          <div className="mt-3">
            {!PAYPAL_CLIENT_ID ? (
              <button
                type="button"
                onClick={() => setPayErr(zh ? "PayPal 前端 Client ID 尚未配置，请在环境变量 NEXT_PUBLIC_PAYPAL_CLIENT_ID 中添加后重新部署。" : "PayPal client ID is not configured. Add NEXT_PUBLIC_PAYPAL_CLIENT_ID and redeploy.")}
                className="h-11 w-full rounded-lg bg-[#FFD700] text-[15px] font-black text-[#081120]"
              >
                {zh ? "PayPal 暂未配置" : "PayPal unavailable"}
              </button>
            ) : selected ? (
              <PayPalScriptProvider
                options={{
                  clientId: PAYPAL_CLIENT_ID,
                  currency: "USD",
                  intent: "capture",
                  components: "buttons",
                  disableFunding: "paylater,card",
                }}
              >
                <div className="overflow-hidden rounded-lg">
                  <PayPalButtons
                    key={selected.id}
                    forceReRender={[selected.id]}
                    style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 44 }}
                    disabled={paying}
                    createOrder={createPayPalOrder}
                    onApprove={capturePayPalOrder}
                    onError={(error) => {
                      console.error("[Mobile PayPal onError]", error);
                      setPayErr((current) => current ?? (zh ? "PayPal 支付出错，请重试。" : "PayPal error, please retry."));
                    }}
                    onCancel={() => setPayErr(zh ? "PayPal 支付已取消。" : "PayPal payment cancelled.")}
                  />
                </div>
              </PayPalScriptProvider>
            ) : (
              <button type="button" disabled className="h-11 w-full rounded-lg bg-slate-700 text-[15px] font-black text-slate-500">
                {zh ? "请先选择套餐" : "Select a package first"}
              </button>
            )}
          </div>
        )}

        {payMethod === "usdt" && selected && (
          <div className="mt-3 grid gap-2 rounded-lg border border-[#26A17B]/30 bg-[#26A17B]/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-black text-[#26A17B]">{zh ? "加密货币付款" : "Crypto payment"}</p>
                <p className="mt-0.5 text-[12px] text-slate-400">USDT · TRON/TRC-20</p>
              </div>
              <span className="rounded-full border border-[#26A17B]/30 bg-[#26A17B]/10 px-2 py-1 text-[10px] font-black text-[#26A17B]">
                {zh ? "自动到账" : "Auto credit"}
              </span>
            </div>

            {usdtStatus === "idle" && (
              <>
                <div className="rounded-lg border border-white/10 bg-[#081120]/70 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-slate-500">{zh ? "应付金额" : "Amount"}</span>
                    <span className="text-[16px] font-black text-white">{selected.priceUsdt.toFixed(2)} <span className="text-[#26A17B]">USDT</span></span>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-slate-500">
                    {zh
                      ? "生成本次订单的专属 TRC-20 地址。转账后系统会自动识别到账，不需要填写 TxID。"
                      : "Generate a unique TRC-20 address. Payment is detected automatically; no TxID is required."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={createUsdtOrder}
                  disabled={paying}
                  className="h-11 rounded-lg bg-[#26A17B] text-[14px] font-black text-white disabled:bg-slate-700 disabled:text-slate-500"
                >
                  {paying ? (zh ? "正在生成..." : "Generating...") : (zh ? "生成专属付款地址" : "Generate payment address")}
                </button>
              </>
            )}

            {usdtStatus === "pending" && usdtAddress && usdtPayAmount != null && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
                    {zh ? "等待付款到账" : "Awaiting payment"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">{zh ? "通常 1-5 分钟" : "Usually 1-5 min"}</span>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#081120]/80 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500">{zh ? "精确转账金额" : "Exact amount"}</p>
                      <p className="mt-0.5 text-[17px] font-black text-white">{usdtPayAmount.toFixed(6)} <span className="text-[#26A17B]">USDT</span></p>
                    </div>
                    <button type="button" onClick={() => copyText(usdtPayAmount.toFixed(6), "amount")} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#26A17B]/30 px-2 text-[11px] font-black text-[#26A17B]">
                      <Copy className="h-3 w-3" />
                      {copied === "amount" ? (zh ? "已复制" : "Copied") : (zh ? "复制金额" : "Copy")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 rounded-lg border border-white/10 bg-[#081120]/80 p-2.5">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(usdtAddress)}&bgcolor=081120&color=26A17B&margin=1&format=png`}
                    alt="USDT TRC-20 payment address"
                    className="h-[5.5rem] w-[5.5rem] rounded-md border border-[#26A17B]/25"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-500">{zh ? "专属收款地址" : "Unique address"}</p>
                    <p className="mt-1 break-all font-mono text-[10px] leading-4 text-slate-300">{usdtAddress}</p>
                    <button type="button" onClick={() => copyText(usdtAddress, "address")} className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-md border border-[#26A17B]/30 px-2 text-[11px] font-black text-[#26A17B]">
                      <Copy className="h-3 w-3" />
                      {copied === "address" ? (zh ? "已复制" : "Copied") : (zh ? "复制地址" : "Copy address")}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] leading-4 text-amber-200/80">
                  {zh
                    ? "仅使用 TRON/TRC-20 网络，并转入上方精确金额。钱包需保留少量 TRX 支付网络费。"
                    : "Use TRON/TRC-20 only and send the exact amount. Keep a small TRX balance for network fees."}
                </p>

                <button
                  type="button"
                  onClick={checkUsdtPayment}
                  disabled={paying}
                  className="h-10 rounded-lg border border-[#26A17B]/40 bg-[#26A17B]/5 text-[13px] font-black text-[#26A17B] disabled:opacity-50"
                >
                  {paying ? (zh ? "查询中..." : "Checking...") : (zh ? "手动查询到账状态" : "Check payment status")}
                </button>
              </>
            )}

            {usdtStatus === "completed" && (
              <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-3 text-center">
                <p className="text-[14px] font-black text-emerald-100">{zh ? "付款已到账" : "Payment received"}</p>
                <p className="mt-1 text-[11px] text-emerald-200/70">{zh ? "GC 余额已经自动更新" : "Your GC balance has been updated automatically."}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {!isLoggedIn && (
        <Link href={`/${locale}/m/login?next=${encodeURIComponent("/m?view=topup")}`} className="flex h-11 items-center justify-center rounded-lg bg-[#FFD700] text-[15px] font-black text-[#081120]">
          {zh ? "先登录再充值" : "Sign in to top up"}
        </Link>
      )}
    </div>
  );
}

function MobilePayMethodButton({
  active,
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border text-[12px] font-black ${
        disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
          : active
          ? "border-[#FFD700]/70 bg-[#FFD700]/10 text-[#FFD700]"
          : "border-white/10 bg-white/[0.035] text-slate-300"
      }`}
    >
      <Icon className={`h-4 w-4 ${disabled ? "opacity-40" : ""}`} />
      <span className={disabled ? "opacity-40" : ""}>{label}</span>
      {hint && <span className="mt-0.5 text-[9px] font-bold opacity-60">{hint}</span>}
    </button>
  );
}

function MobileInviteView({
  locale,
  isLoggedIn,
  canPersistActions,
  profile,
  rank,
  claimedMilestones,
  leaderboard,
  siteUrl,
  onOpenView,
}: {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  profile: MobileInviteProfile | null;
  rank: number;
  claimedMilestones: number[];
  leaderboard: MobileInviteLeaderboardEntry[];
  siteUrl: string;
  onOpenView: (view: MobileView) => void;
}) {
  const zh = locale === "zh";
  const [tab, setTab] = useState<"my" | "board">(profile ? "my" : "board");
  const [notice, setNotice] = useState<string | null>(null);
  const inviteCount = profile?.inviteCount ?? 0;
  const nextMilestone = MILESTONES.find((milestone) => milestone.count > inviteCount && milestone.gcBonus > 0) ?? null;
  const previousCount = nextMilestone
    ? (MILESTONES.filter((milestone) => milestone.gcBonus > 0 && milestone.count < nextMilestone.count).at(-1)?.count ?? 0)
    : (MILESTONES.at(-1)?.count ?? 0);
  const progress = nextMilestone && nextMilestone.count > previousCount
    ? Math.min(100, Math.max(0, Math.round(((inviteCount - previousCount) / (nextMilestone.count - previousCount)) * 100)))
    : 100;
  const referralUrl = useMemo(() => {
    const rawBase = siteUrl.replace(/\/$/, "");
    let base = rawBase.includes("football2026.net") ? "https://m.football2026.net" : rawBase;
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      base = host === "localhost" || host === "127.0.0.1" ? window.location.origin : "https://m.football2026.net";
    }
    const url = new URL(`/${locale}/m/register`, base);
    const referralKey = profile?.referralCode || profile?.username;
    if (referralKey) url.searchParams.set("ref", referralKey);
    url.searchParams.set("next", "/m?view=home");
    return url.toString();
  }, [locale, profile?.referralCode, profile?.username, siteUrl]);
  const shareText = zh
    ? "加入 Football2026，注册即可领取 GC，一起为世界杯助威。"
    : "Join Football2026, get GC when you sign up, and support the World Cup together.";
  const sharePlatforms = [
    { name: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralUrl)}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${referralUrl}`)}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareText)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}` },
  ];

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setNotice(zh ? "邀请链接已复制" : "Invite link copied");
    } catch {
      setNotice(zh ? "复制失败，请手动复制链接" : "Copy failed. Please copy manually.");
    }
    window.setTimeout(() => setNotice(null), 1800);
  }

  async function shareNative() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Football2026", text: shareText, url: referralUrl });
        return;
      }
      await copyInviteLink();
    } catch {
      setNotice(zh ? "分享已取消" : "Share cancelled");
      window.setTimeout(() => setNotice(null), 1400);
    }
  }

  return (
    <div className="grid gap-3 pb-2">
      <section className="sticky top-0 z-20 -mx-3 border-b border-white/10 bg-[#081120]/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <button type="button" onClick={() => onOpenView("mine")} className="h-8 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[12px] font-black text-slate-300">
            {zh ? "返回" : "Back"}
          </button>
          <div className="min-w-0 text-center">
            <h1 className="text-[17px] font-black leading-5 text-white">{zh ? "邀请好友" : "Invite Friends"}</h1>
            <p className="mt-0.5 text-[11px] font-bold text-[#FFD700]">
              {zh ? `每人奖励 ${formatBalance(PER_INVITE_GC)} GC` : `${formatBalance(PER_INVITE_GC)} GC per invite`}
            </p>
          </div>
          <span className={`w-[3.25rem] text-right text-[10px] font-black ${canPersistActions ? "text-emerald-300" : "text-amber-300"}`}>
            {canPersistActions ? (zh ? "已登录" : "Live") : (zh ? "预览" : "Preview")}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-[#FFD700]/25 bg-[linear-gradient(135deg,rgba(255,215,0,0.14),rgba(16,185,129,0.08),rgba(255,255,255,0.03))] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[18px] font-black leading-6 text-white">{zh ? "分享链接，好友注册，双方得 GC" : "Share. Friend joins. Both earn GC."}</p>
            <p className="mt-1 text-[12px] leading-5 text-slate-300">
              {zh ? "邀请奖励、排行榜和里程碑沿用 PC 端同一套数据。" : "Rewards, leaderboard, and milestones use the same data as the desktop page."}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] text-[#081120]">
            <Gift className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <InviteStep icon={Share2} title={zh ? "分享链接" : "Share"} body={zh ? "复制专属邀请" : "Copy your link"} />
          <InviteStep icon={UserRound} title={zh ? "好友注册" : "Friend joins"} body={zh ? "带 ref 记录来源" : "Referral is tracked"} />
          <InviteStep icon={Coins} title={zh ? "双方得币" : "Both earn"} body={`${formatBalance(PER_INVITE_GC)} GC`} />
        </div>
      </section>

      {!profile && (
        <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
          <p className="text-[15px] font-black text-white">{zh ? "登录后开始邀请" : "Sign in to start inviting"}</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            {zh ? "移动端会使用你的昵称生成邀请链接，并统计邀请人数、奖励和排行榜。" : "The mobile page will generate your invite link and track invites, rewards, and rank."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href={`/${locale}/m/login?next=${encodeURIComponent("/m?view=invite")}`} className="flex h-10 items-center justify-center rounded-lg bg-[#FFD700] text-[13px] font-black text-[#081120]">
              {zh ? "移动端登录" : "Mobile Login"}
            </Link>
            <Link href={`/${locale}/m/register?next=${encodeURIComponent("/m?view=invite")}`} className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[13px] font-black text-white">
              {zh ? "注册账号" : "Register"}
            </Link>
          </div>
        </section>
      )}

      {profile && (
        <section className="grid gap-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-[#0d1a2b] p-1.5">
            <button
              type="button"
              onClick={() => setTab("my")}
              className={`h-9 rounded-lg text-[13px] font-black ${tab === "my" ? "bg-[#FFD700] text-[#081120]" : "text-slate-400"}`}
            >
              {zh ? "我的邀请" : "My Invites"}
            </button>
            <button
              type="button"
              onClick={() => setTab("board")}
              className={`h-9 rounded-lg text-[13px] font-black ${tab === "board" ? "bg-[#FFD700] text-[#081120]" : "text-slate-400"}`}
            >
              {zh ? "排行榜" : "Leaderboard"}
            </button>
          </div>

          {tab === "my" && (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                <InviteStat label={zh ? "已邀人数" : "Invited"} value={formatCompactCount(profile.inviteCount)} />
                <InviteStat label={zh ? "获得 GC" : "GC Earned"} value={`${formatBalance(profile.inviteGc)}`} highlight />
                <InviteStat label={zh ? "我的排名" : "My Rank"} value={rank > 0 ? `#${rank}` : "-"} />
              </div>

              <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-black text-white">{zh ? "专属邀请链接" : "Referral Link"}</p>
                  <button type="button" onClick={shareNative} className="inline-flex h-8 items-center gap-1 rounded-full border border-[#FFD700]/30 px-3 text-[12px] font-black text-[#FFD700]">
                    <Share2 className="h-3.5 w-3.5" />
                    {zh ? "分享" : "Share"}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_4.5rem] gap-1.5 rounded-lg border border-white/10 bg-[#081120] p-1.5">
                  <div className="min-w-0 px-2 py-1.5">
                    <p className="truncate font-mono text-[12px] leading-5 text-slate-300">{referralUrl.replace(/^https?:\/\//, "")}</p>
                  </div>
                  <button type="button" onClick={copyInviteLink} className="h-8 rounded-md bg-[#FFD700] text-[12px] font-black text-[#081120]">
                    {zh ? "复制" : "Copy"}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {sharePlatforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[11px] font-black text-slate-200 active:bg-white/[0.08]"
                    >
                      {platform.name}
                    </a>
                  ))}
                </div>
                {profile.referredBy && (
                  <p className="mt-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2 py-1.5 text-[11px] font-bold text-emerald-100">
                    {zh ? `你的邀请人：${profile.referredBy}` : `Invited by: ${profile.referredBy}`}
                  </p>
                )}
                {notice && <p className="mt-2 text-center text-[12px] font-black text-[#FFD700]">{notice}</p>}
              </section>

              <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-black text-white">{zh ? "邀请里程碑" : "Invite Milestones"}</p>
                  {nextMilestone && (
                    <span className="text-[11px] font-bold text-slate-500">
                      {zh ? `还差 ${nextMilestone.count - inviteCount} 人` : `${nextMilestone.count - inviteCount} more`}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#081120]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-emerald-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 grid gap-1.5">
                  {MILESTONES.filter((milestone) => milestone.gcBonus > 0).map((milestone) => {
                    const reached = inviteCount >= milestone.count;
                    const claimed = claimedMilestones.includes(milestone.count);
                    return (
                      <div key={milestone.count} className={`grid grid-cols-[2.8rem_minmax(0,1fr)_4.5rem] items-center gap-2 rounded-lg border px-2 py-2 ${reached ? "border-[#FFD700]/25 bg-[#FFD700]/10" : "border-white/10 bg-white/[0.035]"}`}>
                        <span className="text-center text-[13px] font-black text-[#FFD700]">{milestone.count}{zh ? "人" : ""}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-black text-white">{getInviteMilestoneLabel(milestone.count, locale)}</p>
                          <p className="text-[11px] font-bold text-slate-500">+{formatBalance(milestone.gcBonus)} GC</p>
                        </div>
                        <span className={`rounded-full px-1.5 py-1 text-center text-[10px] font-black ${claimed ? "bg-emerald-300/15 text-emerald-200" : reached ? "bg-[#FFD700]/20 text-[#FFD700]" : "bg-white/[0.04] text-slate-500"}`}>
                          {claimed ? (zh ? "已领" : "Claimed") : reached ? (zh ? "已达成" : "Reached") : (zh ? "未达成" : "Locked")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </section>
      )}

      {(tab === "board" || !profile) && (
        <MobileInviteLeaderboard locale={locale} leaderboard={leaderboard} currentName={profile?.username ?? null} />
      )}
    </div>
  );
}

function InviteStep({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#081120]/55 p-2 text-center">
      <Icon className="mx-auto h-4 w-4 text-[#FFD700]" />
      <p className="mt-1 truncate text-[12px] font-black text-white">{title}</p>
      <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{body}</p>
    </div>
  );
}

function InviteStat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1a2b] px-2 py-3 text-center">
      <p className={`text-[18px] font-black leading-6 ${highlight ? "text-[#FFD700]" : "text-white"}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function getInviteMilestoneLabel(count: number, locale: string) {
  const labels: Record<number, { zh: string; en: string }> = {
    3: { zh: "招募者", en: "Recruiter" },
    10: { zh: "大使", en: "Ambassador" },
    25: { zh: "冠军推手", en: "Champion" },
    50: { zh: "传奇推手", en: "Legend" },
  };
  const label = labels[count];
  return locale === "zh" ? (label?.zh ?? `${count}人奖励`) : (label?.en ?? `${count} invites`);
}

function MobileInviteLeaderboard({
  locale,
  leaderboard,
  currentName,
}: {
  locale: string;
  leaderboard: MobileInviteLeaderboardEntry[];
  currentName: string | null;
}) {
  const zh = locale === "zh";
  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-black text-white">{zh ? "邀请排行榜" : "Invite Leaderboard"}</p>
        <Trophy className="h-4 w-4 text-[#FFD700]" />
      </div>
      {leaderboard.length === 0 ? (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-5 text-center text-[12px] font-bold text-slate-500">
          {zh ? "暂无邀请排行榜数据" : "No leaderboard data yet"}
        </p>
      ) : (
        <div className="mt-2 grid gap-1.5">
          {leaderboard.map((entry, index) => {
            const active = currentName === entry.username;
            return (
              <div key={`${entry.username}-${index}`} className={`grid grid-cols-[2rem_2.25rem_minmax(0,1fr)_4.5rem] items-center gap-2 rounded-lg border px-2 py-2 ${active ? "border-[#FFD700]/35 bg-[#FFD700]/10" : "border-white/10 bg-white/[0.035]"}`}>
                <span className="text-center text-[12px] font-black text-[#FFD700]">#{index + 1}</span>
                <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[12px] font-black text-white">
                  {entry.avatarUrl ? (
                    <Image src={entry.avatarUrl} alt="" fill sizes="32px" className="object-cover" />
                  ) : entry.countryCode ? (
                    <img src={`https://flagcdn.com/w40/${entry.countryCode.toLowerCase()}.png`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    entry.username.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-white">{entry.username}</p>
                  <p className="truncate text-[11px] font-bold text-slate-500">{zh ? "获得" : "Earned"} {formatBalance(entry.inviteGc)} GC</p>
                </div>
                <span className="rounded-full border border-[#FFD700]/25 bg-[#FFD700]/10 px-1.5 py-1 text-center text-[11px] font-black text-[#FFD700]">
                  {entry.inviteCount}{zh ? "人" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MineView({
  locale,
  t,
  isLoggedIn,
  canPersistActions,
  userEmail,
  userDisplayName,
  balance,
  myPosts,
  myReplies,
  minePredictions,
  followedMatches,
  followedMatchCount,
  checkinLabel,
  checkinState,
  onCheckin,
  onOpenView,
}: {
  locale: string;
  t: MobileCopy;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userEmail?: string;
  userDisplayName?: string;
  balance: number;
  myPosts: MobileForumPost[];
  myReplies: MobileForumUserReply[];
  minePredictions: MobileMinePrediction[];
  followedMatches: MobileMatch[];
  followedMatchCount: number;
  checkinLabel: string;
  checkinState: "idle" | "loading" | "done" | "already" | "error";
  onCheckin: () => void;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"predict" | "posts" | "replies" | "saved" | "follow">("predict");
  const [quickNotice, setQuickNotice] = useState<string | null>(null);
  const displayName = userDisplayName ?? userEmail?.split("@")[0] ?? (lc(locale, "未登录用户", "Guest"));
  const handle = userEmail ?? "m.football2026.net";
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "F";
  const predictionCount = minePredictions.length;
  const stats = [
    { key: "predict" as const, label: lc(locale, "预测", "Predict"), value: predictionCount },
    { key: "posts" as const, label: lc(locale, "帖子", "Posts"), value: myPosts.length },
    { key: "replies" as const, label: lc(locale, "回复", "Replies"), value: myReplies.length },
    { key: "saved" as const, label: lc(locale, "收藏", "Saved"), value: 0 },
    { key: "follow" as const, label: lc(locale, "关注", "Follow"), value: followedMatchCount },
  ];

  function openForumThread(postId: number) {
    const url = new URL(`/${locale}/m`, window.location.origin);
    const current = new URLSearchParams(window.location.search);
    const preview = current.get("preview");
    if (preview) url.searchParams.set("preview", preview);
    url.searchParams.set("view", "forum");
    url.searchParams.set("thread", String(postId));
    window.location.assign(url.toString());
  }

  function openPredict() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "predict");
    url.searchParams.delete("thread");
    window.location.assign(url.toString());
  }

  function showQuickNotice(label: string) {
    setQuickNotice(locale === "zh" ? `${label}移动端页面稍后开放` : `${label} mobile page is coming soon`);
    window.setTimeout(() => setQuickNotice(null), 2200);
  }

  async function signOutAndGo(target: "home" | "login") {
    const supabase = createClient();
    // Guard the signOut call: when the refresh token is already stale it can
    // throw, which would otherwise leave the user stuck on the page. Always
    // fall through to a full-page navigation so the server re-renders the
    // logged-out state. Mirrors the desktop Navbar.handleSignOut behaviour.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — cookies are best-effort cleared; the navigation re-syncs state
    }
    const nextUrl = target === "login"
      ? `/${locale}/m/login?next=${encodeURIComponent("/m?view=home")}`
      : `/${locale}/m?view=home`;
    window.location.href = nextUrl;
  }

  return (
    <div className="grid gap-3 pb-2">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1a2b]">
        <div className="h-20 bg-[linear-gradient(135deg,rgba(255,215,0,0.24),rgba(20,83,45,0.18),rgba(8,17,32,0.65))]" />
        <div className="-mt-9 px-3 pb-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 items-end gap-3">
              <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-4 border-[#0d1a2b] bg-[#FFD700] text-3xl font-black text-[#081120] shadow-lg shadow-black/30">
                {initials}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="truncate text-xl font-black leading-6 text-white">{displayName}</h1>
                <p className="mt-0.5 truncate text-[13px] font-bold text-slate-400">@{handle}</p>
              </div>
            </div>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => onOpenView("checkin")}
                disabled={checkinState === "loading" || checkinState === "done"}
                className="mb-1 h-8 shrink-0 rounded-full border border-emerald-300/25 bg-emerald-300/12 px-3 text-[12px] font-black text-emerald-100 disabled:opacity-70"
              >
                {checkinLabel}
              </button>
            ) : (
              <Link href={`/${locale}/m/register?next=${encodeURIComponent("/m?view=mine")}`} className="mb-1 flex h-8 shrink-0 items-center rounded-full bg-[#FFD700] px-3 text-[12px] font-black text-[#081120]">
                {t.register}
              </Link>
            )}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-[#FFD700]">{isLoggedIn ? t.balance : t.guestBalance}</p>
              <p className="mt-0.5 truncate text-2xl font-black leading-7 text-white">{isLoggedIn ? `${formatBalance(balance)} GC` : "100M GC"}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-black text-slate-300">
              {canPersistActions ? t.loggedIn : isLoggedIn ? (lc(locale, "预览", "Preview")) : (lc(locale, "未登录", "Signed out"))}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-5 text-center">
            {stats.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className="min-w-0 rounded-lg px-1 py-1.5 active:bg-white/[0.04]"
              >
                <span className="block text-[16px] font-black leading-5 text-white">{formatCompactCount(item.value)}</span>
                <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-500">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-5 gap-1.5">
        <button type="button" onClick={() => onOpenView("profile")} className="grid min-h-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035] px-1 text-center">
          <UserRound className="h-4 w-4 text-[#FFD700]" />
          <span className="text-[11px] font-black text-white">{lc(locale, "个人中心", "Profile")}</span>
        </button>
        <button type="button" onClick={() => onOpenView("checkin")} className="grid min-h-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035] px-1.5 text-center">
          <CheckCircle2 className="h-4 w-4 text-[#FFD700]" />
          <span className="text-[12px] font-black text-white">{lc(locale, "签到", "Check in")}</span>
        </button>
        <button type="button" onClick={() => onOpenView("topup")} className="grid min-h-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035] px-1.5 text-center">
          <CircleDollarSign className="h-4 w-4 text-[#FFD700]" />
          <span className="text-[12px] font-black text-white">{lc(locale, "充值", "Top up")}</span>
        </button>
        <button type="button" onClick={() => onOpenView("invite")} className="grid min-h-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035] px-1.5 text-center">
          <Gift className="h-4 w-4 text-[#FFD700]" />
          <span className="text-[12px] font-black text-white">{lc(locale, "邀请", "Invite")}</span>
        </button>
        <button type="button" onClick={() => onOpenView("settings")} className="grid min-h-14 place-items-center rounded-lg border border-white/10 bg-white/[0.035] px-1.5 text-center">
          <Settings className="h-4 w-4 text-[#FFD700]" />
          <span className="text-[12px] font-black text-white">{lc(locale, "设置", "Settings")}</span>
        </button>
      </section>
      {quickNotice && (
        <p className="rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-2 text-center text-[12px] font-black text-[#FFD700]">
          {quickNotice}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1a2b]">
        <div className="grid grid-cols-5 border-b border-white/10">
          {stats.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`h-9 border-b-2 text-[12px] font-black ${
                activeTab === item.key ? "border-[#FFD700] text-[#FFD700]" : "border-transparent text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-2.5">
          {activeTab === "predict" && (
            <MinePredictionList locale={locale} predictions={minePredictions} onOpenPredict={openPredict} />
          )}
          {activeTab === "posts" && (
            <MinePostList locale={locale} posts={myPosts} emptyLabel={lc(locale, "还没有发布帖子", "No posts yet")} onOpenPost={openForumThread} />
          )}
          {activeTab === "replies" && (
            <MineReplyList locale={locale} replies={myReplies} emptyLabel={lc(locale, "还没有回复", "No replies yet")} onOpenPost={openForumThread} />
          )}
          {activeTab === "saved" && (
            <MineEmptyState title={lc(locale, "我的收藏", "Saved")} body={lc(locale, "收藏的帖子和赛事稍后会集中在这里。", "Saved posts and matches will appear here.")} />
          )}
          {activeTab === "follow" && (
            <MineFollowedMatchList
              locale={locale}
              matches={followedMatches}
              emptyLabel={lc(locale, "还没有关注比赛", "No followed matches yet")}
              onOpenMatch={(match) => onOpenView("matches", getMatchTeams(locale, match))}
            />
          )}
        </div>
      </section>

      {isLoggedIn && (
        <div className="flex items-center justify-center gap-4 py-2 text-[11px] font-bold text-slate-600">
          <button type="button" onClick={() => signOutAndGo("home")} className="active:text-slate-300">
            {lc(locale, "退出登录", "Log out")}
          </button>
          <span className="h-3 w-px bg-white/10" />
          <button type="button" onClick={() => signOutAndGo("login")} className="active:text-slate-300">
            {lc(locale, "更改用户", "Switch user")}
          </button>
        </div>
      )}

    </div>
  );
}

function MobileProfileView({
  locale,
  isLoggedIn,
  canPersistActions,
  userEmail,
  userDisplayName,
  balance,
  minePredictions,
  myPosts,
  myReplies,
  followedMatchCount,
  onOpenView,
}: {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userEmail?: string;
  userDisplayName?: string;
  balance: number;
  minePredictions: MobileMinePrediction[];
  myPosts: MobileForumPost[];
  myReplies: MobileForumUserReply[];
  followedMatchCount: number;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const zh = locale === "zh";
  const displayName = userDisplayName ?? userEmail?.split("@")[0] ?? (zh ? "未登录用户" : "Guest");
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "F";
  const stats = [
    { label: zh ? "预测" : "Predictions", value: minePredictions.length, view: "predict" as MobileView },
    { label: zh ? "帖子" : "Posts", value: myPosts.length, view: "forum" as MobileView },
    { label: zh ? "回复" : "Replies", value: myReplies.length, view: "forum" as MobileView },
    { label: zh ? "关注" : "Following", value: followedMatchCount, view: "matches" as MobileView },
  ];

  return (
    <div className="grid gap-3 pb-2">
      <MobileSubHeader locale={locale} title={zh ? "个人中心" : "Profile"} onBack={() => onOpenView("mine")} />
      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1a2b]">
        <div className="h-16 bg-[linear-gradient(135deg,rgba(255,215,0,0.22),rgba(34,197,94,0.12),rgba(8,17,32,0.7))]" />
        <div className="-mt-8 grid gap-3 px-3 pb-3">
          <div className="flex items-end gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-[#0d1a2b] bg-[#FFD700] text-2xl font-black text-[#081120]">
              {initials}
            </div>
            <div className="min-w-0 pb-1">
              <p className="truncate text-xl font-black text-white">{displayName}</p>
              <p className="truncate text-[12px] font-bold text-slate-400">{userEmail ?? "m.football2026.net"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/10 p-2">
              <p className="text-[11px] font-black text-[#FFD700]">{zh ? "GC 余额" : "GC Balance"}</p>
              <p className="mt-0.5 text-xl font-black text-white">{formatBalance(balance)} GC</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2">
              <p className="text-[11px] font-black text-slate-500">{zh ? "登录状态" : "Status"}</p>
              <p className="mt-0.5 text-[14px] font-black text-white">{canPersistActions ? (zh ? "已登录" : "Signed in") : isLoggedIn ? (zh ? "预览登录" : "Preview") : (zh ? "未登录" : "Guest")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-1.5">
        {stats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onOpenView(item.view)}
            className="grid min-h-16 place-items-center rounded-lg border border-white/10 bg-white/[0.035] px-1 text-center active:bg-white/[0.06]"
          >
            <span className="text-lg font-black text-white">{formatCompactCount(item.value)}</span>
            <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-1.5 rounded-xl border border-white/10 bg-[#0d1a2b] p-2">
        <MobileMenuButton icon={CircleDollarSign} label={zh ? "充值" : "Top up"} value={zh ? "购买 GC" : "Buy GC"} onClick={() => onOpenView("topup")} />
        <MobileMenuButton icon={Gift} label={zh ? "邀请好友" : "Invite"} value={zh ? "邀请奖励" : "Rewards"} onClick={() => onOpenView("invite")} />
        <MobileMenuButton icon={Trophy} label={zh ? "排行榜" : "Leaderboard"} value={zh ? "射手榜 / 邀请榜" : "Scorers / invites"} onClick={() => onOpenView("leaderboard")} />
        <MobileMenuButton icon={Settings} label={zh ? "设置" : "Settings"} value={zh ? "账户与应用" : "Account & app"} onClick={() => onOpenView("settings")} />
      </section>
    </div>
  );
}

function MobileSettingsView({
  locale,
  isLoggedIn,
  userEmail,
  onOpenView,
}: {
  locale: string;
  isLoggedIn: boolean;
  userEmail?: string;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const zh = locale === "zh";

  async function signOutAndGo(target: "home" | "login") {
    const supabase = createClient();
    // Guard the signOut call: when the refresh token is already stale it can
    // throw, which would otherwise leave the user stuck on the page. Always
    // fall through to a full-page navigation so the server re-renders the
    // logged-out state. Mirrors the desktop Navbar.handleSignOut behaviour.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — cookies are best-effort cleared; the navigation re-syncs state
    }
    const nextUrl = target === "login"
      ? `/${locale}/m/login?next=${encodeURIComponent("/m?view=home")}`
      : `/${locale}/m?view=home`;
    window.location.href = nextUrl;
  }

  return (
    <div className="grid gap-3 pb-2">
      <MobileSubHeader locale={locale} title={zh ? "设置" : "Settings"} onBack={() => onOpenView("mine")} />
      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <p className="text-[13px] font-black text-[#FFD700]">{zh ? "账户" : "Account"}</p>
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
          <p className="truncate text-[14px] font-black text-white">{userEmail ?? (zh ? "未登录" : "Not signed in")}</p>
          <p className="mt-0.5 text-[12px] font-bold text-slate-500">{isLoggedIn ? (zh ? "当前移动端账户" : "Current mobile account") : (zh ? "登录后可保存数据" : "Sign in to save data")}</p>
        </div>
      </section>

      <section className="grid gap-1.5 rounded-xl border border-white/10 bg-[#0d1a2b] p-2">
        <MobileMenuButton icon={Languages} label={zh ? "语言" : "Language"} value={zh ? "切换到 English" : "Switch to 中文"} onClick={() => { const target = lc(locale, "en", "zh"); document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`; window.location.href = `/${target}/m?preview=app&view=settings`; }} />
        <MobileMenuButton icon={Home} label={zh ? "返回首页" : "Home"} value="Football2026" onClick={() => onOpenView("home")} />
        <MobileMenuButton icon={Gift} label={zh ? "邀请" : "Invite"} value={zh ? "邀请链接和排行榜" : "Link and board"} onClick={() => onOpenView("invite")} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <p className="text-[13px] font-black text-[#FFD700]">{zh ? "桌面快捷方式" : "Home Screen Shortcut"}</p>
        <div className="mt-2">
          <MobileInstallPrompt locale={locale} />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <p className="text-[13px] font-black text-slate-500">{zh ? "账户操作" : "Account actions"}</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-[12px] font-bold text-slate-500">
          <button type="button" onClick={() => signOutAndGo("home")} disabled={!isLoggedIn} className="disabled:opacity-40 active:text-slate-200">
            {zh ? "退出登录" : "Log out"}
          </button>
          <span className="h-3 w-px bg-white/10" />
          <button type="button" onClick={() => signOutAndGo("login")} className="active:text-slate-200">
            {zh ? "更改用户" : "Switch user"}
          </button>
        </div>
      </section>
    </div>
  );
}

function MobileLeaderboardView({
  locale,
  topScorers,
  inviteLeaderboard,
  onOpenView,
}: {
  locale: string;
  topScorers: MobileTopScorer[];
  inviteLeaderboard: MobileInviteLeaderboardEntry[];
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const zh = locale === "zh";
  return (
    <div className="grid gap-3 pb-2">
      <MobileSubHeader locale={locale} title={zh ? "排行榜" : "Leaderboard"} onBack={() => onOpenView("mine")} />
      <TopScorersSection locale={locale} scorers={topScorers} />
      <MobileInviteLeaderboard locale={locale} leaderboard={inviteLeaderboard} currentName={null} />
    </div>
  );
}

function MobileAwardsView({
  locale,
  isLoggedIn,
  canPersistActions,
  userGc,
  awardBets,
  awardPhase,
  awardOdds,
  goldenBootClosed,
  onOpenView,
}: {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  userGc: number;
  awardBets: MobileAwardBet[];
  awardPhase: AwardPhase;
  awardOdds: number;
  goldenBootClosed: boolean;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const zh = locale === "zh";
  return (
    <div className="grid gap-3 pb-2">
      <MobileSubHeader locale={locale} title={zh ? "大奖预测" : "Award Predictions"} onBack={() => onOpenView("mine")} />
      <MobileAwardPredictionPanel
        locale={locale}
        isLoggedIn={isLoggedIn}
        canPersistActions={canPersistActions}
        userGc={userGc}
        initialBets={awardBets}
        phase={awardPhase}
        odds={awardOdds}
        goldenBootClosed={goldenBootClosed}
      />
    </div>
  );
}

function MobileCheckinView({
  locale,
  isLoggedIn,
  canPersistActions,
  balance,
  initialHistory,
  refreshBalance,
  onOpenView,
}: {
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
  balance: number;
  initialHistory: MobileCheckinRecord[];
  refreshBalance: () => Promise<void>;
  onOpenView: (view: MobileView, match?: string) => void;
}) {
  const zh = locale === "zh";
  const [history, setHistory] = useState(initialHistory);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const todayKey = new Date().toISOString().split("T")[0];
  const yesterdayKey = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const todayRecord = history.find((item) => item.date === todayKey) ?? null;
  const yesterdayRecord = history.find((item) => item.date === yesterdayKey) ?? null;
  const wealthLevel = getWealthLevel(balance);
  const currentStreak = todayRecord?.streak ?? yesterdayRecord?.streak ?? 0;
  const nextStreak = todayRecord ? currentStreak : currentStreak + 1;
  const streakBonus = Math.min(Math.max(nextStreak - 1, 0), 30) * 0.01;
  const dailyEstimate = todayRecord?.gcEarned ?? Math.floor(wealthLevel.dailyFreeGc * (1 + streakBonus));
  const bonusPercent = Math.round(streakBonus * 100);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().split("T")[0];
    const record = history.find((item) => item.date === dateKey) ?? null;
    return { date, dateKey, record, isToday: dateKey === todayKey };
  });

  async function submitCheckin() {
    if (!isLoggedIn) {
      redirectToMobileLogin(locale);
      return;
    }
    if (loading || todayRecord) return;
    if (!canPersistActions) {
      setHistory((current) => [
        { date: todayKey, streak: nextStreak, gcEarned: dailyEstimate },
        ...current.filter((item) => item.date !== todayKey),
      ]);
      setMessage({ type: "ok", text: zh ? `已在本页显示签到，正式登录后会保存到数据库。` : "Check-in preview shown here. Sign in online to save it." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/checkin", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "already_claimed") {
          setHistory((current) => [
            { date: todayKey, streak: Math.max(1, currentStreak), gcEarned: dailyEstimate },
            ...current.filter((item) => item.date !== todayKey),
          ]);
          setMessage({ type: "err", text: zh ? "今天已经签到过了" : "Already checked in today" });
          return;
        }
        throw new Error(data.error ?? "checkin_failed");
      }
      const earned = Number(data.gc_earned ?? dailyEstimate);
      const streak = Number(data.streak ?? nextStreak);
      setHistory((current) => [
        { date: todayKey, streak, gcEarned: earned },
        ...current.filter((item) => item.date !== todayKey),
      ]);
      setMessage({ type: "ok", text: zh ? `签到成功，获得 ${formatBalance(earned)} GC` : `Checked in. +${formatBalance(earned)} GC` });
      await refreshBalance();
    } catch {
      setMessage({ type: "err", text: zh ? "签到失败，请稍后重试" : "Check-in failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3 pb-2">
      <MobileSubHeader locale={locale} title={zh ? "每日签到" : "Daily Check-in"} onBack={() => onOpenView("mine")} />

      <section className="overflow-hidden rounded-xl border border-[#FFD700]/25 bg-[#0d1a2b]">
        <div className="grid gap-3 bg-[linear-gradient(135deg,rgba(255,215,0,0.18),rgba(16,185,129,0.10),rgba(8,17,32,0.5))] p-3">
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-black text-[#FFD700]">{zh ? "今日可领取" : "Available today"}</p>
              <p className="mt-1 text-3xl font-black leading-8 text-white">{formatBalance(dailyEstimate)} GC</p>
              <p className="mt-1 text-[12px] font-bold text-slate-400">
                {zh ? `基础 ${formatBalance(wealthLevel.dailyFreeGc)} GC + 连签 ${bonusPercent}%` : `Base ${formatBalance(wealthLevel.dailyFreeGc)} GC + ${bonusPercent}% streak`}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
              <p className="text-[11px] font-black text-slate-500">{zh ? "连续" : "Streak"}</p>
              <p className="text-2xl font-black text-[#FFD700]">{currentStreak}</p>
              <p className="text-[10px] font-bold text-slate-500">{zh ? "天" : "days"}</p>
            </div>
          </div>

          {message && (
            <p className={`rounded-lg border px-3 py-2 text-[12px] font-black ${
              message.type === "ok" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-red-300/25 bg-red-300/10 text-red-200"
            }`}>
              {message.text}
            </p>
          )}

          <button
            type="button"
            onClick={submitCheckin}
            disabled={loading || Boolean(todayRecord)}
            className={`h-12 rounded-xl text-[16px] font-black transition active:scale-[0.99] ${
              todayRecord
                ? "border border-emerald-300/25 bg-emerald-300/15 text-emerald-100"
                : "bg-[#FFD700] text-[#081120] shadow-lg shadow-[#FFD700]/15"
            } disabled:opacity-80`}
          >
            {todayRecord ? (zh ? "今日已签到" : "Checked in today") : loading ? (zh ? "签到中..." : "Checking in...") : (zh ? "立即签到领取" : "Check in now")}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[15px] font-black text-white">{zh ? "最近 7 天" : "Last 7 days"}</p>
          <span className="text-[11px] font-black text-slate-500">{zh ? "每天 1 次" : "Once daily"}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const checked = Boolean(day.record);
            return (
              <div key={day.dateKey} className="grid gap-1 text-center">
                <span className="text-[10px] font-bold text-slate-600">{formatMobileWeekday(day.date, locale)}</span>
                <span className={`flex h-9 items-center justify-center rounded-lg border text-[12px] font-black ${
                  checked
                    ? "border-[#FFD700]/50 bg-[#FFD700] text-[#081120]"
                    : day.isToday
                    ? "border-[#FFD700]/35 bg-[#FFD700]/10 text-[#FFD700]"
                    : "border-white/10 bg-white/[0.035] text-slate-600"
                }`}>
                  {checked ? "OK" : day.date.getDate()}
                </span>
                <span className="h-3 truncate text-[9px] font-black text-[#FFD700]">
                  {checked && day.record ? `+${formatBalance(day.record.gcEarned)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2 rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-[#FFD700]">{zh ? "当前财富等级" : "Current wealth level"}</p>
            <p className="mt-1 truncate text-[18px] font-black text-white">{zh ? wealthLevel.nameZh : wealthLevel.name}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[12px] font-black text-slate-300">
            Lv.{wealthLevel.rank}
          </span>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-[12px] leading-5 text-slate-400">
          {zh
            ? "规则：每日签到根据 GC 财富等级发放基础奖励；连续签到每天增加 1% 奖励，最高增加 30%。中断后从新的连续天数重新计算。"
            : "Rules: daily check-in uses your GC wealth level as the base reward. Each streak day adds 1%, capped at 30%. If the streak breaks, it starts again."}
        </div>
      </section>
    </div>
  );
}

function MobileSubHeader({ locale, title, onBack }: { locale: string; title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-30 -mx-3 flex h-11 items-center justify-between border-b border-white/10 bg-[#081120]/96 px-3 backdrop-blur">
      <button type="button" onClick={onBack} className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2 text-[12px] font-black text-slate-300">
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        {lc(locale, "返回", "Back")}
      </button>
      <p className="text-[15px] font-black text-white">{title}</p>
      <span className="h-8 w-12" />
    </div>
  );
}

function MobileMenuButton({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2 text-left active:bg-white/[0.06]">
      <Icon className="h-4 w-4 shrink-0 text-[#FFD700]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-black text-white">{label}</span>
        <span className="block truncate text-[11px] font-bold text-slate-500">{value}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
    </button>
  );
}

function LegacyMineView({
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
            <p className="text-[13px] font-black text-[#FFD700]">{canPersistActions ? t.loggedIn : (lc(locale, "数据预览", "Data preview"))}</p>
            <p className="mt-1 truncate text-[15px] font-bold text-white">{userEmail}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] text-slate-400">{isLoggedIn ? t.balance : t.guestBalance}</p>
            <p className="mt-1 text-2xl font-black text-[#FFD700]">{isLoggedIn ? `${formatBalance(balance)} GC` : "100M GC"}</p>
          </div>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onCheckin}
              disabled={checkinState === "loading" || checkinState === "done"}
              className="rounded-lg bg-emerald-400/15 px-3 py-2 text-[15px] font-black text-emerald-100 disabled:opacity-70"
            >
              {checkinLabel}
            </button>
          ) : (
            <Link href={`/${locale}/m/register?next=${encodeURIComponent("/m?view=mine")}`} className="rounded-lg bg-[#FFD700] px-3 py-2 text-[15px] font-black text-[#081120]">
              {t.register}
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-2 rounded-xl border border-white/10 bg-[#0d1a2b] p-3">
        <p className="text-[15px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{t.appStatus}</p>
        <MobileInstallPrompt locale={locale} />
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <ActionLink href={`/${locale}/m?view=profile`} icon={UserRound} label={t.account} />
        <ActionLink href={`/${locale}/m?view=invite`} icon={Gift} label={t.invite} />
        <ActionLink href={`/${locale}/m?view=leaderboard`} icon={Trophy} label={t.leaderboard} />
        <ActionLink href={`/${locale}/m?view=awards`} icon={CircleDollarSign} label={t.awards} />
      </div>
    </div>
  );
}

function MineEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-40 place-items-center rounded-lg border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Sparkles className="h-5 w-5 text-[#FFD700]" />
        </div>
        <p className="mt-3 text-[15px] font-black text-white">{title}</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-[12px] leading-5 text-slate-500">{body}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 h-8 rounded-full bg-[#FFD700] px-4 text-[12px] font-black text-[#081120]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function getMinePredictionLabel(item: MobileMinePrediction, locale: string) {
  const home = getTeamName(item.homeTeam, locale);
  const away = getTeamName(item.awayTeam, locale);
  if (item.kind === "score") {
    const scoreLabel = item.scoreHome === 99 && item.scoreAway === 99
      ? (lc(locale, "其他比分", "Other score"))
      : `${item.scoreHome}:${item.scoreAway}`;
    return scoreLabel;
  }
  if (item.prediction === "draw") return lc(locale, "平局", "Draw");
  if (item.prediction === "away") return locale === "zh" ? `${away} 胜` : `${away} win`;
  return locale === "zh" ? `${home} 胜` : `${home} win`;
}

function getMinePredictionStatus(status: string, locale: string) {
  const normalized = status.toLowerCase();
  if (normalized === "won") return lc(locale, "已中", "Won");
  if (normalized === "lost") return lc(locale, "未中", "Lost");
  if (normalized === "refunded") return lc(locale, "已退回", "Refunded");
  return lc(locale, "待开奖", "Pending");
}

function MinePredictionList({
  locale,
  predictions,
  onOpenPredict,
}: {
  locale: string;
  predictions: MobileMinePrediction[];
  onOpenPredict: () => void;
}) {
  if (predictions.length === 0) {
    return (
      <MineEmptyState
        title={lc(locale, "我的预测", "My Predictions")}
        body={lc(locale, "这里会显示你参加过的输赢预测和比分预测。", "Your match and score predictions will appear here.")}
        actionLabel={lc(locale, "去预测", "Predict")}
        onAction={onOpenPredict}
      />
    );
  }

  return (
    <div className="grid gap-1.5">
      {predictions.map((item) => (
        <button
          key={`${item.kind}-${item.id}`}
          type="button"
          onClick={onOpenPredict}
          className="grid min-w-0 gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left active:bg-white/[0.06]"
        >
          <span className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <img src={getFlagUrl(item.homeTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
              <span className="min-w-0 truncate text-[13px] font-black text-white">{getTeamName(item.homeTeam, locale)}</span>
              <span className="shrink-0 text-[10px] font-bold text-slate-600">VS</span>
              <img src={getFlagUrl(item.awayTeam, 20)} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover" />
              <span className="min-w-0 truncate text-[13px] font-black text-white">{getTeamName(item.awayTeam, locale)}</span>
            </span>
            <span className="shrink-0 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-2 py-0.5 text-[11px] font-black text-[#FFD700]">
              {item.kind === "win" ? (lc(locale, "输赢", "Win")) : (lc(locale, "比分", "Score"))}
            </span>
          </span>
          <span className="flex min-w-0 items-center justify-between gap-2 text-[12px] font-bold text-slate-400">
            <span className="min-w-0 truncate">{getMinePredictionLabel(item, locale)}</span>
            <span className="shrink-0">{formatBalance(item.gcAmount)} GC</span>
          </span>
          <span className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-slate-600">
            <span className="min-w-0 truncate">{formatKickoff(item.kickoffTime, locale)}</span>
            <span className="shrink-0 text-slate-400">{getMinePredictionStatus(item.status, locale)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function MineFollowedMatchList({
  locale,
  matches,
  emptyLabel,
  onOpenMatch,
}: {
  locale: string;
  matches: MobileMatch[];
  emptyLabel: string;
  onOpenMatch: (match: MobileMatch) => void;
}) {
  if (matches.length === 0) {
    return (
      <MineEmptyState
        title={emptyLabel}
        body={lc(locale, "关注比赛后会显示在这里。", "Followed matches will appear here.")}
      />
    );
  }

  return (
    <div className="grid gap-1.5">
      {matches.map((match) => (
        <button
          key={match.id}
          type="button"
          onClick={() => onOpenMatch(match)}
          className="grid min-w-0 gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left active:bg-white/[0.06]"
        >
          <span className="min-w-0 text-sm font-black leading-5 text-white">
            <MatchAlignedRow locale={locale} match={match} />
          </span>
          <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[12px] leading-4 text-slate-500">
            <span className="shrink-0">{formatKickoff(match.kickoffTime, locale)}</span>
            <span className="min-w-0 truncate">{getLocation(match, locale)}</span>
            <span className="shrink-0">{formatCountdown(match.kickoffTime, locale)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function MinePostList({
  locale,
  posts,
  emptyLabel,
  onOpenPost,
}: {
  locale: string;
  posts: MobileForumPost[];
  emptyLabel: string;
  onOpenPost: (postId: number) => void;
}) {
  if (posts.length === 0) {
    return (
      <MineEmptyState
        title={emptyLabel}
        body={lc(locale, "发布后的内容会像作品列表一样显示在这里。", "Published content will appear here.")}
      />
    );
  }

  return (
    <div className="grid gap-1.5">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          onClick={() => onOpenPost(post.id)}
          className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_3rem] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left active:bg-white/[0.06]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFD700]/12 text-[15px]">
            {post.categoryIcon}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-black leading-5 text-white">{post.title}</span>
            <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-500">
              {getForumPostCategoryName(post, locale)} · {formatForumTime(post.lastActivityAt, locale)}
            </span>
          </span>
          <span className="text-right text-[11px] font-bold leading-4 text-slate-500">
            <span className="block">{lc(locale, "赞", "Like")} {formatCompactCount(post.likeCount)}</span>
            <span className="block">{lc(locale, "回", "Reply")} {formatCompactCount(post.replyCount)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function MineReplyList({
  locale,
  replies,
  emptyLabel,
  onOpenPost,
}: {
  locale: string;
  replies: MobileForumUserReply[];
  emptyLabel: string;
  onOpenPost: (postId: number) => void;
}) {
  if (replies.length === 0) {
    return (
      <MineEmptyState
        title={emptyLabel}
        body={lc(locale, "你参与讨论后的回复会显示在这里。", "Your replies will appear here.")}
      />
    );
  }

  return (
    <div className="grid gap-1.5">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          onClick={() => onOpenPost(reply.postId)}
          className="grid min-w-0 gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-left active:bg-white/[0.06]"
        >
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[14px] font-black text-white">{reply.postTitle}</span>
            <span className="shrink-0 text-[11px] font-bold text-slate-500">{formatForumTime(reply.createdAt, locale)}</span>
          </span>
          <ForumHtml html={reply.content} className="mobile-forum-content line-clamp-2 text-[12px] leading-5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-600">{lc(locale, "赞", "Like")} {formatCompactCount(reply.likeCount)}</span>
        </button>
      ))}
    </div>
  );
}

// ── Install-only page copy (12 locales) ──────────────────────────────────────
// Kept separate from the main `copy` object so we can support all locales
// without duplicating the entire app translation table.
const installOnlyCopy: Record<string, { title: string; subtitle: string; iconPreview: string; openFromIcon: string; browserLimited: string }> = {
  zh: {
    title: "先把 Football2026 添加到桌面",
    subtitle: "浏览器模式只用于安装。添加后像 App 一样从桌面图标打开，才能使用完整预测、签到和消息功能。",
    iconPreview: "桌面图标预览",
    openFromIcon: "安装后从这个图标进入",
    browserLimited: "当前网页版功能已精简，请优先添加桌面快捷方式。",
  },
  en: {
    title: "Add Football2026 to your Home Screen first",
    subtitle: "Browser mode is only for installation. Open from the phone icon to use predictions, check-ins, and messages.",
    iconPreview: "Home icon preview",
    openFromIcon: "Open from this icon after install",
    browserLimited: "The browser version is intentionally limited. Add the shortcut for the full experience.",
  },
  es: {
    title: "Primero añade Football2026 a tu pantalla de inicio",
    subtitle: "El modo navegador es solo para instalación. Abre desde el icono del teléfono para predicciones, check-ins y mensajes.",
    iconPreview: "Vista previa del icono",
    openFromIcon: "Abre desde este icono tras instalar",
    browserLimited: "La versión del navegador está limitada. Añade el acceso directo para la experiencia completa.",
  },
  fr: {
    title: "Ajoute d'abord Football2026 à ton écran d'accueil",
    subtitle: "Le mode navigateur est uniquement pour l'installation. Ouvre depuis l'icône du téléphone pour les pronostics, check-ins et messages.",
    iconPreview: "Aperçu de l'icône",
    openFromIcon: "Ouvre depuis cette icône après l'installation",
    browserLimited: "La version navigateur est volontairement limitée. Ajoute le raccourci pour l'expérience complète.",
  },
  de: {
    title: "Füge Football2026 zuerst zum Home-Bildschirm hinzu",
    subtitle: "Der Browser-Modus dient nur zur Installation. Öffne über das Telefon-Icon für Prognosen, Check-ins und Nachrichten.",
    iconPreview: "Icon-Vorschau",
    openFromIcon: "Nach der Installation über dieses Icon öffnen",
    browserLimited: "Die Browserversion ist bewusst eingeschränkt. Füge die Verknüpfung für das vollständige Erlebnis hinzu.",
  },
  pt: {
    title: "Adicione Football2026 à tela inicial primeiro",
    subtitle: "O modo navegador é apenas para instalação. Abra pelo ícone do celular para previsões, check-ins e mensagens.",
    iconPreview: "Prévia do ícone",
    openFromIcon: "Abra por este ícone após instalar",
    browserLimited: "A versão do navegador é intencionalmente limitada. Adicione o atalho para a experiência completa.",
  },
  ru: {
    title: "Сначала добавь Football2026 на главный экран",
    subtitle: "Режим браузера предназначен только для установки. Открывай через иконку телефона для прогнозов, чекинов и сообщений.",
    iconPreview: "Предпросмотр иконки",
    openFromIcon: "Открывай через эту иконку после установки",
    browserLimited: "Версия браузера намеренно ограничена. Добавь ярлык для полного опыта.",
  },
  ar: {
    title: "أضف Football2026 إلى شاشتك الرئيسية أولاً",
    subtitle: "وضع المتصفح مخصص للتثبيت فقط. افتح من أيقونة الهاتف للتوقعات وتسجيل الحضور والرسائل.",
    iconPreview: "معاينة الأيقونة",
    openFromIcon: "افتح من هذه الأيقونة بعد التثبيت",
    browserLimited: "نسخة المتصفح محدودة عمداً. أضف الاختصار للتجربة الكاملة.",
  },
  ja: {
    title: "まずFootball2026をホーム画面に追加してください",
    subtitle: "ブラウザモードはインストール専用です。予測・チェックイン・メッセージはスマホのアイコンから開いてください。",
    iconPreview: "アイコンプレビュー",
    openFromIcon: "インストール後はこのアイコンから開いてください",
    browserLimited: "ブラウザ版は機能が制限されています。ショートカットを追加して全機能をご利用ください。",
  },
  ko: {
    title: "먼저 Football2026을 홈 화면에 추가하세요",
    subtitle: "브라우저 모드는 설치 전용입니다. 예측, 체크인, 메시지는 폰 아이콘에서 여세요.",
    iconPreview: "아이콘 미리보기",
    openFromIcon: "설치 후 이 아이콘에서 여세요",
    browserLimited: "브라우저 버전은 의도적으로 제한되어 있습니다. 바로가기를 추가하고 모든 기능을 이용하세요.",
  },
  vi: {
    title: "Trước tiên hãy thêm Football2026 vào màn hình chính",
    subtitle: "Chế độ trình duyệt chỉ dùng để cài đặt. Mở từ biểu tượng điện thoại để dự đoán, điểm danh và nhắn tin.",
    iconPreview: "Xem trước biểu tượng",
    openFromIcon: "Mở từ biểu tượng này sau khi cài đặt",
    browserLimited: "Phiên bản trình duyệt bị giới hạn có chủ đích. Thêm lối tắt để trải nghiệm đầy đủ.",
  },
  id: {
    title: "Tambahkan Football2026 ke Layar Utama dulu",
    subtitle: "Mode browser hanya untuk instalasi. Buka dari ikon ponsel untuk prediksi, check-in, dan pesan.",
    iconPreview: "Pratinjau ikon",
    openFromIcon: "Buka dari ikon ini setelah instal",
    browserLimited: "Versi browser sengaja dibatasi. Tambahkan pintasan untuk pengalaman lengkap.",
  },
};

function InstallOnlyHome({ locale, t }: { locale: string; t: MobileCopy }) {
  const ic = installOnlyCopy[locale] ?? installOnlyCopy.en;
  return (
    <main className="-mt-16 min-h-screen bg-[#081120] px-4 pb-8 pt-4 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col">
        <div className="mb-4 flex min-h-14 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <Image src="/icons/levels/logo.png" alt="Football2026" fill className="object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black leading-none text-white">Football2026</p>
            <p className="mt-1.5 text-[15px] leading-none text-slate-500">m.football2026.net</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#0b1a2d_0%,#10345b_58%,#14533b_100%)] p-4 shadow-2xl shadow-black/30">
          <h1 className="text-2xl font-black leading-tight">{ic.title}</h1>
          <p className="mt-2 text-[15px] leading-5 text-slate-300">{ic.subtitle}</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#081120]/70 p-3">
            <p className="mb-3 text-[13px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{ic.iconPreview}</p>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-black/25 p-1.5 shadow-lg shadow-black/20">
                <div className="relative h-11 w-11 overflow-hidden rounded-xl">
                  <Image src="/icons/levels/logo.png" alt="Football2026" fill className="object-cover" priority />
                </div>
                <span className="w-full truncate text-center text-[11px] font-bold leading-none text-white">Football2026</span>
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-black text-white">Football2026</p>
                <p className="mt-1 text-[15px] leading-5 text-slate-300">{ic.openFromIcon}</p>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <MobileInstallPrompt locale={locale} force allowDismiss={false} />
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-center text-[13px] leading-4 text-red-100">
          {ic.browserLimited}
        </p>

        <div className="mt-auto pt-5 text-center text-[13px] text-slate-600">
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
          <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{getStageLabel(match, locale)}</p>
          <h2 className="mt-1 text-base font-black">{getMatchTeams(locale, match)}</h2>
        </div>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[13px] font-bold text-slate-300">
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
        className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#FFD700]/35 bg-[#FFD700]/12 text-[15px] font-black text-[#FFD700]"
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
      <p className="text-[13px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{eyebrow}</p>
      <h1 className="mt-1 text-xl font-black leading-tight text-white">{title}</h1>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-2.5">
      <p className="text-[13px] leading-4 text-slate-500">{label}</p>
      <p className="mt-1 text-[15px] font-black text-white">{value}</p>
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
      <span className="text-[15px] font-black leading-4 text-white">{label}</span>
    </Link>
  );
}

function ChoiceButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-2 text-[15px] font-black ${
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
      <p className="mb-2 text-[13px] font-bold text-slate-500">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-8 rounded-md border px-2 text-[15px] font-black ${
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
      <p className="mt-1 text-[15px] leading-5 text-slate-400">{body}</p>
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
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        <BottomItem view="home" icon={Home} label={t.bottomHome} active={activeView === "home"} onChange={onChange} />
        <BottomItem view="matches" icon={CalendarDays} label={t.bottomMatches} active={activeView === "matches"} onChange={onChange} />
        <BottomItem view="predict" icon={CheckCircle2} label={t.bottomPredict} active={activeView === "predict"} onChange={onChange} />
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
  onChange,
}: {
  view: MobileView;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onChange: (view: MobileView) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(view)}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[12px] font-semibold transition-colors ${
        active ? "text-white bg-white/5" : "text-slate-500"
      }`}
      style={{ minHeight: "48px" }}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}