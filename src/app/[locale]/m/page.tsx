import MobileHome, {
  type MobileForumCategory,
  type MobileForumPost,
  type MobileForumTag,
  type MobileForumUserReply,
  type MobileInviteLeaderboardEntry,
  type MobileInviteProfile,
  type MobileAwardBet,
  type MobileCheckinRecord,
  type MobileMinePrediction,
  type MobileMatch,
  type MobileTopScorer,
} from "@/components/mobile/MobileHome";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBetPhase } from "@/lib/awardPhase";
import sanitizeHtml from "sanitize-html";

interface MobileHomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preview?: string; thread?: string }>;
}

type DbMatch = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  group_name: string | null;
  stage: string | null;
  venue: string | null;
  city: string | null;
  status: string | null;
  pool_home: number | null;
  pool_draw: number | null;
  pool_away: number | null;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
  is_featured: boolean | null;
};

type DbTopScorer = {
  id: number;
  player_name: string;
  player_name_zh: string | null;
  team: string;
  goals: number;
  assists: number;
  matches_played: number;
};

type DbForumCategory = {
  id: number;
  slug: string;
  name: string;
  name_zh: string | null;
  icon: string | null;
  description: string | null;
  description_zh: string | null;
  post_count: number | null;
  cat_group: string | null;
  cat_group_zh: string | null;
};

type DbForumRelation =
  | { slug: string; name: string; name_zh: string | null; icon: string | null }
  | { slug: string; name: string; name_zh: string | null; icon: string | null }[]
  | null;

type DbForumUserRelation =
  | { nickname: string | null; email: string | null; avatar_url: string | null; gc_balance: number | null }
  | { nickname: string | null; email: string | null; avatar_url: string | null; gc_balance: number | null }[]
  | null;

type DbForumPost = {
  id: number;
  user_id: string | null;
  title: string;
  title_zh: string | null;
  content: string | null;
  content_zh: string | null;
  reply_count: number | null;
  like_count: number | null;
  view_count: number | null;
  created_at: string;
  last_reply_at: string | null;
  forum_categories: DbForumRelation;
  users: DbForumUserRelation;
};

type DbForumReply = {
  id: number;
  post_id: number;
  user_id: string | null;
  content: string | null;
  content_zh: string | null;
  like_count: number | null;
  created_at: string;
  users: DbForumUserRelation;
};

type DbForumUserReply = {
  id: number;
  post_id: number;
  content: string | null;
  content_zh: string | null;
  like_count: number | null;
  created_at: string;
};

type DbForumTag = {
  id: number;
  name: string;
  name_zh: string | null;
  color: string | null;
  post_count: number | null;
};

type DbMineBet = {
  id: string;
  match_id: number;
  prediction: "home" | "draw" | "away";
  gc_amount: number;
  status: string | null;
  created_at: string;
};

type DbMineScoreBet = {
  id: string;
  match_id: number;
  score_home: number;
  score_away: number;
  gc_amount: number;
  status: string | null;
  created_at: string;
};

type DbAwardBet = {
  id: string;
  award_type: string;
  player_id: number;
  player_name: string;
  player_name_zh: string;
  gc_amount: number;
  odds_multiplier: number;
  bet_phase: string;
  result: string;
};

type DbCheckinRow = {
  date: string;
  streak: number;
  gc_earned: number;
};

type DbInviteUserRow = {
  id: string;
  nickname: string | null;
  referral_code: string | null;
  referred_by: string | null;
  country_code: string | null;
  avatar_url: string | null;
};

const MATCH_COLUMNS = "id, home_team, away_team, kickoff_time, group_name, stage, venue, city, status, pool_home, pool_draw, pool_away, odds_home, odds_draw, odds_away, is_featured";
const FORUM_POST_COLUMNS = `
  id, user_id, title, title_zh, content, content_zh, reply_count, like_count, view_count, created_at, last_reply_at,
  forum_categories!inner(slug, name, name_zh, icon),
  users(nickname, email, avatar_url, gc_balance)
`;

