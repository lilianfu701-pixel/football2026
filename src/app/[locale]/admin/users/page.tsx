export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import UserAdminActions from "./UserAdminActions";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminUsersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { q = "", page: pageStr = "1" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * 20;

  // Auth check via user client, then use service client for admin queries
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  const service = createServiceClient();
  let query = service
    .from("users")
    .select("id, nickname, email, avatar_url, gc_balance, is_admin, is_banned, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + 19);
  if (q) query = query.or(`nickname.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: users, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / 20);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      <div className="pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin`} className="text-gray-500 hover:text-white">←</Link>
          <h1 className="text-xl font-black">👤 {zh ? "用户管理" : "User Management"}</h1>
        </div>

        {/* Search */}
        <form method="GET" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder={zh ? "搜索用户名或邮箱…" : "Search nickname or email…"}
            className="flex-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/40" />
          <button type="submit"
            className="px-4 py-2.5 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200]">
            {zh ? "搜索" : "Search"}
          </button>
        </form>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#1E3A5F]/40">
            {(users ?? []).map((u) => (
              <div key={u.id} className="px-5 py-3.5">
                {/* Main row */}
                <div className="flex items-center gap-4">
                  {u.avatar_url ? (
                    <Image src={u.avatar_url} alt={u.nickname} width={36} height={36}
                      className="rounded-full object-cover shrink-0 border border-[#1E3A5F]" unoptimized />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-sm shrink-0 border border-[#1E3A5F]">
                      {u.nickname.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{u.nickname}</p>
                      {u.is_admin && <span className="text-[9px] font-black text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded">ADMIN</span>}
                      {u.is_banned && <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">BANNED</span>}
                    </div>
                    <p className="text-[10px] text-gray-600 truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#FFD700] font-bold">
                      {(u.gc_balance ?? 0) >= 1_000_000
                        ? ((u.gc_balance ?? 0) / 1_000_000).toFixed(1) + "M"
                        : (u.gc_balance ?? 0).toLocaleString()} GC
                    </p>
                  </div>
                  <UserAdminActions
                    userId={u.id}
                    userName={u.nickname}
                    gcBalance={u.gc_balance ?? 0}
                    isAdmin={!!u.is_admin}
                    isBanned={!!u.is_banned}
                    zh={zh}
                    myId={user.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex gap-2 justify-center">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((pg) => (
              <Link key={pg} href={`/${locale}/admin/users?q=${q}&page=${pg}`}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold border transition-all ${
                  page === pg ? "bg-[#FFD700] text-[#0A1628] border-transparent" : "border-[#1E3A5F] text-gray-500 hover:text-white"
                }`}>
                {pg}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
