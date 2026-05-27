"use client";

import { useState } from "react";
import { formatGc }  from "@/lib/levels";

interface Props { locale: string }

export default function GcAwardForm({ locale }: Props) {
  const zh = locale === "zh";

  const [userId,  setUserId]  = useState("");
  const [amount,  setAmount]  = useState("");
  const [note,    setNote]    = useState("");
  const [action,  setAction]  = useState<"award" | "deduct">("award");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const gc = Number(amount);
    if (!userId.trim()) {
      setResult({ ok: false, msg: zh ? "请输入用户 ID" : "User ID is required" });
      return;
    }
    if (!gc || gc <= 0 || !Number.isInteger(gc)) {
      setResult({ ok: false, msg: zh ? "GC 必须为正整数" : "GC must be a positive integer" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/gc-award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId.trim(), gc_amount: gc, action, note: note.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: json.error ?? (zh ? "操作失败" : "Operation failed") });
      } else {
        setResult({
          ok: true,
          msg: zh
            ? `成功：用户余额现为 ${formatGc(json.new_balance)} GC`
            : `Done — new balance: ${formatGc(json.new_balance)} GC`,
        });
        setUserId("");
        setAmount("");
        setNote("");
      }
    } catch {
      setResult({ ok: false, msg: zh ? "网络错误" : "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Action toggle */}
      <div className="flex gap-2">
        {(["award", "deduct"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
              action === a
                ? a === "award"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-[#1E3A5F]/40 text-gray-500 border border-[#1E3A5F]/40 hover:text-white"
            }`}
          >
            {a === "award"
              ? (zh ? "➕ 奖励 GC" : "➕ Award GC")
              : (zh ? "➖ 扣除 GC" : "➖ Deduct GC")}
          </button>
        ))}
      </div>

      {/* User ID */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">{zh ? "用户 ID（UUID）" : "User ID (UUID)"}</label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full bg-[#080F1F] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FFD700]/40"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">{zh ? "GC 数量" : "GC Amount"}</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000"
          min={1}
          step={1}
          className="w-full bg-[#080F1F] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FFD700]/40"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">{zh ? "备注（可选）" : "Note (optional)"}</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={zh ? "例如：活动奖励" : "e.g. event reward"}
          className="w-full bg-[#080F1F] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#FFD700]/40"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-xl text-sm font-black transition-all ${
          action === "award"
            ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
            : "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading
          ? (zh ? "处理中…" : "Processing…")
          : action === "award"
            ? (zh ? "确认奖励" : "Confirm Award")
            : (zh ? "确认扣除" : "Confirm Deduct")}
      </button>

      {/* Result */}
      {result && (
        <div className={`p-3 rounded-xl text-sm font-semibold ${
          result.ok
            ? "bg-green-500/10 border border-green-500/20 text-green-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {result.msg}
        </div>
      )}
    </form>
  );
}
