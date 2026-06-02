import { createServiceClient } from "@/lib/supabase/service";
import { formatGc }            from "@/lib/levels";

interface Props { params: Promise<{ locale: string }> }

export default async function AdminFinancePage({ params }: Props) {
  const { locale } = await params;
  const zh      = locale === "zh";
  const service = createServiceClient();

  // ── Summary stats ────────────────────────────────────────────────────────
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const since7d  = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [allTopups, topups24h, topups7d, gcTxAll] = await Promise.all([
    service.from("gc_transactions").select("amount").eq("type", "topup"),
    service.from("gc_transactions").select("amount").eq("type", "topup").gte("created_at", since24h),
    service.from("gc_transactions").select("amount").eq("type", "topup").gte("created_at", since7d),
    service.from("gc_transactions").select("id, user_id, amount, type, note, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const totalGc  = (allTopups.data  ?? []).reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const gc24h    = (topups24h.data  ?? []).reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const gc7d     = (topups7d.data   ?? []).reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const txRows   = gcTxAll.data ?? [];

  // ── Fetch user nicknames ─────────────────────────────────────────────────
  const uids = [...new Set(txRows.map((t) => t.user_id).filter(Boolean))];
  const { data: users } = uids.length
    ? await service.from("users").select("id, nickname").in("id", uids)
    : { data: [] };
  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.nickname]));

  // ── Type label helper ────────────────────────────────────────────────────
  function txLabel(type: string) {
    const map: Record<string, string> = {
      topup:          zh ? "充值"      : "Topup",
      bet_placed:     zh ? "预测消耗"  : "Prediction",
      bet_refunded:   zh ? "预测退还"  : "Prediction Refund",
      bet_won:        zh ? "预测奖励"  : "Prediction Reward",
      daily_checkin:  zh ? "每日签到"  : "Daily Check-in",
      share_reward:   zh ? "分享奖励"  : "Share Reward",
      forum_post:     zh ? "发帖奖励"  : "Forum Post",
      forum_like:     zh ? "点赞奖励"  : "Forum Like",
      admin_award:    zh ? "管理员奖励": "Admin Award",
      admin_deduct:   zh ? "管理员扣除": "Admin Deduct",
    };
    return map[type] ?? type;
  }

  function amountColor(type: string, amount: number) {
    if (amount > 0) return "text-green-400";
    if (amount < 0) return "text-red-400";
    return "text-gray-500";
  }

  return (
    <div className="pt-6 space-y-6 text-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F2040] to-[#1A1A3E] border border-[#FFD700]/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <h1 className="text-2xl font-black">{zh ? "财务管理" : "Finance"}</h1>
            <p className="text-gray-400 text-sm">{zh ? "充值记录与 GC 流水" : "Topup & GC transaction history"}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "💰", label: zh ? "总充值 GC" : "Total Topup GC", value: formatGc(totalGc) },
          { icon: "📅", label: zh ? "近 7 天"    : "Last 7 Days",   value: formatGc(gc7d)    },
          { icon: "⏱️", label: zh ? "近 24 小时" : "Last 24 Hours", value: formatGc(gc24h)   },
        ].map((c) => (
          <div key={c.label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-xl font-black text-[#FFD700] truncate">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Transaction table */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1E3A5F]">
          <h2 className="font-black text-sm">{zh ? "最近 100 条流水" : "Recent 100 Transactions"}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E3A5F] text-gray-500 text-xs">
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "时间" : "Time"}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "用户" : "User"}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "类型" : "Type"}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{zh ? "金额 GC" : "Amount GC"}</th>
                <th className="px-4 py-2.5 text-left font-semibold">{zh ? "备注" : "Note"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A5F]/30">
              {txRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">
                    {zh ? "暂无记录" : "No records yet"}
                  </td>
                </tr>
              )}
              {txRows.map((t) => (
                <tr key={t.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[120px]">
                    {userMap[t.user_id] ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E3A5F] text-gray-300">
                      {txLabel(t.type)}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-black ${amountColor(t.type, Number(t.amount))}`}>
                    {Number(t.amount) >= 0 ? "+" : ""}{formatGc(Number(t.amount))}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs truncate max-w-[180px]">
                    {t.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
