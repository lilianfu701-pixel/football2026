import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";

export interface TeamStanding {
  team:   string;
  flag:   string;
  played: number;
  won:    number;
  drawn:  number;
  lost:   number;
  gf:     number;
  ga:     number;
  gd:     number;
  pts:    number;
}

export interface GroupStanding {
  group:  string;   // "A" … "L"
  teams:  TeamStanding[];
}

type MatchRow = {
  home_team:   string;
  away_team:   string;
  home_score:  number | null;
  away_score:  number | null;
  group_name:  string | null;
  status:      string;
};

function emptyTeam(team: string, locale: string): TeamStanding {
  return {
    team,
    flag:   getFlagUrl(team),
    played: 0, won: 0, drawn: 0, lost: 0,
    gf: 0,  ga: 0, gd: 0, pts: 0,
  };
}

/** Build group standings from all group-stage matches */
export function computeGroupStandings(
  matches: MatchRow[],
  locale:  string
): GroupStanding[] {
  // Collect teams per group
  const groupTeams: Record<string, Set<string>> = {};
  for (const m of matches) {
    if (!m.group_name) continue;
    const g = m.group_name;
    if (!groupTeams[g]) groupTeams[g] = new Set();
    groupTeams[g].add(m.home_team);
    groupTeams[g].add(m.away_team);
  }

  // Build team stats maps
  const groupStats: Record<string, Record<string, TeamStanding>> = {};
  for (const [g, teams] of Object.entries(groupTeams)) {
    groupStats[g] = {};
    for (const t of teams) groupStats[g][t] = emptyTeam(t, locale);
  }

  // Apply finished match results
  for (const m of matches) {
    if (!m.group_name) continue;
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) continue;

    const g  = m.group_name;
    const h  = groupStats[g]?.[m.home_team];
    const a  = groupStats[g]?.[m.away_team];
    if (!h || !a) continue;

    const hs = m.home_score, as = m.away_score;
    h.played++; a.played++;
    h.gf += hs; h.ga += as;
    a.gf += as; a.ga += hs;

    if (hs > as)       { h.won++;   h.pts += 3; a.lost++; }
    else if (hs < as)  { a.won++;   a.pts += 3; h.lost++; }
    else               { h.drawn++; h.pts += 1; a.drawn++; a.pts += 1; }
  }

  // Compute GD, sort
  return Object.keys(groupStats)
    .sort()
    .map((g) => {
      const teams = Object.values(groupStats[g]).map((t) => ({
        ...t,
        gd: t.gf - t.ga,
      }));
      teams.sort((a, b) =>
        b.pts - a.pts ||
        (b.gf - b.ga) - (a.gf - a.ga) ||
        b.gf - a.gf ||
        a.team.localeCompare(b.team)
      );
      return { group: g, teams };
    });
}
