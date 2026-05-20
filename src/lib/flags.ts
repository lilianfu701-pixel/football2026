// Team name → ISO country code mapping for flagcdn.com
const TEAM_FLAG_CODES: Record<string, string> = {
  // Group A: Mexico, South Korea, Czechia, South Africa
  "Mexico": "mx",
  "South Korea": "kr",
  "Czechia": "cz",
  "South Africa": "za",
  // Group B: Canada, Bosnia & Herzegovina, Qatar, Switzerland
  "Canada": "ca",
  "Bosnia & Herzegovina": "ba",
  "Qatar": "qa",
  "Switzerland": "ch",
  // Group C: Brazil, Morocco, Haiti, Scotland
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  // Group D: USA, Paraguay, Australia, Türkiye
  "USA": "us",
  "Paraguay": "py",
  "Australia": "au",
  "Türkiye": "tr",
  "Turkey": "tr",
  // Group E: Germany, Curaçao, Ivory Coast, Ecuador
  "Germany": "de",
  "Curaçao": "cw",
  "Curacao": "cw",
  "Ivory Coast": "ci",
  "Ecuador": "ec",
  // Group F: Netherlands, Japan, Sweden, Tunisia
  "Netherlands": "nl",
  "Japan": "jp",
  "Sweden": "se",
  "Tunisia": "tn",
  // Group G: Belgium, Egypt, Iran, New Zealand
  "Belgium": "be",
  "Egypt": "eg",
  "Iran": "ir",
  "New Zealand": "nz",
  // Group H: Spain, Cape Verde, Saudi Arabia, Uruguay
  "Spain": "es",
  "Cape Verde": "cv",
  "Saudi Arabia": "sa",
  "Uruguay": "uy",
  // Group I: France, Senegal, Iraq, Norway
  "France": "fr",
  "Senegal": "sn",
  "Iraq": "iq",
  "Norway": "no",
  // Group J: Argentina, Algeria, Austria, Jordan
  "Argentina": "ar",
  "Algeria": "dz",
  "Austria": "at",
  "Jordan": "jo",
  // Group K: Portugal, DR Congo, Uzbekistan, Colombia
  "Portugal": "pt",
  "DR Congo": "cd",
  "Uzbekistan": "uz",
  "Colombia": "co",
  // Group L: England, Croatia, Ghana, Panama
  "England": "gb-eng",
  "Croatia": "hr",
  "Ghana": "gh",
  "Panama": "pa",
  // Extra
  "Wales": "gb-wls",
  "Poland": "pl",
  "Serbia": "rs",
  "Denmark": "dk",
  "Italy": "it",
  "Nigeria": "ng",
  "Costa Rica": "cr",
  "Cameroon": "cm",
  "Ukraine": "ua",
  "Greece": "gr",
  "Chile": "cl",
  "Peru": "pe",
  "Bolivia": "bo",
  "Venezuela": "ve",
  "Jamaica": "jm",
  "Honduras": "hn",
  "El Salvador": "sv",
  "Mali": "ml",
  "Burkina Faso": "bf",
  "Syria": "sy",
  "UAE": "ae",
  "Oman": "om",
  "Bahrain": "bh",
  "Kuwait": "kw",
  "China": "cn",
  "India": "in",
  "Thailand": "th",
  "Vietnam": "vn",
  "Indonesia": "id",
  "Philippines": "ph",
  "Fiji": "fj",
};

export function getFlagUrl(teamName: string, size: number = 80): string {
  const code = TEAM_FLAG_CODES[teamName];
  if (!code) return null as unknown as string; // TBD teams handled separately
  return `https://flagcdn.com/w${size}/${code}.png`;
}

export function getFlagCode(teamName: string): string {
  return TEAM_FLAG_CODES[teamName] ?? "";
}

/** Returns true if team is a placeholder (e.g. "1A", "W M73", "3rd ABCD") */
export function isTBD(teamName: string): boolean {
  if (!teamName) return true;
  return /^[123WL]/.test(teamName) && (
    /^\d[A-L]$/.test(teamName) ||       // "1A", "2B"
    /^[WL]\s+M\d+/.test(teamName) ||    // "W M73", "L M101"
    /^3rd/.test(teamName)               // "3rd ABCD"
  );
}
