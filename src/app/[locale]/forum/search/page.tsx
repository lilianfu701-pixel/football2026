import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getWealthLevel } from "@/lib/levels";
import ForumSearchBar from "@/components/forum/ForumSearchBar";
import ForumPagination from "@/components/forum/Pagination";
import { lc } from "@/i18n/content";

interface PageProps {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags and decode common entities to plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi,  " ")
    .replace(/&amp;/gi,   "&")
    .replace(/&lt;/gi,    "<")
    .replace(/&gt;/gi,    ">")
    .replace(/&quot;/gi,  '"')
    .replace(/\s+/g,      " ")
    .trim();
}

/** Extract a snippet of plain text centred around the first match of `query`. */
function extractSnippet(html: string, query: string, maxLen = 160): string {
  const text = stripHtml(html);
  if (!query) return text.slice(0, maxLen) + (text.length > maxLen ? "…" : "");
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? "…" : "");
  const start = Math.max(0, idx - 60);
  const end   = Math.min(text.length, idx + query.length + 100);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/** Wrap every occurrence of `query` in a highlighted <mark>. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts   = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-[#FFD700]/20 text-[#FFD700] rounded-sm px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function timeAgo(dateStr: string, zh: boolean, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)   return lc(locale, "刚刚", "just now");
  if (m < 60)  return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24)  return zh ? `${h}小时前` : `${h}h ago`;
  if (d < 30)  return zh ? `${d}天前`   : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale }                        = await params;
  const { q = "", cat = "", page: pageStr = "1" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * PAGE_SIZE;
  const query = q.trim();

  const supabase = await createClient();

  // ── Fetch all categories for the filter tabs ────────────────────────────
  type CatRow = { id: number; slug: string; name: string; name_zh: string; icon: string };
  const { data: allCats } = await supabase
    .from("forum_categories")
    .select("id, slug, name, name_zh, icon")
    .order("sort_order");
  const categories = (allCats ?? []) as CatRow[];

  // ── Build and run search query ──────────────────────────────────────────
  type PostRow = {
    id: number; title: string; content: string; is_pinned: boolean; is_locked: boolean;
    view_count: number; reply_count: number; like_count: number; created_at: string;
    user_id: string | null;
    category_id: number;
    forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                    | { slug: string; name: string; name_zh: string; icon: string }[];
  };

  let dbQuery = supabase
    .from("forum_posts")
    .select(
      "id, title, content, is_pinned, is_locked, view_count, reply_count, like_count, created_at, user_id, category_id, forum_categories(slug, name, name_zh, icon)",
      { count: "exact" },
    )
    .eq("is_deleted", false);

  // Filter by category slug if provided
  if (cat) {
    const found = categories.find((c) => c.slug === cat);
    if (found) dbQuery = dbQuery.eq("category_id", found.id);
  }

  // Search terms: AND logic — each term must appear in title OR content
  if (query) {
    const terms = query.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const term of terms) {
      dbQuery = dbQuery.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    }
  }

  const { data: rawPosts, count, error } = await dbQuery
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const posts      = (rawPosts ?? []) as PostRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Batch-fetch authors ─────────────────────────────────────────────────
  type AuthorRow = { id: string; nickname: string; avatar_url: string | null; gc_balance: number };
  const authorIds = [...new Set(posts.map((p) => p.user_id).filter(Boolean))] as string[];
  const authorsMap = new Map<string, AuthorRow>();
  if (authorIds.length) {
    const { data: authors } = await supabase
      .from("users")
      .select("id, nickname, avatar_url, gc_balance")
      .in("id", authorIds);
    for (const a of (authors ?? []) as AuthorRow[]) authorsMap.set(a.id, a);
  }

  // ── Build href helpers ──────────────────────────────────────────────────
  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (query)                         p.set("q",    query);
    if (cat)                           p.set("cat",  cat);
    if (page > 1)                      p.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/${locale}/forum/search?${p.toString()}`;
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6 space-y-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href={`/${locale}/forum`} className="hover:text-[#FFD700] transition-colors">
            {lc(locale, "论坛", "Forum")}
          </Link>
          <span className="text-gray-700">›</span>
          <span className="text-gray-400">{lc(locale, "搜索", "Search")}</span>
        </nav>

        {/* Search bar */}
        <div className="space-y-1">
          <h1 className="text-xl font-black text-white">
            🔍 {lc(locale, "搜索帖子", "Search Posts")}
          </h1>
          <ForumSearchBar locale={locale} defaultValue={query} zh={zh} />
        </div>

        {/* Only show results if a query was entered */}
        {query ? (
          <>
            {/* Result count + category filter */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-500">
                {error
                  ? (lc(locale, "搜索出错，请重试", "Search error, please retry"))
                  : zh
                    ? `找到 ${totalCount.toLocaleString()} 条结果（关键词：「${query}」）`
                    : `${totalCount.toLocaleString()} result${totalCount !== 1 ? "s" : ""} for "${query}"`}
              </p>
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={buildHref({ cat: "", page: "1" })}
                className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                  !cat
                    ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                    : "border-[#1E3A5F] text-gray-500 hover:text-white hover:border-[#2A4A7F]"
                }`}
              >
                {lc(locale, "全部板块", "All boards")}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={buildHref({ cat: c.slug, page: "1" })}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                    cat === c.slug
                      ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                      : "border-[#1E3A5F] text-gray-500 hover:text-white hover:border-[#2A4A7F]"
                  }`}
                >
                  {c.icon} {zh ? c.name_zh : c.name}
                </Link>
              ))}
            </div>

            {/* Pagination (top) */}
            {totalPages > 1 && (
              <ForumPagination
                page={page}
                totalPages={totalPages}
                buildHref={(pg) => buildHref({ page: String(pg) })}
                zh={zh}
                locale={locale}
              />
            )}

            {/* Results list */}
            {posts.length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center space-y-3">
                <div className="text-4xl">🔭</div>
                <p className="text-gray-400 font-bold">
                  {zh ? `没有找到与「${query}」相关的帖子` : `No posts found for "${query}"`}
                </p>
                <p className="text-gray-600 text-sm">
                  {lc(locale, "试试其他关键词，或浏览所有板块", "Try different keywords or browse all boards")}
                </p>
                <Link
                  href={`/${locale}/forum`}
                  className="inline-block mt-2 text-xs text-[#FFD700] hover:underline"
                >
                  {lc(locale, "← 返回论坛首页", "← Back to forum")}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => {
                  const catData  = Array.isArray(post.forum_categories)
                    ? post.forum_categories[0]
                    : post.forum_categories;
                  const author   = post.user_id ? (authorsMap.get(post.user_id) ?? null) : null;
                  const wl       = getWealthLevel(author?.gc_balance ?? 0);
                  const snippet  = extractSnippet(post.content, query);
                  const catSlug  = catData?.slug ?? "";
                  const catHref  = catSlug === "match"
                    ? `/${locale}/forum/match`
                    : `/${locale}/forum/${catSlug}`;

                  return (
                    <Link
                      key={post.id}
                      href={`/${locale}/forum/thread/${post.id}`}
                      className="block bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30
                                 rounded-2xl p-4 transition-all hover:shadow-lg hover:shadow-[#FFD700]/5 group"
                    >
                      {/* Top row: badges + title */}
                      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                        {/* Category badge */}
                        {catData && (
                          <span
                            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full
                                       bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-400"
                            onClick={(e) => { e.preventDefault(); window.location.href = catHref; }}
                          >
                            {catData.icon} {zh ? catData.name_zh : catData.name}
                          </span>
                        )}
                        {post.is_pinned && (
                          <span className="shrink-0 text-[10px] font-black text-red-400">📌</span>
                        )}
                        {post.is_locked && (
                          <span className="shrink-0 text-[10px] font-black text-gray-500">🔒</span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-black text-white group-hover:text-[#FFD700]
                                     transition-colors leading-snug mb-2">
                        <Highlight text={post.title} query={query} />
                      </h3>

                      {/* Snippet */}
                      {snippet && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2.5">
                          <Highlight text={snippet} query={query} />
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-[10px] text-gray-600 flex-wrap">
                        {author && (
                          <span className="flex items-center gap-1">
                            <span style={{ color: wl.color }}>{wl.icon}</span>
                            <span className="text-gray-500">@{author.nickname}</span>
                          </span>
                        )}
                        <span>{timeAgo(post.created_at, zh, locale)}</span>
                        <span className="flex items-center gap-0.5">
                          <span>👁</span>
                          <span>{(post.view_count ?? 0).toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span>💬</span>
                          <span>{post.reply_count.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span>❤️</span>
                          <span>{post.like_count.toLocaleString()}</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <ForumPagination
                page={page}
                totalPages={totalPages}
                buildHref={(pg) => buildHref({ page: String(pg) })}
                zh={zh}
                locale={locale}
              />
            )}
          </>
        ) : (
          /* No query entered yet — show category shortcuts */
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {lc(locale, "输入关键词开始搜索全站帖子", "Enter keywords to search all posts across all boards")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((c) => {
                const href = c.slug === "match"
                  ? `/${locale}/forum/match`
                  : `/${locale}/forum/${c.slug}`;
                return (
                  <Link
                    key={c.slug}
                    href={href}
                    className="flex items-center gap-2 bg-[#0F2040] border border-[#1E3A5F]
                               hover:border-[#FFD700]/30 rounded-xl px-3 py-2.5 text-xs
                               text-gray-400 hover:text-white transition-all"
                  >
                    <span>{c.icon}</span>
                    <span className="font-bold">{zh ? c.name_zh : c.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
