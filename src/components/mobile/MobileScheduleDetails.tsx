"use client";

import { Check, ChevronDown, Copy, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useGcBalance } from "@/context/GcBalance";
import MatchFanSection from "@/components/matches/MatchFanSection";
import { getTeamDisplayName } from "@/lib/flags";
import { calcScoreOdds, netPayout } from "@/lib/scoreOdds";
import { getTeamColor } from "@/lib/teamColors";
import type { MobileMatch } from "@/components/mobile/MobileHome";
import { redirectToMobileLogin } from "@/components/mobile/mobileAuth";

const MIN_BET = 10_000;
const DEFAULT_AMOUNT = "10,000";
const PRESETS = [0.05, 0.1, 0.2, 0.5] as const;

type VoteChoice = "home" | "neutral" | "away";
type ResultChoice = "home" | "draw" | "away";
type FoldKey = "map" | "posts";
type CountryRow = { countryCode: string; home: number; away: number; total: number };
type ForumPost = { id: number; title: string; content: string; replyCount: number; likeCount: number; replies: { id: number; content: string; likeCount: number; createdAt: string }[] };
type ExistingBet = { id: string; prediction: ResultChoice; gcAmount: number; status: string; potentialPayout: number };
type ScoreBetRow = { id: string; scoreHome: number; scoreAway: number; gcAmount: number; oddsMultiplier: number; status: string };
type DetailData = {
  voteCounts: { home: number; neutral: number; away: number };
  myVote: VoteChoice | null;
  isFollowing: boolean;
  existingBet: ExistingBet | null;
  scoreBets: ScoreBetRow[];
  countries: CountryRow[];
  forumPostCount: number;
  forumPost: ForumPost | null;
};

