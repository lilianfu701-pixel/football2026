import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps { params: Promise<{ locale: string }> }

export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  // Stats
  const [usersRes, postsRes, reportsRes, matchesRes] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("forum_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("matches").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: zh ? "用户总数" : "Total Users",   value: usersRes.count ?? 0,   icon: "👤", href: `/${locale}/admin/users` },
    { label: zh ? "帖子总数" : "Total Posts",   value: postsRes.count ?? 0,   icon: "📝", href: `/${locale}/admin/reports` },
    { label: zh ? "待处理举报" : "Pending Reports", value: reportsRes.count ?? 0, icon: "🚩", href: `/${locale}/admin/reports`, urgent: (reportsRes.count ?? 0) > 0 },
    { label: zh ? "赛事数量" : "Matches",       value: matchesRes.count ?? 0, icon: "⚽", href: `/${locale}/admin/matches` },
  ];

  const navItems = [
    { href: `/${locale}/admin/users`,   icon: "👤", label: zh ? "用户管理"   : "User Management",   desc: zh ? "封号、权限、查询"       : "Ban, permissions, search" },
    { href: `/${locale}/admin/reports`, icon: "🚩", label: zh ? "举报审核"   : "Content Reports",   desc: zh ? "处理待审核的举报"       : "Review pending reports" },
    { href: `/${locale}/admin/matches`, icon: "⚽", label: zh ? "赛事管理"   : "Match Management",  desc: zh ? "更新比分、状态、赛程"   : "Update scores & status" },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      <div className="pt-6 space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2040] to-[#1A1A3E] border border-[#FFD700]/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🛡</span>
            <h1 className="text-2xl font-black text-white">{zh ? "管理后台" : "Admin Panel"}</h1>
          </div>
          <p className="text-gray-400 text-sm">Football2026 · {zh ? "系统管理" : "System Management"}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Link key={s.href + s.label} href={s.href}
              className={`bg-[#0F2040] border rounded-2xl p-4 hover:border-[#FFD700]/40 transition-all ${
                s.urgent ? "border-red-500/40 bg-red-500/5" : "border-[#1E3A5F]"
              }`}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className={`text-2xl font-black ${s.urgent ? "text-red-400" : "text-[#FFD700]"}`}>
                {s.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Nav */}
        <div className="space-y-3">
          {navItems.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-4 bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-5 py-4 hover:border-[#FFD700]/40 hover:bg-[#0F2040]/80 transition-all group">
              <span className="text-3xl">{n.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors">{n.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
              </div>
              <span className="text-gray-600 group-hover:text-[#FFD700] transition-colors">→</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
