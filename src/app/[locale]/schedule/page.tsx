import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ScheduleClient from "./ScheduleClient";
import { lc } from "@/i18n/content";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: lc(locale, "赛程 & 小组积分榜 | Football2026", "Schedule & Group Standings | Football2026"),
    description: lc(locale, "2026 FIFA 世界杯全部赛程和实时小组积分榜。", "Full 2026 FIFA World Cup schedule and live group standings."),
  };
}

// ── Standings helper ──────────────────────────────────────────────────────────

interface MatchRow {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_time: string;
  status: string;
  group_name: string | null;
  stage: string;
  venue: string | null;
  city: string | null;
}

interface Standing {
  team: string;
  P: number; W: number; D: number; L: number;
  GF: number; GA: number; GD: number; Pts: number;
}

function computeStandings(matches: MatchRow[]): Standing[] {
  const map: Record<string, Standing> = {};

  for (const m of matches) {
    if (!map[m.home_team]) map[m.home_team] = { team: m.home_team, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0 };
    if (!map[m.away_team]) map[m.away_team] = { team: m.away_team, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0 };

    if (m.status === "finished" && m.home_score !== null && m.away_score !== null) {
      const hs = m.home_score;
      const as_ = m.away_score;

      map[m.home_team].P++;
      map[m.away_team].P++;
      map[m.home_team].GF += hs;
      map[m.home_team].GA += as_;
      map[m.away_team].GF += as_;
      map[m.away_team].GA += hs;

      if (hs > as_) {
        map[m.home_team].W++;
        map[m.home_team].Pts += 3;
        map[m.away_team].L++;
      } else if (hs < as_) {
        map[m.away_team].W++;
        map[m.away_team].Pts += 3;
        map[m.home_team].L++;
      } else {
        map[m.home_team].D++;
        map[m.away_team].D++;
        map[m.home_team].Pts++;
        map[m.away_team].Pts++;
      }
    }
  }

  const rows = Object.values(map);
  for (const r of rows) r.GD = r.GF - r.GA;

  return rows.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    if (b.GD  !== a.GD)  return b.GD  - a.GD;
    return b.GF - a.GF;
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SchedulePage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: allMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, kickoff_time, status, group_name, stage, venue, city")
    .order("kickoff_time", { ascending: true });

  const matches: MatchRow[] = (allMatches ?? []) as MatchRow[];

  // ── Group stage ──────────────────────────────────────────────────────────
  const groupMatches = matches.filter((m) => m.stage === "group");

  // Collect unique group names, sorted
  const groupNamesSet = new Set<string>();
  for (const m of groupMatches) {
    if (m.group_name) groupNamesSet.add(m.group_name);
  }
  const groupNames = [...groupNamesSet].sort();

  const groups = groupNames.map((g) => {
    const gm = groupMatches.filter((m) => m.group_name === g);
    return {
      group: g,
      matches: gm,
      standings: computeStandings(gm),
    };
  });

  // ── Knockout stages ──────────────────────────────────────────────────────
  const KNOCKOUT_STAGES = ["round32", "round16", "quarter", "semi", "third", "final"] as const;
  const knockoutMatches: Record<string, MatchRow[]> = {};
  for (const stage of KNOCKOUT_STAGES) {
    knockoutMatches[stage] = matches.filter((m) => m.stage === stage);
  }

  return (
    <ScheduleClient
      locale={locale}
      groups={groups}
      knockoutMatches={knockoutMatches}
    />
  );
}