function toMobileMatch(match: DbMatch, followCount = 0, isFollowing = false): MobileMatch {
  return {
    id: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    kickoffTime: match.kickoff_time,
    groupName: match.group_name,
    stage: match.stage,
    venue: match.venue,
    city: match.city,
    status: match.status,
    poolHome: match.pool_home,
    poolDraw: match.pool_draw,
    poolAway: match.pool_away,
    oddsHome: match.odds_home,
    oddsDraw: match.odds_draw,
    oddsAway: match.odds_away,
    followCount,
    isFollowing,
  };
}

function fallbackDaysLeft(matches: MobileMatch[]) {
  const kickoff = matches[0]?.kickoffTime ? new Date(matches[0].kickoffTime) : new Date("2026-06-11T19:00:00Z");
  return Math.max(0, Math.ceil((kickoff.getTime() - Date.now()) / 86_400_000))
    .toString()
    .padStart(2, "0");
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function toMobileForumCategory(category: DbForumCategory): MobileForumCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    nameZh: category.name_zh,
    icon: category.icon ?? "💬",
    description: category.description,
    descriptionZh: category.description_zh,
    postCount: category.post_count ?? 0,
    group: category.cat_group,
    groupZh: category.cat_group_zh,
  };
}

function cleanForumHtml(html: string | null) {
  return sanitizeHtml(html ?? "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "a", "span"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"],
    },
    transformTags: {
      a: (_, attributes) => ({
        tagName: "a",
        attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

function toMobileForumReply(reply: DbForumReply, locale: string, likedReplyIds = new Set<number>()) {
  const author = firstRelation(reply.users);
  return {
    id: reply.id,
    authorId: reply.user_id,
    content: cleanForumHtml(locale === "zh" ? (reply.content_zh || reply.content) : reply.content),
    likeCount: reply.like_count ?? 0,
    isLiked: likedReplyIds.has(reply.id),
    createdAt: reply.created_at,
    authorName: author?.nickname ?? author?.email?.split("@")[0] ?? "Football2026",
    authorAvatarUrl: author?.avatar_url ?? null,
    authorBalance: author?.gc_balance ?? 0,
  };
}

function toMobileForumPost(
  post: DbForumPost,
  locale: string,
  repliesByPost = new Map<number, ReturnType<typeof toMobileForumReply>[]>(),
  state: { likedPostIds?: Set<number>; followedPostIds?: Set<number>; bookmarkedPostIds?: Set<number> } = {},
) : MobileForumPost {
  const category = firstRelation(post.forum_categories);
  const author = firstRelation(post.users);
  return {
    id: post.id,
    authorId: post.user_id,
    title: locale === "zh" ? (post.title_zh || post.title) : post.title,
    content: cleanForumHtml(locale === "zh" ? (post.content_zh || post.content) : post.content),
    replyCount: post.reply_count ?? 0,
    likeCount: post.like_count ?? 0,
    isLiked: state.likedPostIds?.has(post.id) ?? false,
    isFollowing: state.followedPostIds?.has(post.id) ?? false,
    isBookmarked: state.bookmarkedPostIds?.has(post.id) ?? false,
    viewCount: post.view_count ?? 0,
    createdAt: post.created_at,
    lastActivityAt: post.last_reply_at ?? post.created_at,
    categorySlug: category?.slug ?? "match",
    categoryName: category?.name ?? "Forum",
    categoryNameZh: category?.name_zh ?? category?.name ?? "社区",
    categoryIcon: category?.icon ?? "💬",
    authorName: author?.nickname ?? author?.email?.split("@")[0] ?? "Football2026",
    authorAvatarUrl: author?.avatar_url ?? null,
    authorBalance: author?.gc_balance ?? 0,
    replies: repliesByPost.get(post.id) ?? [],
  };
}

function toMobileForumTag(tag: DbForumTag): MobileForumTag {
  return {
    id: tag.id,
    name: tag.name,
    nameZh: tag.name_zh,
    color: tag.color,
    postCount: tag.post_count ?? 0,
  };
}

function toMobileForumUserReply(reply: DbForumUserReply, locale: string, postTitle: string): MobileForumUserReply {
  return {
    id: reply.id,
    postId: reply.post_id,
    postTitle,
    content: cleanForumHtml(locale === "zh" ? (reply.content_zh || reply.content) : reply.content),
    likeCount: reply.like_count ?? 0,
    createdAt: reply.created_at,
  };
}

function toMobileMinePredictionFromBet(row: DbMineBet, match?: DbMatch): MobileMinePrediction | null {
  if (!match) return null;
  return {
    id: row.id,
    kind: "win",
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    kickoffTime: match.kickoff_time,
    prediction: row.prediction,
    gcAmount: Number(row.gc_amount ?? 0),
    status: row.status ?? "pending",
    createdAt: row.created_at,
  };
}

function toMobileMinePredictionFromScore(row: DbMineScoreBet, match?: DbMatch): MobileMinePrediction | null {
  if (!match) return null;
  return {
    id: row.id,
    kind: "score",
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    kickoffTime: match.kickoff_time,
    scoreHome: row.score_home,
    scoreAway: row.score_away,
    gcAmount: Number(row.gc_amount ?? 0),
    status: row.status ?? "pending",
    createdAt: row.created_at,
  };
}

function toMobileAwardBet(row: DbAwardBet): MobileAwardBet {
  return {
    id: row.id,
    awardType: row.award_type,
    playerId: row.player_id,
    playerName: row.player_name,
    playerNameZh: row.player_name_zh,
    gcAmount: Number(row.gc_amount ?? 0),
    oddsMultiplier: Number(row.odds_multiplier ?? 0),
    betPhase: row.bet_phase,
    result: row.result,
  };
}

function toMobileCheckinRecord(row: DbCheckinRow): MobileCheckinRecord {
  return {
    date: row.date,
    streak: Number(row.streak ?? 0),
    gcEarned: Number(row.gc_earned ?? 0),
  };
}

export default async function MobileHomePage({ params, searchParams }: MobileHomePageProps) {
  const { locale } = await params;
  const { preview, thread } = await searchParams;
  const selectedThreadId = thread && Number.isInteger(Number(thread)) ? Number(thread) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const previewEmail = preview === "app" && process.env.NODE_ENV !== "production" ? "zeximail@gmail.com" : undefined;
  const userEmail = user?.email ?? previewEmail;
  const profileClient = user ? supabase : previewEmail ? createServiceClient() : null;
  const { data: profile } = profileClient
    ? await profileClient
        .from("users")
        .select("id, nickname, gc_balance, referral_code, referred_by, country_code, avatar_url")
        .eq(user ? "id" : "email", user ? user.id : previewEmail!)
        .maybeSingle()
    : { data: null };
  const userDisplayName =
    profile?.nickname ??
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    userEmail?.split("@")[0];
  const followUserId = user?.id ?? profile?.id ?? null;
  const followClient = user ? createServiceClient() : profileClient;
  const { data: followRows } = followClient && followUserId
    ? await followClient.from("match_follows").select("match_id").eq("user_id", followUserId)
    : { data: [] };
  const followedIds = new Set((followRows ?? []).map((row) => row.match_id));
  const toVisibleMobileMatch = (match: DbMatch) => toMobileMatch(match, 0, followedIds.has(match.id));
  const inviteKeys = [profile?.nickname, profile?.referral_code].filter((value): value is string => Boolean(value));
  const [inviteRowsRes, inviteUsersRes] = await Promise.all([
    inviteKeys.length
      ? supabase
          .from("users")
          .select("id, referred_by")
          .in("referred_by", inviteKeys)
          .returns<Pick<DbInviteUserRow, "id" | "referred_by">[]>()
      : Promise.resolve({ data: [] as Pick<DbInviteUserRow, "id" | "referred_by">[] }),
    supabase
      .from("users")
      .select("id, nickname, referral_code, referred_by, country_code, avatar_url")
      .limit(1000)
      .returns<DbInviteUserRow[]>(),
  ]);
  const [mineBetRowsRes, mineScoreBetRowsRes] = profileClient && profile?.id
    ? await Promise.all([
        profileClient
          .from("bets")
          .select("id, match_id, prediction, gc_amount, status, created_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<DbMineBet[]>(),
        profileClient
          .from("score_bets")
          .select("id, match_id, score_home, score_away, gc_amount, status, created_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<DbMineScoreBet[]>(),
      ])
    : [{ data: [] as DbMineBet[] }, { data: [] as DbMineScoreBet[] }];
  const { data: awardBetRows } = profileClient && profile?.id
    ? await profileClient
        .from("award_bets")
        .select("id, award_type, player_id, player_name, player_name_zh, gc_amount, odds_multiplier, bet_phase, result")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: true })
        .returns<DbAwardBet[]>()
    : { data: [] as DbAwardBet[] };
  const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().split("T")[0];
  const { data: checkinRows } = profileClient && profile?.id
    ? await profileClient
        .from("check_ins")
        .select("date, streak, gc_earned")
        .eq("user_id", profile.id)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false })
        .returns<DbCheckinRow[]>()
    : { data: [] as DbCheckinRow[] };

  const nowIso = new Date().toISOString();
  let { data: upcomingRows } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .gte("kickoff_time", nowIso)
    .order("kickoff_time", { ascending: true })
    .limit(12)
    .returns<DbMatch[]>();

  if (!upcomingRows?.length) {
    const fallback = await supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .order("kickoff_time", { ascending: true })
      .limit(12)
      .returns<DbMatch[]>();
    upcomingRows = fallback.data ?? [];
  }

  const rows = upcomingRows ?? [];
  const { data: scheduleRows } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .order("kickoff_time", { ascending: true })
    .returns<DbMatch[]>();
  const [{ data: featuredRows }, { data: topScorerRows }, forumCategoriesRes, forumHotRes, forumLatestRes, forumTagsRes, selectedForumRes, myPostsRes, myRepliesRes] = await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .eq("is_featured", true)
      .order("kickoff_time", { ascending: true })
      .limit(4)
      .returns<DbMatch[]>(),
    supabase
      .from("top_scorers")
      .select("id, player_name, player_name_zh, team, goals, assists, matches_played")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .limit(5)
      .returns<DbTopScorer[]>(),
    supabase
      .from("forum_categories")
      .select("id, slug, name, name_zh, icon, description, description_zh, post_count, cat_group, cat_group_zh")
      .order("sort_order")
      .returns<DbForumCategory[]>(),
    supabase
      .from("forum_posts")
      .select(FORUM_POST_COLUMNS)
      .eq("is_deleted", false)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("like_count", { ascending: false })
      .limit(5)
      .returns<DbForumPost[]>(),
    supabase
      .from("forum_posts")
      .select(FORUM_POST_COLUMNS)
      .eq("is_deleted", false)
      .order("last_reply_at", { ascending: false })
      .limit(8)
      .returns<DbForumPost[]>(),
    supabase
      .from("forum_tags")
      .select("id, name, name_zh, color, post_count")
      .order("post_count", { ascending: false })
      .limit(10)
      .returns<DbForumTag[]>(),
    selectedThreadId
      ? supabase
          .from("forum_posts")
          .select(FORUM_POST_COLUMNS)
          .eq("id", selectedThreadId)
          .eq("is_deleted", false)
          .maybeSingle()
          .returns<DbForumPost>()
      : Promise.resolve({ data: null }),
    profile?.id
      ? profileClient!
          .from("forum_posts")
          .select(FORUM_POST_COLUMNS)
          .eq("user_id", profile.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<DbForumPost[]>()
      : Promise.resolve({ data: [] }),
    profile?.id
      ? profileClient!
          .from("forum_replies")
          .select("id, post_id, content, content_zh, like_count, created_at")
          .eq("user_id", profile.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<DbForumUserReply[]>()
      : Promise.resolve({ data: [] }),
  ]);
  const forumRows = [
    ...(forumHotRes.data ?? []),
    ...(forumLatestRes.data ?? []),
    ...(selectedForumRes.data ? [selectedForumRes.data] : []),
    ...(myPostsRes.data ?? []),
  ];
  const myReplyPostIds = Array.from(new Set((myRepliesRes.data ?? []).map((reply) => reply.post_id)));
  const { data: myReplyPostRows } = myReplyPostIds.length
    ? await supabase
        .from("forum_posts")
        .select(FORUM_POST_COLUMNS)
        .in("id", myReplyPostIds)
        .eq("is_deleted", false)
        .returns<DbForumPost[]>()
    : { data: [] };
  forumRows.push(...(myReplyPostRows ?? []));
  const forumPostIds = Array.from(new Set(forumRows.map((post) => post.id)));
  const { data: forumReplyRows } = forumPostIds.length
    ? await supabase
        .from("forum_replies")
        .select("id, post_id, user_id, content, content_zh, like_count, created_at, users(nickname, email, avatar_url, gc_balance)")
        .in("post_id", forumPostIds)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(80)
        .returns<DbForumReply[]>()
    : { data: [] };
  const forumReplyIds = (forumReplyRows ?? []).map((reply) => reply.id);
  const [likedPostRes, likedReplyRes, bookmarkedPostRes, followedPostRes] = profile?.id && forumPostIds.length
    ? await Promise.all([
        profileClient!
          .from("forum_likes")
          .select("target_id")
          .eq("user_id", profile.id)
          .eq("target_type", "post")
          .in("target_id", forumPostIds),
        forumReplyIds.length
          ? profileClient!
              .from("forum_likes")
              .select("target_id")
              .eq("user_id", profile.id)
              .eq("target_type", "reply")
              .in("target_id", forumReplyIds)
          : Promise.resolve({ data: [] }),
        profileClient!
          .from("forum_bookmarks")
          .select("post_id")
          .eq("user_id", profile.id)
          .in("post_id", forumPostIds),
        profileClient!
          .from("forum_follows")
          .select("post_id")
          .eq("user_id", profile.id)
          .in("post_id", forumPostIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const likedPostIds = new Set((likedPostRes.data ?? []).map((row) => row.target_id as number));
  const likedReplyIds = new Set((likedReplyRes.data ?? []).map((row) => row.target_id as number));
  const bookmarkedPostIds = new Set((bookmarkedPostRes.data ?? []).map((row) => row.post_id as number));
  const followedPostIds = new Set((followedPostRes.data ?? []).map((row) => row.post_id as number));
  const forumState = { likedPostIds, likedReplyIds, bookmarkedPostIds, followedPostIds };
  const repliesByPost = new Map<number, ReturnType<typeof toMobileForumReply>[]>();
  for (const reply of forumReplyRows ?? []) {
    const current = repliesByPost.get(reply.post_id) ?? [];
    if (current.length < 6) {
      current.push(toMobileForumReply(reply, locale, likedReplyIds));
      repliesByPost.set(reply.post_id, current);
    }
  }
  const upcomingMatches = rows.slice(0, 4).map(toVisibleMobileMatch);
  const featuredMatches = (featuredRows ?? []).map(toVisibleMobileMatch);
  const scheduleMobileMatches = (scheduleRows ?? rows).map(toVisibleMobileMatch);
  const followedMatches = scheduleMobileMatches.filter((match) => followedIds.has(match.id));
  const forumLatestPosts = (forumLatestRes.data ?? []).map((post) => toMobileForumPost(post, locale, repliesByPost, forumState));
  const forumHotPosts = (forumHotRes.data?.length ? forumHotRes.data : forumLatestRes.data ?? []).map((post) => toMobileForumPost(post, locale, repliesByPost, forumState));
  const forumSelectedPost = selectedForumRes.data ? toMobileForumPost(selectedForumRes.data, locale, repliesByPost, forumState) : null;
  const myReplyPostTitleMap = new Map((myReplyPostRows ?? []).map((post) => [post.id, locale === "zh" ? (post.title_zh || post.title) : post.title]));
  const forumMyPosts = (myPostsRes.data ?? []).map((post) => toMobileForumPost(post, locale, repliesByPost, forumState));
  const forumMyReplies = (myRepliesRes.data ?? []).map((reply) => toMobileForumUserReply(reply, locale, myReplyPostTitleMap.get(reply.post_id) ?? `#${reply.post_id}`));
  const mineMatchById = new Map((scheduleRows ?? rows).map((match) => [match.id, match]));
  const minePredictions = [
    ...(mineBetRowsRes.data ?? []).map((row) => toMobileMinePredictionFromBet(row, mineMatchById.get(Number(row.match_id)))),
    ...(mineScoreBetRowsRes.data ?? []).map((row) => toMobileMinePredictionFromScore(row, mineMatchById.get(Number(row.match_id)))),
  ]
    .filter((item): item is MobileMinePrediction => Boolean(item))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
  const topScorers: MobileTopScorer[] = (topScorerRows ?? []).map((scorer) => ({
    id: scorer.id,
    playerName: scorer.player_name,
    playerNameZh: scorer.player_name_zh,
    team: scorer.team,
    goals: scorer.goals,
    assists: scorer.assists,
    matchesPlayed: scorer.matches_played,
  }));
  const inviteRows = inviteRowsRes.data ?? [];
  const inviteCountByKey = new Map<string, number>();
  for (const row of inviteUsersRes.data ?? []) {
    if (!row.referred_by) continue;
    inviteCountByKey.set(row.referred_by, (inviteCountByKey.get(row.referred_by) ?? 0) + 1);
  }
  const inviteUserByKey = new Map<string, DbInviteUserRow>();
  for (const row of inviteUsersRes.data ?? []) {
    if (row.nickname) inviteUserByKey.set(row.nickname, row);
    if (row.referral_code) inviteUserByKey.set(row.referral_code, row);
  }
  const inviteLeaderboard: MobileInviteLeaderboardEntry[] = Array.from(inviteCountByKey.entries())
    .map(([key, count]) => {
      const row = inviteUserByKey.get(key);
      return {
        username: row?.nickname ?? key,
        inviteCount: count,
        inviteGc: count * 500_000,
        countryCode: row?.country_code ?? null,
        avatarUrl: row?.avatar_url ?? null,
      };
    })
    .sort((a, b) => b.inviteCount - a.inviteCount)
    .slice(0, 50);
  const inviteProfile: MobileInviteProfile | null = profile
    ? {
        username: profile.nickname ?? userEmail?.split("@")[0] ?? "Player",
        referralCode: profile.referral_code ?? null,
        inviteCount: inviteRows.length,
        inviteGc: inviteRows.length * 500_000,
        referredBy: profile.referred_by ?? null,
        gcBalance: Number(profile.gc_balance ?? 0),
      }
    : null;
  const inviteRank = inviteProfile
    ? inviteLeaderboard.findIndex((entry) => entry.username === inviteProfile.username) + 1
    : 0;
  const { phase: awardPhase, odds: awardOdds, goldenBootClosed } = getBetPhase();

  return (
    <MobileHome
      locale={locale}
      isLoggedIn={Boolean(userEmail)}
      canPersistActions={Boolean(user)}
      userEmail={userEmail}
      userDisplayName={userDisplayName}
      profileBalance={profile?.gc_balance ?? 0}
      daysLeft={fallbackDaysLeft(upcomingMatches)}
      upcomingMatches={upcomingMatches}
      featuredMatches={featuredMatches}
      scheduleMatches={scheduleMobileMatches}
      topScorers={topScorers}
      forumCategories={(forumCategoriesRes.data ?? []).map(toMobileForumCategory)}
      forumHotPosts={forumHotPosts}
      forumLatestPosts={forumLatestPosts}
      forumSelectedPost={forumSelectedPost}
      forumMyPosts={forumMyPosts}
      forumMyReplies={forumMyReplies}
      forumTags={(forumTagsRes.data ?? []).map(toMobileForumTag)}
      minePredictions={minePredictions}
      awardBets={(awardBetRows ?? []).map(toMobileAwardBet)}
      awardPhase={awardPhase}
      awardOdds={awardOdds}
      goldenBootClosed={goldenBootClosed}
      checkinHistory={(checkinRows ?? []).map(toMobileCheckinRecord)}
      followedMatches={followedMatches}
      followedMatchCount={followedIds.size}
      inviteProfile={inviteProfile}
      inviteRank={inviteRank}
      inviteClaimedMilestones={[]}
      inviteLeaderboard={inviteLeaderboard}
      inviteSiteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://football2026.net"}
    />
  );
}
