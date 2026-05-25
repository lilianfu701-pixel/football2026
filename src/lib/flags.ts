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

// Team display names per locale (key = English name, value = localized name)
const TEAM_NAMES: Record<string, Record<string, string>> = {
  zh: {
    // Group A
    "Mexico": "墨西哥",
    "South Korea": "韩国",
    "Czechia": "捷克",
    "South Africa": "南非",
    // Group B
    "Canada": "加拿大",
    "Bosnia & Herzegovina": "波黑",
    "Qatar": "卡塔尔",
    "Switzerland": "瑞士",
    // Group C
    "Brazil": "巴西",
    "Morocco": "摩洛哥",
    "Haiti": "海地",
    "Scotland": "苏格兰",
    // Group D
    "USA": "美国",
    "Paraguay": "巴拉圭",
    "Australia": "澳大利亚",
    "Türkiye": "土耳其",
    "Turkey": "土耳其",
    // Group E
    "Germany": "德国",
    "Curaçao": "库拉索",
    "Curacao": "库拉索",
    "Ivory Coast": "科特迪瓦",
    "Ecuador": "厄瓜多尔",
    // Group F
    "Netherlands": "荷兰",
    "Japan": "日本",
    "Sweden": "瑞典",
    "Tunisia": "突尼斯",
    // Group G
    "Belgium": "比利时",
    "Egypt": "埃及",
    "Iran": "伊朗",
    "New Zealand": "新西兰",
    // Group H
    "Spain": "西班牙",
    "Cape Verde": "佛得角",
    "Saudi Arabia": "沙特阿拉伯",
    "Uruguay": "乌拉圭",
    // Group I
    "France": "法国",
    "Senegal": "塞内加尔",
    "Iraq": "伊拉克",
    "Norway": "挪威",
    // Group J
    "Argentina": "阿根廷",
    "Algeria": "阿尔及利亚",
    "Austria": "奥地利",
    "Jordan": "约旦",
    // Group K
    "Portugal": "葡萄牙",
    "DR Congo": "刚果（金）",
    "Uzbekistan": "乌兹别克斯坦",
    "Colombia": "哥伦比亚",
    // Group L
    "England": "英格兰",
    "Croatia": "克罗地亚",
    "Ghana": "加纳",
    "Panama": "巴拿马",
    // Extra
    "Wales": "威尔士",
    "Poland": "波兰",
    "Serbia": "塞尔维亚",
    "Denmark": "丹麦",
    "Italy": "意大利",
    "Nigeria": "尼日利亚",
    "Costa Rica": "哥斯达黎加",
    "Cameroon": "喀麦隆",
    "Ukraine": "乌克兰",
    "Greece": "希腊",
    "Chile": "智利",
    "Peru": "秘鲁",
    "Bolivia": "玻利维亚",
    "Venezuela": "委内瑞拉",
    "Jamaica": "牙买加",
    "Honduras": "洪都拉斯",
    "El Salvador": "萨尔瓦多",
    "Mali": "马里",
    "Burkina Faso": "布基纳法索",
    "Syria": "叙利亚",
    "UAE": "阿联酋",
    "Oman": "阿曼",
    "Bahrain": "巴林",
    "Kuwait": "科威特",
    "China": "中国",
    "India": "印度",
    "Thailand": "泰国",
    "Vietnam": "越南",
    "Indonesia": "印度尼西亚",
    "Philippines": "菲律宾",
    "Fiji": "斐济",
  },
};

/** Returns the localized display name for a team. Falls back to English. */
export function getTeamDisplayName(teamName: string, locale: string): string {
  return TEAM_NAMES[locale]?.[teamName] ?? teamName;
}

// FlagCDN only supports these widths — anything else returns 404
const VALID_WIDTHS = [20, 40, 80, 160, 320, 640];

function snapWidth(size: number): number {
  return VALID_WIDTHS.reduce((prev, cur) =>
    Math.abs(cur - size) < Math.abs(prev - size) ? cur : prev
  );
}

export function getFlagUrl(teamName: string, size: number = 80): string {
  const code = TEAM_FLAG_CODES[teamName];
  if (!code) return null as unknown as string; // TBD teams handled separately
  return `https://flagcdn.com/w${snapWidth(size)}/${code}.png`;
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
