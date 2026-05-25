"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { userId: string; isAdmin: boolean; isBanned: boolean; zh: boolean; myId: string }

export default function UserAdminActions({ userId, isAdmin, isBanned, zh, myId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (userId === myId) return null;

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

  return (
    <div className="flex gap-1 shrink-0">
      <button onClick={() => act(isBanned ? "unban" : "ban")} disabled={!!busy}
        className={`px-2.5 py-1.5 rounded text-[10px] font-black border transition-all disabled:opacity-50 ${
          isBanned
            ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
            : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
        }`}>
        {busy === "ban" || busy === "unban" ? "…" : (isBanned ? (zh ? "解封" : "Unban") : (zh ? "封号" : "Ban"))}
      </button>
      <button onClick={() => act(isAdmin ? "unadmin" : "admin")} disabled={!!busy}
        className="px-2.5 py-1.5 rounded text-[10px] font-black border border-[#1E3A5F] text-gray-500 hover:text-[#FFD700] hover:border-[#FFD700]/30 transition-all disabled:opacity-50">
        {busy === "admin" || busy === "unadmin" ? "…" : (isAdmin ? (zh ? "撤销管理" : "Remove Admin") : (zh ? "设管理员" : "Make Admin"))}
      </button>
    </div>
  );
}
