import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import Link                    from "next/link";
import { formatGc }            from "@/lib/levels";

interface Props { params: Promise<{ locale: string }> }

function StatCard({ icon, label, value, sub, href, urgent }: {
  icon: string; label: string; value: string | number;
  sub?: string; href?: string; urgent?: boolean;
}) {
  const cls = `bg-[#0F2040] border rounded-2xl p-4 transition-all ${
    urgent ? "border-red-500/40 bg-red-500/5" : "border-[#1E3A5F] hover:border-[#FFD700]/30"
  }`;
  const inner = (
    <>
      <div className="text-2xl mb-2">{icon}</div>
      <p className={`text-xl font-black truncate ${urgent ? "text-red-400" : "text-[#FFD700]"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-1">{sub}</p>}
    </>
  );
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

export default async function AdminDashboard({ params }: Props) {
  const { locale } = await params;
  const zh         = locale === "zh";
  const supabase   = await createClient();
  const service    = createServiceClient();

  // ── Stats queries ────────────────────────────────────────────────────────
  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const since7d  = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    usersRes, newUsersRes, postsRes, reportsRes, matchesRes,
    betsRes, gcTxRes, topupRes,
  ] = await Promise.all([
    service.from("users").select("id", { count: "exact", head: true }),
    service.from("users").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    service.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    service.from("forum_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    service.from("matches").select("id", { count: "exact", head: true }),
    service.from("bets").select("id, amount_gc").eq("status", "pending"),
    service.from("gc_transactions").select("amount").eq("type", "topup"),
    service.from("gc_transactions").select("amount").eq("type", "topup").gte("created_at", since24h),
  ]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalBetPool  = (betsRes.data ?? []).reduce((s, b) => s + Number(b.amount_gc ?? 0), 0);
  const totalRevenue  = (gcTxRes.data  ?? []).reduce((s, t) => s + Number(t.amount   ?? 0), 0);
  const revenue24h    = (topupRes.data ?? []).reduce((s, t) => s + Number(t.amount   ?? 0), 0);

  // ── Top users by GC balance ──────────────────────────────────────────────
  const { data: topUsers } = await service
    .from("users")
    .select("id, nickname, avatar_url, gc_balance, wealth_level")
    .order("gc_balance", { ascending: false })
    .limit(5);

  // ── Recent topups ────────────────────────────────────────────────────────
  const { data: recentTopups } = await service
    .from("gc_transactions")
    .select("id, user_id, amount, note, created_at")
    .eq("type", "topup")
    .order("created_at", { ascending: false })
    .limit(5);

  const topupUserIds = [...new Set((recentTopups ?? []).map((t) => t.user_id))];
  const { data: topupUsers } = topupUserIds.length
    ? await service.from("users").select("id, nickname").in("id", topupUserIds)
    : { data: [] };
  const userMap = Object.fromEntries((topupUsers ?? []).map((u) => [u.id, u.nickname]));

  return (
    <div className="pt-6 space-y-6 text-white">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F2040] to-[#1A1A3E] border border-[#FFD700]/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-2xl font-black">{zh ? "管理控制台" : "Admin Dashboard"}</h1>
            <p className="text-gray-400 text-sm">Football2026 · {zh ? "系统总览" : "System Overview"}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="👤" label={zh ? "注册用户" : "Users"}
          value={(usersRes.count ?? 0).toLocaleString()}
          sub={zh ? `本周 +${newUsersRes.count ?? 0}` : `+${newUsersRes.count ?? 0} this week`}
          href={`/${locale}/admin/users`} />
        <StatCard icon="📝" label={zh ? "论坛帖子" : "Posts"}
          value={(postsRes.count ?? 0).toLocaleString()}
          href={`/${locale}/admin/reports`} />
        <StatCard icon="🚩" label={zh ? "待审举报" : "Reports"}
          value={reportsRes.count ?? 0}
          href={`/${locale}/admin/reports`}
          urgent={(reportsRes.count ?? 0) > 0} />
        <StatCard icon="⚽" label={zh ? "比赛数量" : "Matches"}
          value={matchesRes.count ?? 0}
          href={`/${locale}/admin/matches`} />
        <StatCard icon="🎯" label={zh ? "待结算预测" : "Active Predictions"}
          value={(betsRes.count ?? 0).toLocaleString()}
          sub={`Pool: ${formatGc(totalBetPool)} GC`}
          href={`/${locale}/admin/bets`} />
        <StatCard icon="💰" label={zh ? "总充值 GC" : "Total Topup GC"}
          value={formatGc(totalRevenue)}
          sub={zh ? `24h: ${formatGc(revenue24h)}` : `24h: ${formatGc(revenue24h)}`}
          href={`/${locale}/admin/finance`} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top users */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1E3A5F] flex items-center justify-between">
            <h2 className="font-black text-sm">{zh ? "🏆 GC 余额排行" : "🏆 Top GC Holders"}</h2>
            <Link href={`/${locale}/admin/users`} className="text-[10px] text-gray-500 hover:text-[#FFD700]">
              {zh ? "全部" : "View all"} →
            </Link>
          </div>
          <div className="divide-y divide-[#1E3A5F]/30">
            {(topUsers ?? []).map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-sm font-black text-gray-600 w-4">#{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-xs shrink-0">
                  {u.nickname.slice(0, 1).toUpperCase()}
                </div>
                <p className="flex-1 text-sm font-semibold text-white truncate">{u.nickname}</p>
                <p className="text-sm font-black text-[#FFD700]">{formatGc(u.gc_balance ?? 0)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent topups */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1E3A5F] flex items-center justify-between">
            <h2 className="font-black text-sm">{zh ? "💳 最近充值" : "💳 Recent Topups"}</h2>
            <Link href={`/${locale}/admin/finance`} className="text-[10px] text-gray-500 hover:text-[#FFD700]">
              {zh ? "全部" : "View all"} →
            </Link>
          </div>
          <div className="divide-y divide-[#1E3A5F]/30">
            {(recentTopups ?? []).length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-600 text-center">{zh ? "暂无充值记录" : "No topups yet"}</p>
            )}
            {(recentTopups ?? []).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{userMap[t.user_id] ?? "—"}</p>
                  <p className="text-[10px] text-gray-600 truncate">{t.note ?? "topup"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-green-400">+{formatGc(t.amount)} GC</p>
                  <p className="text-[10px] text-gray-600">
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: `/${locale}/admin/matches`,  icon: "⚽", label: zh ? "更新比分" : "Update Scores",  desc: zh ? "比赛结果、AI 预测"  : "Match results & AI" },
          { href: `/${locale}/admin/bets`,     icon: "🎯", label: zh ? "预测管理" : "Predictions",    desc: zh ? "查看预测、结算奖励"  : "View & settle predictions" },
          { href: `/${locale}/admin/gc-tools`, icon: "🪙", label: zh ? "GC 工具"  : "GC Tools",       desc: zh ? "手动奖励或调整余额"  : "Award or adjust GC" },
          { href: `/${locale}/admin/finance`,  icon: "💰", label: zh ? "财务记录" : "Finance",        desc: zh ? "充值与流水记录"       : "Topup & tx history" },
          { href: `/${locale}/admin/users`,    icon: "👤", label: zh ? "用户管理" : "User Management", desc: zh ? "封号、管理员权限"    : "Ban, admin perms" },
          { href: `/${locale}/admin/reports`,  icon: "🚩", label: zh ? "举报审核" : "Reports",        desc: zh ? "处理待审核举报"       : "Review reports" },
        ].map((n) => (
          <Link key={n.href} href={n.href}
            className="flex items-center gap-3 bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-4 py-3.5 hover:border-[#FFD700]/40 transition-all group">
            <span className="text-2xl">{n.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors">{n.label}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 truncate">{n.desc}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
