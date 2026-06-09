export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getWealthLevel, getHonorLevel } from "@/lib/levels";
import RichTextContent from "@/components/forum/RichTextContent";
import PostActions from "./PostActions";
import ForumPagination from "@/components/forum/Pagination";
import ShareButtons from "@/components/forum/ShareButtons";
import FloorRatingBadge,  { type RatingEntry } from "@/components/forum/FloorRatingBadge";
import TranslatedTitle from "@/components/forum/TranslatedTitle";
import RateButtons from "@/components/forum/RateButtons";
import EditableFloor from "@/components/forum/EditableFloor";
import AdminPostControls from "@/components/forum/AdminPostControls";
import MatchHero from "@/components/forum/MatchHero";
import TagBadge from "@/components/forum/TagBadge";
import { lc } from "@/i18n/content";

interface PageProps {
  params:       Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}

const REPLIES_PER_PAGE = 10;

function formatDate(dateStr: string, zh: boolean) {
  // Use en-US for the server side (Vercel small-icu returns English regardless of locale).
  // Numeric format is universally readable.
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  };
  return new Date(dateStr).toLocaleString(zh ? "zh-CN" : "en-US", opts);
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
  if (d < 7)  return fmt(d, "d");
  return formatDate(dateStr, zh);
}

// (RatingRecords replaced by FloorRatingBadge — see component)

