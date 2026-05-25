import { createClient } from "@/lib/supabase/server";
import { getWealthLevel, getHonorLevel, formatGc } from "@/lib/levels";
import LeaderboardClient from "./LeaderboardClient";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [wealthRes, honorRes, inviteRes, betStatsRes] = await Promise.all([
    // Top 100 by GC balance
    supabase
      .from("users")
      .select("id, username, nickname, avatar_url, country_code, gc_balance, honor_points")
      .order("gc_balance", { ascending: false })
      .limit(100),

    // Top 100 by honor points
    supabase
      .from("users")
      .select("id, username, nickname, avatar_url, country_code, gc_balance, honor_points")
      .order("honor_points", { ascending: false })
      .limit(100),

    // Top 100 by invite count
    supabase
      .from("users")
      .select("id, username, nickname, avatar_url, country_code, invite_count, invite_gc")
      .order("invite_count", { ascending: false })
      .limit(100),

    // Bet stats for win-rate board: count per user grouped by status
    supabase
      .from("bets")
      .select("user_id, status"),
  ]);

  // ── Win-rate board: compute from raw bets ────────────────────────────────
  type BetRow = { user_id: string; status: string };
  const betRows: BetRow[] = (betStatsRes.data ?? []) as BetRow[];

  const betMap: Record<string, { total: number; won: number }> = {};
  for (const b of betRows) {
    if (!betMap[b.user_id]) betMap[b.user_id] = { total: 0, won: 0 };
    betMap[b.user_id].total++;
    if (b.status === "won") betMap[b.user_id].won++;
  }

  // Only users with ≥5 settled bets
  const eligibleIds = Object.keys(betMap).filter((id) => {
    const s = betMap[id];
    return s.total >= 5;
  });

  // Fetch profile for those users (up to 100)
  const winRateUsers = eligibleIds.length > 0
    ? (await supabase
        .from("users")
        .select("id, username, nickname, avatar_url, country_code, gc_balance, honor_points")
        .in("id", eligibleIds.slice(0, 200))).data ?? []
    : [];

  // Sort by win rate desc, then total bets desc
  const winRateBoard = winRateUsers
    .map((u) => ({
      ...u,
      total: betMap[u.id]?.total ?? 0,
      won:   betMap[u.id]?.won   ?? 0,
      rate:  betMap[u.id]?.total
               ? Math.round((betMap[u.id].won / betMap[u.id].total) * 100)
               : 0,
    }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, 100);

  // ── Enrich all boards with level info ───────────────────────────────────
  function enrich(u: {
    id: string; username: string | null; nickname: string | null;
    avatar_url: string | null; country_code: string | null;
    gc_balance?: number; honor_points?: number;
  }) {
    const gc    = u.gc_balance    ?? 0;
    const honor = u.honor_points  ?? 0;
    const wl    = getWealthLevel(gc);
    const hl    = getHonorLevel(honor);
    const cc    = (u.country_code ?? "UN").toUpperCase();
    let countryName = "";
    try {
      if (cc !== "UN") {
        countryName = new Intl.DisplayNames([zh ? "zh-CN" : "en"], { type: "region" }).of(cc) ?? "";
      }
    } catch { /* ignore */ }
    return {
      id:          u.id,
      username:    u.username ?? u.nickname ?? "Player",
      avatarUrl:   u.avatar_url ?? null,
      countryCode: cc,
      countryName,
      flagUrl:     cc !== "UN" ? `https://flagcdn.com/w40/${cc.toLowerCase()}.png` : null,
      gc, honor,
      wlName:   zh ? wl.nameZh : wl.name,
      wlColor:  wl.color,
      wlBg:     wl.bgColor,
      wlIcon:   wl.icon,
      hlName:   zh ? hl.nameZh : hl.name,
      hlColor:  hl.color,
      hlIcon:   hl.icon,
      gcFormatted:    formatGc(gc),
      honorFormatted: honor.toLocaleString(),
    };
  }

  const wealthBoard = (wealthRes.data ?? []).map(enrich);
  const honorBoard  = (honorRes.data  ?? []).map(enrich);

  const winBoard = winRateBoard.map((u) => ({
    ...enrich(u),
    total: u.total,
    won:   u.won,
    rate:  u.rate,
  }));

  type InviteRow = {
    id: string; username: string | null; nickname: string | null;
    avatar_url: string | null; country_code: string | null;
    invite_count: number | null; invite_gc: number | null;
  };
  const inviteBoard = (inviteRes.data ?? []).map((u: InviteRow) => {
    const cc = (u.country_code ?? "UN").toUpperCase();
    let countryName = "";
    try {
      if (cc !== "UN") countryName = new Intl.DisplayNames([zh ? "zh-CN" : "en"], { type: "region" }).of(cc) ?? "";
    } catch { /* ignore */ }
    return {
      id:          u.id,
      username:    u.username ?? u.nickname ?? "Player",
      avatarUrl:   u.avatar_url ?? null,
      countryCode: cc,
      countryName,
      flagUrl:     cc !== "UN" ? `https://flagcdn.com/w40/${cc.toLowerCase()}.png` : null,
      inviteCount: u.invite_count ?? 0,
      inviteGc:    formatGc(u.invite_gc ?? 0),
    };
  });

  // ── Current user's rank in each board ────────────────────────────────────
  const myId = user?.id ?? null;
  const myRanks = {
    wealth: myId ? wealthBoard.findIndex((u) => u.id === myId) + 1 : 0,
    honor:  myId ? honorBoard.findIndex((u)  => u.id === myId) + 1 : 0,
    win:    myId ? winBoard.findIndex((u)    => u.id === myId) + 1 : 0,
    invite: myId ? inviteBoard.findIndex((u) => u.id === myId) + 1 : 0,
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">
            🏆 {zh ? "排行榜" : "Leaderboard"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {zh ? "顶尖玩家实时排名" : "Live rankings of top players"}
          </p>
        </div>

        <LeaderboardClient
          locale={locale}
          myId={myId}
          myRanks={myRanks}
          wealthBoard={wealthBoard}
          honorBoard={honorBoard}
          winBoard={winBoard}
          inviteBoard={inviteBoard}
        />
      </div>
    </div>
  );
}
