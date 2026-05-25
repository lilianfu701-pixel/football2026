"use client";

import { useState } from "react";
import { getMaxAmount, makePresets, fmtGC } from "@/lib/forum/ratingCap";

interface Props {
  mode:           "transfer-btn";
  targetUserId:   string;
  targetNickname: string;
  targetBalance:  number;
  locale:         string;
  zh:             boolean;
}

export default function ProfileTabs({
  targetUserId,
  targetNickname,
  targetBalance,
  locale,
  zh,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [direction, setDirection] = useState<"give" | "deduct">("give");
  const [customAmt, setCustomAmt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const maxAmount = getMaxAmount(targetBalance);
  const presets   = makePresets(maxAmount);

  const amount = selectedPreset ?? (parseInt(customAmt, 10) || 0);
  const finalAmount = Math.min(Math.max(0, amount), maxAmount);
  const signedAmount = direction === "deduct" ? -finalAmount : finalAmount;

  async function handleSubmit() {
    if (finalAmount <= 0) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/profile/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: targetUserId,
          gc_amount:      signedAmount,
          reason:         reason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: json.error ?? "Failed" });
      } else {
        setResult({
          ok: true,
          msg: zh
            ? `成功${direction === "give" ? "转赠" : "扣除"} ${fmtGC(finalAmount)} GC`
            : `Successfully ${direction === "give" ? "sent" : "deducted"} ${fmtGC(finalAmount)} GC`,
        });
        setTimeout(() => { setShowModal(false); window.location.reload(); }, 1500);
      }
    } catch {
      setResult({ ok: false, msg: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setShowModal(true); setResult(null); setSelectedPreset(presets[1] ?? presets[0] ?? null); setCustomAmt(""); }}
        className="shrink-0 flex items-center gap-2 bg-[#FFD700] text-[#0A1628] font-black px-4 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
      >
        🪙 {zh ? "转 GC" : "Send GC"}
      </button>

      {/* Modal Overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">
                🪙 {zh ? "GC 转账" : "Transfer GC"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>

            {/* Target */}
            <div className="bg-[#0A1628] rounded-xl p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-400">{zh ? "对象" : "To"}</span>
              <span className="text-sm font-bold text-white">{targetNickname}</span>
            </div>

            {/* Direction toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDirection("give")}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  direction === "give"
                    ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : "bg-[#0A1628] border-[#1E3A5F] text-gray-500 hover:text-white"
                }`}
              >
                ➕ {zh ? "加分（转赠）" : "Give (+)"}
              </button>
              <button
                type="button"
                onClick={() => setDirection("deduct")}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  direction === "deduct"
                    ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : "bg-[#0A1628] border-[#1E3A5F] text-gray-500 hover:text-white"
                }`}
              >
                ➖ {zh ? "扣分（扣除）" : "Deduct (-)"}
              </button>
            </div>

            {/* Max hint */}
            <div className="text-[10px] text-gray-500 mb-2 text-right">
              {zh ? "上限" : "Max"}: <span className="text-[#FFD700] font-bold">{fmtGC(maxAmount)} GC</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setSelectedPreset(p); setCustomAmt(""); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    selectedPreset === p
                      ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                      : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white"
                  }`}
                >
                  {fmtGC(p)}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <input
              type="number"
              min={1}
              max={maxAmount}
              value={customAmt}
              onChange={(e) => { setCustomAmt(e.target.value); setSelectedPreset(null); }}
              placeholder={zh ? "自定义金额" : "Custom amount"}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm mb-3
                         focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors placeholder-gray-600"
            />

            {/* Reason */}
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={100}
              placeholder={zh ? "转账原因（可选）" : "Reason (optional)"}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm mb-4
                         focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors placeholder-gray-600"
            />

            {/* Preview */}
            {finalAmount > 0 && (
              <div className={`rounded-xl p-3 mb-4 text-center text-sm font-bold ${
                direction === "give"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {direction === "give" ? "+" : "-"}{fmtGC(finalAmount)} GC → {targetNickname}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`rounded-xl p-3 mb-4 text-center text-sm font-bold ${
                result.ok
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {result.msg}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || finalAmount <= 0}
              className={`w-full font-bold py-3 rounded-xl transition-colors disabled:opacity-40 ${
                direction === "give"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {submitting
                ? (zh ? "处理中…" : "Processing...")
                : direction === "give"
                  ? (zh ? `确认转赠 ${fmtGC(finalAmount)} GC` : `Confirm Send ${fmtGC(finalAmount)} GC`)
                  : (zh ? `确认扣除 ${fmtGC(finalAmount)} GC` : `Confirm Deduct ${fmtGC(finalAmount)} GC`)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