// ── Main Page ────────────────────────────────────────────────────────────────
export default async function PostPage({ params, searchParams }: PageProps) {
  const { locale, id } = await params;
  const { page: pageStr = "1" } = await searchParams;
  const replyPage = Math.max(1, parseInt(pageStr, 10));
  const replyFrom = (replyPage - 1) * REPLIES_PER_PAGE;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const [isAdmin, myProfileRes] = await Promise.all([
    user
      ? supabase.from("users").select("is_admin").eq("id", user.id).single()
          .then(({ data }) => data?.is_admin === true)
      : Promise.resolve(false),
    user
      ? supabase.from("users").select("username").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);
  const myUsername = (myProfileRes.data as { username: string } | null)?.username ?? null;

  // ── Fetch post (no FK join — avoids PostgREST auth.users vs public.users ambiguity) ──
  const { data: post, error: postErr } = await supabase
    .from("forum_posts")
    .select(`
      id, title, title_zh, title_en, content, content_zh, content_en, user_id, match_id,
      is_pinned, is_locked, is_deleted, is_featured, view_count, reply_count, like_count, created_at, edited_at,
      forum_categories(id, slug, name, name_zh, icon)
    `)
    .eq("id", id)
    .single();

  if (postErr) console.error("POST_ERR", JSON.stringify(postErr));
  if (!post) notFound();
  if (post.is_deleted) notFound();

  // ── Parallel fetches ────────────────────────────────────────────────────────
  const [repliesRes, myLikesRes, myFollowRes, ratingsRes, postAuthorRes, postTransRes, myBookmarkRes, postTagsRes] = await Promise.all([
    supabase
      .from("forum_replies")
      .select("id, content, content_zh, content_en, like_count, parent_id, created_at, edited_at, user_id",
        { count: "exact" })
      .eq("post_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .range(replyFrom, replyFrom + REPLIES_PER_PAGE - 1),

    user
      ? supabase.from("forum_likes").select("target_type, target_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),

    user
      ? supabase.from("forum_follows").select("id").eq("user_id", user.id).eq("post_id", id).maybeSingle()
      : Promise.resolve({ data: null }),

    // All ratings for every floor of this thread (post + replies)
    supabase
      .from("forum_ratings")
      .select("id, gc_amount, reason, created_at, user_id, reply_id")
      .eq("post_id", id)
      .order("created_at", { ascending: false })
      .limit(200),

    // Fetch post author separately (direct table query, no FK join)
    post.user_id
      ? supabase.from("users")
          .select("id, nickname, avatar_url, gc_balance, honor_points, last_seen, country_code")
          .eq("id", post.user_id)
          .single()
      : Promise.resolve({ data: null }),

    // All cached translations for this post (title + content)
    supabase
      .from("forum_translations")
      .select("type, lang, content")
      .in("type", ["post_content", "post_title"])
      .eq("source_id", id),

    // User's bookmark for this post
    user
      ? supabase.from("forum_bookmarks").select("id").eq("user_id", user.id).eq("post_id", id).maybeSingle()
      : Promise.resolve({ data: null }),

    // Tags on this post
    supabase
      .from("forum_post_tags")
      .select("forum_tags(id, name, name_zh, color)")
      .eq("post_id", id),
  ]);

  // ── Fetch match data + votes if this is a match thread ──────────────────
  type MatchRow = {
    id: number; home_team: string; away_team: string; home_flag: string; away_flag: string;
    group_name: string | null; venue: string | null; city: string | null;
    kickoff_time: string; home_score: number | null; away_score: number | null; status: string;
  };
  let matchData: MatchRow | null = null;
  let matchVoteCounts = { home: 0, neutral: 0, away: 0 };
  let myMatchVote: string | null = null;

  if (post.match_id) {
    const [matchRes, votesRes, myVoteRes] = await Promise.all([
      supabase
        .from("matches")
        .select("id, home_team, away_team, home_flag, away_flag, group_name, venue, city, kickoff_time, home_score, away_score, status")
        .eq("id", post.match_id)
        .single(),
      supabase
        .from("match_votes")
        .select("vote")
        .eq("match_id", post.match_id),
      user
        ? supabase
            .from("match_votes")
            .select("vote")
            .eq("match_id", post.match_id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    matchData = (matchRes.data as MatchRow) ?? null;

    // Count votes
    if (votesRes.data) {
      for (const v of votesRes.data as { vote: string }[]) {
        if (v.vote === "home")    matchVoteCounts.home++;
        else if (v.vote === "neutral") matchVoteCounts.neutral++;
        else if (v.vote === "away")    matchVoteCounts.away++;
      }
    }

    myMatchVote = (myVoteRes.data as { vote: string } | null)?.vote ?? null;
  }

  // Collect all unique user_ids from replies + ratings to batch-fetch
  const replies    = repliesRes.data ?? [];
  const rawRatings = (ratingsRes.data ?? []) as {
    id: number; gc_amount: number; reason: string | null;
    created_at: string; user_id: string | null; reply_id: number | null;
  }[];

  const replyUserIds = [...new Set(replies.map((r: { user_id: string | null }) => r.user_id).filter(Boolean))] as string[];
  const raterIds     = [...new Set(rawRatings.map((r) => r.user_id).filter(Boolean))] as string[];
  const allUserIds   = [...new Set([...replyUserIds, ...raterIds])];

  const usersMapRes = allUserIds.length
    ? await supabase.from("users")
        .select("id, nickname, avatar_url, gc_balance, honor_points, last_seen, country_code")
        .in("id", allUserIds)
    : { data: [] };

  type UserShape = {
    id: string; nickname: string; avatar_url: string | null;
    gc_balance: number; honor_points: number; last_seen: string | null;
    country_code: string | null;
  };
  const usersById = new Map<string, UserShape>(
    ((usersMapRes.data ?? []) as UserShape[]).map((u) => [u.id, u])
  );

  // ── Build post translation maps from forum_translations ─────────────────
  type TransRow = { type: string; lang: string; content: string };
  const postContentTrans: Record<string, string> = {};
  const postTitleTrans:   Record<string, string> = {};
  for (const t of ((postTransRes.data ?? []) as TransRow[])) {
    if (t.type === "post_content") postContentTrans[t.lang] = t.content;
    if (t.type === "post_title")   postTitleTrans[t.lang]   = t.content;
  }

  // ── Fetch reply translations (batch, one query for all replies on this page) ──
  const replyIds = replies.map((r: { id: number }) => r.id);
  const replyTransData = replyIds.length
    ? (await supabase
        .from("forum_translations")
        .select("source_id, lang, content")
        .eq("type", "reply_content")
        .in("source_id", replyIds)
      ).data ?? []
    : [];

  const replyTransMap = new Map<number, Record<string, string>>();
  for (const t of (replyTransData as { source_id: number; lang: string; content: string }[])) {
    if (!replyTransMap.has(t.source_id)) replyTransMap.set(t.source_id, {});
    replyTransMap.get(t.source_id)![t.lang] = t.content;
  }

  // Fire-and-forget view count increment
  supabase.from("forum_posts")
    .update({ view_count: (post.view_count ?? 0) + 1 })
    .eq("id", id).then(() => {});

  const totalReplies    = repliesRes.count ?? 0;
  const totalReplyPages = Math.ceil(totalReplies / REPLIES_PER_PAGE);

  const myLikedIds = new Set(
    ((myLikesRes.data ?? []) as { target_type: string; target_id: number }[])
      .map((l) => `${l.target_type}-${l.target_id}`)
  );

  const cat            = Array.isArray(post.forum_categories) ? post.forum_categories[0] : post.forum_categories;
  const authorRaw      = postAuthorRes.data as UserShape | null;
  const isSystem       = !authorRaw;
  const isBookmarked   = !!myBookmarkRes.data;

  type TagRow = { id: number; name: string; name_zh: string | null; color: string | null };
  const postTags: TagRow[] = ((postTagsRes.data ?? []) as { forum_tags: TagRow | TagRow[] | null }[])
    .flatMap((pt) => {
      const t = pt.forum_tags;
      if (!t) return [];
      return Array.isArray(t) ? t : [t];
    });

  // Build per-floor ratings map: "post-{id}" | "reply-{id}" → RatingEntry[]
  const ratingsMap = new Map<string, RatingEntry[]>();
  for (const r of rawRatings) {
    const key = r.reply_id != null ? `reply-${r.reply_id}` : `post-${id}`;
    if (!ratingsMap.has(key)) ratingsMap.set(key, []);
    const ru = r.user_id ? (usersById.get(r.user_id) ?? null) : null;
    ratingsMap.get(key)!.push({
      id:         r.id,
      gc_amount:  r.gc_amount,
      reason:     r.reason,
      created_at: r.created_at,
      rater: ru ? {
        id:           ru.id,
        nickname:     ru.nickname,
        avatar_url:   ru.avatar_url,
        gc_balance:   ru.gc_balance,
        country_code: ru.country_code ?? "UN",
      } : null,
    });
  }

  // Build reply rows with resolved user objects
  type ReplyRow2 = {
    id: number; content: string; content_zh: string | null; content_en: string | null;
    like_count: number; parent_id: number | null; created_at: string; edited_at: string | null;
    user_id: string | null; userObj: UserShape | null;
  };
  const allReplies: ReplyRow2[] = (replies as { id: number; content: string; content_zh: string | null; content_en: string | null; like_count: number; parent_id: number | null; created_at: string; edited_at: string | null; user_id: string | null }[])
    .map((r) => ({ ...r, userObj: r.user_id ? (usersById.get(r.user_id) ?? null) : null }));

  const topReplies = allReplies.filter((r) => !r.parent_id);
  const nestedMap  = new Map<number, ReplyRow2[]>();
  allReplies.filter((r) => r.parent_id).forEach((r) => {
    const pid = r.parent_id!;
    if (!nestedMap.has(pid)) nestedMap.set(pid, []);
    nestedMap.get(pid)!.push(r);
  });

  const catHref = cat.slug === "match" ? `/${locale}/forum/match` : `/${locale}/forum/${cat.slug}`;
  const p = post!;

  // ── Author Card Column ────────────────────────────────────────────────────
  function AuthorCol({ u, isOp }: { u: UserShape | null; isOp: boolean }) {
    if (isOp && isSystem) {
      return (
        <div className="w-[160px] sm:w-[192px] shrink-0 border-r border-[#1E3A5F]/70 bg-[#080F1F]/40 flex flex-col items-center gap-2.5 p-4 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#F59E0B] flex items-center justify-center text-4xl shadow-lg shadow-[#FFD700]/20">
            ⚽
          </div>
          <p className="text-base font-black text-white">GoalCoin Bot</p>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/25 font-bold">
            🤖 {lc(locale, "官方账号", "Official")}
          </span>
        </div>
      );
    }

    if (!u) {
      return (
        <div className="w-[160px] sm:w-[192px] shrink-0 border-r border-[#1E3A5F]/70 bg-[#080F1F]/40 flex items-center justify-center p-4">
          <span className="text-gray-600 text-sm">{lc(locale, "用户已注销", "Deleted")}</span>
        </div>
      );
    }

    const wl = getWealthLevel(u.gc_balance ?? 0);
    const hl = getHonorLevel(u.honor_points ?? 0);
    const isOnline = u.last_seen
      ? Date.now() - new Date(u.last_seen).getTime() < 5 * 60 * 1000
      : false;

    return (
      <div className="w-[160px] sm:w-[192px] shrink-0 border-r border-[#1E3A5F]/70 bg-[#080F1F]/40 flex flex-col items-center gap-2.5 p-3 text-center">

        {/* Avatar */}
        <div className="relative mt-1">
          {u.avatar_url ? (
            <Image src={u.avatar_url} alt={u.nickname}
              width={68} height={68}
              className="rounded-full object-cover border-2 border-[#1E3A5F] shadow-md" unoptimized />
          ) : (
            <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-2xl border-2 border-[#1E3A5F] shadow-md">
              {u.nickname.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0F2040] ${isOnline ? "bg-green-400" : "bg-gray-600"}`} />
        </div>

        {/* Nickname */}
        <Link href={`/${locale}/profile/${u.id}`}
          className="text-base font-black text-white hover:text-[#FFD700] transition-colors leading-tight max-w-full truncate px-1">
          {u.nickname}
        </Link>

        {/* Online badge */}
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
          isOnline
            ? "bg-green-500/10 text-green-400 border-green-500/25"
            : "bg-gray-600/10 text-gray-500 border-gray-600/20"
        }`}>
          {isOnline ? (lc(locale, "● 在线", "● Online")) : (lc(locale, "○ 离线", "○ Offline"))}
        </span>

        {/* Level badges */}
        <div className="w-full space-y-1 px-1">
          <div className="flex items-center justify-between rounded-lg bg-[#0F2040]/60 px-2.5 py-1.5">
            <span className="text-xs text-gray-500 font-medium">{lc(locale, "荣誉", "Honor")}</span>
            <span className="text-xs font-black" style={{ color: hl.color }}>{hl.icon} {zh ? hl.nameZh : hl.name}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#0F2040]/60 px-2.5 py-1.5">
            <span className="text-xs text-gray-500 font-medium">{lc(locale, "财富", "Wealth")}</span>
            <span className="text-xs font-black" style={{ color: wl.color }}>{wl.icon} {zh ? wl.nameZh : wl.name}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#FFD700]/5 border border-[#FFD700]/15 px-2.5 py-1.5">
            <span className="text-xs text-gray-500 font-medium">GC</span>
            <span className="text-sm font-black text-[#FFD700]">{(u.gc_balance ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#1E3A5F]/50" />

        {/* Action links */}
        <div className="w-full space-y-0.5">
          <Link href={`/${locale}/profile/${u.id}`}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1E3A5F]/50 transition-colors font-medium">
            👤 <span>{lc(locale, "个人空间", "Profile")}</span>
          </Link>
          <Link href={`/${locale}/messages/new?to=${u.id}`}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1E3A5F]/50 transition-colors font-medium">
            ✉️ <span>{lc(locale, "发站内信", "Message")}</span>
          </Link>
          <button className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1E3A5F]/50 transition-colors font-medium">
            ➕ <span>{lc(locale, "加为好友", "Add Friend")}</span>
          </button>
        </div>

      </div>
    );
  }

  // ── Post / Reply Cell ─────────────────────────────────────────────────────
  function PostCell({
    authorUser, content, createdAt, editedAt,
    floorNum, isOp, cellId, cellLikeCount, isLiked, isPost, floorRatings, title,
  }: {
    authorUser:    UserShape | null;
    content:       string;
    createdAt:     string;
    editedAt?:     string | null;
    floorNum:      number;
    isOp:          boolean;
    cellId:        number;
    cellLikeCount: number;
    isLiked:       boolean;
    isPost:        boolean;
    floorRatings:  RatingEntry[];
    title?:        string;
  }) {
    const catSlug = Array.isArray(cat) ? (cat[0]?.slug ?? undefined) : (cat?.slug ?? undefined);
    const cellAuthorId   = authorUser?.id ?? null;
    const cellAuthorName = authorUser?.nickname ?? "?";
    return (
      <div className={`bg-[#0F2040] border rounded-2xl overflow-hidden transition-all ${
        isOp ? "border-[#FFD700]/20 shadow-lg shadow-[#FFD700]/3" : "border-[#1E3A5F]"
      }`}>
        <div className="flex min-h-[180px]">

          {/* Left: Author */}
          <AuthorCol u={authorUser} isOp={isOp} />

          {/* Right: Content */}
          <div className="flex-1 min-w-0 flex flex-col">

            {/* Header bar: [timestamp] → [N楼] [gap] [打赏][扣分] [score badge] */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#080F1F]/50 border-b border-[#1E3A5F]/50">
              <span className="text-[11px] text-gray-500 flex items-center gap-1 flex-1 min-w-0">
                <span className="text-gray-600 shrink-0">🕐</span>
                <span className="truncate">{formatDate(createdAt, zh)}</span>
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md shrink-0 bg-[#1E3A5F]/40 text-gray-400">
                {zh ? `${floorNum}楼` : `#${floorNum}`}
              </span>
              <span className="w-1 shrink-0" />
              <RateButtons
                postId={isPost ? cellId : p.id}
                replyId={isPost ? undefined : cellId}
                authorId={cellAuthorId}
                authorName={cellAuthorName}
                authorBalance={authorUser?.gc_balance ?? 0}
                userId={user?.id ?? null}
                locale={locale}
                zh={zh}
              />
              {floorRatings.length > 0 && (
                <FloorRatingBadge ratings={floorRatings} locale={locale} zh={zh} />
              )}
            </div>

            {/* EditableFloor: handles view/edit mode for content + action bar */}
            <EditableFloor
              originalHtml={content}
              cachedTranslations={isPost ? postContentTrans : (replyTransMap.get(cellId) ?? {})}
              defaultLang={locale}
              contentType={isPost ? "post_content" : "reply_content"}
              contentId={cellId}
              editedAt={editedAt}
              title={title}
              isPost={isPost}
              userId={user?.id ?? null}
              authorId={cellAuthorId}
              locale={locale}
              zh={zh}
              postId={isPost ? cellId : p.id}
              replyId={isPost ? undefined : cellId}
              authorName={cellAuthorName}
              isAdmin={isAdmin}
              isLocked={p.is_locked}
              likeCount={cellLikeCount}
              isLiked={isLiked}
              isFollowing={isPost ? !!myFollowRes.data : undefined}
              replyCount={isPost ? p.reply_count : undefined}
              quoteContent={content}
              isBookmarked={isBookmarked}
              categorySlug={catSlug}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Page render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      <div className="pt-6 space-y-4">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <Link href={`/${locale}/forum`} className="hover:text-[#FFD700] transition-colors">
            {lc(locale, "论坛", "Forum")}
          </Link>
          <span className="text-gray-700">›</span>
          <Link href={catHref} className="hover:text-[#FFD700] transition-colors flex items-center gap-1">
            {cat.icon} {zh ? cat.name_zh : lc(locale, cat.name_zh, cat.name)}
          </Link>
          <span className="text-gray-700">›</span>
          <span className="text-gray-400 truncate max-w-[240px]">
            {zh ? (post.title_zh ?? post.title) : post.title}
          </span>
        </nav>

        {/* ── Thread Header ── */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {/* Top accent line */}
          <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FFD700]/60 to-transparent" />

          {/* Admin controls bar — only visible to admins */}
          {isAdmin && (
            <AdminPostControls
              postId={post.id}
              isPinned={post.is_pinned}
              isLocked={post.is_locked}
              isFeatured={!!(post as typeof post & { is_featured?: boolean }).is_featured}
              locale={locale}
              zh={zh}
            />
          )}

          <div className="px-5 py-4">

            {/* Badges row */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1E3A5F]/60 border border-[#1E3A5F] text-gray-400">
                {cat.icon} {zh ? cat.name_zh : lc(locale, cat.name_zh, cat.name)}
              </span>
              {post.is_pinned && (
                <span className="text-[10px] font-black bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/20">
                  📌 {lc(locale, "置顶", "PINNED")}
                </span>
              )}
              {post.is_locked && (
                <span className="text-[10px] font-black bg-gray-500/15 text-gray-400 px-2.5 py-0.5 rounded-full border border-gray-500/20">
                  🔒 {lc(locale, "已锁定", "LOCKED")}
                </span>
              )}
              {(post as typeof post & { is_featured?: boolean }).is_featured && (
                <span className="text-[10px] font-black bg-[#FFD700]/10 text-[#FFD700] px-2.5 py-0.5 rounded-full border border-[#FFD700]/25">
                  ⭐ {lc(locale, "精华", "FEATURED")}
                </span>
              )}
            </div>

            {/* Tags */}
            {postTags.length > 0 && (
              <div className="mb-3">
                <TagBadge
                  tags={postTags.map((t) => ({ ...t, color: t.color ?? "#6B7280" }))}
                  locale={locale}
                  zh={zh}
                />
              </div>
            )}

            {/* ── Match threads: MatchHero IS the title ── */}
            {/* ── Regular threads: show translated title text ── */}
            {matchData ? (
              <MatchHero
                matchId={matchData.id}
                homeTeam={matchData.home_team}
                awayTeam={matchData.away_team}
                homeFlag={matchData.home_flag ?? ""}
                awayFlag={matchData.away_flag ?? ""}
                groupName={matchData.group_name}
                venue={matchData.venue}
                city={matchData.city}
                kickoff={matchData.kickoff_time}
                homeScore={matchData.home_score}
                awayScore={matchData.away_score}
                status={matchData.status ?? "upcoming"}
                votes={matchVoteCounts}
                myVote={myMatchVote}
                loggedIn={!!user}
                zh={zh}
                embedded
              />
            ) : (
              <div className="mb-3">
                <TranslatedTitle
                  postId={post.id}
                  originalTitle={zh ? ((post as typeof post & { title_zh?: string | null }).title_zh ?? post.title) : post.title}
                  cachedTranslations={postTitleTrans}
                  defaultLang={locale}
                  zh={zh}
                  className="text-xl sm:text-2xl font-black text-white leading-snug"
                />
              </div>
            )}

            {/* Stats + actions row */}
            <div className="flex items-center justify-between gap-4 flex-wrap mt-3">
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span>👁</span>
                  <span>{((post.view_count ?? 0) + 1).toLocaleString()}</span>
                  <span className="text-gray-700">{lc(locale, "浏览", "views")}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>💬</span>
                  <span>{post.reply_count.toLocaleString()}</span>
                  <span className="text-gray-700">{lc(locale, "回复", "replies")}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>❤️</span>
                  <span>{post.like_count.toLocaleString()}</span>
                </span>
                <span className="text-gray-600">{timeAgo(post.created_at, zh, locale)}</span>
              </div>

              {/* Bookmark + Recommend */}
              <PostActions
                locale={locale}
                postId={post.id}
                userId={user?.id ?? null}
                isAdmin={isAdmin}
                isLocked={post.is_locked}
                likeCount={post.like_count}
                isLiked={myLikedIds.has(`post-${post.id}`)}
                isFollowing={!!myFollowRes.data}
                isBookmarked={isBookmarked}
                replyCount={post.reply_count}
                showRating={!isSystem}
                isHeaderMode
                zh={zh}
              />
            </div>

            {/* Share row */}
            <div className="mt-3 pt-3 border-t border-[#1E3A5F]/50 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-black text-gray-300 shrink-0 flex items-center gap-1.5">
                🔗 {lc(locale, "分享", "Share")}
              </span>
              <ShareButtons
                title={post.title}
                translatedTitle={postTitleTrans[locale] ?? null}
                locale={locale}
                zh={zh}
                username={myUsername}
              />

              {/* Page jump — shown if multi-page */}
              {totalReplyPages > 1 && (
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="text-gray-600">{lc(locale, "跳至第", "Page")}</span>
                  {Array.from({ length: Math.min(totalReplyPages, 5) }, (_, i) => i + 1).map((pg) => (
                    <a key={pg}
                      href={`/${locale}/forum/thread/${id}?page=${pg}#replies`}
                      className={`w-6 h-6 flex items-center justify-center rounded border text-[9px] font-bold transition-all ${
                        replyPage === pg
                          ? "bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]"
                          : "border-[#1E3A5F] text-gray-500 hover:text-white hover:border-[#1E3A5F]/80"
                      }`}>{pg}</a>
                  ))}
                  {totalReplyPages > 5 && (
                    <a href={`/${locale}/forum/thread/${id}?page=${totalReplyPages}#replies`}
                      className="flex items-center gap-0.5 text-gray-600 hover:text-white transition-colors">
                      <span>…</span>
                      <span className="w-6 h-6 flex items-center justify-center rounded border border-[#1E3A5F] text-[9px] font-bold">{totalReplyPages}</span>
                    </a>
                  )}
                  <span className="text-gray-700">{zh ? `共${totalReplyPages}页` : `of ${totalReplyPages}`}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── OP Post ── */}
        <PostCell
          authorUser={authorRaw ?? null}
          content={post.content}
          createdAt={post.created_at}
          editedAt={(post as typeof post & { edited_at?: string | null }).edited_at ?? null}
          title={post.title}
          floorNum={1}
          isOp={true}
          cellId={post.id}
          cellLikeCount={post.like_count}
          isLiked={myLikedIds.has(`post-${post.id}`)}
          isPost={true}
          floorRatings={ratingsMap.get(`post-${post.id}`) ?? []}
        />

        {/* ── Replies ── */}
        {topReplies.length > 0 && (
          <div id="replies" className="space-y-3">
            {/* Reply count header */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                💬 {totalReplies.toLocaleString()} {lc(locale, "条回复", "Replies")}
              </span>
              <div className="flex-1 h-px bg-[#1E3A5F]/40" />
            </div>

            {/* Pagination (top) */}
            {totalReplyPages > 1 && (
              <ForumPagination
                page={replyPage}
                totalPages={totalReplyPages}
                buildHref={(pg) => `/${locale}/forum/thread/${id}?page=${pg}#replies`}
                zh={zh}
                locale={locale}
              />
            )}

            {topReplies.map((reply, idx) => {
              const rAuthor = reply.userObj;
              const nested  = nestedMap.get(reply.id) ?? [];

              return (
                <div key={reply.id}>
                  <PostCell
                    authorUser={rAuthor ?? null}
                    content={reply.content}
                    createdAt={reply.created_at}
                    editedAt={reply.edited_at ?? null}
                    floorNum={replyFrom + idx + 2}
                    isOp={false}
                    cellId={reply.id}
                    cellLikeCount={reply.like_count}
                    isLiked={myLikedIds.has(`reply-${reply.id}`)}
                    isPost={false}
                    floorRatings={ratingsMap.get(`reply-${reply.id}`) ?? []}
                  />

                  {/* Nested L2 replies */}
                  {nested.map((nr) => {
                    const nrAuthor = nr.userObj;
                    return (
                      <div key={nr.id} className="ml-8 sm:ml-12 mt-2">
                        <div className="flex items-start gap-3 bg-[#0A1628]/60 border border-[#1E3A5F]/50 rounded-xl px-4 py-3">
                          <div className="w-0.5 self-stretch bg-[#FFD700]/20 rounded-full shrink-0" />
                          <div className="shrink-0">
                            {nrAuthor?.avatar_url ? (
                              <Image src={nrAuthor.avatar_url} alt={nrAuthor.nickname}
                                width={28} height={28} className="rounded-full object-cover border border-[#1E3A5F]" unoptimized />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white font-black text-xs border border-[#1E3A5F]">
                                {(nrAuthor?.nickname ?? "?").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-black text-white">@{nrAuthor?.nickname ?? "?"}</span>
                              <span className="text-[10px] text-gray-600">{timeAgo(nr.created_at, zh, locale)}</span>
                            </div>
                            <RichTextContent html={nr.content} className="text-sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalReplyPages > 1 && (
          <ForumPagination
            page={replyPage}
            totalPages={totalReplyPages}
            buildHref={(pg) => `/${locale}/forum/thread/${id}?page=${pg}#replies`}
            zh={zh}
            locale={locale}
          />
        )}

        {/* ── Reply Box ── */}
        <div className="pt-2">
          {!post.is_locked ? (
            <PostActions
              locale={locale}
              postId={post.id}
              userId={user?.id ?? null}
              isLocked={false}
              likeCount={0}
              isLiked={false}
              isReplyBox
              zh={zh}
              categorySlug={Array.isArray(cat) ? (cat[0]?.slug ?? undefined) : (cat?.slug ?? undefined)}
            />
          ) : (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-5 py-6 text-center">
              <span className="text-3xl mb-2 block">🔒</span>
              <p className="text-gray-500 text-sm">
                {lc(locale, "此帖已锁定，不允许继续回复", "This thread is locked")}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
