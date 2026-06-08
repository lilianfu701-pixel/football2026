"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGcBalance } from "@/context/GcBalance";

interface Props {
  userId:    string;
  userName:  string;
  gcBalance: number;
  isAdmin:   boolean;
  isBanned:  boolean;
  zh:        boolean;
  myId:      string;
}

export default function UserAdminActions({ userId, userName, gcBalance, isAdmin, isBanned, zh, myId }: Props) {
  const router = useRouter();
  const { setBalance: setHeaderBalance, refresh: refreshHeaderBalance } = useGcBalance();

  // Ban / admin busy state
  const [busy, setBusy] = useState<string | null>(null);

  // GC panel state
  const [showGc,    setShowGc]    = useState(false);
  const [gcAction,  setGcAction]  = useState<"award" | "deduct">("award");
  const [gcAmount,  setGcAmount]  = useState("");
  const [gcNote,    setGcNote]    = useState("");
  const [gcLoading, setGcLoading] = useState(false);
  const [gcResult,  setGcResult]  = useState<{ ok: boolean; msg: string } | null>(null);

  const isSelf = userId === myId;

  async function act(action: string) {
    setBusy(action);
    await fetch("/api/admin/user-action", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_id: userId, action }),
    });
    setBusy(null);
    router.refresh();
  }

  async function handleGcSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gc = Number(gcAmount);
    if (!gc || gc <= 0 || !Number.isInteger(gc)) {
      setGcResult({ ok: false, msg: zh ? "请输入正整数" : "Enter a positive integer" });
      return;
    }
    setGcLoading(true);
    setGcResult(null);
    try {
      const res = await fetch("/api/admin/gc-award", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: userId, gc_amount: gc, action: gcAction, note: gcNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGcResult({ ok: false, msg: json.error ?? (zh ? "操作失败" : "Failed") });
      } else {
        const newBal = json.new_balance ?? 0;
        const balStr = newBal >= 1_000_000
          ? (newBal / 1_000_000).toFixed(2) + "M"
          : newBal.toLocaleString();
        setGcResult({
          ok:  true,
          msg: zh ? `✅ 成功！新余额：${balStr} GC` : `✅ Done! New balance: ${balStr} GC`,
        });
        setGcAmount("");
        setGcNote("");
        // If the admin adjusted their own balance, sync the header GC widget
        // immediately — router.refresh() re-renders server components but does
        // not reset the GcBalance context's client useState.
        if (isSelf) {
          if (typeof json.new_balance === "number") {
            setHeaderBalance(json.new_balance);
          } else {
            await refreshHeaderBalance();
          }
        }
        router.refresh();
      }
    } catch {
      setGcResult({ ok: false, msg: zh ? "网络错误" : "Network error" });
    } finally {
      setGcLoading(false);
    }
  }

  const balDisplay = gcBalance >= 1_000_000
    ? (gcBalance / 1_000_000).toFixed(1) + "M"
    : gcBalance.toLocaleString();

  return (
    <div className="flex flex-col gap-1 items-end shrink-0">
      {/* Action buttons row */}
      <div className="flex gap-1">
        {/* GC tool — shown for all users including self */}
        <button
          onClick={() => { setShowGc(!showGc); setGcResult(null); }}
          title={zh ? "GC 奖励 / 扣除" : "Award / Deduct GC"}
          className={`px-2.5 py-1.5 rounded text-[10px] font-black border transition-all ${
            showGc
              ? "bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFD700]"
              : "bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]/70 hover:bg-[#FFD700]/20 hover:text-[#FFD700]"
          }`}
        >
          🪙 GC
        </button>

        {/* Ban / Unban — hidden for self */}
        {!isSelf && (
          <button
            onClick={() => act(isBanned ? "unban" : "ban")}
            disabled={!!busy}
            className={`px-2.5 py-1.5 rounded text-[10px] font-black border transition-all disabled:opacity-50 ${
              isBanned
                ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {busy === "ban" || busy === "unban" ? "…" : isBanned ? (zh ? "解封" : "Unban") : (zh ? "封号" : "Ban")}
          </button>
        )}

        {/* Admin toggle — hidden for self */}
        {!isSelf && (
          <button
            onClick={() => act(isAdmin ? "unadmin" : "admin")}
            disabled={!!busy}
            className="px-2.5 py-1.5 rounded text-[10px] font-black border border-[#1E3A5F] text-gray-500 hover:text-[#FFD700] hover:border-[#FFD700]/30 transition-all disabled:opacity-50"
          >
            {busy === "admin" || busy === "unadmin" ? "…" : isAdmin ? (zh ? "撤管理" : "Rm Admin") : (zh ? "设管理" : "Mk Admin")}
          </button>
        )}
      </div>

      {/* Inline GC Panel */}
      {showGc && (
        <div className="w-64 bg-[#080F1F] border border-[#FFD700]/25 rounded-xl p-3 space-y-2 text-left shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-[#FFD700]/80 uppercase tracking-wide">
              {zh ? "GC 操作" : "GC Tool"}
            </p>
            <p className="text-[10px] text-gray-600">
              {zh ? `当前：${balDisplay} GC` : `Current: ${balDisplay} GC`}
            </p>
          </div>

          {/* Award / Deduct toggle */}
          <div className="flex gap-1.5">
            {(["award", "deduct"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setGcAction(a)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                  gcAction === a
                    ? a === "award"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-[#1E3A5F]/30 text-gray-600 border-[#1E3A5F]/30 hover:text-gray-400"
                }`}
              >
                {a === "award" ? (zh ? "➕ 奖励" : "➕ Award") : (zh ? "➖ 扣除" : "➖ Deduct")}
              </button>
            ))}
          </div>

          <form onSubmit={handleGcSubmit} className="space-y-1.5">
            <input
              type="number"
              value={gcAmount}
              onChange={(e) => setGcAmount(e.target.value)}
              placeholder={zh ? "GC 数量（整数）" : "GC amount (integer)"}
              min={1}
              step={1}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#FFD700]/30"
            />
            <input
              value={gcNote}
              onChange={(e) => setGcNote(e.target.value)}
              placeholder={zh ? "备注（可选）" : "Note (optional)"}
              className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#FFD700]/30"
            />
            <button
              type="submit"
              disabled={gcLoading}
              className={`w-full py-1.5 rounded-lg text-[10px] font-black border transition-all disabled:opacity-50 ${
                gcAction === "award"
                  ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              }`}
            >
              {gcLoading
                ? (zh ? "处理中…" : "Processing…")
                : gcAction === "award"
                  ? (zh ? "确认奖励" : "Confirm Award")
                  : (zh ? "确认扣除" : "Confirm Deduct")}
            </button>
          </form>

          {gcResult && (
            <p className={`text-[10px] font-semibold leading-snug ${gcResult.ok ? "text-green-400" : "text-red-400"}`}>
              {gcResult.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
