export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getWealthLevel,
  getHonorLevel,
  getNextWealthLevel,
  getWealthProgress,
  getHonorProgress,
  formatGc,
} from "@/lib/levels";
import { getCountryByCode } from "@/lib/countries";
import ProfileTabs from "./ProfileTabs";
import UserFollowButton from "@/components/UserFollowButton";

interface PageProps {
  params:       Promise<{ locale: string; userId: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}

const PAGE_SIZE = 15;

export default async function PublicProfilePage({ params, searchParams }: PageProps) {
  const { locale, userId } = await params;
  const { tab = "posts", page: pageStr = "1" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Check if this is "me" — redirect to own profile
  const { data: { user: me } } = await supabase.auth.getUser();
  if (me && me.id === userId) {
    redirect(`/${locale}/profile`);
  }

  // Fetch target user + follow state in parallel
  const [profileRes, followRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, nickname, avatar_url, gc_balance, honor_points, country_code, bio, favorite_team, slogan, social_x, social_telegram, created_at, follower_count, following_count")
      .eq("id", userId)
      .single(),
    me
      ? supabase.from("user_follows").select("id").eq("follower_id", me.id).eq("following_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const isFollowing = !!followRes.data;

  const wealthLevel  = getWealthLevel(profile.gc_balance ?? 0);
  const honorLevel   = getHonorLevel(profile.honor_points ?? 0);
  const nextWealth   = getNextWealthLevel(profile.gc_balance ?? 0);
  const wealthProg   = getWealthProgress(profile.gc_balance ?? 0);
  const honorProg    = getHonorProgress(profile.honor_points ?? 0);
  const country      = profile.country_code ? getCountryByCode(profile.country_code.trim()) : null;

  // Fetch posts or replies
  type PostRow = {
    id: number; title: string; reply_count: number; like_count: number;
    view_count: number; created_at: string;
    forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                    | { slug: string; name: string; name_zh: string; icon: string }[];
  };
  type ReplyRow = {
    id: number; content: string; like_count: number; created_at: string;
    post_id: number;
    forum_posts: { id: number; title: string;
      forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                      | { slug: string; name: string; name_zh: string; icon: string }[];
    } | { id: number; title: string;
      forum_categories: { slug: string; name: string; name_zh: string; icon: string }
                      | { slug: string; name: string; name_zh: string; icon: string }[];
    }[];
  };

  // Followers / following list
  type FollowUserRow = { id: string; nickname: string; avatar_url: string | null; follower_count: number };
  let followers: FollowUserRow[] = [];
  let following: FollowUserRow[] = [];

  if (tab === "followers" || tab === "following") {
    if (tab === "followers") {
      // People who follow this user
      const { data } = await supabase
        .from("user_follows")
        .select("users!user_follows_follower_id_fkey(id, nickname, avatar_url, follower_count)")
        .eq("following_id", userId)
        .limit(100);
      followers = ((data ?? []) as unknown as Array<{ users: FollowUserRow | FollowUserRow[] | null }>)
        .map((r) => { const u = Array.isArray(r.users) ? r.users[0] : r.users; return u ?? null; })
        .filter((u): u is FollowUserRow => !!u);
    } else {
      // People this user follows
      const { data } = await supabase
        .from("user_follows")
        .select("users!user_follows_following_id_fkey(id, nickname, avatar_url, follower_count)")
        .eq("follower_id", userId)
        .limit(100);
      following = ((data ?? []) as unknown as Array<{ users: FollowUserRow | FollowUserRow[] | null }>)
        .map((r) => { const u = Array.isArray(r.users) ? r.users[0] : r.users; return u ?? null; })
        .filter((u): u is FollowUserRow => !!u);
    }
  }

  let posts: PostRow[]     = [];
  let replies: ReplyRow[]  = [];
  let totalCount = 0;

  if (tab === "replies") {
    const { data, count } = await supabase
      .from("forum_replies")
      .select(
        "id, content, like_count, created_at, post_id, forum_posts!inner(id, title, forum_categories(slug, name, name_zh, icon))",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    replies    = (data ?? []) as unknown as ReplyRow[];
    totalCount = count ?? 0;
  } else {
    const { data, count } = await supabase
      .from("forum_posts")
      .select(
        "id, title, reply_count, like_count, view_count, created_at, forum_categories(slug, name, name_zh, icon)",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    posts      = (data ?? []) as unknown as PostRow[];
    totalCount = count ?? 0;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // helper: strip html for reply snippets
  function snippet(html: string, max = 120): string {
    const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return zh ? "刚刚"      : "just now";
    if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
    if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
    if (d < 30) return zh ? `${d}天前`   : `${d}d ago`;
    return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">

        {/* ── Profile Header ── */}
        <div className="bg-gradient-to-r from-[#0F2040] to-[#0A1628] border border-[#1E3A5F] rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1E3A5F] flex items-center justify-center">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.nickname} width={80} height={80}
                    className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span className="text-4xl font-black text-[#FFD700]">
                    {profile.nickname?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-base border-2 border-[#0A1628]"
                style={{ backgroundColor: wealthLevel.bgColor }}
              >
                {wealthLevel.icon}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white truncate">{profile.nickname}</h1>
                {country && <span className="text-xl" title={country.name}>{country.flag}</span>}
              </div>

              {/* Slogan */}
              {profile.slogan && (
                <p className="text-gray-400 text-xs italic mt-1">&ldquo;{profile.slogan}&rdquo;</p>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border"
                  style={{ color: wealthLevel.color, borderColor: wealthLevel.color + "40", backgroundColor: wealthLevel.bgColor + "40" }}
                >
                  {wealthLevel.icon} {wealthLevel.name}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border"
                  style={{ color: honorLevel.color, borderColor: honorLevel.color + "40", backgroundColor: honorLevel.color + "15" }}
                >
                  {honorLevel.icon} {honorLevel.name}
                </span>
                {profile.favorite_team && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border border-[#1E3A5F] text-gray-300 bg-[#1E3A5F]/40">
                    ⚽ {profile.favorite_team}
                  </span>
                )}
              </div>
            </div>

            {/* Follow + Transfer buttons */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <UserFollowButton
                targetId={userId}
                initialFollow={isFollowing}
                initialCount={profile.follower_count ?? 0}
                loggedIn={!!me}
                locale={locale}
                zh={zh}
              />
              {me && (
                <ProfileTabs
                  mode="transfer-btn"
                  targetUserId={userId}
                  targetNickname={profile.nickname}
                  targetBalance={profile.gc_balance ?? 0}
                  locale={locale}
                  zh={zh}
                />
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-4 bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-3">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{profile.bio}</p>
            </div>
          )}

          {/* Follower / Following counts */}
          <div className="mt-3 flex items-center gap-4">
            <Link href={`/${locale}/profile/${userId}?tab=followers`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-white font-black text-sm">{(profile.follower_count ?? 0).toLocaleString()}</span>
              <span className="text-gray-500 text-xs">{zh ? "粉丝" : "Followers"}</span>
            </Link>
            <div className="w-px h-3 bg-[#1E3A5F]" />
            <Link href={`/${locale}/profile/${userId}?tab=following`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-white font-black text-sm">{(profile.following_count ?? 0).toLocaleString()}</span>
              <span className="text-gray-500 text-xs">{zh ? "关注" : "Following"}</span>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">{zh ? "财富等级" : "Wealth"}</p>
              <p className="text-sm font-black" style={{ color: wealthLevel.color }}>
                {wealthLevel.icon} {zh ? wealthLevel.nameZh : wealthLevel.name}
              </p>
            </div>
            <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">{zh ? "荣誉等级" : "Honor"}</p>
              <p className="text-sm font-black" style={{ color: honorLevel.color }}>
                {honorLevel.icon} {zh ? honorLevel.nameZh : honorLevel.name}
              </p>
            </div>
            <div className="bg-[#0A1628] border border-[#FFD700]/15 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">GC</p>
              <p className="text-sm font-black text-[#FFD700]">🪙 {formatGc(profile.gc_balance ?? 0)}</p>
            </div>
          </div>

          {/* Social links */}
          {(profile.social_x || profile.social_telegram) && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {profile.social_x && (
                <a
                  href={`https://x.com/${profile.social_x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  𝕏 @{profile.social_x}
                </a>
              )}
              {profile.social_telegram && (
                <a
                  href={`https://t.me/${profile.social_telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  ✈️ @{profile.social_telegram}
                </a>
              )}
            </div>
          )}

          {/* Member since */}
          <p className="text-[10px] text-gray-600 mt-3">
            {zh ? "注册于" : "Member since"}{" "}
            {new Date(profile.created_at).toLocaleDateString(zh ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── Tabs: Posts | Replies | Followers | Following ── */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["posts", "replies", "followers", "following"] as const).map((t) => (
            <Link
              key={t}
              href={`/${locale}/profile/${userId}?tab=${t}`}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                tab === t
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {t === "posts"
                ? (zh ? `📝 主题${tab === "posts" ? ` (${totalCount})` : ""}` : `📝 Posts${tab === "posts" ? ` (${totalCount})` : ""}`)
                : t === "replies"
                ? (zh ? `💬 回复${tab === "replies" ? ` (${totalCount})` : ""}` : `💬 Replies${tab === "replies" ? ` (${totalCount})` : ""}`)
                : t === "followers"
                ? (zh ? `👥 粉丝 (${(profile.follower_count ?? 0).toLocaleString()})` : `👥 Followers (${(profile.follower_count ?? 0).toLocaleString()})`)
                : (zh ? `➕ 关注 (${(profile.following_count ?? 0).toLocaleString()})` : `➕ Following (${(profile.following_count ?? 0).toLocaleString()})`)}
            </Link>
          ))}
        </div>

        {/* ── Posts list ── */}
        {tab === "posts" && (
          <>
            {posts.length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">{zh ? "还没有发布主题" : "No posts yet"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((p) => {
                  const cat = Array.isArray(p.forum_categories) ? p.forum_categories[0] : p.forum_categories;
                  return (
                    <Link
                      key={p.id}
                      href={`/${locale}/forum/thread/${p.id}`}
                      className="block bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30
                                 rounded-2xl p-4 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {cat && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-400">
                            {cat.icon} {zh ? cat.name_zh : cat.name}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600">{timeAgo(p.created_at)}</span>
                      </div>
                      <h3 className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors leading-snug mb-2">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[10px] text-gray-600">
                        <span>👁 {p.view_count.toLocaleString()}</span>
                        <span>💬 {p.reply_count}</span>
                        <span>❤️ {p.like_count}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Replies list ── */}
        {tab === "replies" && (
          <>
            {replies.length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">{zh ? "还没有回复" : "No replies yet"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {replies.map((r) => {
                  const fp = Array.isArray(r.forum_posts) ? r.forum_posts[0] : r.forum_posts;
                  const cat = fp
                    ? (Array.isArray(fp.forum_categories) ? fp.forum_categories[0] : fp.forum_categories)
                    : null;
                  return (
                    <Link
                      key={r.id}
                      href={`/${locale}/forum/thread/${fp?.id ?? r.post_id}`}
                      className="block bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30
                                 rounded-2xl p-4 transition-all group"
                    >
                      {/* Original post title */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {cat && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E3A5F]/80 border border-[#1E3A5F] text-gray-400">
                            {cat.icon} {zh ? cat.name_zh : cat.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-semibold truncate">
                          {zh ? "回复：" : "Re: "}{fp?.title ?? ""}
                        </span>
                        <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(r.created_at)}</span>
                      </div>
                      {/* Reply snippet */}
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {snippet(r.content)}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-2">
                        <span>❤️ {r.like_count}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Followers list ── */}
        {tab === "followers" && (
          <div className="space-y-2">
            {followers.length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-gray-500 text-sm">{zh ? "还没有粉丝" : "No followers yet"}</p>
              </div>
            ) : (
              followers.map((u) => (
                <Link
                  key={u.id}
                  href={`/${locale}/profile/${u.id}`}
                  className="flex items-center gap-3 bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30 rounded-2xl px-4 py-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1E3A5F] flex items-center justify-center shrink-0">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt={u.nickname} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <span className="text-lg font-black text-[#FFD700]">{u.nickname?.[0]?.toUpperCase() ?? "?"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors truncate">{u.nickname}</p>
                    <p className="text-[10px] text-gray-600">{(u.follower_count ?? 0).toLocaleString()} {zh ? "粉丝" : "followers"}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))
            )}
          </div>
        )}

        {/* ── Following list ── */}
        {tab === "following" && (
          <div className="space-y-2">
            {following.length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-gray-500 text-sm">{zh ? "还没有关注任何人" : "Not following anyone yet"}</p>
              </div>
            ) : (
              following.map((u) => (
                <Link
                  key={u.id}
                  href={`/${locale}/profile/${u.id}`}
                  className="flex items-center gap-3 bg-[#0F2040] border border-[#1E3A5F] hover:border-[#FFD700]/30 rounded-2xl px-4 py-3 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1E3A5F] flex items-center justify-center shrink-0">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt={u.nickname} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <span className="text-lg font-black text-[#FFD700]">{u.nickname?.[0]?.toUpperCase() ?? "?"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-[#FFD700] transition-colors truncate">{u.nickname}</p>
                    <p className="text-[10px] text-gray-600">{(u.follower_count ?? 0).toLocaleString()} {zh ? "粉丝" : "followers"}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))
            )}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && tab !== "followers" && tab !== "following" && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <Link
                href={`/${locale}/profile/${userId}?tab=${tab}&page=${page - 1}`}
                className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
              >
                {zh ? "上一页" : "Prev"}
              </Link>
            )}
            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/${locale}/profile/${userId}?tab=${tab}&page=${page + 1}`}
                className="px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
              >
                {zh ? "下一页" : "Next"}
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
