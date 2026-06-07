"use client";

import { useState, useEffect } from "react";
import { getMaxAmount, makePresets, fmtGC } from "@/lib/forum/ratingCap";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";

interface Props {
  postId:            number;
  replyId?:          number;
  authorName:        string;
  recipientBalance?: number;   // recipient's current gc_balance — drives the cap
  initialMode?:      "reward" | "punish";
  locale:            string;
  zh:                boolean;
  onClose:           () => void;
  onDone:            () => void;
}

export default function RatingModal({
  postId, replyId, authorName,
  recipientBalance = 0,
  initialMode = "reward", zh, onClose, onDone,
}: Props) {
  const locale = useLocale();
  const maxAmount = getMaxAmount(recipientBalance);
  const PRESETS   = makePresets(maxAmount);

  const [mode,       setMode]       = useState<"reward" | "punish">(initialMode);
  const [preset,     setPreset]     = useState<number>(PRESETS[1] ?? PRESETS[0]);
  const [custom,     setCustom]     = useState<string>("");
  const [useCustom,  setUseCustom]  = useState(false);
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const finalAmount = useCustom
    ? Math.max(1, Math.min(maxAmount, parseInt(custom || "0", 10) || 0))
    : preset;

  const fee = Math.min(Math.floor(finalAmount / 2), Math.floor(maxAmount * 0.05));

  async function handleSubmit() {
    if (finalAmount <= 0) {
      setErr(lc(locale, "请输入有效金额", "Invalid amount"));
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/forum/rate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id:  postId,
          reply_id: replyId ?? undefined,
          gc_amount: mode === "reward" ? finalAmount : -finalAmount,
          reason:   reason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? (lc(locale, "操作失败", "Failed")));
        return;
      }
      onDone();
    } catch {
      setErr(lc(locale, "网络错误", "Network error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,10,25,0.88)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">

        {/* top accent */}
        <div className={`h-0.5 ${mode === "reward" ? "bg-gradient-to-r from-[#FFD700] via-[#FFD700]/50 to-transparent" : "bg-gradient-to-r from-red-500 via-red-500/50 to-transparent"}`} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3A5F]/70">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              💰 {lc(locale, "赏罚 GC", "Rate with GC")}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {lc(locale, "对象：", "To: ")}
              <span className="text-[#FFD700] font-bold">{authorName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1E3A5F] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#080F1F] rounded-xl p-1">
            {(["reward", "punish"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black transition-all ${
                  mode === m
                    ? m === "reward"
                      ? "bg-[#FFD700]/15 border border-[#FFD700]/35 text-[#FFD700]"
                      : "bg-red-500/15 border border-red-500/35 text-red-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {m === "reward" ? "🎁" : "🔨"}
                {m === "reward" ? (lc(locale, "赏（奖励）", "Reward")) : (lc(locale, "罚（扣除）", "Punish"))}
              </button>
            ))}
          </div>

          {/* Preset amounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                GC {lc(locale, "金额", "Amount")}
              </p>
              <p className="text-[10px] text-gray-600">
                {lc(locale, "上限", "Max")}{" "}
                <span className="font-black text-gray-500">{fmtGC(maxAmount)} GC</span>
              </p>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setUseCustom(false); }}
                  className={`py-2 rounded-lg text-[11px] font-black transition-all border ${
                    !useCustom && preset === p
                      ? mode === "reward"
                        ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                        : "bg-red-500/15 border-red-500/40 text-red-400"
                      : "border-[#1E3A5F] text-gray-500 hover:text-white hover:border-[#1E3A5F]/70"
                  }`}
                >
                  {fmtGC(p)}
                </button>
              ))}
            </div>
            {/* Custom input */}
            <div className="relative">
              <input
                type="number"
                min={1}
                max={maxAmount}
                value={custom}
                onFocus={() => setUseCustom(true)}
                onChange={(e) => { setCustom(e.target.value); setUseCustom(true); }}
                placeholder={zh ? `自定义金额 (1–${fmtGC(maxAmount)})` : `Custom (1–${fmtGC(maxAmount)})`}
                className={`w-full bg-[#080F1F] rounded-xl border px-3 py-2.5 text-sm text-white placeholder-gray-700 outline-none transition-colors ${
                  useCustom
                    ? mode === "reward" ? "border-[#FFD700]/40" : "border-red-500/40"
                    : "border-[#1E3A5F] focus:border-[#2A4A7F]"
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-bold pointer-events-none">GC</span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">
              {lc(locale, "理由（可选，最多 80 字）", "Reason (optional)")}
            </p>
            <input
              type="text"
              maxLength={80}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={lc(locale, "填写赏罚理由…", "Enter your reason…")}
              className="w-full bg-[#080F1F] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-[#2A4A7F] transition-colors"
            />
          </div>

          {/* Summary box */}
          <div className={`rounded-xl border px-4 py-3 text-[11px] space-y-1.5 ${
            mode === "reward" ? "bg-[#FFD700]/5 border-[#FFD700]/15" : "bg-red-500/5 border-red-500/15"
          }`}>
            {mode === "reward" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">{lc(locale, "你支出", "You spend")}</span>
                  <span className="font-black text-[#FFD700]">−{finalAmount.toLocaleString()} GC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{zh ? `${authorName} 获得` : `${authorName} gets`}</span>
                  <span className="font-black text-green-400">+{finalAmount.toLocaleString()} GC</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">{zh ? `${authorName} 扣除` : `${authorName} loses`}</span>
                  <span className="font-black text-red-400">−{finalAmount.toLocaleString()} GC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{lc(locale, "手续费（你支出）", "Your fee")}</span>
                  <span className="font-black text-orange-400">−{fee.toLocaleString()} GC</span>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {err && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              ⚠ {err}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#1E3A5F] text-sm font-bold text-gray-400 hover:text-white hover:border-[#2A4A7F] transition-colors"
            >
              {lc(locale, "取消", "Cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || finalAmount <= 0}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 ${
                mode === "reward"
                  ? "bg-gradient-to-r from-[#FFD700] to-[#F59E0B] text-[#0A1628] hover:brightness-110 shadow-lg shadow-[#FFD700]/15"
                  : "bg-gradient-to-r from-red-600 to-rose-700 text-white hover:brightness-110 shadow-lg shadow-red-500/15"
              }`}
            >
              {submitting
                ? "…"
                : mode === "reward"
                  ? (lc(locale, "🎁 确认赏", "🎁 Reward"))
                  : (lc(locale, "🔨 确认罚", "🔨 Punish"))}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
