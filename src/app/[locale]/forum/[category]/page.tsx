export const dynamic = "force-dynamic";

import { createClient }   from "@/lib/supabase/server";
import Link               from "next/link";
import { notFound }       from "next/navigation";
import ForumPagination    from "@/components/forum/Pagination";
import PostList, { type PostItem } from "./PostList";
import ForumSearchBar     from "@/components/forum/ForumSearchBar";

interface PageProps {
  params:       Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

const PAGE_SIZE = 10;

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, category: slug } = await params;
  const { page: pageStr = "1", sort = "latest" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch category + all categories (for the sidebar nav)
  const [{ data: cat }, { data: allCats }] = await Promise.all([
    supabase.from("forum_categories").select("*").eq("slug", slug).single(),
    supabase.from("forum_categories").select("id, slug, name, name_zh, icon").order("sort_order"),
  ]);

  if (!cat) notFound();

  type CatLink = { id: number; slug: string; name: string; name_zh: string; icon: string };
  const otherCats = ((allCats ?? []) as CatLink[]).filter((c) => c.slug !== slug);

  // Fetch posts
  const orderCol = sort === "hot" ? "like_count" : sort === "replies" ? "reply_count" : "last_reply_at";

  const { data: rawPosts, count } = await supabase
    .from("forum_posts")
    .select(
      "id, title, is_pinned, is_locked, is_featured, view_count, reply_count, like_count, last_reply_at, created_at, user_id",
      { count: "exact" },
    )
    .eq("category_id", cat.id)
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order(orderCol,    { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Batch-fetch authors
  type AuthorRow = { id: string; nickname: string; avatar_url: string | null; gc_balance: number };
  const authorIds = [
    ...new Set(
      (rawPosts ?? [])
        .map((p: { user_id: string | null }) => p.user_id)
        .filter(Boolean),
    ),
  ] as string[];
  const { data: authorRows } = authorIds.length
    ? await supabase.from("users").select("id, nickname, avatar_url, gc_balance").in("id", authorIds)
    : { data: [] as AuthorRow[] };
  const authorsById = new Map<string, AuthorRow>(
    ((authorRows ?? []) as AuthorRow[]).map((a) => [a.id, a]),
  );

  // Batch-fetch cached title translations for the current locale
  const postIds = (rawPosts ?? []).map((p: { id: number }) => p.id);
  type TransRow = { source_id: number; content: string };
  const { data: transRows } = postIds.length
    ? await supabase
        .from("forum_translations")
        .select("source_id, content")
        .eq("type", "post_title")
        .eq("lang", locale)
        .in("source_id", postIds)
    : { data: [] as TransRow[] };

  const cachedTranslations = Object.fromEntries(
    ((transRows ?? []) as TransRow[]).map((r) => [r.source_id, r.content]),
  );

  // Batch-fetch tags for posts on this page
  type TagRow = { id: number; name: string; name_zh: string | null; color: string | null };
  type PostTagRow = { post_id: number; forum_tags: TagRow | TagRow[] | null };
  const { data: postTagRows } = postIds.length
    ? await supabase
        .from("forum_post_tags")
        .select("post_id, forum_tags(id, name, name_zh, color)")
        .in("post_id", postIds)
    : { data: [] as PostTagRow[] };

  const postTagsMap: Record<number, TagRow[]> = {};
  for (const pt of ((postTagRows ?? []) as PostTagRow[])) {
    const t = pt.forum_tags;
    if (!t) continue;
    const arr = Array.isArray(t) ? t : [t];
    if (!postTagsMap[pt.post_id]) postTagsMap[pt.post_id] = [];
    postTagsMap[pt.post_id].push(...arr);
  }

  // Combine posts + authors
  type RawPost = {
    id: number; title: string; is_pinned: boolean; is_locked: boolean; is_featured?: boolean;
    view_count: number; reply_count: number; like_count: number;
    last_reply_at: string | null; created_at: string; user_id: string | null;
  };
  const posts: PostItem[] = ((rawPosts ?? []) as RawPost[]).map((p) => ({
    ...p,
    is_featured: !!p.is_featured,
    author: p.user_id ? authorsById.get(p.user_id) : undefined,
  }));

  const SORT_OPTIONS = [
    { key: "latest",  label: zh ? "最新"    : "Latest"       },
    { key: "hot",     label: zh ? "最热"    : "Hottest"      },
    { key: "replies", label: zh ? "最多回复" : "Most Replies" },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href={`/${locale}/forum`} className="hover:text-white transition-colors">
            {zh ? "论坛" : "Forum"}
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">{cat.icon} {zh ? cat.name_zh : cat.name}</span>
        </div>

        {/* Header */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{cat.icon}</span>
            <div>
              <h1 className="text-xl font-black text-white">{zh ? cat.name_zh : cat.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {zh ? (cat.description_zh ?? cat.description) : cat.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-gray-600">
                  {(cat.post_count ?? 0).toLocaleString()} {zh ? "篇帖子" : "posts"}
                </p>
                {cat.no_new_posts && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#1E3A5F]/60 border border-[#1E3A5F] text-gray-500">
                    📌 {zh ? "系统专属" : "Official Only"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!cat.no_new_posts && (
            user ? (
              <Link
                href={`/${locale}/forum/new?cat=${slug}`}
                className="shrink-0 flex items-center gap-2 bg-[#FFD700] text-[#0A1628] font-black px-4 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
              >
                ✏️ {zh ? "发帖" : "Post"}
              </Link>
            ) : (
              <Link
                href={`/${locale}/auth/login`}
                className="shrink-0 text-xs border border-[#1E3A5F] text-gray-400 px-4 py-2.5 rounded-xl hover:text-white transition-colors"
              >
                {zh ? "登录发帖" : "Login to post"}
              </Link>
            )
          )}
        </div>

        {/* Other boards — compact horizontal strip */}
        {otherCats.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <span className="text-[10px] text-gray-600 font-bold shrink-0 mr-0.5">
              {zh ? "其他板块：" : "Boards:"}
            </span>
            {otherCats.map((c) => {
              const href = c.slug === "match"
                ? `/${locale}/forum/match`
                : `/${locale}/forum/${c.slug}`;
              return (
                <Link
                  key={c.slug}
                  href={href}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#1E3A5F]
                             text-[11px] text-gray-500 hover:text-white hover:border-[#2A4A7F]
                             bg-[#0F2040] transition-colors"
                >
                  <span>{c.icon}</span>
                  <span>{zh ? c.name_zh : c.name}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Search bar */}
        <div className="mb-4">
          <ForumSearchBar locale={locale} zh={zh} />
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-4">
          {SORT_OPTIONS.map((o) => (
            <Link
              key={o.key}
              href={`/${locale}/forum/${slug}?sort=${o.key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                sort === o.key
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>

        {/* Pagination (top) */}
        <ForumPagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/${locale}/forum/${slug}?sort=${sort}&page=${p}`}
          zh={zh}
        />

        {/* Post list */}
        {posts.length === 0 ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-20 text-center">
            <div className="text-4xl mb-3">{cat.icon}</div>
            <p className="text-gray-500 text-sm mb-4">
              {cat.no_new_posts
                ? (zh ? "赛事帖子将由系统自动生成" : "Match threads are generated automatically")
                : (zh ? "这个板块还没有帖子" : "No posts in this category yet")}
            </p>
            {!cat.no_new_posts && user && (
              <Link
                href={`/${locale}/forum/new?cat=${slug}`}
                className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-5 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
              >
                ✏️ {zh ? "发第一帖" : "Be the first to post"}
              </Link>
            )}
          </div>
        ) : (
          <PostList
            posts={posts}
            cachedTranslations={cachedTranslations}
            postTagsMap={postTagsMap}
            locale={locale}
            zh={zh}
            catSlug={slug}
          />
        )}

        {/* Pagination */}
        <ForumPagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/${locale}/forum/${slug}?sort=${sort}&page=${p}`}
          zh={zh}
        />

      </div>
    </div>
  );
}
