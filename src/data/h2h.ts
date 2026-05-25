/**
 * Head-to-head historical records for World Cup 2026 matchups.
 * Format: [team1Wins, draws, team2Wins] where team1 < team2 alphabetically.
 * Data is approximate historical totals (all official matches).
 */
const H2H_DATA: Record<string, [number, number, number]> = {
  "Algeria|Burkina Faso":       [6, 3, 2],
  "Algeria|England":            [0, 2, 5],
  "Argentina|Australia":        [7, 0, 0],
  "Argentina|France":           [6, 3, 3],
  "Argentina|Mexico":           [11, 6, 5],
  "Argentina|Poland":           [2, 2, 1],
  "Argentina|Saudi Arabia":     [2, 1, 0],
  "Austria|Jordan":             [1, 0, 0],
  "Australia|Denmark":          [2, 3, 5],
  "Australia|France":           [1, 0, 8],
  "Australia|Tunisia":          [2, 1, 1],
  "Belgium|Croatia":            [3, 3, 5],
  "Belgium|Egypt":              [3, 1, 0],
  "Belgium|Morocco":            [3, 2, 1],
  "Bosnia & Herzegovina|Qatar": [2, 1, 0],
  "Bosnia & Herzegovina|Switzerland": [1, 2, 3],
  "Brazil|Cameroon":            [4, 1, 0],
  "Brazil|Morocco":             [5, 1, 0],
  "Brazil|Scotland":            [2, 1, 0],
  "Brazil|Serbia":              [2, 0, 0],
  "Brazil|Switzerland":         [3, 2, 1],
  "Canada|Morocco":             [0, 1, 1],
  "Canada|Qatar":               [0, 0, 0],
  "Cape Verde|Spain":           [0, 0, 1],
  "Cape Verde|Uruguay":         [0, 0, 1],
  "Colombia|DR Congo":          [1, 0, 0],
  "Colombia|Portugal":          [2, 1, 3],
  "Colombia|Uzbekistan":        [0, 0, 0],
  "Croatia|England":            [0, 2, 1],
  "Croatia|Ghana":              [1, 0, 0],
  "Croatia|Panama":             [1, 0, 0],
  "Czechia|Mexico":             [1, 0, 1],
  "Czechia|South Africa":       [2, 1, 0],
  "Czechia|South Korea":        [2, 1, 0],
  "Denmark|Tunisia":            [1, 1, 0],
  "Ecuador|Germany":            [0, 0, 3],
  "Ecuador|Ivory Coast":        [1, 0, 1],
  "Ecuador|Netherlands":        [0, 1, 3],
  "Egypt|Iran":                 [1, 2, 2],
  "Egypt|New Zealand":          [2, 1, 0],
  "England|Iran":               [1, 0, 0],
  "England|USA":                [2, 8, 4],
  "England|Wales":              [67, 21, 32],
  "France|Australia":           [5, 0, 2],
  "France|Iraq":                [1, 0, 0],
  "France|Norway":              [3, 1, 1],
  "France|Senegal":             [2, 0, 1],
  "Germany|Ivory Coast":        [3, 0, 0],
  "Germany|Japan":              [2, 1, 4],
  "Germany|Netherlands":        [17, 4, 9],
  "Ghana|England":              [0, 0, 2],
  "Ghana|Panama":               [0, 0, 0],
  "Haiti|Morocco":              [0, 0, 1],
  "Haiti|Scotland":             [0, 0, 0],
  "Iran|Iraq":                  [10, 5, 8],
  "Iran|New Zealand":           [1, 0, 0],
  "Iran|USA":                   [0, 1, 0],
  "Iraq|Norway":                [0, 0, 1],
  "Iraq|Senegal":               [0, 0, 1],
  "Japan|Sweden":               [1, 0, 3],
  "Japan|Tunisia":              [2, 1, 0],
  "Jordan|Portugal":            [0, 0, 2],
  "Jordan|Austria":             [1, 0, 0],
  "Kuwait|UAE":                 [5, 6, 7],
  "Mexico|Poland":              [5, 7, 3],
  "Mexico|South Africa":        [3, 1, 2],
  "Mexico|South Korea":         [4, 2, 3],
  "Netherlands|Japan":          [5, 0, 1],
  "Netherlands|Sweden":         [8, 4, 6],
  "Netherlands|Tunisia":        [3, 0, 0],
  "New Zealand|Saudi Arabia":   [0, 0, 1],
  "Norway|Senegal":             [1, 0, 0],
  "Panama|Croatia":             [0, 0, 2],
  "Panama|England":             [0, 0, 2],
  "Paraguay|Australia":         [1, 2, 1],
  "Paraguay|Türkiye":           [1, 1, 1],
  "Paraguay|USA":               [0, 3, 2],
  "Poland|Saudi Arabia":        [1, 0, 0],
  "Portugal|Colombia":          [3, 1, 2],
  "Portugal|DR Congo":          [1, 0, 0],
  "Portugal|Uzbekistan":        [0, 0, 0],
  "Qatar|Switzerland":          [0, 0, 2],
  "Saudi Arabia|Uruguay":       [0, 0, 1],
  "Serbia|Brazil":              [0, 0, 3],
  "Serbia|Cameroon":            [2, 0, 0],
  "Serbia|Switzerland":         [4, 4, 5],
  "South Africa|Czechia":       [0, 1, 2],
  "South Korea|Czechia":        [0, 1, 2],
  "Spain|Cape Verde":           [1, 0, 0],
  "Spain|Costa Rica":           [3, 0, 0],
  "Spain|Saudi Arabia":         [4, 0, 0],
  "Spain|Uruguay":              [10, 6, 9],
  "Sweden|Japan":               [3, 0, 1],
  "Sweden|Tunisia":             [3, 1, 0],
  "Switzerland|Cameroon":       [1, 0, 0],
  "Turkey|Paraguay":            [1, 1, 1],
  "Türkiye|Australia":          [1, 0, 1],
  "Türkiye|Paraguay":           [1, 1, 1],
  "Türkiye|USA":                [0, 1, 2],
  "Uruguay|Cape Verde":         [1, 0, 0],
  "Uruguay|Saudi Arabia":       [1, 0, 0],
  "Uruguay|Spain":              [9, 6, 10],
  "USA|Iran":                   [0, 1, 0],
  "USA|Paraguay":               [2, 3, 0],
  "USA|Türkiye":                [2, 1, 0],
  "USA|Wales":                  [0, 1, 0],
  "Wales|England":              [32, 21, 67],
  "Wales|Iran":                 [2, 0, 0],
};

function sortedKey(a: string, b: string): string {
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

export interface H2HRecord {
  homeWins: number;
  draws: number;
  awayWins: number;
  total: number;
}

export function getH2H(homeTeam: string, awayTeam: string): H2HRecord | null {
  const key = sortedKey(homeTeam, awayTeam);
  const entry = H2H_DATA[key];
  if (!entry) return null;

  const [w1, d, w2] = entry;
  const isTeam1Home = homeTeam <= awayTeam;
  const homeWins = isTeam1Home ? w1 : w2;
  const awayWins = isTeam1Home ? w2 : w1;
  return { homeWins, draws: d, awayWins, total: homeWins + d + awayWins };
}
