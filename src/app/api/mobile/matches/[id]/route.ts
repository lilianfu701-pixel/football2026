import { NextRequest, NextResponse } from "next/server";
import { getH2H } from "@/lib/h2h";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import sanitizeHtml from "sanitize-html";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const supabase = await createClient();
  const [{ data: match }, { data: { user } }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, home_team, away_team, ai_predictions")
      .eq("id", matchId)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const previewClient = request.nextUrl.searchParams.get("preview") === "app" && process.env.NODE_ENV !== "production"
    ? createServiceClient()
    : null;
  const { data: previewProfile } = !user && previewClient
    ? await previewClient.from("users").select("id").eq("email", "zeximail@gmail.com").maybeSingle()
    : { data: null };
  const userId = user?.id ?? previewProfile?.id ?? null;
  const userClient = user ? supabase : previewClient;

  const [votesRes, countryRes, forumRes, h2h, followRes, betRes, scoreBetsRes] = await Promise.all([
    supabase.from("match_votes").select("vote, user_id").eq("match_id", matchId),
    supabase.from("match_votes").select("vote, users!inner(country_code)").eq("match_id", matchId),
    supabase.from("forum_posts").select("id, title, title_zh, content, content_zh, reply_count, like_count", { count: "exact" }).eq("match_id", matchId).eq("is_deleted", false).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    getH2H(match.home_team, match.away_team, 6),
    userId && userClient
      ? userClient.from("match_follows").select("match_id").eq("match_id", matchId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId && userClient
      ? userClient.from("bets").select("id, prediction, gc_amount, status, potential_payout").eq("match_id", matchId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId && userClient
      ? userClient.from("score_bets").select("id, score_home, score_away, gc_amount, odds_multiplier, status").eq("match_id", matchId).eq("user_id", userId).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const voteCounts = { home: 0, neutral: 0, away: 0 };
  let myVote: "home" | "neutral" | "away" | null = null;
  for (const row of (votesRes.data ?? []) as { vote: string; user_id: string }[]) {
    if (row.vote === "home") voteCounts.home++;
    if (row.vote === "neutral") voteCounts.neutral++;
    if (row.vote === "away") voteCounts.away++;
    if (userId && row.user_id === userId && (row.vote === "home" || row.vote === "neutral" || row.vote === "away")) myVote = row.vote;
  }

  const countries = new Map<string, { countryCode: string; home: number; away: number; total: number }>();
  for (const row of (countryRes.data ?? []) as { vote: string; users: { country_code: string | null } | { country_code: string | null }[] }[]) {
    const users = Array.isArray(row.users) ? row.users[0] : row.users;
    const countryCode = users?.country_code ?? "XX";
    const current = countries.get(countryCode) ?? { countryCode, home: 0, away: 0, total: 0 };
    if (row.vote === "home") current.home++;
    if (row.vote === "away") current.away++;
    current.total++;
    countries.set(countryCode, current);
  }

  const forumPost = forumRes.data;
  const repliesRes = forumPost
    ? await supabase
        .from("forum_replies")
        .select("id, content, content_zh, like_count, created_at")
        .eq("post_id", forumPost.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(6)
    : { data: [] };

  return NextResponse.json({
    voteCounts,
    myVote,
    isFollowing: Boolean(followRes.data),
    existingBet: betRes.data ? {
      id: betRes.data.id,
      prediction: betRes.data.prediction,
      gcAmount: betRes.data.gc_amount,
      status: betRes.data.status,
      potentialPayout: betRes.data.potential_payout,
    } : null,
    scoreBets: (scoreBetsRes.data ?? []).map((bet) => ({
      id: bet.id,
      scoreHome: bet.score_home,
      scoreAway: bet.score_away,
      gcAmount: bet.gc_amount,
      oddsMultiplier: bet.odds_multiplier,
      status: bet.status,
    })),
    h2h,
    aiPredictions: match.ai_predictions ?? null,
    countries: [...countries.values()].sort((a, b) => b.total - a.total),
    forumPostCount: forumRes.count ?? 0,
    forumPost: forumPost ? {
      id: forumPost.id,
      title: forumPost.title_zh || forumPost.title,
      content: cleanForumHtml(forumPost.content_zh || forumPost.content),
      replyCount: forumPost.reply_count ?? 0,
      likeCount: forumPost.like_count ?? 0,
      replies: (repliesRes.data ?? []).map((reply) => ({
        id: reply.id,
        content: cleanForumHtml(reply.content_zh || reply.content),
        likeCount: reply.like_count ?? 0,
        createdAt: reply.created_at,
      })),
    } : null,
  });
}

function cleanForumHtml(html: string | null) {
  return sanitizeHtml(html ?? "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    transformTags: {
      a: (_, attributes) => ({ tagName: "a", attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer" } }),
    },
  });
}
