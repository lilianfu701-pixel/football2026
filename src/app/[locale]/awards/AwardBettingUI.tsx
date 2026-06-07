"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PLAYERS, AWARD_META, getPlayersByAward, awardKeyToDb, dbToAwardKey, type AwardKey, type Player } from "@/data/players";
import { formatGc } from "@/lib/levels";
import { placeAwardBet, cancelAwardBet } from "./actions";
import { useGcBalance } from "@/context/GcBalance";

export interface AwardBet {
  id: string;
  award_type: string;
  player_id: number;
  player_name: string;
  player_name_zh: string;
  gc_amount: number;
  odds_multiplier: number;
  bet_phase: string;
  result: string;
}

import type { AwardPhase } from "@/lib/awardPhase";
import { lc } from "@/i18n/content";

interface Props {
  locale: string;
  userId: string | null;
  userGc: number;
  existingBets: AwardBet[];
  phase: AwardPhase;
  odds: number;
  goldenBootClosed: boolean;
}

const MIN_BET = 10_000; // 10K
const PCT_PRESETS = [0.05, 0.10, 0.20, 0.50] as const; // 5% 10% 20% 50%

const POSITION_LABELS: Record<string, { zh: string; en: string; color: string }> = {
  GK: { zh: "门将", en: "GK", color: "#60A5FA" },
  DF: { zh: "后卫", en: "DF", color: "#34D399" },
  MF: { zh: "中场", en: "MF", color: "#FBBF24" },
  FW: { zh: "前锋", en: "FW", color: "#F87171" },
};

