import { createServiceClient } from "@/lib/supabase/service";
import { formatGc }            from "@/lib/levels";

interface Props { params: Promise<{ locale: string }> }

type BetStatus = "pending" | "won" | "lost" | "refunded";

function StatusBadge({ status }: { status: BetStatus }) {
  const map: Record<BetStatus, { label: string; cls: string }> = {
    pending:  { label: "Pending",  cls: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" },
    won:      { label: "Won",      cls: "bg-green-500/15  text-green-400  border border-green-500/20"  },
    lost:     { label: "Lost",     cls: "bg-red-500/15    text-red-400    border border-red-500/20"    },
    refunded: { label: "Refunded", cls: "bg-gray-500/15   text-gray-400   border border-gray-500/20"   },
  };
  const { label, cls } = map[status] ?? map.pending;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>
  );
}

export default async function AdminBetsPage({ params }: Props) {
  const { locale } = await params;
  const zh      = locale === "zh";
  const service = createServiceClient();

  // ── Stats ────────────────────────────────────────────────────────────────
  const [pendingRes, wonRes, lostRes, allBetsRes] = await Promise.all([
    service.from("bets").select("id, amount_gc", { count: "exact" }).eq("status", "pending"),
    service.from("bets").select("id", { count: "exact", head: true }).eq("status", "won"),
    service.from("bets").select("id", { count: "exact", head: true }).eq("status", "lost"),
    service.from("bets")
      .select("id, user_id, match_id, pick, amount_gc, payout_gc, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const pendingPool = (pendingRes.data ?? []).reduce((s, b) => s + Number(b.amount_gc ?? 0), 0);
  const bets        = allBetsRes.data ?? [];

  // ── Enrich with user + match info ────────────────────────────────────────
  const uids    = [...new Set(bets.map((b) => b.user_id).filter(Boolean))];
  const mids    = [...new Set(bets.map((b) => b.match_id).filter(Boolean))];

  const [usersRes, matchesRes] = await Promise.all([
    uids.length ? service.from("users").select("id, nickname").in("id", uids)   : { data: [] },
    mids.length ? service.from("matches").select("id, home_team, away_team, match_date").in("id", mids) : { data: [] },
  ]);

  const userMap  = Object.fromEntries((usersRes.data  ?? []).map((u) => [u.id, u.nickname]));
  const matchMap = Object.fromEntries((matchesRes.data ?? []).map((m) => [m.id, m]));

  function pickLabel(pick: string) {
    return pick === "home" ? "🏠 Home" : pick === "away" ? "✈️ Away" : "🤝 Draw";
  }

  return (
    <div className="pt-6 space-y-6 text-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F2040] to-[#1A1A3E] border border-[#FFD700]/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h1 className="text-2xl font-black">{zh ? "投注管理" : "Bets Management"}</h1>
            <p className="text-gray-400 text-sm">{zh ? "所有投注记录，最近 100 条" : "All bets — recent 100"}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "⏳", label: zh ? "待结算"   : "Pending",    value: pendingRes.count ?? 0, sub: `Pool: ${formatGc(pendingPool)} GC`, urgent: true },
          { icon: "🏆", label: zh ? "中奖"      : "Won",        value: wonRes.count  ?? 0 },
          { icon: "❌", label: zh ? "未中奖"    : "Lost",       value: lostRes.count ?? 0 },
          { icon: "↩️", label: zh ? "已退款"    : "Refunded",   value: "-" },
        ].map((c) => (
          <div key={c.label} className={`bg-[#0F2040] border rounded-2xl p-4 ${c.urgent ? "border-yellow-500/30" : "border-[#1E3A5F]"}`}>
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className={`text-xl font-black ${c.urgent ? "text-yellow-400" : "text-[#FFD700]"}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            {c.sub && <p className="text-[10px] text-gray-600 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Bets table */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1E3A5F]">
          <h2 className="font-black text-sm">{zh ? "最近 100 条投注" : "Recent 100 Bets"}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E3A5F] text-gray-500 text-xs">
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "时间" : "Time"}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "用户" : "User"}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "比赛" : "Match"}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "选项" : "Pick"}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{zh ? "投注 GC" : "Bet GC"}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{zh ? "派彩 GC" : "Payout GC"}</th>
                <th className="px-4 py-2.5 text-center font-semibold">{zh ? "状态" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A5F]/30">
              {bets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-sm">
                    {zh ? "暂无投注记录" : "No bets yet"}
                  </td>
                </tr>
              )}
              {bets.map((b) => {
                const match = matchMap[b.match_id];
                return (
                  <tr key={b.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[100px]">
                      {userMap[b.user_id] ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 text-xs truncate max-w-[150px]">
                      {match ? `${match.home_team} vs ${match.away_team}` : b.match_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-300">{pickLabel(b.pick)}</td>
                    <td className="px-4 py-2.5 text-right font-black text-[#FFD700]">
                      {formatGc(Number(b.amount_gc ?? 0))}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-green-400">
                      {b.payout_gc != null ? formatGc(Number(b.payout_gc)) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={b.status as BetStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