function parseAmount(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

function formatAmount(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString("en-US");
}

function formatGc(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function resultOdds(match: MobileMatch, choice: ResultChoice | null) {
  if (choice === "home") return match.oddsHome ?? 2;
  if (choice === "draw") return match.oddsDraw ?? 3.2;
  if (choice === "away") return match.oddsAway ?? 2.8;
  return 0;
}

export default function MobileScheduleDetails({ locale, match, isLoggedIn, canPersistActions }: { locale: string; match: MobileMatch; isLoggedIn: boolean; canPersistActions: boolean }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [folds, setFolds] = useState<Record<FoldKey, boolean>>({ map: true, posts: false });

  useEffect(() => {
    let active = true;
    setLoading(true);
    const preview = new URLSearchParams(window.location.search).get("preview") === "app" ? "?preview=app" : "";
    fetch(`/api/mobile/matches/${match.id}${preview}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((value: DetailData) => { if (active) setData(value); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [match.id]);

  function toggle(key: FoldKey) {
    setFolds((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="grid gap-1.5 border-t border-[#FFD700]/20 bg-[#102f2a] p-1.5">
      <SupportAndShare locale={locale} match={match} canPersistActions={canPersistActions} initialData={data} />
      <WinBet locale={locale} match={match} canPersistActions={canPersistActions} existingBet={data?.existingBet ?? null} detailLoading={loading} />
      <ScoreBet locale={locale} match={match} canPersistActions={canPersistActions} initialBets={data?.scoreBets ?? []} />
      <FoldRow title="球迷地图" summary={`${data?.countries.length ?? 0} 个国家`} open={folds.map} onToggle={() => toggle("map")}>
        <MatchFanSection
          matchId={match.id}
          homeTeam={getTeamDisplayName(match.homeTeam, locale)}
          awayTeam={getTeamDisplayName(match.awayTeam, locale)}
          homeColors={getTeamColor(match.homeTeam)}
          awayColors={getTeamColor(match.awayTeam)}
          zh={locale === "zh"}
          loggedIn={canPersistActions}
          userVote={data?.myVote ?? null}
        />
      </FoldRow>
      <FoldRow title="赛事帖子" summary={`${data?.forumPostCount ?? 0} 条讨论`} open={folds.posts} onToggle={() => toggle("posts")}>
        <InlineForumPanel locale={locale} post={data?.forumPost ?? null} canPersistActions={canPersistActions} />
      </FoldRow>
      <Link href={`/${locale}/matches/${match.id}`} className="flex h-7 items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.035] text-[12px] font-black text-slate-300">
        完整赛事页 <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function SupportAndShare({ locale, match, canPersistActions, initialData }: { locale: string; match: MobileMatch; canPersistActions: boolean; initialData: DetailData | null }) {
  const [counts, setCounts] = useState({ home: 0, neutral: 0, away: 0 });
  const [myVote, setMyVote] = useState<VoteChoice | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    setCounts(initialData.voteCounts);
    setMyVote(initialData.myVote);
  }, [initialData]);

  async function vote(choice: VoteChoice) {
    if (!canPersistActions) { redirectToMobileLogin(locale); return; }
    if (loading || myVote === choice) return;
    const previous = myVote;
    const next = { ...counts };
    if (previous) next[previous] = Math.max(0, next[previous] - 1);
    next[choice]++;
    setCounts(next);
    setMyVote(choice);
    setLoading(true);
    try {
      const response = await fetch("/api/match-vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_id: match.id, vote: choice }) });
      if (!response.ok) throw new Error("vote failed");
      setMessage("");
    } catch {
      setCounts(counts);
      setMyVote(previous);
      setMessage(locale === "zh" ? "投票失败，请重新登录" : "Vote failed. Please sign in again.");
    } finally {
      setLoading(false);
    }
  }

  const total = counts.home + counts.neutral + counts.away;
  const homePct = total ? Math.round(counts.home / total * 100) : 0;
  const neutralPct = total ? Math.round(counts.neutral / total * 100) : 0;
  const awayPct = total ? Math.max(0, 100 - homePct - neutralPct) : 0;

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.035] p-1.5">
      <div className="mb-1 flex items-center justify-between text-[12px] font-black"><span className="text-[#FFD700]">支持谁</span><span className="text-slate-500">{total} 人投票</span></div>
      <div className="grid grid-cols-3 gap-1">
        <button type="button" onClick={() => vote("home")} disabled={loading} className={`rounded border px-1 py-1.5 text-[12px] font-black ${myVote === "home" ? "border-[#FFD700]/70 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-white/[0.035] text-slate-200"}`}>{getTeamDisplayName(match.homeTeam, locale)} {homePct}%</button>
        <button type="button" onClick={() => vote("neutral")} disabled={loading} className={`rounded border px-1 py-1.5 text-[12px] font-black ${myVote === "neutral" ? "border-slate-300/70 bg-slate-300/15 text-slate-200" : "border-white/10 bg-white/[0.035] text-slate-200"}`}>{locale === "zh" ? "中立" : "Neutral"} {neutralPct}%</button>
        <button type="button" onClick={() => vote("away")} disabled={loading} className={`rounded border px-1 py-1.5 text-[12px] font-black ${myVote === "away" ? "border-purple-400/70 bg-purple-400/15 text-purple-300" : "border-white/10 bg-white/[0.035] text-slate-200"}`}>{getTeamDisplayName(match.awayTeam, locale)} {awayPct}%</button>
      </div>
      {message && <p className="mt-1 text-[11px] text-rose-300">{message}</p>}
      <MobileShareBar locale={locale} match={match} canReward={canPersistActions} />
    </section>
  );
}

function MobileShareBar({ locale, match, compact = false, canReward = false }: { locale: string; match: MobileMatch; compact?: boolean; canReward?: boolean }) {
  const [more, setMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reward, setReward] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/${locale}/matches/${match.id}`;
  const text = `${getTeamDisplayName(match.homeTeam, locale)} vs ${getTeamDisplayName(match.awayTeam, locale)}`;

  async function rewardShare() {
    if (!canReward) return;
    try {
      const response = await fetch("/api/share/reward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareUrl: url }) });
      if (!response.ok) return;
      const data = await response.json();
      if (data.awarded) setReward(`+${formatGc(data.awarded)} GC`);
    } catch {}
  }

  function open(target: string) {
    window.open(target, "_blank", "noopener,noreferrer");
    void rewardShare();
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); void rewardShare(); } catch {}
      return;
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      void rewardShare();
    } catch {}
  }

  return (
    <div className={`${compact ? "mt-1" : "mt-1.5"} flex flex-wrap items-center gap-1`}>
      <span className="mr-auto text-[12px] font-black text-slate-400">分享 {reward && <b className="ml-1 text-emerald-400">{reward}</b>}</span>
      <ShareChip label="分享" onClick={nativeShare} icon={<Share2 className="h-3 w-3" />} />
      <ShareChip label="微博" onClick={() => open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`)} />
      <ShareChip label="X" onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)} />
      <ShareChip label="更多" onClick={() => setMore((value) => !value)} />
      {more && <>
        <ShareChip label={copied ? "已复制" : "复制"} onClick={copy} icon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} />
        <ShareChip label="Telegram" onClick={() => open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`)} />
      </>}
    </div>
  );
}

function ShareChip({ label, onClick, icon }: { label: string; onClick: () => void | Promise<void>; icon?: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="flex h-5 items-center gap-0.5 rounded border border-white/10 bg-white/[0.04] px-1.5 text-[11px] font-black text-slate-300">{icon}{label}</button>;
}

function WinBet({ locale, match, canPersistActions, existingBet, detailLoading }: { locale: string; match: MobileMatch; canPersistActions: boolean; existingBet: ExistingBet | null; detailLoading: boolean }) {
  const { balance, setBalance } = useGcBalance();
  const [choice, setChoice] = useState<ResultChoice | null>(null);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const amountNum = parseAmount(amount);
  const odds = resultOdds(match, choice);
  const locked = Boolean(existingBet) || detailLoading;

  useEffect(() => {
    setChoice(existingBet?.prediction ?? null);
  }, [existingBet]);

  function preset(value: number) {
    const next = Math.floor(balance * value);
    if (next < MIN_BET) setMessage("最低下注 10K GC");
    setAmount(formatAmount(next));
  }

  async function submit() {
    if (!choice || loading) return;
    if (!canPersistActions) { redirectToMobileLogin(locale); return; }
    if (amountNum < MIN_BET) { setMessage("最低下注 10K GC"); return; }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/bets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_id: match.id, prediction: choice, gc_amount: amountNum }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "下注失败");
      setBalance(Math.max(0, balance - amountNum));
      setSuccess(true);
      setMessage("竞猜成功");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "下注失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.035] p-1.5">
      <div className="mb-1 flex justify-between text-[12px] font-black"><span className="text-[#FFD700]">输赢竞猜</span><span className="text-slate-500">余额 {formatGc(balance)} GC</span></div>
      <div className="grid grid-cols-3 gap-1">
        <BetChoice active={choice === "home"} disabled={locked} label={getTeamDisplayName(match.homeTeam, locale)} odds={match.oddsHome} onClick={() => setChoice("home")} />
        <BetChoice active={choice === "draw"} disabled={locked} label="平局" odds={match.oddsDraw} onClick={() => setChoice("draw")} />
        <BetChoice active={choice === "away"} disabled={locked} label={getTeamDisplayName(match.awayTeam, locale)} odds={match.oddsAway} onClick={() => setChoice("away")} />
      </div>
      <QuickAmounts onPick={preset} onAll={() => setAmount(formatAmount(balance))} />
      <div className="mt-1 grid grid-cols-[1.25fr_.85fr_3rem] gap-1">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" className="h-7 min-w-0 rounded border border-white/10 bg-[#081120] px-1.5 text-[12px] text-white outline-none" />
        <span className="flex min-w-0 items-center justify-center truncate rounded border border-white/10 bg-[#081120] px-1 text-[11px] text-slate-400">预计 {formatGc(Math.round(amountNum * odds))}</span>
        <button type="button" onClick={submit} disabled={!choice || loading || success || locked} className="h-7 rounded bg-[#FFD700] text-[12px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500">{existingBet ? "已提交" : "确认"}</button>
      </div>
      {existingBet && <p className="mt-1 text-[11px] text-emerald-300">已参与：{existingBet.prediction === "home" ? getTeamDisplayName(match.homeTeam, locale) : existingBet.prediction === "away" ? getTeamDisplayName(match.awayTeam, locale) : "平局"} · {formatGc(existingBet.gcAmount)} GC</p>}
      {message && <p className={`mt-1 text-[11px] ${success ? "text-emerald-400" : "text-rose-300"}`}>{message}</p>}
      {success && <MobileShareBar locale={locale} match={match} compact canReward={canPersistActions} />}
    </section>
  );
}

function ScoreBet({ locale, match, canPersistActions, initialBets }: { locale: string; match: MobileMatch; canPersistActions: boolean; initialBets: ScoreBetRow[] }) {
  const { balance, setBalance } = useGcBalance();
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const amountNum = parseAmount(amount);
  const scoreReady = homeScore !== "" && awayScore !== "";
  const odds = scoreReady ? calcScoreOdds(Number(homeScore), Number(awayScore)) : 0;

  function preset(value: number) {
    const next = Math.floor(balance * value);
    if (next < MIN_BET) setMessage("最低下注 10K GC");
    setAmount(formatAmount(next));
  }

  async function submit() {
    if (!scoreReady || loading) return;
    if (!canPersistActions) { redirectToMobileLogin(locale); return; }
    if (amountNum < MIN_BET) { setMessage("最低下注 10K GC"); return; }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/score-bets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_id: match.id, score_home: Number(homeScore), score_away: Number(awayScore), gc_amount: amountNum }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "下注失败");
      setBalance(Math.max(0, balance - amountNum));
      setSuccess(true);
      setMessage("比分竞猜成功");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "下注失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-md border border-white/10 bg-white/[0.035] p-1.5">
      <div className="mb-1 flex justify-between text-[12px] font-black"><span className="text-[#FFD700]">比分竞猜</span><span className="text-slate-500">最低 10K GC</span></div>
      <div className="grid grid-cols-[1fr_1.4rem_1fr] gap-1">
        <ScoreInput label={getTeamDisplayName(match.homeTeam, locale)} value={homeScore} onChange={setHomeScore} />
        <span className="flex h-7 items-center justify-center text-[15px] font-black text-slate-500">:</span>
        <ScoreInput label={getTeamDisplayName(match.awayTeam, locale)} value={awayScore} onChange={setAwayScore} />
      </div>
      <QuickAmounts onPick={preset} onAll={() => setAmount(formatAmount(balance))} />
      <div className="mt-1 grid grid-cols-[1.25fr_.85fr_3rem] gap-1">
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" className="h-7 min-w-0 rounded border border-white/10 bg-[#081120] px-1.5 text-[12px] text-white outline-none" />
        <span className="flex min-w-0 items-center justify-center truncate rounded border border-white/10 bg-[#081120] px-1 text-[11px] text-slate-400">预计 {formatGc(netPayout(amountNum, odds))}</span>
        <button type="button" onClick={submit} disabled={!scoreReady || loading} className="h-7 rounded bg-[#FFD700] text-[12px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500">确认</button>
      </div>
      {message && <p className={`mt-1 text-[11px] ${success ? "text-emerald-400" : "text-rose-300"}`}>{message}</p>}
      {initialBets.length > 0 && <p className="mt-1 truncate text-[11px] text-emerald-300">已参与：{initialBets.map((bet) => `${bet.scoreHome}:${bet.scoreAway} ${formatGc(bet.gcAmount)} GC`).join(" · ")}</p>}
      {success && <MobileShareBar locale={locale} match={match} compact canReward={canPersistActions} />}
    </section>
  );
}