export default function AwardBettingUI({ locale, userId, userGc, existingBets, phase, odds, goldenBootClosed }: Props) {
  const zh = locale === "zh";
  const [activeAward, setActiveAward] = useState<AwardKey>("goldenBoot");
  const [betModal, setBetModal] = useState<Player | null>(null);
  const [betAmount, setBetAmount] = useState(5_000_000);
  const [customInput, setCustomInput] = useState("");
  const [bets, setBets] = useState<AwardBet[]>(existingBets);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Use the global GcBalance context as source of truth; fall back to server prop
  const { balance: ctxBalance, setBalance: setCtxBalance, refresh: refreshGc } = useGcBalance();
  const [localGc, setLocalGc] = useState(userGc);

  // On mount: refresh once from API to get latest balance
  useEffect(() => {
    refreshGc();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync localGc whenever context balance updates
  useEffect(() => {
    if (ctxBalance > 0) setLocalGc(ctxBalance);
    else if (userGc > 0) setLocalGc(userGc);
  }, [ctxBalance, userGc]);

  const meta = AWARD_META[activeAward];
  const players = getPlayersByAward(activeAward);
  const myBetsForAward = bets.filter((b) => dbToAwardKey(b.award_type) === activeAward);

  function getBetForPlayer(playerId: number) {
    return bets.find((b) => dbToAwardKey(b.award_type) === activeAward && b.player_id === playerId);
  }

  function openModal(player: Player) {
    if (!userId) return;
    setBetModal(player);
    setBetAmount(5_000_000);
    setCustomInput("");
    setFeedback(null);
  }

  function effectiveAmount(): number {
    const custom = parseInt(customInput.replace(/[^0-9]/g, ""), 10);
    return customInput.trim() ? (isNaN(custom) ? 0 : custom) : betAmount;
  }

  function handlePreset(v: number) {
    setBetAmount(v);
    setCustomInput(String(v));
  }

  function handlePlaceBet() {
    const amount = effectiveAmount();
    if (amount < MIN_BET) { setFeedback({ type: "err", msg: zh ? `最低消耗 ${formatGc(MIN_BET)} GC` : `Minimum is ${formatGc(MIN_BET)} GC` }); return; }
    if (amount > localGc) { setFeedback({ type: "err", msg: lc(locale, "GC 余额不足", "Insufficient GC") }); return; }
    if (!betModal) return;

    startTransition(async () => {
      let res: { success: boolean; error?: string };
      try {
        res = await placeAwardBet(awardKeyToDb(activeAward), betModal.id, amount);
      } catch (e) {
        setFeedback({ type: "err", msg: `${lc(locale, "网络异常", "Network error")}: ${String(e)}` });
        return;
      }
      if (res.success) {
        // Optimistic update
        const existing = bets.find((b) => b.award_type === activeAward && b.player_id === betModal.id);
        if (existing) {
          setBets((prev) => prev.map((b) =>
            b.award_type === activeAward && b.player_id === betModal.id
              ? { ...b, gc_amount: b.gc_amount + amount }
              : b
          ));
        } else {
          setBets((prev) => [...prev, {
            id:             crypto.randomUUID(),
            award_type:     awardKeyToDb(activeAward),
            player_id:      betModal.id,
            player_name:    betModal.name,
            player_name_zh: betModal.nameZh,
            gc_amount:      amount,
            odds_multiplier: odds,
            bet_phase:      phase,
            result:         "pending",
          }]);
        }
        const newBal = localGc - amount;
        setLocalGc(newBal);
        setCtxBalance(newBal); // keep navbar in sync
        setFeedback({ type: "ok", msg: zh ? `✅ 预测成功！` : "✅ Prediction placed!" });
        setTimeout(() => { setBetModal(null); setFeedback(null); }, 1200);
      } else {
        const errMap: Record<string, string> = {
          insufficient_gc:    lc(locale, "GC 余额不足", "Insufficient GC"),
          max_picks_reached:  lc(locale, "每项大奖最多预测 5 名球员", "Max 5 picks per award"),
          betting_closed:     lc(locale, "预测已截止", "Predictions closed"),
          not_authenticated:  lc(locale, "请先登录", "Please log in"),
          player_not_found:   lc(locale, "球员数据异常", "Player not found"),
          gc_deduction_failed:lc(locale, "GC 扣除失败，请重试", "GC deduction failed"),
          insert_failed:      lc(locale, "写入失败，请刷新后重试", "Insert failed, please refresh"),
          update_failed:      lc(locale, "更新失败，请重试", "Update failed, please retry"),
          invalid_amount:     lc(locale, "金额无效", "Invalid amount"),
        };
        setFeedback({ type: "err", msg: errMap[res.error ?? ""] ?? `${lc(locale, "错误", "Error")}: ${res.error ?? "unknown"}` });
      }
    });
  }

  function handleCancel(betId: string) {
    startTransition(async () => {
      const bet = bets.find((b) => b.id === betId);
      const res = await cancelAwardBet(betId);
      if (res.success && bet) {
        setBets((prev) => prev.filter((b) => b.id !== betId));
        const newBal = localGc + bet.gc_amount;
        setLocalGc(newBal);
        setCtxBalance(newBal); // keep navbar in sync
      }
    });
  }

  const phaseConfig = {
    pre:      { label: lc(locale, "⭐ 开赛前", "⭐ Pre-Tournament"), color: "#FFD700", sublabel: lc(locale, "截止 6月11日开赛前，预测开放中", "Before Jun 11 kick-off · Predictions Open") },
    group:    { label: lc(locale, "🔥 小组赛阶段", "🔥 Group Stage"),    color: "#FB923C", sublabel: lc(locale, "小组赛结束前，预测开放中", "Before group stage ends · Predictions Open") },
    knockout: { label: lc(locale, "🏆 淘汰赛阶段", "🏆 Knockout Stage"),  color: "#34D399", sublabel: lc(locale, "决赛结束前，预测开放中", "Before final ends · Predictions Open")       },
    closed:   { label: lc(locale, "🔒 预测已截止", "🔒 Closed"),          color: "#6B7280", sublabel: lc(locale, "不再接受新预测", "No new predictions")                         },
  }[phase];

  // Effective closed state per award
  const isBettingClosed = phase === "closed" || (activeAward === "goldenBoot" && goldenBootClosed);

  return (
    <div className="text-white pb-10">
      <div className="max-w-5xl mx-auto">

        {/* ── Section Header ── */}
        <div className="mb-5 mt-8 flex items-center gap-2">
          <h2 className="text-base font-black text-white">🏅 {lc(locale, "大奖预测", "Award Predictions")}</h2>
          <span className="text-xs text-gray-500">
            {lc(locale, "每项最多 5 名球员", "max 5 picks each")}
          </span>
        </div>

        {/* ── Award Tabs — horizontal nav ── */}
        <div className="flex gap-1 bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-1 mb-5">
          {(Object.keys(AWARD_META) as AwardKey[]).map((key) => {
            const m = AWARD_META[key];
            const myCount = bets.filter((b) => dbToAwardKey(b.award_type) === key).length;
            const isActive = activeAward === key;
            return (
              <button
                key={key}
                onClick={() => setActiveAward(key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#FFD700] text-[#0A1628]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-xl leading-none">{m.icon}</span>
                <span className="text-[10px] font-black leading-tight text-center">
                  {zh ? m.nameZh : m.name}
                </span>
                {myCount > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                    isActive ? "bg-[#0A1628] text-[#FFD700]" : "bg-[#FFD700] text-[#0A1628]"
                  }`}>
                    {myCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Active Award description ── */}
        <p className="text-xs text-gray-500 mb-4">{zh ? meta.descZh : meta.desc}</p>

        {/* ── My Picks ── */}
        {myBetsForAward.length > 0 && (
          <div className="mb-5 bg-[#0F2040] border border-[#FFD700]/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-[#FFD700] uppercase tracking-widest mb-3">
              {lc(locale, "我的预测", "My Picks")} ({myBetsForAward.length}/5)
            </p>
            <div className="space-y-2">
              {myBetsForAward.map((bet) => {
                const player = PLAYERS.find((p) => p.id === bet.player_id);
                return (
                  <div key={bet.id} className="flex items-center gap-3 bg-[#0A1628] rounded-xl px-3 py-2.5">
                    {player && (
                      <div className="w-6 h-4 relative overflow-hidden rounded-sm shrink-0">
                        <Image
                          src={`https://flagcdn.com/w40/${player.countryCode}.png`}
                          alt={player.country} fill className="object-cover" unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {zh ? bet.player_name_zh : bet.player_name}
                      </p>
                      <p className="text-[10px] text-gray-500">{player?.club}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#FFD700]">{formatGc(bet.gc_amount)}</p>
                      <p className="text-[10px] text-gray-500">{bet.odds_multiplier}× · {lc(locale, "潜在", "→")} {formatGc(bet.gc_amount * bet.odds_multiplier)}</p>
                    </div>
                    {!isBettingClosed && (
                      <button
                        onClick={() => handleCancel(bet.id)}
                        disabled={isPending}
                        className="ml-2 text-gray-600 hover:text-red-400 transition-colors text-xs shrink-0"
                        title={lc(locale, "取消预测", "Cancel")}
                      >✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Player Grid ── */}
        <p className="text-xs text-gray-600 mb-4">
          {players.length} {lc(locale, "名候选", "candidates")}
        </p>
        <div key={activeAward} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((player) => {
            const bet = getBetForPlayer(player.id);
            const hasBet = !!bet;
            const pos = POSITION_LABELS[player.position];

            return (
              <div
                key={player.id}
                className={`relative bg-[#0F2040] rounded-2xl p-4 border transition-all ${
                  hasBet
                    ? "border-[#FFD700]/50 shadow-lg shadow-[#FFD700]/10"
                    : "border-[#1E3A5F] hover:border-[#7C6FE0]/40"
                }`}
              >
                {/* Already-bet badge */}
                {hasBet && (
                  <div className="absolute top-2.5 right-2.5 bg-[#FFD700] text-[#0A1628] text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    ✓ {lc(locale, "已押", "BET")}
                  </div>
                )}

                {/* Flag + Position */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-5 relative overflow-hidden rounded-sm shrink-0">
                    <Image
                      src={`https://flagcdn.com/w40/${player.countryCode}.png`}
                      alt={player.country} fill className="object-cover" unoptimized
                    />
                  </div>
                  <span
                    className="text-[10px] font-black px-1.5 py-0.5 rounded"
                    style={{ color: pos.color, backgroundColor: pos.color + "22" }}
                  >
                    {zh ? pos.zh : pos.en}
                  </span>
                </div>

                {/* Name */}
                <p className="text-sm font-black text-white leading-tight truncate">
                  {zh ? player.nameZh : player.name}
                </p>
                {zh && (
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{player.name}</p>
                )}

                {/* Club + Age */}
                <p className="text-[11px] text-gray-500 mt-1 truncate">{player.club}</p>
                <p className="text-[10px] text-gray-600">{player.age} {lc(locale, "岁", "y/o")}</p>

                {/* Bet info if existing */}
                {hasBet && (
                  <div className="mt-2 pt-2 border-t border-[#1E3A5F]">
                    <p className="text-[10px] text-gray-500">{lc(locale, "预测消耗", "GC Used")}</p>
                    <p className="text-sm font-black text-[#FFD700]">{formatGc(bet.gc_amount)}</p>
                    <p className="text-[10px] text-gray-600">{bet.odds_multiplier}× = {formatGc(bet.gc_amount * bet.odds_multiplier)}</p>
                  </div>
                )}

                {/* Action button */}
                {!isBettingClosed && (
                  userId ? (
                    <button
                      onClick={() => openModal(player)}
                      className={`mt-3 w-full py-1.5 rounded-xl text-xs font-black transition-all ${
                        hasBet
                          ? "bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/25"
                          : "bg-[#1E3A5F] text-gray-300 hover:bg-[#7C6FE0]/30 hover:text-white border border-[#1E3A5F] hover:border-[#7C6FE0]/50"
                      }`}
                    >
                      {hasBet ? (lc(locale, "+ 加预测", "+ Add")) : (lc(locale, "支持", "Predict"))}
                    </button>
                  ) : (
                    <Link
                      href={`/${locale}/auth/login`}
                      className="mt-3 block w-full py-1.5 rounded-xl text-xs font-black text-center bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200] transition-colors"
                    >
                      {lc(locale, "登录预测", "Login to Predict")}
                    </Link>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bet Modal ── */}
      {betModal && (
        <div
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!isPending) { setBetModal(null); setFeedback(null); } }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative bg-[#0D1E3A] border border-[#1E3A5F] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#1E3A5F]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 relative overflow-hidden rounded-sm shrink-0">
                  <Image
                    src={`https://flagcdn.com/w40/${betModal.countryCode}.png`}
                    alt={betModal.country} fill className="object-cover" unoptimized
                  />
                </div>
                <div>
                  <h3 className="text-white font-black text-base leading-tight">
                    {zh ? betModal.nameZh : betModal.name}
                  </h3>
                  <p className="text-gray-400 text-xs">{betModal.club} · {meta.icon} {zh ? meta.nameZh : meta.name}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Odds + phase info */}
              <div className="bg-[#0A1628] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">{lc(locale, "预测奖励", "Prediction Reward")}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: phaseConfig.color }}>
                      {phaseConfig.label}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{phaseConfig.sublabel}</p>
                    {activeAward === "goldenBoot" && (
                      <p className="text-[10px] text-orange-400 mt-1">
                        {lc(locale, "⚠️ 金靴奖于四强赛前截止下注", "⚠️ Golden Boot closes before semi-finals")}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-black text-[#FFD700]">{odds.toFixed(1)}×</span>
                </div>
              </div>

              {/* Percentage quick-bet */}
              <div>
                <p className="text-xs text-gray-500 mb-2">{lc(locale, "快速下注", "Quick bet")}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {PCT_PRESETS.map((pct) => {
                    const v = Math.max(Math.floor(localGc * pct), 1);
                    const active = betAmount === v && !customInput;
                    return (
                      <button
                        key={pct}
                        onClick={() => handlePreset(v)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                          active
                            ? "bg-[#FFD700] text-[#0A1628]"
                            : "bg-[#1E3A5F] text-gray-300 hover:text-white"
                        }`}
                      >
                        <span>{Math.round(pct * 100)}%</span>
                        <span className="text-[9px] opacity-70">{formatGc(v)}</span>
                      </button>
                    );
                  })}
                  {/* All in */}
                  <button
                    onClick={() => handlePreset(localGc)}
                    className={`py-1.5 rounded-lg text-[11px] font-black transition-all flex flex-col items-center gap-0.5 ${
                      betAmount === localGc && !customInput
                        ? "bg-[#FFD700] text-[#0A1628]"
                        : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    }`}
                  >
                    <span>{lc(locale, "全押", "All in")}</span>
                    <span className="text-[9px] opacity-70">{formatGc(localGc)}</span>
                  </button>
                </div>
              </div>

              {/* Custom input */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">{lc(locale, "自定义金额", "Custom amount")}</p>
                <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-3 py-2">
                  <input
                    type="number"
                    min={MIN_BET}
                    placeholder={zh ? `最低 ${formatGc(MIN_BET)}…` : `Min ${formatGc(MIN_BET)}…`}
                    value={customInput}
                    onChange={(e) => { setCustomInput(e.target.value); setBetAmount(0); }}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                  />
                  <span className="text-xs text-gray-500 shrink-0">GC</span>
                </div>
              </div>

              {/* Expected return */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{lc(locale, "预计回报", "Expected Return")}</span>
                <span className="text-sm font-black text-green-400">
                  {formatGc(Math.floor(effectiveAmount() * odds))} GC
                </span>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between border-t border-[#1E3A5F] pt-3">
                <span className="text-xs text-gray-500">{lc(locale, "当前余额", "Balance")}</span>
                <span className="text-sm font-black text-[#FFD700]">{formatGc(localGc)}</span>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`rounded-xl px-3 py-2 text-xs font-semibold text-center ${
                  feedback.type === "ok"
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
                }`}>
                  {feedback.msg}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={handlePlaceBet}
                disabled={isPending || isBettingClosed}
                className="flex-1 bg-[#FFD700] text-[#0A1628] font-black py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50"
              >
                {isPending ? "…" : (lc(locale, "确认预测", "Confirm Prediction"))}
              </button>
              <button
                onClick={() => { setBetModal(null); setFeedback(null); }}
                disabled={isPending}
                className="px-4 py-2.5 border border-[#1E3A5F] text-gray-400 rounded-xl text-sm hover:text-white hover:border-gray-500 transition-colors"
              >
                {lc(locale, "取消", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
