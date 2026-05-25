"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  postId:      number;
  isPinned:    boolean;
  isLocked:    boolean;
  isFeatured?: boolean;
  locale:      string;
  zh:          boolean;
}

export default function AdminPostControls({ postId, isPinned, isLocked, isFeatured = false, locale, zh }: Props) {
  const router = useRouter();

  const [pinned,    setPinned]    = useState(isPinned);
  const [locked,    setLocked]    = useState(isLocked);
  const [featured,  setFeatured]  = useState(isFeatured);
  const [busy,      setBusy]      = useState<string | null>(null);
  const [err,       setErr]       = useState<string | null>(null);

  async function doAction(action: "pin" | "unpin" | "lock" | "unlock" | "feature" | "unfeature") {
    setBusy(action);
    setErr(null);
    try {
      const res  = await fetch("/api/forum/admin/manage", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ post_id: postId, action }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Failed"); return; }

      // Optimistic state update
      if (action === "pin")       setPinned(true);
      if (action === "unpin")     setPinned(false);
      if (action === "lock")      setLocked(true);
      if (action === "unlock")    setLocked(false);
      if (action === "feature")   setFeatured(true);
      if (action === "unfeature") setFeatured(false);

      router.refresh();   // sync server-rendered badges
    } catch {
      setErr(zh ? "网络错误" : "Network error");
    } finally {
      setBusy(null);
    }
  }

  const btnBase =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black " +
    "border transition-all disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#050D1A] border-b border-[#FFD700]/10 flex-wrap">
      {/* Admin label */}
      <span className="text-[10px] font-black text-[#FFD700]/50 uppercase tracking-widest mr-1 shrink-0">
        🛡 {zh ? "管理" : "Admin"}
      </span>

      {/* Pin / Unpin */}
      {pinned ? (
        <button
          onClick={() => doAction("unpin")}
          disabled={!!busy}
          className={`${btnBase} bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20`}
        >
          {busy === "unpin" ? "…" : "📌"} {zh ? "取消置顶" : "Unpin"}
        </button>
      ) : (
        <button
          onClick={() => doAction("pin")}
          disabled={!!busy}
          className={`${btnBase} bg-[#1E3A5F]/60 border-[#1E3A5F] text-gray-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400`}
        >
          {busy === "pin" ? "…" : "📌"} {zh ? "置顶" : "Pin"}
        </button>
      )}

      {/* Lock / Unlock */}
      {locked ? (
        <button
          onClick={() => doAction("unlock")}
          disabled={!!busy}
          className={`${btnBase} bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20`}
        >
          {busy === "unlock" ? "…" : "🔓"} {zh ? "解锁" : "Unlock"}
        </button>
      ) : (
        <button
          onClick={() => doAction("lock")}
          disabled={!!busy}
          className={`${btnBase} bg-[#1E3A5F]/60 border-[#1E3A5F] text-gray-400 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-400`}
        >
          {busy === "lock" ? "…" : "🔒"} {zh ? "锁定" : "Lock"}
        </button>
      )}

      {/* Feature / Unfeature */}
      {featured ? (
        <button onClick={() => doAction("unfeature")} disabled={!!busy}
          className={`${btnBase} bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20`}>
          {busy === "unfeature" ? "…" : "⭐"} {zh ? "取消精华" : "Unfeature"}
        </button>
      ) : (
        <button onClick={() => doAction("feature")} disabled={!!busy}
          className={`${btnBase} bg-[#1E3A5F]/60 border-[#1E3A5F] text-gray-400 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-400`}>
          {busy === "feature" ? "…" : "⭐"} {zh ? "加精" : "Feature"}
        </button>
      )}

      {/* Separator */}
      <span className="w-px h-4 bg-[#1E3A5F] shrink-0" />

      {/* Move to category — placeholder for future */}
      <span className="text-[10px] text-gray-700 font-medium">
        {zh ? `ID: ${postId}` : `Post #${postId}`}
      </span>

      {/* Error */}
      {err && (
        <span className="text-[10px] text-red-400 ml-1">⚠ {err}</span>
      )}
    </div>
  );
}