function BetChoice({ active, disabled = false, label, odds, onClick }: { active: boolean; disabled?: boolean; label: string; odds: number | null; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`h-9 min-w-0 truncate rounded border px-1 text-[12px] font-black disabled:opacity-70 ${active ? "border-[#FFD700]/70 bg-[#FFD700]/15 text-[#FFD700]" : "border-white/10 bg-[#081120] text-slate-300"}`}>{label}<span className="block text-[11px] font-bold text-slate-500">{(odds ?? 0).toFixed(2)}</span></button>;
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid h-7 min-w-0 grid-cols-[1fr_1.7rem] items-center rounded border border-white/10 bg-[#081120] pl-1.5 text-[11px] text-slate-400"><span className="truncate">{label}</span><input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="h-full w-full bg-transparent text-center text-[15px] font-black text-white outline-none" /></label>;
}

function QuickAmounts({ onPick, onAll }: { onPick: (value: number) => void; onAll: () => void }) {
  return <div className="mt-1 grid grid-cols-5 gap-1">{PRESETS.map((value) => <button key={value} type="button" onClick={() => onPick(value)} className="h-5 rounded border border-white/10 bg-white/[0.035] text-[11px] font-black text-slate-400">{value * 100}%</button>)}<button type="button" onClick={onAll} className="h-5 rounded border border-white/10 bg-white/[0.035] text-[11px] font-black text-slate-400">ALL</button></div>;
}

function FoldRow({ title, summary, open, onToggle, children }: { title: string; summary: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-md border border-white/10 bg-white/[0.035]"><button type="button" onClick={onToggle} className="flex h-7 w-full items-center justify-between gap-2 px-2 text-left"><span className="shrink-0 text-[12px] font-black text-white">{title}</span><span className="ml-auto truncate text-[11px] text-slate-500">{summary}</span><ChevronDown className={`h-3 w-3 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} /></button>{open && <div className="border-t border-white/10">{children}</div>}</section>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="p-2 text-[12px] text-slate-500">{children}</p>;
}

function InlineForumPanel({ locale, post, canPersistActions }: { locale: string; post: ForumPost | null; canPersistActions: boolean }) {
  const [replies, setReplies] = useState(post?.replies ?? []);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setReplies(post?.replies ?? []), [post]);

  if (!post) return <EmptyText>暂无赛事帖子</EmptyText>;

  async function submit() {
    if (!post) return;
    if (!canPersistActions) { redirectToMobileLogin(locale); return; }
    if (!value.trim() || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/forum/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id, content: value.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "回复失败");
      setReplies((current) => [...current, { id: data.id, content: value.trim(), likeCount: 0, createdAt: new Date().toISOString() }]);
      setValue("");
      setMessage("回复成功");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "回复失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-1.5 p-2">
      <div className="rounded border border-white/10 bg-[#081120] p-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-[12px] font-black text-white">{post.title}</h4>
          <span className="shrink-0 text-[11px] text-slate-500">{post.replyCount} 回复 · {post.likeCount} 赞</span>
        </div>
        <ForumHtml html={post.content} className="mt-1 text-[12px] leading-4 text-slate-300" />
      </div>
      {replies.map((reply) => (
        <div key={reply.id} className="rounded border border-white/10 bg-white/[0.025] px-2 py-1.5">
          <ForumHtml html={reply.content} className="text-[12px] leading-4 text-slate-400" />
          <p className="mt-1 text-[11px] text-slate-600">{reply.likeCount} 赞</p>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_3rem] gap-1">
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="参与赛事讨论" className="h-7 min-w-0 rounded border border-white/10 bg-[#081120] px-2 text-[12px] text-white outline-none placeholder:text-slate-600" />
        <button type="button" onClick={submit} disabled={!value.trim() || loading} className="h-7 rounded bg-[#FFD700] text-[12px] font-black text-[#081120] disabled:bg-slate-700 disabled:text-slate-500">回复</button>
      </div>
      {message && <p className="text-[11px] text-slate-400">{message}</p>}
    </div>
  );
}

function ForumHtml({ html, className }: { html: string; className: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
