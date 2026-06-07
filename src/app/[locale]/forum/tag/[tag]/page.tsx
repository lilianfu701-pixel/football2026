import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ForumPagination from "@/components/forum/Pagination";
import { getWealthLevel } from "@/lib/levels";
import { lc } from "@/i18n/content";

interface PageProps {
  params:       Promise<{ locale: string; tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 15;

function timeAgo(dateStr: string, zh: boolean, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return lc(locale, "刚刚", "just now");
  if (m < 60) return zh ? `${m}分钟前`  : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前`  : `${h}h ago`;
  if (d < 30) return zh ? `${d}天前`    : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { locale, tag: tagName } = await params;
  const { page: pageStr = "1" }  = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Fetch tag metadata
  const { data: tag } = await supabase
    .from("forum_tags")
    .select("id, name, name_zh, color, post_count")
    .eq("name", decodeURIComponent(tagName))
    .single();

  if (!tag) notFound();

  // Fetch posts with this tag via junction table
  const { data: postTagRows, count } = await supabase
    .from("forum_post_tags")
    .select(
      "forum_posts!inner(id, title, is_pinned, is_locked, is_featured, reply_count, like_count, view_count, last_reply_at, created_at, user_id, forum_categories(slug, name, name_zh, icon))",
      { count: "exact" }
    )
    .eq("tag_id", tag.id)
    .order("created_at", { ascending: false, referencedTable: "forum_posts" })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  type CatRow = { slug: string; name: string; name_zh: string; icon: string };
  type PostRow = {
    id: number; title: string; is_pinned: boolean; is_locked: boolean; is_featured?: boolean;
    reply_count: number; like_count: number; view_count: number;
    last_reply_at: string | null; created_at: string; user_id: string | null;
    forum_categories: CatRow | CatRow[];
  };

  const posts: PostRow[] = ((postTagRows ?? []) as { forum_posts: PostRow | PostRow[] | null }[])
    .flatMap((r) => {
      const fp = r.forum_posts;
      if (!fp) return [];
      return Array.isArray(fp) ? fp : [fp];
    });

  // Batch-fetch authors
  type AuthorRow = { id: string; nickname: string; avatar_url: string | null; gc_balance: number };
  const authorIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))] as string[];
  const { data: authorRows } = authorIds.length
    ? await supabase.from("users").select("id, nickname, avatar_url, gc_balance").in("id", authorIds)
    : { data: [] as AuthorRow[] };
  const authorsById = new Map<string, AuthorRow>(
    ((authorRows ?? []) as AuthorRow[]).map((a) => [a.id, a])
  );

  const tagColor = tag.color ?? "#6B7280";
  const tagLabel = zh ? (tag.name_zh ?? tag.name) : tag.name;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6 space-y-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href={`/${locale}/forum`} className="hover:text-[#FFD700] transition-colors">
            {lc(locale, "论坛", "Forum")}
          </Link>
          <span className="text-gray-700">›</span>
          <span className="text-gray-400">#{tagLabel}</span>
        </nav>

        {/* Tag header */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border"
              style={{ color: tagColor, borderColor: tagColor + "40", backgroundColor: tagColor + "15" }}
            >
              #
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: tagColor }}>
                #{tagLabel}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {(count ?? 0).toLocaleString()} {lc(locale, "篇帖子", "posts")}
              </p>
            </div>
          </div>
        </div>

        {/* Pagination (top) */}
        {totalPages > 1 && (
          <ForumPagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/${locale}/forum/tag/${tagName}?page=${p}`}
            zh={zh}
            locale={locale}
          />
        )}

        {/* Post list */}
        {posts.length === 0 ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-20 text-center">
            <p className="text-gray-500 text-sm">{lc(locale, "此标签下暂无帖子", "No posts with this tag yet")}</p>
          </div>
        ) : (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden divide-y divide-[#1E3A5F]/60">
            {posts.map((p) => {
              const author = p.user_id ? authorsById.get(p.user_id) : undefined;
              const wl     = getWealthLevel(author?.gc_balance ?? 0);
              const name   = author?.nickname ?? (lc(locale, "系统", "System"));
              const cat    = Array.isArray(p.forum_categories) ? p.forum_categories[0] : p.forum_categories;

              return (
                <Link
                  key={p.id}
                  href={`/${locale}/forum/thread/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#1E3A5F]/30 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {author?.avatar_url ? (
                      <Image src={author.avatar_url} alt={name} width={38} height={38}
                        className="rounded-full object-cover" unoptimized />
                    ) : (
                      <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-black text-sm ${
                        author ? "bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5]" : "bg-gradient-to-br from-[#FFD700]/40 to-[#F59E0B]/40"
                      }`}>
                        {author ? name.slice(0, 1).toUpperCase() : "⚽"}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 text-[10px]">{wl.icon}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.is_pinned && (
                        <span className="text-[9px] font-black bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                          {lc(locale, "置顶", "PIN")}
                        </span>
                      )}
                      {p.is_featured && (
                        <span className="text-[9px] font-black bg-[#FFD700]/10 text-[#FFD700] px-1.5 py-0.5 rounded border border-[#FFD700]/25">
                          ⭐
                        </span>
                      )}
                      <span className="text-sm font-semibold text-white group-hover:text-[#FFD700] transition-colors line-clamp-1">
                        {p.title}
                      </span>
                    </div>
                    {cat && (
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        <span>{cat.icon} {zh ? cat.name_zh : cat.name}</span>
                        <span className="text-gray-600">·</span>
                        <span>@{name}</span>
                        <span className="text-gray-600">·</span>
                        <span>{timeAgo(p.last_reply_at ?? p.created_at, zh, locale)}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col items-end gap-1 shrink-0 text-[10px] text-gray-500">
                    <span>💬 {p.reply_count}</span>
                    <span>❤️ {p.like_count}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination (bottom) */}
        {totalPages > 1 && (
          <ForumPagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/${locale}/forum/tag/${tagName}?page=${p}`}
            zh={zh}
            locale={locale}
          />
        )}

        {/* Browse all tags */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
          <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-3">
            {lc(locale, "其他标签", "Other Tags")}
          </p>
          <AllTagsList locale={locale} zh={zh} currentTag={tag.name} />
        </div>

      </div>
    </div>
  );
}

// Server sub-component: fetch and display all tags
async function AllTagsList({ locale, zh, currentTag }: { locale: string; zh: boolean; currentTag: string }) {
  const supabase = await createClient();
  const { data: tags } = await supabase
    .from("forum_tags")
    .select("id, name, name_zh, color, post_count")
    .order("post_count", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-wrap gap-1.5">
      {(tags ?? []).map((t) => {
        const label = zh ? (t.name_zh ?? t.name) : t.name;
        const color = t.color ?? "#6B7280";
        const isCurrent = t.name === currentTag;
        return (
          <Link
            key={t.id}
            href={`/${locale}/forum/tag/${t.name}`}
            style={isCurrent
              ? { color, borderColor: color + "60", backgroundColor: color + "25" }
              : { color, borderColor: color + "30", backgroundColor: color + "10" }
            }
            className="text-xs font-bold px-2.5 py-1 rounded-full border transition-opacity hover:opacity-80"
          >
            #{label}
            {(t.post_count ?? 0) > 0 && (
              <span className="ml-1 opacity-60 font-normal text-[10px]">{t.post_count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
