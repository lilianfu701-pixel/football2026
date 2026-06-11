export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { getWealthLevel } from "@/lib/levels";
import ForumSearchBar from "@/components/forum/ForumSearchBar";
import { lc } from "@/i18n/content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

function timeAgo(dateStr: string, zh: boolean, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return lc(locale, "刚刚", "just now");

  // Locale-specific templates (Vercel small-icu blocks Intl.RelativeTimeFormat for non-English)
  type U = "m" | "h" | "d";
  const tpl: Record<string, (n: number, u: U) => string> = {
    ru: (n, u) => u === "m" ? `${n} мин. назад` : u === "h" ? `${n} ч. назад` : `${n} д. назад`,
    ar: (n, u) => u === "m" ? `منذ ${n} د` : u === "h" ? `منذ ${n} س` : `منذ ${n} ي`,
    ja: (n, u) => u === "m" ? `${n}分前` : u === "h" ? `${n}時間前` : `${n}日前`,
    ko: (n, u) => u === "m" ? `${n}분 전` : u === "h" ? `${n}시간 전` : `${n}일 전`,
    vi: (n, u) => u === "m" ? `${n} phút trước` : u === "h" ? `${n} giờ trước` : `${n} ngày trước`,
    id: (n, u) => u === "m" ? `${n} mnt lalu` : u === "h" ? `${n} jam lalu` : `${n} hr lalu`,
    pt: (n, u) => u === "m" ? `há ${n} min` : u === "h" ? `há ${n} h` : `há ${n} d`,
    es: (n, u) => u === "m" ? `hace ${n} min` : u === "h" ? `hace ${n} h` : `hace ${n} d`,
    fr: (n, u) => u === "m" ? `il y a ${n} min` : u === "h" ? `il y a ${n} h` : `il y a ${n} j`,
    de: (n, u) => u === "m" ? `vor ${n} Min.` : u === "h" ? `vor ${n} Std.` : `vor ${n} T.`,
  };
  const fmt = zh
    ? (n: number, u: U) => u === "m" ? `${n}分钟前` : u === "h" ? `${n}小时前` : `${n}天前`
    : (tpl[locale] ?? ((n: number, u: U) => u === "m" ? `${n}m ago` : u === "h" ? `${n}h ago` : `${n}d ago`));

  if (m < 60) return fmt(m, "m");
  if (h < 24) return fmt(h, "h");
  if (d < 30) return fmt(d, "d");
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Group metadata: order + display colors
const GROUP_META: Record<string, {
  orderIdx: number;
  labelEn: string;
  labelZh: string;
  accent: string;   // tailwind color token for left-border & icon tint
  bgFrom: string;
}> = {
  match:     { orderIdx: 0, labelEn: "Match & Competition", labelZh: "赛事竞技", accent: "border-[#FFD700]", bgFrom: "from-[#FFD700]/5" },
  predict:   { orderIdx: 1, labelEn: "GC Predictions",      labelZh: "GC预测",   accent: "border-[#4F46E5]", bgFrom: "from-[#4F46E5]/5" },
  news:      { orderIdx: 2, labelEn: "News & Media",         labelZh: "资讯动态", accent: "border-[#EF4444]", bgFrom: "from-[#EF4444]/5" },
  special:   { orderIdx: 3, labelEn: "2026 Special",         labelZh: "2026专题", accent: "border-[#10B981]", bgFrom: "from-[#10B981]/5" },
  community: { orderIdx: 4, labelEn: "Fan Community",        labelZh: "球迷社区", accent: "border-[#8B5CF6]", bgFrom: "from-[#8B5CF6]/5" },
};

export default async function ForumPage({ params }: PageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [catsRes, hotRes, latestRes, tagsRes] = await Promise.all([
    supabase
      .from("forum_categories")
      .select("id, slug, name, name_zh, icon, description, description_zh, post_count, cat_group, cat_group_zh")
      .order("sort_order"),

    supabase
      .from("forum_posts")
      .select(`
        id, title, like_count, reply_count, view_count, created_at,
        forum_categories!inner(slug, name, name_zh, icon),
        users!inner(username, avatar_url, gc_balance)
      `)
      .eq("is_deleted", false)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("like_count", { ascending: false })
      .limit(5),

    supabase
      .from("forum_posts")
      .select(`
        id, title, reply_count, like_count, last_reply_at, created_at,
        forum_categories!inner(slug, name, name_zh, icon),
        users!inner(username, avatar_url, gc_balance)
      `)
      .eq("is_deleted", false)
      .order("last_reply_at", { ascending: false })
      .limit(10),

    supabase
      .from("forum_tags")
      .select("id, name, name_zh, color, post_count")
      .order("post_count", { ascending: false })
      .limit(12),
  ]);

  const categories = catsRes.data ?? [];
  const hotPosts   = hotRes.data   ?? [];
  const hotTags    = tagsRes.data  ?? [];
  const latest     = latestRes.data ?? [];

  const totalPosts   = categories.reduce((s, c) => s + (c.post_count ?? 0), 0);
  const totalBoards  = categories.length;

  // Group categories
  type CatRow = typeof categories[number];
  const grouped = new Map<string, CatRow[]>();
  for (const c of categories) {
    const g = (c as CatRow & { cat_group?: string }).cat_group ?? "community";
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(c);
  }
  // Sort groups by orderIdx
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const ai = GROUP_META[a[0]]?.orderIdx ?? 99;
    const bi = GROUP_META[b[0]]?.orderIdx ?? 99;
    return ai - bi;
  });

  type PostRow = {
    id: number; title: string; reply_count: number; like_count: number;
    view_count?: number; last_reply_at?: string; created_at: string;
    forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                    | { slug: string; name: string; name_zh: string; icon: string }[];
    users: { username: string; avatar_url: string | null; gc_balance: number }
         | { username: string; avatar_url: string | null; gc_balance: number }[];
  };

  function normPost(p: PostRow) {
    const cat  = Array.isArray(p.forum_categories) ? p.forum_categories[0] : p.forum_categories;
    const u    = Array.isArray(p.users) ? p.users[0] : p.users;
    return { ...p, cat, user: u };
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">
              💬 {lc(locale, "GoalCoin 论坛", "GoalCoin Forum")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {zh
                ? `${totalBoards} 个板块 · ${totalPosts.toLocaleString()} 篇帖子 · 2026 世界杯全球讨论`
                : `${totalBoards} ${lc(locale, "个板块", "boards")} · ${totalPosts.toLocaleString()} ${lc(locale, "帖", "posts")} · World Cup 2026`}
            </p>
          </div>
          {user ? (
            <Link
              href={`/${locale}/forum/new`}
              className="shrink-0 flex items-center gap-2 bg-[#FFD700] text-[#0A1628] font-black px-4 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
            >
              ✏️ {lc(locale, "发帖", "New Post")}
            </Link>
          ) : (
            <Link
              href={`/${locale}/auth/login`}
              className="shrink-0 text-xs border border-[#1E3A5F] text-gray-400 px-4 py-2.5 rounded-xl hover:text-white transition-colors"
            >
              {lc(locale, "登录后发帖", "Login to post")}
            </Link>
          )}
        </div>

        {/* ── Search bar ── */}
        <div className="mb-6">
          <ForumSearchBar locale={locale} zh={zh} />
        </div>

        <div className="space-y-8">

          {/* ── Grouped Categories ── */}
          <div className="space-y-6">
            {sortedGroups.map(([groupKey, cats]) => {
              const meta = GROUP_META[groupKey] ?? { orderIdx: 99, labelEn: groupKey, labelZh: groupKey, accent: "border-[#1E3A5F]", bgFrom: "from-[#1E3A5F]/5" };
              const groupLabel = zh
                ? ((cats[0] as CatRow & { cat_group_zh?: string }).cat_group_zh ?? meta.labelZh)
                : lc(locale, meta.labelZh, meta.labelEn);

              return (
                <div key={groupKey}>
                  {/* Group header */}
                  <div className={`flex items-center gap-3 mb-3 pl-3 border-l-4 ${meta.accent}`}>
                    <h2 className="text-sm font-black text-white tracking-wide">{groupLabel}</h2>
                    <span className="text-[10px] text-gray-600">
                      {cats.reduce((s, c) => s + (c.post_count ?? 0), 0).toLocaleString()} {lc(locale, "帖", "posts")}
                    </span>
                  </div>

                  {/* Board cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cats.map((c) => {
                      const href = c.slug === "match"
                        ? `/${locale}/forum/match`
                        : `/${locale}/forum/${c.slug}`;
                      const desc = zh
                        ? (c.description_zh ?? c.description ?? "")
                        : (c.description ?? "");

                      return (
                        <Link
                          key={c.slug}
                          href={href}
                          className={`group bg-gradient-to-r ${meta.bgFrom} to-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/40 rounded-2xl p-4 flex items-start gap-4 transition-all hover:shadow-lg hover:shadow-[#FFD700]/5`}
                        >
                          {/* Icon bubble */}
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#0A1628]/60 border border-[#1E3A5F] flex items-center justify-center text-2xl">
                            {c.icon}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors truncate">
                                {zh ? c.name_zh : lc(locale, c.name_zh, c.name)}
                              </p>
                              <span className="shrink-0 text-[10px] text-gray-600 font-semibold">
                                {(c.post_count ?? 0).toLocaleString()} {lc(locale, "帖", "posts")}
                              </span>
                            </div>
                            {desc && (
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                {desc}
                              </p>
                            )}
                          </div>

                          {/* Arrow */}
                          <span className="shrink-0 text-gray-700 group-hover:text-[#FFD700] transition-colors text-lg self-center">›</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Hot posts (7 days) ── */}
          {hotPosts.length > 0 && (
            <div>
              <h2 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                🔥 {lc(locale, "本周热帖", "Hot This Week")}
              </h2>
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden divide-y divide-[#1E3A5F]/60">
                {hotPosts.map((p, i) => {
                  const { cat, user: author } = normPost(p as PostRow);
                  const wl = getWealthLevel(author.gc_balance ?? 0);
                  return (
                    <Link
                      key={p.id}
                      href={`/${locale}/forum/thread/${p.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#1E3A5F]/30 transition-colors group"
                    >
                      <span className={`text-base font-black shrink-0 w-5 text-center ${
                        i === 0 ? "text-red-400" : i === 1 ? "text-orange-400" : i === 2 ? "text-yellow-400" : "text-gray-600"
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-semibold group-hover:text-[#FFD700] transition-colors truncate">
                          {p.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ color: wl.color, background: wl.bgColor + "60" }}>
                            {wl.icon}
                          </span>
                          <span className="text-[10px] text-gray-500">@{author.username}</span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500">
                            {cat.icon} {zh ? cat.name_zh : lc(locale, cat.name_zh, cat.name)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[10px] text-gray-500">
                        <span>❤️ {p.like_count}</span>
                        <span>💬 {p.reply_count}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Latest posts ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center gap-2">
                🕐 {lc(locale, "最新帖子", "Latest Posts")}
              </h2>
            </div>

            {latest.length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm mb-4">
                  {lc(locale, "还没有帖子，来发第一帖！", "No posts yet — be the first!")}
                </p>
                {user && (
                  <Link href={`/${locale}/forum/new`}
                    className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-5 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors">
                    ✏️ {lc(locale, "发帖", "New Post")}
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden divide-y divide-[#1E3A5F]/60">
                {latest.map((p) => {
                  const { cat, user: author } = normPost(p as PostRow);
                  const wl = getWealthLevel(author.gc_balance ?? 0);
                  return (
                    <Link
                      key={p.id}
                      href={`/${locale}/forum/thread/${p.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[#1E3A5F]/30 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="shrink-0 relative">
                        {author.avatar_url ? (
                          <Image src={author.avatar_url} alt={author.username}
                            width={36} height={36} className="rounded-full object-cover" unoptimized />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-sm">
                            {author.username.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">{wl.icon}</div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-[#FFD700] transition-colors line-clamp-1">
                          {p.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-500">@{author.username}</span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500">
                            {cat.icon} {zh ? cat.name_zh : lc(locale, cat.name_zh, cat.name)}
                          </span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500">
                            {timeAgo((p as PostRow).last_reply_at ?? p.created_at, zh, locale)}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-gray-500">💬 {p.reply_count}</span>
                        <span className="text-[10px] text-gray-500">❤️ {p.like_count}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Hot Tags ── */}
          {hotTags.length > 0 && (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  🏷 {lc(locale, "热门标签", "Hot Tags")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(hotTags as { id: number; name: string; name_zh: string | null; color: string | null; post_count: number | null }[]).map((t) => {
                  const label = zh ? (t.name_zh ?? t.name) : t.name;
                  const color = t.color ?? "#6B7280";
                  return (
                    <Link
                      key={t.id}
                      href={`/${locale}/forum/tag/${encodeURIComponent(t.name)}`}
                      style={{ color, borderColor: color + "35", backgroundColor: color + "12" }}
                      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border transition-opacity hover:opacity-80"
                    >
                      <span>#{label}</span>
                      {(t.post_count ?? 0) > 0 && (
                        <span className="text-[10px] opacity-50 font-normal">{t.post_count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
