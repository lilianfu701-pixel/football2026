"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportActions({ reportId, zh }: { reportId: number; zh: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(status: "reviewed" | "dismissed") {
    setBusy(status);
    await fetch("/api/forum/admin/report-action", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ report_id: reportId, status }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button onClick={() => act("reviewed")} disabled={!!busy}
        className="px-3 py-1.5 text-xs font-bold bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/25 transition-all disabled:opacity-50">
        {busy === "reviewed" ? "…" : (zh ? "已处理" : "Resolve")}
      </button>
      <button onClick={() => act("dismissed")} disabled={!!busy}
        className="px-3 py-1.5 text-xs font-bold bg-gray-500/15 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-500/25 transition-all disabled:opacity-50">
        {busy === "dismissed" ? "…" : (zh ? "忽略" : "Dismiss")}
      </button>
    </div>
  );
}
