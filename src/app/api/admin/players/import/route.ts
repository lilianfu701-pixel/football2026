/**
 * POST /api/admin/players/import
 * Seeds the players table from the static src/data/players.ts roster.
 * Also tries to enrich with football-data.org squad data (WC 2026).
 * Idempotent: uses UPSERT on static_id / fd_id.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAYERS } from "@/data/players";

const FD_BASE = "https://api.football-data.org/v4";
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";

// football-data.org position strings → our short codes
const FD_POS_MAP: Record<string, string> = {
  Goalkeeper: "GK",
  Defence:    "DF",
  Midfield:   "MF",
  Offence:    "FW",
  Attacker:   "FW",
  Forward:    "FW",
  Defender:   "DF",
  Midfielder: "MF",
};

interface FdPlayer {
  id:          number;
  name:        string;
  position:    string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  shirtNumber: number | null;
}

interface FdTeam {
  id:        number;
  name:      string;
  shortName: string;
  tla:       string;
  crest:     string;
  squad:     FdPlayer[];
}

// Try to fetch WC 2026 squads from football-data.org
async function fetchFdSquads(): Promise<Map<string, FdPlayer[]>> {
  const map = new Map<string, FdPlayer[]>();
  if (!FD_KEY) return map;
  try {
    const res = await fetch(`${FD_BASE}/competitions/WC/teams?season=2026`, {
      headers: { "X-Auth-Token": FD_KEY },
      next: { revalidate: 0 },
    });
    if (!res.ok) return map;
    const json = await res.json() as { teams?: FdTeam[] };
    for (const team of json.teams ?? []) {
      if (team.squad?.length) {
        map.set(team.name, team.squad);
        map.set(team.shortName, team.squad);
      }
    }
  } catch {
    // football-data.org unavailable — continue with static data only
  }
  return map;
}

export async function POST() {
  // Auth check: must be admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  // 1. Seed from static PLAYERS list
  const staticRows = PLAYERS.map((p) => ({
    static_id:    p.id,
    name:         p.name,
    name_zh:      p.nameZh,
    team:         p.country,
    country_code: p.countryCode,
    position:     p.position,
    club:         p.club,
    age:          p.age,
    golden_boot:  p.goldenBoot,
    golden_ball:  p.goldenBall,
    golden_glove: p.goldenGlove,
    best_young:   p.bestYoung,
  }));

  const { error: staticErr, count: staticCount } = await service
    .from("players")
    .upsert(staticRows, { onConflict: "static_id", count: "exact" });

  if (staticErr) {
    return NextResponse.json({ error: staticErr.message }, { status: 500 });
  }

  // 2. Enrich with football-data.org data (shirt numbers, DOB, fd_id)
  const fdSquads = await fetchFdSquads();
  let fdEnriched = 0;

  for (const [, squad] of fdSquads) {
    for (const fdp of squad) {
      // Try to match by name in our static table
      const { data: existing } = await service
        .from("players")
        .select("id, name")
        .ilike("name", `%${fdp.name.split(" ").pop() ?? ""}%`)
        .limit(1)
        .maybeSingle();

      const updatePayload: Record<string, unknown> = {
        fd_id:        fdp.id,
        shirt_number: fdp.shirtNumber ?? null,
        date_of_birth: fdp.dateOfBirth ?? null,
      };
      if (fdp.position) {
        updatePayload.position = FD_POS_MAP[fdp.position] ?? fdp.position;
      }

      if (existing) {
        await service
          .from("players")
          .update(updatePayload)
          .eq("id", existing.id);
        fdEnriched++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    static_inserted: staticCount ?? staticRows.length,
    fd_enriched:     fdEnriched,
    message: "Import complete. Check admin/players to review.",
  });
}
