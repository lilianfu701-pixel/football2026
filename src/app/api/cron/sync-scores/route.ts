import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const FD_BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC";

const TEAM_MAP: Record<string, string> = {
  "Korea Republic":     "South Korea",
  "United States":      "USA",
  "Côte d'Ivoire":      "Ivory Coast",
  "Türkiye":            "Turkey",
  "Congo DR":           "DR Congo",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Cape Verde Islands": "Cape Verde",
  "Curaçao":            "Curacao",
};

function mapStatus(s: string): string {
  if (s === "FINISHED")                  return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "POSTPONED")                 return "postponed";
  if (s === "CANCELLED")                 return "cancelled";
  return "upcoming";
}

function normTeam(name: string): string {
  return TEAM_MAP[name] ?? name;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbMatch {
  id:              number;
  home_team:       string;
  away_team:       string;
  home_flag:       string;
  away_flag:       string;
  status:          string;
  home_score:      number | null;
  away_score:      number | null;
  red_cards_home:  number;
  red_cards_away:  number;
  kickoff_time:    string;
}

interface MatchEvent {
  type:   string;
  key:    string;
  detail: Record<string, unknown>;
}

// ── Event detection ───────────────────────────────────────────────────────────

function detectEvents(
  db: DbMatch,
  newStatus:  string,
  newHomeSc:  number | null,
  newAwaySc:  number | null,
  newRedHome: number,
  newRedAway: number,
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const base = {
    home_team: db.home_team,
    away_team: db.away_team,
    home_flag: db.home_flag,
    away_flag: db.away_flag,
  };

  const prevHome = db.home_score ?? 0;
  const prevAway = db.away_score ?? 0;
  const currHome = newHomeSc ?? prevHome;
  const currAway = newAwaySc ?? prevAway;

  // Kickoff: upcoming → live
  if (db.status === "upcoming" && newStatus === "live") {
    events.push({ type: "match_kickoff", key: "kickoff", detail: base });
  }

  // Goals (only when match is going live or already live)
  if (newStatus === "live" || newStatus === "finished") {
    for (let i = prevHome + 1; i <= currHome; i++) {
      events.push({
        type: "match_goal",
        key:  `goal_home_${i}`,
        detail: { ...base, team: "home", score_home: i, score_away: currAway },
      });
    }
    for (let i = prevAway + 1; i <= currAway; i++) {
      events.push({
        type: "match_goal",
        key:  `goal_away_${i}`,
        detail: { ...base, team: "away", score_home: currHome, score_away: i },
      });
    }
  }

  // Red cards (only available if football-data.org provides bookings)
  if (newRedHome > db.red_cards_home) {
    events.push({
      type: "match_red_card",
      key:  `red_home_${newRedHome}`,
      detail: { ...base, team: "home" },
    });
  }
  if (newRedAway > db.red_cards_away) {
    events.push({
      type: "match_red_card",
      key:  `red_away_${newRedAway}`,
      detail: { ...base, team: "away" },
    });
  }

  // Final score: live → finished
  if (db.status === "live" && newStatus === "finished") {
    events.push({
      type: "match_final",
      key:  "final",
      detail: { ...base, home_score: currHome, away_score: currAway },
    });
  }

  return events;
}

// ── Notification content builder ─────────────────────────────────────────────
// Produces a plain-text summary for the legacy `content` NOT NULL column.

function buildContent(event: MatchEvent): string {
  const d = event.detail as Record<string, unknown>;
  const home = d.home_team as string ?? "";
  const away = d.away_team as string ?? "";
  const hf   = d.home_flag as string ?? "";
  const af   = d.away_flag as string ?? "";
  const match = `${hf}${home} vs ${af}${away}`;

  switch (event.type) {
    case "match_countdown": return `⏰ Starting in 10 min · ${match}`;
    case "match_kickoff":   return `🟢 Kick off · ${match}`;
    case "match_goal": {
      const sh = d.score_home as number ?? 0;
      const sa = d.score_away as number ?? 0;
      const team = d.team === "home" ? `${hf}${home}` : `${af}${away}`;
      return `⚽ Goal — ${team} · ${sh}–${sa} · ${match}`;
    }
    case "match_red_card": {
      const team = d.team === "home" ? `${hf}${home}` : `${af}${away}`;
      return `🟥 Red card · ${team} · ${match}`;
    }
    case "match_final": {
      const hs = d.home_score as number ?? 0;
      const as_ = d.away_score as number ?? 0;
      return `🏁 Full time · ${match} · ${hs}–${as_}`;
    }
    default: return match;
  }
}

// ── Notification delivery ─────────────────────────────────────────────────────

type ServiceClient = ReturnType<typeof createServiceClient>;

async function fireNotifications(
  supabase: ServiceClient,
  matchId:  number,
  events:   MatchEvent[],
): Promise<void> {
  if (events.length === 0) return;

  // Load followers of this match
  const { data: follows } = await supabase
    .from("match_follows")
    .select("user_id")
    .eq("match_id", matchId);

  if (!follows?.length) return;

  for (const event of events) {
    // Try to claim this event in the dedup table.
    // Unique constraint (match_id, event_type, event_key) means only the first
    // Cron run that detects this event will insert successfully.
    const { error: dedupErr } = await supabase
      .from("match_notifications_sent")
      .insert({ match_id: matchId, event_type: event.type, event_key: event.key });

    if (dedupErr) continue; // Already sent — unique violation

    // Bulk-insert one notification row per follower
    // content is required by an older NOT NULL constraint on the table
    const content = buildContent(event);
    const rows = follows.map((f: { user_id: string }) => ({
      user_id:      f.user_id,
      type:         event.type,
      match_id:     matchId,
      event_detail: event.detail,
      content,
      is_read:      false,
    }));

    await supabase.from("notifications").insert(rows);
  }
}

// ── Countdown check ───────────────────────────────────────────────────────────
// Finds upcoming matches that kick off within the next 10 minutes and
// sends a one-time reminder to followers (dedup prevents duplicates).

async function checkCountdowns(supabase: ServiceClient): Promise<void> {
  const now     = new Date();
  const in10min = new Date(now.getTime() + 10 * 60 * 1000);

  const { data: upcoming } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, kickoff_time")
    .eq("status", "upcoming")
    .gte("kickoff_time", now.toISOString())
    .lte("kickoff_time", in10min.toISOString());

  if (!upcoming?.length) return;

  for (const m of upcoming) {
    await fireNotifications(supabase, m.id, [{
      type: "match_countdown",
      key:  "countdown_10min",
      detail: {
        home_team:    m.home_team,
        away_team:    m.away_team,
        home_flag:    m.home_flag,
        away_flag:    m.away_flag,
        kickoff_time: m.kickoff_time,
      },
    }]);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    // ── Guard: only call the external API when matches are active ─────────────
    // "Active" = live/paused now, OR upcoming within 15 min (for countdown)
    // This prevents wasting the 10 req/min quota during off-hours.
    const supabaseGuard = createServiceClient();
    const now15 = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { count } = await supabaseGuard
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(
        `status.in.(live,paused),and(status.eq.upcoming,kickoff_time.lte.${now15})`,
      );

    if (!count) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no active matches" });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Fetch matches for yesterday → +2 days (live matches are in this window)
    const today = new Date();
    const from  = new Date(today); from.setDate(today.getDate() - 1);
    const to    = new Date(today); to.setDate(today.getDate() + 2);
    const fmt   = (d: Date) => d.toISOString().slice(0, 10);

    const url = `${FD_BASE}/competitions/${COMPETITION_CODE}/matches?dateFrom=${fmt(from)}&dateTo=${fmt(to)}`;
    const fdRes = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 0 },
    });

    if (fdRes.status === 404) {
      return NextResponse.json({ ok: true, message: "Competition not started yet" });
    }
    if (!fdRes.ok) {
      const txt = await fdRes.text();
      return NextResponse.json({ error: `football-data API: ${fdRes.status} ${txt}` }, { status: 502 });
    }

    const { matches: apiMatches } = await fdRes.json() as { matches: unknown[] };

    const supabase = createServiceClient();
    const { data: dbMatches } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_flag, away_flag, status, home_score, away_score, red_cards_home, red_cards_away, kickoff_time");

    let updated = 0;

    for (const raw of apiMatches) {
      const m = raw as Record<string, unknown>;
      const score    = m.score    as Record<string, unknown> | undefined;
      const fullTime = score?.fullTime as Record<string, number | null> | undefined;
      const bookings = Array.isArray(m.bookings) ? m.bookings : [];

      const homeTeam = m.homeTeam as Record<string, unknown> | undefined;
      const awayTeam = m.awayTeam as Record<string, unknown> | undefined;

      const home   = normTeam((homeTeam?.name as string) ?? "");
      const away   = normTeam((awayTeam?.name as string) ?? "");
      const status = mapStatus((m.status as string) ?? "");
      const hs     = fullTime?.home ?? null;
      const as_    = fullTime?.away ?? null;

      // Count red cards from bookings if available (may be empty on free tier)
      const homeTeamId = homeTeam?.id;
      const awayTeamId = awayTeam?.id;
      const redHome = bookings.filter((b: unknown) => {
        const bk = b as Record<string, unknown>;
        const bkTeam = bk.team as Record<string, unknown> | undefined;
        return bkTeam?.id === homeTeamId &&
          (bk.type === "RED_CARD" || bk.type === "YELLOW_RED_CARD");
      }).length;
      const redAway = bookings.filter((b: unknown) => {
        const bk = b as Record<string, unknown>;
        const bkTeam = bk.team as Record<string, unknown> | undefined;
        return bkTeam?.id === awayTeamId &&
          (bk.type === "RED_CARD" || bk.type === "YELLOW_RED_CARD");
      }).length;

      const db = (dbMatches as DbMatch[] | null)?.find(
        (d) => d.home_team === home && d.away_team === away,
      );
      if (!db) continue;

      const noChange =
        db.status         === status &&
        db.home_score     === hs &&
        db.away_score     === as_ &&
        db.red_cards_home === redHome &&
        db.red_cards_away === redAway;
      if (noChange) continue;

      // Fire notifications for changed events (non-blocking on error)
      const events = detectEvents(db, status, hs, as_, redHome, redAway);
      await fireNotifications(supabase, db.id, events).catch(() => {});

      await supabase
        .from("matches")
        .update({ status, home_score: hs, away_score: as_, red_cards_home: redHome, red_cards_away: redAway })
        .eq("id", db.id);

      updated++;
    }

    // Separate countdown check (uses current DB state, no API call needed)
    await checkCountdowns(supabase).catch(() => {});

    return NextResponse.json({ ok: true, updated, total: apiMatches.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
