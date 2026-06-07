export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { getFlagUrl, isTBD, getTeamDisplayName } from "@/lib/flags";
import ForumPagination from "@/components/forum/Pagination";
import { lc } from "@/i18n/content";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string; sort?: string; page?: string }>;
}

const STAGES = ["all", "group", "round32", "round16", "quarter", "semi", "third", "final"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<string, Record<Stage | string, string>> = {
  zh: {
    all: "全部", group: "小组赛", round32: "32强", round16: "16强",
    quarter: "四强", semi: "半决赛", third: "季军赛", final: "决赛",
  },
  en: {
    all: "All", group: "Group Stage", round32: "Round of 32", round16: "Round of 16",
    quarter: "Quarters", semi: "Semi-finals", third: "3rd Place", final: "Final",
  },
};

const PAGE_SIZE = 10;

function timeAgo(dateStr: string, zh: boolean, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return lc(locale, "刚刚", "just now");
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  if (d < 30) return zh ? `${d}天前`   : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string, zh: boolean, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string, zh: boolean, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(zh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

type StatusInfo = { label: string; cls: string };

function getStatusInfo(status: string, kickoff: string, zh: boolean, locale: string): StatusInfo {
  if (status === "live") {
    return { label: lc(locale, "进行中", "LIVE"), cls: "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse" };
  }
  if (status === "finished") {
    return { label: lc(locale, "已结束", "FT"), cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
  }
  const d = new Date(kickoff);
  if (d > new Date()) {
    return { label: formatTime(kickoff, zh, locale), cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  }
  return { label: lc(locale, "待开赛", "Upcoming"), cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
}

export default async function MatchForumPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { stage = "group", sort = "latest", page: pageStr = "1" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * PAGE_SIZE;

  const labels = STAGE_LABELS[zh ? "zh" : "en"];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Parallel fetches
  const catQ = supabase
    .from("forum_categories")
    .select("id, post_count")
    .eq("slug", "match")
    .single();

  let matchQ = supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, kickoff_time, status, stage, group_name")
    .order("kickoff_time", { ascending: true })
    .limit(80);
  if (stage !== "all") matchQ = matchQ.eq("stage", stage);

  const [catRes, matchRes] = await Promise.all([catQ, matchQ]);

  const cat     = catRes.data;
  const matches = matchRes.data ?? [];

  // Now that we have cat.id, fetch threads + free posts
  const orderCol = sort === "hot" ? "like_count" : sort === "replies" ? "reply_count" : "last_reply_at";

  let threadQ = supabase
    .from("forum_posts")
    .select("id, match_id, reply_count, like_count")
    .eq("category_id", cat?.id ?? 0)
    .not("match_id", "is", null);
  if (stage !== "all") threadQ = threadQ.eq("stage", stage);

  let postsQ = supabase
    .from("forum_posts")
    .select(`
      id, title, is_pinned, is_locked,
      view_count, reply_count, like_count, last_reply_at, created_at,
      users(username, avatar_url)
    `, { count: "exact" })
    .eq("category_id", cat?.id ?? 0)
    .is("match_id", null)
    .not("user_id", "is", null);
  if (stage !== "all") postsQ = postsQ.eq("stage", stage);
  postsQ = postsQ.order(orderCol, { ascending: false }).range(from, from + PAGE_SIZE - 1);

  const [threadRes, postsRes] = await Promise.all([threadQ, postsQ]);

  const threads    = threadRes.data ?? [];
  const freePosts  = postsRes.data ?? [];
  const totalPosts = postsRes.count ?? 0;
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);

  // match_id → thread
  const threadMap = new Map<number, { id: number; reply_count: number; like_count: number }>();
  threads.forEach((t) => { if (t.match_id) threadMap.set(t.match_id, t); });

  const SORT_OPTIONS = [
    { key: "latest",  label: lc(locale, "最新", "Latest") },
    { key: "hot",     label: lc(locale, "最热", "Hottest") },
    { key: "replies", label: lc(locale, "最多回复", "Most Replies") },
  ];

  type PostRow = {
    id: number; title: string; is_pinned: boolean; is_locked: boolean;
    view_count: number; reply_count: number; like_count: number;
    last_reply_at: string; created_at: string;
    users: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href={`/${locale}/forum`} className="hover:text-white transition-colors">
            {lc(locale, "论坛", "Forum")}
          </Link>
          <span>/</span>
          <span className="text-white font-semibold">⚽ {lc(locale, "赛事讨论", "Match Talk")}</span>
        </div>

        {/* Header card */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚽</span>
            <div>
              <h1 className="text-xl font-black text-white">{lc(locale, "赛事讨论", "Match Talk")}</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {lc(locale, "赛前预测、赛后复盘与即时讨论", "Previews, post-match reviews & live match chat")}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {(cat?.post_count ?? 0).toLocaleString()} {lc(locale, "篇帖子", "posts")}
              </p>
            </div>
          </div>
        </div>

        {/* Stage Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
          {STAGES.map((s) => (
            <Link
              key={s}
              href={`/${locale}/forum/match?stage=${s}`}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                stage === s
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {labels[s]}
            </Link>
          ))}
        </div>

        {/* ── Match Cards (Pinned Threads) ── */}
        {matches.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-black text-[#FFD700] uppercase tracking-widest">
                📌 {lc(locale, "赛事专帖", "Match Threads")}
              </span>
              <div className="flex-1 h-px bg-[#1E3A5F]" />
              <span className="text-[10px] text-gray-600">{matches.length} {lc(locale, "场", "matches")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matches.map((m) => {
                const thread   = threadMap.get(m.id);
                const status   = getStatusInfo(m.status, m.kickoff_time, zh, locale);
                const hasScore = m.home_score !== null && m.away_score !== null;
                const homeTBD  = isTBD(m.home_team);
                const awayTBD  = isTBD(m.away_team);

                // Link: direct if thread exists, else lazy-create redirect
                const href = thread
                  ? `/${locale}/forum/thread/${thread.id}`
                  : `/${locale}/forum/match/thread?match_id=${m.id}`;

                const groupLabel = m.group_name
                  ? (zh ? `${m.group_name}组` : `Group ${m.group_name}`)
                  : labels[m.stage] ?? m.stage;

                return (
                  <Link
                    key={m.id}
                    href={href}
                    className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 hover:border-[#FFD700]/50 hover:bg-[#0F2040]/80 transition-all group block"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                        {groupLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Teams + Score */}
                    <div className="flex items-center gap-2">
                      {/* Home team */}
                      <div className="flex-1 flex items-center gap-2 justify-end overflow-hidden">
                        <span className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors truncate text-right">
                          {homeTBD ? (lc(locale, "待定", "TBD")) : getTeamDisplayName(m.home_team, locale)}
                        </span>
                        {!homeTBD && (
                          <Image
                            src={getFlagUrl(m.home_team)} alt={m.home_team}
                            width={24} height={16} className="rounded-sm object-cover shrink-0" unoptimized
                          />
                        )}
                      </div>

                      {/* Score / VS */}
                      <div className="shrink-0 w-14 text-center">
                        {hasScore ? (
                          <span className="text-base font-black text-white tabular-nums">
                            {m.home_score}–{m.away_score}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-600">VS</span>
                        )}
                      </div>

                      {/* Away team */}
                      <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        {!awayTBD && (
                          <Image
                            src={getFlagUrl(m.away_team)} alt={m.away_team}
                            width={24} height={16} className="rounded-sm object-cover shrink-0" unoptimized
                          />
                        )}
                        <span className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors truncate">
                          {awayTBD ? (lc(locale, "待定", "TBD")) : getTeamDisplayName(m.away_team, locale)}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E3A5F]/50">
                      <span className="text-[10px] text-gray-600">
                        {formatDate(m.kickoff_time, zh, locale)}
                      </span>
                      {thread ? (
                        <span className="text-[10px] text-gray-500 flex items-center gap-2">
                          <span>💬 {thread.reply_count}</span>
                          <span>❤️ {thread.like_count}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#FFD700]/70 font-bold">
                          {lc(locale, "开启讨论 →", "Open thread →")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Fan Posts ── */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              💬 {lc(locale, "球迷帖子", "Fan Posts")}
            </span>
            <div className="flex-1 h-px bg-[#1E3A5F]" />
          </div>

          {/* Sort tabs */}
          <div className="flex gap-2 mb-4">
            {SORT_OPTIONS.map((o) => (
              <Link
                key={o.key}
                href={`/${locale}/forum/match?stage=${stage}&sort=${o.key}`}
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
            buildHref={(p) => `/${locale}/forum/match?stage=${stage}&sort=${sort}&page=${p}`}
            zh={zh}
            locale={locale}
          />

          {freePosts.length === 0 ? (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-14 text-center">
              <div className="text-4xl mb-3">⚽</div>
              <p className="text-gray-500 text-sm">
                {lc(locale, "赛事帖子将由系统自动生成", "Match threads are generated automatically")}
              </p>
            </div>
          ) : (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden divide-y divide-[#1E3A5F]/60">
              {(freePosts as PostRow[]).map((p) => {
                const author = Array.isArray(p.users) ? p.users[0] : p.users;
                return (
                  <Link
                    key={p.id}
                    href={`/${locale}/forum/thread/${p.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#1E3A5F]/30 transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="shrink-0">
                      {author?.avatar_url ? (
                        <Image
                          src={author.avatar_url} alt={author.username ?? ""}
                          width={36} height={36} className="rounded-full object-cover" unoptimized
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-sm">
                          {(author?.username ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.is_pinned && (
                          <span className="text-[9px] font-black bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                            {lc(locale, "置顶", "PIN")}
                          </span>
                        )}
                        {p.is_locked && (
                          <span className="text-[9px] font-black bg-gray-500/15 text-gray-400 px-1.5 py-0.5 rounded border border-gray-500/20">
                            🔒
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white group-hover:text-[#FFD700] transition-colors line-clamp-1">
                          {p.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                        <span>@{author?.username ?? "?"}</span>
                        <span className="text-gray-600">·</span>
                        <span>{timeAgo(p.last_reply_at ?? p.created_at, zh, locale)}</span>
                      </div>
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

          {/* Pagination */}
          <ForumPagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/${locale}/forum/match?stage=${stage}&sort=${sort}&page=${p}`}
            zh={zh}
            locale={locale}
          />
        </section>

      </div>
    </div>
  );
}
