import { createServiceClient } from "@/lib/supabase/service";
import { formatGc }            from "@/lib/levels";
import GcAwardForm             from "@/components/admin/GcAwardForm";

interface Props { params: Promise<{ locale: string }> }

export default async function AdminGcToolsPage({ params }: Props) {
  const { locale } = await params;
  const zh      = locale === "zh";
  const service = createServiceClient();

  // ── Recent admin GC operations ───────────────────────────────────────────
  const { data: recentOps } = await service
    .from("gc_transactions")
    .select("id, user_id, amount, type, note, created_at")
    .in("type", ["admin_award", "admin_deduct"])
    .order("created_at", { ascending: false })
    .limit(20);

  const uids = [...new Set((recentOps ?? []).map((t) => t.user_id).filter(Boolean))];
  const { data: users } = uids.length
    ? await service.from("users").select("id, nickname").in("id", uids)
    : { data: [] };
  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.nickname]));

  return (
    <div className="pt-6 space-y-6 text-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F2040] to-[#1A1A3E] border border-[#FFD700]/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🪙</span>
          <div>
            <h1 className="text-2xl font-black">{zh ? "GC 工具" : "GC Tools"}</h1>
            <p className="text-gray-400 text-sm">
              {zh ? "手动奖励或扣除用户 GC 余额" : "Manually award or deduct user GC balance"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Award / Deduct form */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
          <h2 className="font-black text-sm mb-4">{zh ? "🎯 GC 操作" : "🎯 GC Operation"}</h2>
          <GcAwardForm locale={locale} />

          {/* Tip */}
          <div className="mt-4 p-3 bg-[#1E3A5F]/30 rounded-xl">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {zh
                ? "⚠️ 此操作使用原子函数执行，无法撤销。扣除操作在余额不足时会失败并返回错误。"
                : "⚠️ Operations are atomic and irreversible. Deductions fail gracefully if balance is insufficient."}
            </p>
          </div>
        </div>

        {/* Recent admin ops */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1E3A5F]">
            <h2 className="font-black text-sm">{zh ? "📋 最近操作" : "📋 Recent Operations"}</h2>
          </div>
          <div className="divide-y divide-[#1E3A5F]/30 max-h-[420px] overflow-y-auto">
            {(recentOps ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-600">
                {zh ? "暂无操作记录" : "No operations yet"}
              </p>
            )}
            {(recentOps ?? []).map((op) => (
              <div key={op.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {userMap[op.user_id] ?? <span className="text-gray-600">—</span>}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate">{op.note ?? op.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-black ${
                    op.type === "admin_award" ? "text-green-400" : "text-red-400"
                  }`}>
                    {op.type === "admin_award" ? "+" : "-"}{formatGc(Math.abs(Number(op.amount)))} GC
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {new Date(op.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How to find user ID */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        <h2 className="font-black text-sm mb-3">{zh ? "🔍 如何获取用户 ID" : "🔍 How to find User ID"}</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          {zh
            ? "前往「用户管理」页面，点击任意用户行即可看到完整的 UUID。也可以在 Supabase 后台的 users 表中查找。"
            : "Go to the Users management page, click on any user row to see their full UUID. You can also look it up directly in the Supabase users table."}
        </p>
        <a
          href={`/${locale}/admin/users`}
          className="inline-block mt-3 px-4 py-2 bg-[#1E3A5F]/50 hover:bg-[#1E3A5F] rounded-xl text-xs font-bold text-[#FFD700] transition-colors"
        >
          {zh ? "前往用户管理 →" : "Go to User Management →"}
        </a>
      </div>

    </div>
  );
}
