/**
 * Team representative colors for fan map dots and props.
 * primary   = dot fill / main identity color
 * secondary = dot stroke/glow ring (for two-color kits)
 *             If a team only has one color, secondary === primary.
 */
export interface TeamColor {
  primary:   string;
  secondary: string;
}

export const TEAM_COLORS: Record<string, TeamColor> = {
  // ── Americas ──────────────────────────────────────────────────────────────
  Argentina:    { primary: "#74ACDF", secondary: "#FFFFFF" }, // celeste + white
  Brazil:       { primary: "#FFD700", secondary: "#009B3A" }, // yellow + green
  Canada:       { primary: "#FF0000", secondary: "#FFFFFF" }, // red + white
  Chile:        { primary: "#D52B1E", secondary: "#003DA5" }, // red + blue
  Colombia:     { primary: "#FCD116", secondary: "#003087" }, // yellow + blue
  "Costa Rica": { primary: "#002B7F", secondary: "#CE1126" }, // blue + red
  Ecuador:      { primary: "#FFD100", secondary: "#034EA2" }, // yellow + blue
  Haiti:        { primary: "#4D0A28", secondary: "#00209F" }, // very dark wine + flag blue
  Honduras:     { primary: "#0073CF", secondary: "#FFFFFF" }, // blue + white
  Jamaica:      { primary: "#FFD700", secondary: "#009B3A" }, // gold + green (black invisible on dark bg)
  Mexico:       { primary: "#006847", secondary: "#CE1126" }, // forest green + red (darker)
  Panama:       { primary: "#003893", secondary: "#DA121A" }, // blue primary + red ring (distinct from England red)
  Paraguay:     { primary: "#0038A8", secondary: "#D52B1E" }, // blue primary + red ring (distinct from Turkey red)
  Peru:         { primary: "#D91023", secondary: "#FFFFFF" }, // red + white
  "United States": { primary: "#002868", secondary: "#BF0A30" }, // blue + red
  USA:          { primary: "#002868", secondary: "#BF0A30" }, // blue + red
  Uruguay:      { primary: "#5EB6E4", secondary: "#FFFFFF" }, // celeste + white
  Venezuela:    { primary: "#CF142B", secondary: "#00247D" }, // red + blue

  // ── Europe ────────────────────────────────────────────────────────────────
  Albania:      { primary: "#E41E20", secondary: "#000000" }, // red + black
  Austria:      { primary: "#ED2939", secondary: "#FFFFFF" }, // red + white
  Belgium:      { primary: "#FFD700", secondary: "#C8102E" }, // gold primary + red ring (distinct from Egypt red)
  "Bosnia & Herzegovina": { primary: "#002395", secondary: "#FFD700" },
  Croatia:      { primary: "#FFFFFF", secondary: "#C8102E" }, // white primary + red ring (checkerboard; distinct from England red)
  Czechia:      { primary: "#11457E", secondary: "#D7141A" }, // Czech blue primary + red (distinct from S.Korea red)
  "Czech Republic": { primary: "#11457E", secondary: "#D7141A" },
  Denmark:      { primary: "#C60C30", secondary: "#FFFFFF" }, // red + white
  England:      { primary: "#CF081F", secondary: "#FFFFFF" }, // red cross + white
  France:       { primary: "#002395", secondary: "#ED2939" }, // blue + red
  Germany:      { primary: "#DD0000", secondary: "#FFCE00" }, // red + gold (black invisible on dark bg)
  Greece:       { primary: "#0D5EAF", secondary: "#FFFFFF" }, // blue + white
  Hungary:      { primary: "#CE2939", secondary: "#477050" }, // red + green
  Italy:        { primary: "#003399", secondary: "#FFFFFF" }, // azzurri blue
  Netherlands:  { primary: "#FF6600", secondary: "#FFFFFF" }, // oranje
  Norway:       { primary: "#EF2B2D", secondary: "#003087" }, // red + blue
  Poland:       { primary: "#DC143C", secondary: "#FFFFFF" }, // red + white
  Portugal:     { primary: "#C8102E", secondary: "#006600" }, // red + green
  Romania:      { primary: "#002B7F", secondary: "#CE1126" }, // blue + red
  Scotland:     { primary: "#003DA5", secondary: "#FFFFFF" }, // blue + white
  Serbia:       { primary: "#C6363C", secondary: "#0C4076" }, // red + blue
  Slovakia:     { primary: "#0B4EA2", secondary: "#CE1126" }, // blue + red
  Slovenia:     { primary: "#003DA5", secondary: "#CE1126" }, // blue + red
  Spain:        { primary: "#C60B1E", secondary: "#FFC400" }, // red + yellow
  Sweden:       { primary: "#006AA7", secondary: "#FECC02" }, // blue + yellow
  Switzerland:  { primary: "#FFFFFF", secondary: "#FF0000" }, // white primary + red ring (distinct from Canada red)
  Türkiye:      { primary: "#E30A17", secondary: "#FFFFFF" }, // red + white
  Turkey:       { primary: "#E30A17", secondary: "#FFFFFF" },
  Ukraine:      { primary: "#005BBB", secondary: "#FFD500" }, // blue + yellow
  Wales:        { primary: "#C8102E", secondary: "#FFFFFF" }, // red + white

  // ── Africa ────────────────────────────────────────────────────────────────
  Algeria:      { primary: "#FFFFFF", secondary: "#016A30" }, // white primary + green ring (flag: half white; distinct from Jordan green)
  Cameroon:     { primary: "#007A5E", secondary: "#CE1126" }, // green + red
  "Cape Verde": { primary: "#003893", secondary: "#CF2027" }, // blue + red
  "DR Congo":   { primary: "#007FFF", secondary: "#F7D618" }, // blue + yellow
  Egypt:        { primary: "#C8102E", secondary: "#000000" }, // red + black
  Ghana:        { primary: "#FCD116", secondary: "#006B3F" }, // gold + green
  "Ivory Coast": { primary: "#F77F00", secondary: "#009A44" }, // orange + green
  Mali:         { primary: "#14B53A", secondary: "#CE1126" }, // green + red
  Morocco:      { primary: "#C1272D", secondary: "#006233" }, // red + green
  Nigeria:      { primary: "#008751", secondary: "#FFFFFF" }, // green + white
  Senegal:      { primary: "#00853F", secondary: "#FDEF42" }, // green + yellow
  "South Africa": { primary: "#FFB81C", secondary: "#007A4D" }, // gold primary + green ring (Bafana Bafana kit)
  Tunisia:      { primary: "#E70013", secondary: "#FFFFFF" }, // red + white

  // ── Asia & Oceania ────────────────────────────────────────────────────────
  Australia:    { primary: "#FFD700", secondary: "#00843D" }, // gold + green
  China:        { primary: "#DE2910", secondary: "#FFD700" }, // red + gold
  "Hong Kong":  { primary: "#DE2910", secondary: "#FFFFFF" },
  Indonesia:    { primary: "#CE1126", secondary: "#FFFFFF" }, // red + white
  Iran:         { primary: "#239F40", secondary: "#FFFFFF" }, // green + white
  Iraq:         { primary: "#CE1126", secondary: "#007A3D" }, // red + green
  Japan:        { primary: "#FFFFFF", secondary: "#BC002D" }, // white + red (flag: white bg + red circle)
  Jordan:       { primary: "#007A3D", secondary: "#CE1126" }, // green + red
  Kuwait:       { primary: "#007A3D", secondary: "#000000" }, // green + black
  "New Zealand": { primary: "#00247D", secondary: "#CC0000" }, // navy blue + red from flag (black invisible)
  "North Korea": { primary: "#024FA2", secondary: "#CE1126" }, // blue + red
  Oman:         { primary: "#DB161B", secondary: "#FFFFFF" }, // red + white
  Qatar:        { primary: "#8D1B3D", secondary: "#FFFFFF" }, // maroon + white
  "Saudi Arabia": { primary: "#006C35", secondary: "#FFFFFF" }, // green + white
  "South Korea": { primary: "#C60C30", secondary: "#003478" }, // red + blue
  Syria:        { primary: "#CE1126", secondary: "#007A3D" }, // red + green
  UAE:          { primary: "#00732F", secondary: "#CE1126" }, // green + red
  Uzbekistan:   { primary: "#1EB53A", secondary: "#0099B5" }, // green + blue

  // ── Catch-all for TBD / unknown ───────────────────────────────────────────
  TBD:          { primary: "#64748B", secondary: "#94A3B8" },
};

/** Normalize common name variants (e.g. "United States" vs "USA") */
const ALIASES: Record<string, string> = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Republic of Korea": "South Korea",
  "DPR Korea": "North Korea",
  "IR Iran": "Iran",
  "Türkiye": "Türkiye",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Ivory Coast": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
};

const FALLBACK: TeamColor = { primary: "#64748B", secondary: "#94A3B8" };

export function getTeamColor(name: string): TeamColor {
  const norm  = (name ?? "").trim();
  const alias = ALIASES[norm] ?? norm;
  return TEAM_COLORS[alias] ?? FALLBACK;
}
