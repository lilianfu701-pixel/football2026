export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ForumAdminClient from "./ForumAdminClient";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; q?: string; page?: string; filter?: string }>;
}

const PER_PAGE = 30;

export default async function ForumAdminPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { cat = "", q = "", page: pageStr = "1", filter = "all" } = await searchParams;
  const zh = locale === "zh";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect(`/${locale}`);

  const service = createServiceClient();
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * PER_PAGE;

  // Build query
  let query = service
    .from("forum_posts")
    .select(`
      id, title, user_id, is_pinned, is_locked, is_featured, is_deleted,
      reply_count, like_count, view_count, created_at, category_id,
      forum_categories!inner(id, slug, name, name_zh, icon),
      users(nickname)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);

  if (cat) query = query.eq("category_id", parseInt(cat));
  if (q) query = query.ilike("title", `%${q}%`);
  if (filter === "pinned")  query = query.eq("is_pinned", true);
  if (filter === "locked")  query = query.eq("is_locked", true);
  if (filter === "deleted") query = query.eq("is_deleted", true);
  if (filter === "active")  query = query.eq("is_deleted", false);

  const { data: posts, count } = await query;

  // Categories for filter
  const { data: categories } = await service
    .from("forum_categories")
    .select("id, slug, name, name_zh, icon")
    .order("sort_order");

  // Stats
  const [
    { count: totalPosts },
    { count: deletedPosts },
    { count: pinnedPosts },
    { count: lockedPosts },
  ] = await Promise.all([
    service.from("forum_posts").select("id", { count: "exact", head: true }),
    service.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_deleted", true),
    service.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_pinned", true),
    service.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_locked", true),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  type Post = {
    id: number; title: string; user_id: string | null;
    is_pinned: boolean; is_locked: boolean; is_featured: boolean; is_deleted: boolean;
    reply_count: number; like_count: number; view_count: number; created_at: string;
    category_id: number;
    forum_categories: { id: number; slug: string; name: string; name_zh: string; icon: string } | { id: number; slug: string; name: string; name_zh: string; icon: string }[];
    users: { nickname: string } | { nickname: string }[] | null;
  };

  return (
    <div className="pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">
          💬 {zh ? "论坛管理" : "Forum Management"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {zh ? "管理帖子：置顶、锁定、删除、精华" : "Manage posts: pin, lock, delete, feature"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: zh ? "总帖数" : "Total Posts", value: totalPosts ?? 0, color: "text-white", icon: "📝" },
          { label: zh ? "置顶" : "Pinned",        value: pinnedPosts ?? 0, color: "text-[#FFD700]", icon: "📌" },
          { label: zh ? "锁定" : "Locked",        value: lockedPosts ?? 0, color: "text-blue-400", icon: "🔒" },
          { label: zh ? "已删除" : "Deleted",     value: deletedPosts ?? 0, color: "text-red-400", icon: "🗑️" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-600 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <ForumAdminClient
        locale={locale}
        posts={(posts ?? []) as unknown as Post[]}
        categories={(categories ?? []) as { id: number; slug: string; name: string; name_zh: string; icon: string }[]}
        totalPages={totalPages}
        currentPage={page}
        currentCat={cat}
        currentQ={q}
        currentFilter={filter}
        totalCount={count ?? 0}
      />
    </div>
  );
}
