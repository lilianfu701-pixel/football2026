/**
 * World Cup 2026 — Static player roster for award predictions.
 * Covers ~25 major squads, ~150 players.
 * Ages calculated as of tournament start: June 11, 2026.
 *
 * bestYoung: born on/after Jan 1, 2004 (≤ 22 years old at WC2026)
 */

export type Position = "GK" | "DF" | "MF" | "FW";

export interface Player {
  id: number;
  name: string;
  nameZh: string;
  /** Matches the team name used in the matches table */
  country: string;
  /** ISO 3166-1 alpha-2, lowercase */
  countryCode: string;
  position: Position;
  club: string;
  /** Age as of June 11, 2026 */
  age: number;
  /** Eligible for Golden Boot (top scorer) */
  goldenBoot: boolean;
  /** Eligible for Golden Ball (best player) */
  goldenBall: boolean;
  /** Eligible for Golden Glove (best goalkeeper) */
  goldenGlove: boolean;
  /** Eligible for Best Young Player (born ≥ Jan 1, 2004) */
  bestYoung: boolean;
}

export const PLAYERS: Player[] = [

  // ── FRANCE ──────────────────────────────────────────────────────────────
  { id: 1,  name: "Kylian Mbappé",        nameZh: "姆巴佩",       country: "France",      countryCode: "fr", position: "FW", club: "Real Madrid",       age: 27, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 2,  name: "Antoine Griezmann",    nameZh: "格列兹曼",     country: "France",      countryCode: "fr", position: "FW", club: "Atlético Madrid",   age: 35, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 3,  name: "Ousmane Dembélé",      nameZh: "登贝莱",       country: "France",      countryCode: "fr", position: "FW", club: "Paris SG",          age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 4,  name: "Mike Maignan",         nameZh: "马南",         country: "France",      countryCode: "fr", position: "GK", club: "AC Milan",          age: 30, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 5,  name: "Warren Zaïre-Emery",   nameZh: "扎伊尔-埃默里", country: "France",     countryCode: "fr", position: "MF", club: "Paris SG",          age: 20, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 6,  name: "Aurélien Tchouaméni",  nameZh: "秋阿梅尼",     country: "France",      countryCode: "fr", position: "MF", club: "Real Madrid",       age: 26, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 7,  name: "Mathys Tel",           nameZh: "特尔",         country: "France",      countryCode: "fr", position: "FW", club: "Bayern Munich",     age: 21, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: true  },

  // ── ARGENTINA ────────────────────────────────────────────────────────────
  { id: 10, name: "Lionel Messi",         nameZh: "梅西",         country: "Argentina",   countryCode: "ar", position: "FW", club: "Inter Miami",       age: 38, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 11, name: "Julián Álvarez",       nameZh: "胡利安·阿尔瓦雷斯", country: "Argentina", countryCode: "ar", position: "FW", club: "Atlético Madrid", age: 26, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 12, name: "Lautaro Martínez",     nameZh: "劳塔罗",       country: "Argentina",   countryCode: "ar", position: "FW", club: "Inter Milan",       age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 13, name: "Emiliano Martínez",    nameZh: "马丁内斯",     country: "Argentina",   countryCode: "ar", position: "GK", club: "Aston Villa",       age: 33, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 14, name: "Alejandro Garnacho",   nameZh: "加纳乔",       country: "Argentina",   countryCode: "ar", position: "FW", club: "Man. United",       age: 21, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: true  },
  { id: 15, name: "Rodrigo De Paul",      nameZh: "德保罗",       country: "Argentina",   countryCode: "ar", position: "MF", club: "Atlético Madrid",   age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── BRAZIL ───────────────────────────────────────────────────────────────
  { id: 20, name: "Vinicius Jr",          nameZh: "维尼修斯",     country: "Brazil",      countryCode: "br", position: "FW", club: "Real Madrid",       age: 25, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 21, name: "Rodrygo",              nameZh: "罗德里戈",     country: "Brazil",      countryCode: "br", position: "FW", club: "Real Madrid",       age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 22, name: "Raphinha",             nameZh: "拉菲尼亚",     country: "Brazil",      countryCode: "br", position: "FW", club: "Barcelona",         age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 23, name: "Endrick",              nameZh: "恩德里克",     country: "Brazil",      countryCode: "br", position: "FW", club: "Real Madrid",       age: 19, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 24, name: "Alisson",              nameZh: "阿利森",       country: "Brazil",      countryCode: "br", position: "GK", club: "Liverpool",         age: 33, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 25, name: "Lucas Paquetá",        nameZh: "帕奎塔",       country: "Brazil",      countryCode: "br", position: "MF", club: "West Ham",          age: 28, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 26, name: "Savinho",              nameZh: "萨维尼奥",     country: "Brazil",      countryCode: "br", position: "FW", club: "Man. City",         age: 21, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: true  },

  // ── SPAIN ─────────────────────────────────────────────────────────────────
  { id: 30, name: "Lamine Yamal",         nameZh: "亚马尔",       country: "Spain",       countryCode: "es", position: "FW", club: "Barcelona",         age: 18, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 31, name: "Pedri",                nameZh: "佩德里",       country: "Spain",       countryCode: "es", position: "MF", club: "Barcelona",         age: 23, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 32, name: "Gavi",                 nameZh: "加维",         country: "Spain",       countryCode: "es", position: "MF", club: "Barcelona",         age: 21, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 33, name: "Álvaro Morata",        nameZh: "莫拉塔",       country: "Spain",       countryCode: "es", position: "FW", club: "AC Milan",          age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 34, name: "Unai Simón",           nameZh: "乌纳伊·西蒙",  country: "Spain",       countryCode: "es", position: "GK", club: "Athletic Bilbao",   age: 29, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 35, name: "Dani Olmo",            nameZh: "达尼·奥尔莫",  country: "Spain",       countryCode: "es", position: "MF", club: "Barcelona",         age: 28, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },

  // ── ENGLAND ───────────────────────────────────────────────────────────────
  { id: 40, name: "Harry Kane",           nameZh: "凯恩",         country: "England",     countryCode: "gb-eng", position: "FW", club: "Bayern Munich",  age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 41, name: "Jude Bellingham",      nameZh: "贝林厄姆",     country: "England",     countryCode: "gb-eng", position: "MF", club: "Real Madrid",    age: 22, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 42, name: "Bukayo Saka",          nameZh: "萨卡",         country: "England",     countryCode: "gb-eng", position: "FW", club: "Arsenal",        age: 24, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 43, name: "Phil Foden",           nameZh: "福登",         country: "England",     countryCode: "gb-eng", position: "MF", club: "Man. City",      age: 26, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 44, name: "Jordan Pickford",      nameZh: "皮克福德",     country: "England",     countryCode: "gb-eng", position: "GK", club: "Everton",        age: 32, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 45, name: "Cole Palmer",          nameZh: "科尔·帕尔默",  country: "England",     countryCode: "gb-eng", position: "MF", club: "Chelsea",        age: 24, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },

  // ── GERMANY ───────────────────────────────────────────────────────────────
  { id: 50, name: "Florian Wirtz",        nameZh: "维尔茨",       country: "Germany",     countryCode: "de", position: "MF", club: "Bayern Munich",     age: 22, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 51, name: "Jamal Musiala",        nameZh: "穆西亚拉",     country: "Germany",     countryCode: "de", position: "MF", club: "Bayern Munich",     age: 23, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 52, name: "Kai Havertz",          nameZh: "哈弗茨",       country: "Germany",     countryCode: "de", position: "FW", club: "Arsenal",           age: 27, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 53, name: "Leroy Sané",           nameZh: "萨内",         country: "Germany",     countryCode: "de", position: "FW", club: "Bayern Munich",     age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 54, name: "Marc-André ter Stegen", nameZh: "特尔·斯蒂根", country: "Germany",    countryCode: "de", position: "GK", club: "Barcelona",         age: 34, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 55, name: "Antonio Rüdiger",      nameZh: "吕迪格尔",     country: "Germany",     countryCode: "de", position: "DF", club: "Real Madrid",       age: 33, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── PORTUGAL ──────────────────────────────────────────────────────────────
  { id: 60, name: "Cristiano Ronaldo",    nameZh: "C罗",          country: "Portugal",    countryCode: "pt", position: "FW", club: "Al Nassr",          age: 41, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 61, name: "Bruno Fernandes",      nameZh: "B·费尔南德斯", country: "Portugal",    countryCode: "pt", position: "MF", club: "Man. United",       age: 31, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 62, name: "Rafael Leão",          nameZh: "莱昂",         country: "Portugal",    countryCode: "pt", position: "FW", club: "AC Milan",          age: 26, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 63, name: "Gonçalo Ramos",        nameZh: "贡萨洛·拉莫斯", country: "Portugal",   countryCode: "pt", position: "FW", club: "Paris SG",          age: 24, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 64, name: "Diogo Costa",          nameZh: "迪奥戈·科斯塔", country: "Portugal",   countryCode: "pt", position: "GK", club: "Porto",             age: 26, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 65, name: "Bernardo Silva",       nameZh: "B·席尔瓦",     country: "Portugal",    countryCode: "pt", position: "MF", club: "Man. City",         age: 31, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },

  // ── NETHERLANDS ───────────────────────────────────────────────────────────
  { id: 70, name: "Cody Gakpo",           nameZh: "加克波",       country: "Netherlands", countryCode: "nl", position: "FW", club: "Liverpool",         age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 71, name: "Xavi Simons",          nameZh: "哈维·西蒙斯",  country: "Netherlands", countryCode: "nl", position: "MF", club: "Paris SG",          age: 23, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 72, name: "Virgil van Dijk",      nameZh: "范戴克",       country: "Netherlands", countryCode: "nl", position: "DF", club: "Liverpool",         age: 34, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 73, name: "Bart Verbruggen",      nameZh: "韦尔布鲁根",   country: "Netherlands", countryCode: "nl", position: "GK", club: "Brighton",          age: 23, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 74, name: "Brian Brobbey",        nameZh: "布罗比",       country: "Netherlands", countryCode: "nl", position: "FW", club: "Ajax",              age: 24, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── BELGIUM ───────────────────────────────────────────────────────────────
  { id: 80, name: "Romelu Lukaku",        nameZh: "卢卡库",       country: "Belgium",     countryCode: "be", position: "FW", club: "Napoli",            age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 81, name: "Kevin De Bruyne",      nameZh: "德布劳内",     country: "Belgium",     countryCode: "be", position: "MF", club: "Man. City",         age: 34, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 82, name: "Thibaut Courtois",     nameZh: "库尔图瓦",     country: "Belgium",     countryCode: "be", position: "GK", club: "Real Madrid",       age: 34, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 83, name: "Lois Openda",          nameZh: "奥彭达",       country: "Belgium",     countryCode: "be", position: "FW", club: "RB Leipzig",        age: 24, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 84, name: "Amadou Onana",         nameZh: "阿马杜·奥纳纳", country: "Belgium",    countryCode: "be", position: "MF", club: "Aston Villa",       age: 23, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── CROATIA ───────────────────────────────────────────────────────────────
  { id: 90, name: "Luka Modrić",          nameZh: "莫德里奇",     country: "Croatia",     countryCode: "hr", position: "MF", club: "Real Madrid",       age: 40, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 91, name: "Andrej Kramarić",      nameZh: "克拉马里奇",   country: "Croatia",     countryCode: "hr", position: "FW", club: "Hoffenheim",        age: 34, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 92, name: "Ivan Perišić",         nameZh: "佩里西奇",     country: "Croatia",     countryCode: "hr", position: "FW", club: "Hajduk Split",      age: 37, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 93, name: "Dominik Livaković",    nameZh: "利瓦科维奇",   country: "Croatia",     countryCode: "hr", position: "GK", club: "Fenerbahçe",        age: 31, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── MOROCCO ───────────────────────────────────────────────────────────────
  { id: 100, name: "Achraf Hakimi",       nameZh: "哈基米",       country: "Morocco",     countryCode: "ma", position: "DF", club: "Paris SG",          age: 27, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 101, name: "Hakim Ziyech",        nameZh: "齐耶赫",       country: "Morocco",     countryCode: "ma", position: "FW", club: "Galatasaray",       age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 102, name: "Youssef En-Nesyri",   nameZh: "恩内斯里",     country: "Morocco",     countryCode: "ma", position: "FW", club: "Fenerbahçe",        age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 103, name: "Yassine Bounou",      nameZh: "布努",         country: "Morocco",     countryCode: "ma", position: "GK", club: "Al-Hilal",          age: 35, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 104, name: "Sofyan Amrabat",      nameZh: "阿姆拉巴特",   country: "Morocco",     countryCode: "ma", position: "MF", club: "Fiorentina",        age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SENEGAL ───────────────────────────────────────────────────────────────
  { id: 110, name: "Sadio Mané",          nameZh: "马内",         country: "Senegal",     countryCode: "sn", position: "FW", club: "Al Nassr",          age: 34, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 111, name: "Ismaïla Sarr",        nameZh: "伊斯梅拉·萨尔", country: "Senegal",    countryCode: "sn", position: "FW", club: "Marseille",         age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 112, name: "Édouard Mendy",       nameZh: "门迪",         country: "Senegal",     countryCode: "sn", position: "GK", club: "Al-Ahli",           age: 34, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 113, name: "Lamine Camara",       nameZh: "拉明·卡马拉",  country: "Senegal",     countryCode: "sn", position: "MF", club: "Monaco",            age: 21, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: true  },

  // ── USA ───────────────────────────────────────────────────────────────────
  { id: 120, name: "Christian Pulisic",   nameZh: "普利西奇",     country: "USA",         countryCode: "us", position: "FW", club: "AC Milan",          age: 27, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 121, name: "Folarin Balogun",     nameZh: "巴洛冈",       country: "USA",         countryCode: "us", position: "FW", club: "Monaco",            age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 122, name: "Yunus Musah",         nameZh: "穆萨",         country: "USA",         countryCode: "us", position: "MF", club: "AC Milan",          age: 23, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 123, name: "Turner Matt",         nameZh: "特纳",         country: "USA",         countryCode: "us", position: "GK", club: "Nottm Forest",      age: 31, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 124, name: "Ricardo Pepi",        nameZh: "佩皮",         country: "USA",         countryCode: "us", position: "FW", club: "PSV",               age: 23, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── MEXICO ────────────────────────────────────────────────────────────────
  { id: 130, name: "Santiago Giménez",    nameZh: "圣地亚哥·希门尼斯", country: "Mexico", countryCode: "mx", position: "FW", club: "AC Milan",         age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 131, name: "Hirving Lozano",      nameZh: "洛萨诺",       country: "Mexico",      countryCode: "mx", position: "FW", club: "San Diego FC",      age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 132, name: "Edson Álvarez",       nameZh: "埃德森·阿尔瓦雷斯", country: "Mexico", countryCode: "mx", position: "MF", club: "West Ham",         age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 133, name: "Luis Malagón",        nameZh: "马拉贡",       country: "Mexico",      countryCode: "mx", position: "GK", club: "Club América",      age: 28, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── URUGUAY ───────────────────────────────────────────────────────────────
  { id: 140, name: "Darwin Núñez",        nameZh: "达尔文·努涅斯", country: "Uruguay",    countryCode: "uy", position: "FW", club: "Liverpool",         age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 141, name: "Federico Valverde",   nameZh: "巴尔韦德",     country: "Uruguay",     countryCode: "uy", position: "MF", club: "Real Madrid",       age: 27, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 142, name: "Rodrigo Bentancur",   nameZh: "本坦库尔",     country: "Uruguay",     countryCode: "uy", position: "MF", club: "Tottenham",         age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 143, name: "Sergio Rochet",       nameZh: "罗切特",       country: "Uruguay",     countryCode: "uy", position: "GK", club: "Nacional",          age: 29, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── COLOMBIA ──────────────────────────────────────────────────────────────
  { id: 150, name: "Luis Díaz",           nameZh: "路易斯·迪亚斯", country: "Colombia",   countryCode: "co", position: "FW", club: "Liverpool",         age: 28, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 151, name: "James Rodríguez",     nameZh: "J·罗德里格斯", country: "Colombia",    countryCode: "co", position: "MF", club: "Rayo Vallecano",    age: 34, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 152, name: "Jhon Córdoba",        nameZh: "科尔多巴",     country: "Colombia",    countryCode: "co", position: "FW", club: "Krasnodar",         age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 153, name: "Camilo Vargas",       nameZh: "瓦尔加斯",     country: "Colombia",    countryCode: "co", position: "GK", club: "Atlas",             age: 34, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── JAPAN ─────────────────────────────────────────────────────────────────
  { id: 160, name: "Kaoru Mitoma",        nameZh: "三笘薰",       country: "Japan",       countryCode: "jp", position: "FW", club: "Brighton",          age: 28, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 161, name: "Takefusa Kubo",       nameZh: "久保建英",     country: "Japan",       countryCode: "jp", position: "FW", club: "Real Sociedad",     age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 162, name: "Wataru Endō",         nameZh: "远藤航",       country: "Japan",       countryCode: "jp", position: "MF", club: "Liverpool",         age: 33, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 163, name: "Shuichi Gonda",       nameZh: "权田修一",     country: "Japan",       countryCode: "jp", position: "GK", club: "Shimizu S-Pulse",   age: 36, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 164, name: "Ayase Ueda",          nameZh: "上田绮世",     country: "Japan",       countryCode: "jp", position: "FW", club: "Feyenoord",         age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SOUTH KOREA ───────────────────────────────────────────────────────────
  { id: 170, name: "Son Heung-min",       nameZh: "孙兴慜",       country: "South Korea", countryCode: "kr", position: "FW", club: "Tottenham",         age: 33, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 171, name: "Lee Kang-in",         nameZh: "李康仁",       country: "South Korea", countryCode: "kr", position: "MF", club: "Paris SG",          age: 24, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 172, name: "Kim Min-jae",         nameZh: "金玟哉",       country: "South Korea", countryCode: "kr", position: "DF", club: "Bayern Munich",     age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 173, name: "Jo Hyeon-woo",        nameZh: "赵贤祐",       country: "South Korea", countryCode: "kr", position: "GK", club: "Ulsan HD",          age: 33, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── SWITZERLAND ───────────────────────────────────────────────────────────
  { id: 180, name: "Granit Xhaka",        nameZh: "扎卡",         country: "Switzerland", countryCode: "ch", position: "MF", club: "Bayer Leverkusen",  age: 33, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 181, name: "Breel Embolo",        nameZh: "恩博洛",       country: "Switzerland", countryCode: "ch", position: "FW", club: "Monaco",            age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 182, name: "Yann Sommer",         nameZh: "佐默",         country: "Switzerland", countryCode: "ch", position: "GK", club: "Inter Milan",       age: 37, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── DENMARK ───────────────────────────────────────────────────────────────
  { id: 190, name: "Christian Eriksen",   nameZh: "埃里克森",     country: "Denmark",     countryCode: "dk", position: "MF", club: "Man. United",       age: 34, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 191, name: "Rasmus Højlund",      nameZh: "霍伦德",       country: "Denmark",     countryCode: "dk", position: "FW", club: "Man. United",       age: 23, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 192, name: "Kasper Schmeichel",   nameZh: "卡斯帕·舒梅切尔", country: "Denmark",  countryCode: "dk", position: "GK", club: "Anderlecht",        age: 39, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── SERBIA ────────────────────────────────────────────────────────────────
  { id: 200, name: "Aleksandar Mitrović", nameZh: "米特罗维奇",   country: "Serbia",      countryCode: "rs", position: "FW", club: "Al-Hilal",          age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 201, name: "Dušan Vlahović",      nameZh: "弗拉霍维奇",   country: "Serbia",      countryCode: "rs", position: "FW", club: "Juventus",          age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 202, name: "Predrag Rajković",    nameZh: "拉伊科维奇",   country: "Serbia",      countryCode: "rs", position: "GK", club: "Mallorca",          age: 29, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── ECUADOR ───────────────────────────────────────────────────────────────
  { id: 210, name: "Enner Valencia",      nameZh: "瓦伦西亚",     country: "Ecuador",     countryCode: "ec", position: "FW", club: "Internacional",     age: 36, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 211, name: "Moisés Caicedo",      nameZh: "卡伊塞多",     country: "Ecuador",     countryCode: "ec", position: "MF", club: "Chelsea",           age: 24, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 212, name: "Kendry Páez",         nameZh: "肯德里·帕埃斯", country: "Ecuador",    countryCode: "ec", position: "MF", club: "Chelsea",           age: 19, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: true  },

  // ── TÜRKIYE ───────────────────────────────────────────────────────────────
  { id: 220, name: "Arda Güler",          nameZh: "阿尔达·居勒",  country: "Türkiye",     countryCode: "tr", position: "MF", club: "Real Madrid",       age: 20, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: true  },
  { id: 221, name: "Hakan Çalhanoğlu",    nameZh: "恰尔汗奥卢",   country: "Türkiye",     countryCode: "tr", position: "MF", club: "Inter Milan",       age: 32, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 222, name: "Kerem Aktürkoğlu",    nameZh: "阿克图尔科格鲁", country: "Türkiye",   countryCode: "tr", position: "FW", club: "Galatasaray",       age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 223, name: "Altay Bayındır",      nameZh: "巴因迪尔",     country: "Türkiye",     countryCode: "tr", position: "GK", club: "Man. United",       age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── CANADA ────────────────────────────────────────────────────────────────
  { id: 230, name: "Alphonso Davies",     nameZh: "阿方索·戴维斯", country: "Canada",     countryCode: "ca", position: "DF", club: "Bayern Munich",     age: 25, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 231, name: "Jonathan David",      nameZh: "乔纳森·大卫",  country: "Canada",      countryCode: "ca", position: "FW", club: "Lille",             age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 232, name: "Cyle Larin",          nameZh: "拉林",         country: "Canada",      countryCode: "ca", position: "FW", club: "Atlético Madrid",   age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 233, name: "Maxime Crépeau",      nameZh: "克雷波",       country: "Canada",      countryCode: "ca", position: "GK", club: "LA Galaxy",         age: 30, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── AUSTRALIA ─────────────────────────────────────────────────────────────
  { id: 240, name: "Mathew Ryan",         nameZh: "马修·瑞安",    country: "Australia",   countryCode: "au", position: "GK", club: "Real Sociedad",     age: 34, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 241, name: "Mitchell Duke",       nameZh: "杜克",         country: "Australia",   countryCode: "au", position: "FW", club: "Macarthur FC",      age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 242, name: "Martin Boyle",        nameZh: "博伊尔",       country: "Australia",   countryCode: "au", position: "FW", club: "Al-Faisaly",        age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── IRAN ──────────────────────────────────────────────────────────────────
  { id: 250, name: "Mehdi Taremi",        nameZh: "塔雷米",       country: "Iran",        countryCode: "ir", position: "FW", club: "Inter Milan",       age: 34, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 251, name: "Alireza Beiranvand",  nameZh: "贝兰万德",     country: "Iran",        countryCode: "ir", position: "GK", club: "Antwerp",           age: 32, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 252, name: "Sardar Azmoun",       nameZh: "阿兹蒙",       country: "Iran",        countryCode: "ir", position: "FW", club: "Bayer Leverkusen",  age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── CAMEROON ──────────────────────────────────────────────────────────────
  { id: 260, name: "Vincent Aboubakar",   nameZh: "阿布巴卡尔",   country: "Cameroon",    countryCode: "cm", position: "FW", club: "Besiktas",          age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 261, name: "André Onana",         nameZh: "奥纳纳",       country: "Cameroon",    countryCode: "cm", position: "GK", club: "Man. United",       age: 30, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 262, name: "Bryan Mbeumo",        nameZh: "姆布伊莫",     country: "Cameroon",    countryCode: "cm", position: "FW", club: "Brentford",         age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SAUDI ARABIA ──────────────────────────────────────────────────────────
  { id: 270, name: "Salem Al-Dawsari",    nameZh: "道萨里",       country: "Saudi Arabia", countryCode: "sa", position: "FW", club: "Al-Hilal",         age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 271, name: "Mohammed Al-Owais",   nameZh: "阿尔-奥瓦斯",  country: "Saudi Arabia", countryCode: "sa", position: "GK", club: "Al-Hilal",         age: 32, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 272, name: "Firas Al-Buraikan",   nameZh: "阿尔-布雷坎",  country: "Saudi Arabia", countryCode: "sa", position: "FW", club: "Al-Qadsiah",       age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── FRANCE (expanded) ─────────────────────────────────────────────────────
  { id: 280, name: "Marcus Thuram",       nameZh: "马库斯·图拉姆",  country: "France",       countryCode: "fr", position: "FW", club: "Inter Milan",       age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 281, name: "Eduardo Camavinga",   nameZh: "卡马文加",       country: "France",       countryCode: "fr", position: "MF", club: "Real Madrid",       age: 23, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 282, name: "Théo Hernández",      nameZh: "西奥·埃尔南德斯", country: "France",       countryCode: "fr", position: "DF", club: "AC Milan",          age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── ARGENTINA (expanded) ──────────────────────────────────────────────────
  { id: 285, name: "Paulo Dybala",        nameZh: "迪巴拉",         country: "Argentina",    countryCode: "ar", position: "FW", club: "Roma",              age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 286, name: "Enzo Fernández",      nameZh: "恩佐·费尔南德斯", country: "Argentina",    countryCode: "ar", position: "MF", club: "Chelsea",           age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 287, name: "Cristian Romero",     nameZh: "罗梅罗",         country: "Argentina",    countryCode: "ar", position: "DF", club: "Tottenham",         age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── BRAZIL (expanded) ─────────────────────────────────────────────────────
  { id: 290, name: "Marquinhos",          nameZh: "马尔基尼奥斯",   country: "Brazil",       countryCode: "br", position: "DF", club: "Paris SG",          age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 291, name: "Bruno Guimarães",     nameZh: "布鲁诺·吉马良斯", country: "Brazil",       countryCode: "br", position: "MF", club: "Newcastle",         age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 292, name: "Gabriel Martinelli",  nameZh: "马丁内利",       country: "Brazil",       countryCode: "br", position: "FW", club: "Arsenal",           age: 24, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SPAIN (expanded) ──────────────────────────────────────────────────────
  { id: 295, name: "Rodri",               nameZh: "罗德里",         country: "Spain",        countryCode: "es", position: "MF", club: "Man. City",         age: 29, goldenBoot: false, goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 296, name: "Nico Williams",       nameZh: "尼科·威廉姆斯",  country: "Spain",        countryCode: "es", position: "FW", club: "Athletic Bilbao",   age: 23, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 297, name: "Ferran Torres",       nameZh: "费兰·托雷斯",    country: "Spain",        countryCode: "es", position: "FW", club: "Barcelona",         age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── ENGLAND (expanded) ────────────────────────────────────────────────────
  { id: 300, name: "Declan Rice",         nameZh: "德克兰·赖斯",    country: "England",      countryCode: "gb-eng", position: "MF", club: "Arsenal",       age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 301, name: "Marcus Rashford",     nameZh: "拉什福德",       country: "England",      countryCode: "gb-eng", position: "FW", club: "Man. United",   age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 302, name: "Trent Alexander-Arnold", nameZh: "特伦特·阿诺德", country: "England",    countryCode: "gb-eng", position: "DF", club: "Real Madrid",   age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── GERMANY (expanded) ────────────────────────────────────────────────────
  { id: 305, name: "Joshua Kimmich",      nameZh: "基米希",         country: "Germany",      countryCode: "de", position: "MF", club: "Bayern Munich",    age: 31, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 306, name: "Thomas Müller",       nameZh: "穆勒",           country: "Germany",      countryCode: "de", position: "FW", club: "Bayern Munich",    age: 36, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 307, name: "Niclas Füllkrug",     nameZh: "福尔克鲁格",     country: "Germany",      countryCode: "de", position: "FW", club: "West Ham",          age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── PORTUGAL (expanded) ───────────────────────────────────────────────────
  { id: 310, name: "João Félix",          nameZh: "若昂·费利克斯",  country: "Portugal",     countryCode: "pt", position: "FW", club: "Atlético Madrid",  age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 311, name: "Rúben Dias",          nameZh: "鲁本·迪亚斯",    country: "Portugal",     countryCode: "pt", position: "DF", club: "Man. City",         age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 312, name: "Pedro Neto",          nameZh: "佩德罗·内托",    country: "Portugal",     countryCode: "pt", position: "FW", club: "Chelsea",           age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── NETHERLANDS (expanded) ────────────────────────────────────────────────
  { id: 315, name: "Memphis Depay",       nameZh: "孟菲斯·德佩",    country: "Netherlands",  countryCode: "nl", position: "FW", club: "Corinthians",       age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 316, name: "Ryan Gravenberch",    nameZh: "格拉芬贝赫",     country: "Netherlands",  countryCode: "nl", position: "MF", club: "Liverpool",         age: 24, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 317, name: "Denzel Dumfries",     nameZh: "邓弗里斯",       country: "Netherlands",  countryCode: "nl", position: "DF", club: "Inter Milan",       age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── BELGIUM (expanded) ────────────────────────────────────────────────────
  { id: 320, name: "Youri Tielemans",     nameZh: "蒂勒曼斯",       country: "Belgium",      countryCode: "be", position: "MF", club: "Aston Villa",       age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 321, name: "Charles De Ketelaere", nameZh: "德科泰莱",      country: "Belgium",      countryCode: "be", position: "MF", club: "Atalanta",          age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 322, name: "Arthur Theate",       nameZh: "西特",           country: "Belgium",      countryCode: "be", position: "DF", club: "Stade Rennais",     age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── CROATIA (expanded) ────────────────────────────────────────────────────
  { id: 325, name: "Mateo Kovačić",       nameZh: "科瓦契奇",       country: "Croatia",      countryCode: "hr", position: "MF", club: "Man. City",         age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 326, name: "Joško Gvardiol",      nameZh: "瓜尔迪奥尔",     country: "Croatia",      countryCode: "hr", position: "DF", club: "Man. City",         age: 24, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 327, name: "Bruno Petković",      nameZh: "佩特科维奇",     country: "Croatia",      countryCode: "hr", position: "FW", club: "Dinamo Zagreb",     age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── MOROCCO (expanded) ────────────────────────────────────────────────────
  { id: 330, name: "Azzedine Ounahi",     nameZh: "乌纳希",         country: "Morocco",      countryCode: "ma", position: "MF", club: "Marseille",         age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 331, name: "Noussair Mazraoui",   nameZh: "马兹劳伊",       country: "Morocco",      countryCode: "ma", position: "DF", club: "Man. United",       age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 332, name: "Walid Cheddira",      nameZh: "谢迪拉",         country: "Morocco",      countryCode: "ma", position: "FW", club: "Parma",             age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SENEGAL (expanded) ────────────────────────────────────────────────────
  { id: 335, name: "Pape Matar Sarr",     nameZh: "帕普·马塔尔·萨尔", country: "Senegal",    countryCode: "sn", position: "MF", club: "Tottenham",         age: 23, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 336, name: "Nicolas Jackson",     nameZh: "尼古拉斯·杰克逊", country: "Senegal",     countryCode: "sn", position: "FW", club: "Chelsea",           age: 24, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 337, name: "Mikayil Faye",        nameZh: "米卡伊尔·法耶",  country: "Senegal",      countryCode: "sn", position: "DF", club: "Barcelona",         age: 21, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: true  },

  // ── USA (expanded) ────────────────────────────────────────────────────────
  { id: 340, name: "Tyler Adams",         nameZh: "泰勒·亚当斯",    country: "USA",          countryCode: "us", position: "MF", club: "Bournemouth",       age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 341, name: "Weston McKennie",     nameZh: "麦肯尼",         country: "USA",          countryCode: "us", position: "MF", club: "Juventus",          age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 342, name: "Sergiño Dest",        nameZh: "德斯特",         country: "USA",          countryCode: "us", position: "DF", club: "PSV",               age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── MEXICO (expanded) ─────────────────────────────────────────────────────
  { id: 345, name: "Henry Martín",        nameZh: "亨利·马丁",      country: "Mexico",       countryCode: "mx", position: "FW", club: "Club América",      age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 346, name: "Roberto Alvarado",    nameZh: "阿尔瓦拉多",     country: "Mexico",       countryCode: "mx", position: "MF", club: "Chivas",            age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 347, name: "Raúl Jiménez",        nameZh: "希门尼斯",       country: "Mexico",       countryCode: "mx", position: "FW", club: "Fulham",            age: 35, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── URUGUAY (expanded) ────────────────────────────────────────────────────
  { id: 350, name: "Ronald Araújo",       nameZh: "罗纳德·阿劳霍",  country: "Uruguay",      countryCode: "uy", position: "DF", club: "Barcelona",         age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 351, name: "Mathias Olivera",     nameZh: "奥利维拉",       country: "Uruguay",      countryCode: "uy", position: "DF", club: "Napoli",            age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 352, name: "Brian Rodríguez",     nameZh: "布莱恩·罗德里格斯", country: "Uruguay",   countryCode: "uy", position: "FW", club: "Pachuca",           age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── COLOMBIA (expanded) ───────────────────────────────────────────────────
  { id: 355, name: "Richard Ríos",        nameZh: "理查德·里奥斯",  country: "Colombia",     countryCode: "co", position: "MF", club: "Palmeiras",         age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 356, name: "Jhon Durán",          nameZh: "何恩·杜兰",      country: "Colombia",     countryCode: "co", position: "FW", club: "Aston Villa",       age: 22, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 357, name: "Daniel Muñoz",        nameZh: "丹尼尔·穆尼奥斯", country: "Colombia",    countryCode: "co", position: "DF", club: "Crystal Palace",    age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── JAPAN (expanded) ──────────────────────────────────────────────────────
  { id: 360, name: "Junya Ito",           nameZh: "伊东纯也",       country: "Japan",        countryCode: "jp", position: "FW", club: "Reims",             age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 361, name: "Ritsu Doan",          nameZh: "堂安律",         country: "Japan",        countryCode: "jp", position: "FW", club: "Freiburg",          age: 27, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 362, name: "Daichi Kamada",       nameZh: "镰田大地",       country: "Japan",        countryCode: "jp", position: "MF", club: "Crystal Palace",    age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SOUTH KOREA (expanded) ────────────────────────────────────────────────
  { id: 365, name: "Hwang Hee-chan",      nameZh: "黄喜灿",         country: "South Korea",  countryCode: "kr", position: "FW", club: "Wolves",            age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 366, name: "Hwang In-beom",       nameZh: "黄仁范",         country: "South Korea",  countryCode: "kr", position: "MF", club: "Feyenoord",         age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 367, name: "Baek Seung-ho",       nameZh: "白承皓",         country: "South Korea",  countryCode: "kr", position: "MF", club: "Jeonbuk",           age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SWITZERLAND (expanded) ────────────────────────────────────────────────
  { id: 370, name: "Manuel Akanji",       nameZh: "阿坎吉",         country: "Switzerland",  countryCode: "ch", position: "DF", club: "Man. City",         age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 371, name: "Remo Freuler",        nameZh: "弗洛伊勒",       country: "Switzerland",  countryCode: "ch", position: "MF", club: "Nottm Forest",      age: 34, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 372, name: "Zeki Amdouni",        nameZh: "阿姆杜尼",       country: "Switzerland",  countryCode: "ch", position: "FW", club: "Fenerbahçe",        age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── DENMARK (expanded) ────────────────────────────────────────────────────
  { id: 375, name: "Pierre-Emile Højbjerg", nameZh: "霍伊别尔",     country: "Denmark",      countryCode: "dk", position: "MF", club: "Marseille",         age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 376, name: "Andreas Christensen", nameZh: "克里斯滕森",     country: "Denmark",      countryCode: "dk", position: "DF", club: "Barcelona",         age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 377, name: "Joakim Maehle",       nameZh: "梅勒",           country: "Denmark",      countryCode: "dk", position: "DF", club: "Atalanta",          age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SERBIA (expanded) ─────────────────────────────────────────────────────
  { id: 380, name: "Sergej Milinković-Savić", nameZh: "米林科维奇-萨维奇", country: "Serbia", countryCode: "rs", position: "MF", club: "Al-Hilal",        age: 31, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 381, name: "Nikola Milenković",    nameZh: "米连科维奇",     country: "Serbia",       countryCode: "rs", position: "DF", club: "Nottm Forest",      age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 382, name: "Filip Kostić",         nameZh: "科斯蒂奇",       country: "Serbia",       countryCode: "rs", position: "FW", club: "Juventus",          age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── ECUADOR (expanded) ────────────────────────────────────────────────────
  { id: 385, name: "Piero Hincapié",      nameZh: "因卡皮耶",       country: "Ecuador",      countryCode: "ec", position: "DF", club: "Bayer Leverkusen",  age: 24, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 386, name: "Gonzalo Plata",       nameZh: "普拉塔",         country: "Ecuador",      countryCode: "ec", position: "FW", club: "Al-Qadsiah",        age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 387, name: "Jeremy Sarmiento",    nameZh: "萨尔米恩托",     country: "Ecuador",      countryCode: "ec", position: "FW", club: "Brighton",          age: 23, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── TÜRKIYE (expanded) ────────────────────────────────────────────────────
  { id: 390, name: "Merih Demiral",       nameZh: "德米拉尔",       country: "Türkiye",      countryCode: "tr", position: "DF", club: "Al-Qadsiah",        age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 391, name: "Ferdi Kadıoğlu",      nameZh: "卡迪奥卢",       country: "Türkiye",      countryCode: "tr", position: "DF", club: "Brighton",          age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 392, name: "Yusuf Yazıcı",        nameZh: "亚兹奇",         country: "Türkiye",      countryCode: "tr", position: "MF", club: "Lille",             age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── CANADA (expanded) ─────────────────────────────────────────────────────
  { id: 395, name: "Stephen Eustáquio",   nameZh: "尤斯塔基奥",     country: "Canada",       countryCode: "ca", position: "MF", club: "FC Porto",          age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 396, name: "Richie Laryea",       nameZh: "拉里亚",         country: "Canada",       countryCode: "ca", position: "DF", club: "Nottm Forest",      age: 31, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 397, name: "Ismaël Koné",         nameZh: "科内",           country: "Canada",       countryCode: "ca", position: "MF", club: "Marseille",         age: 24, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── AUSTRALIA (expanded) ──────────────────────────────────────────────────
  { id: 400, name: "Harry Souttar",       nameZh: "苏塔尔",         country: "Australia",    countryCode: "au", position: "DF", club: "Leicester",         age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 401, name: "Riley McGree",        nameZh: "麦格里",         country: "Australia",    countryCode: "au", position: "MF", club: "Middlesbrough",     age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 402, name: "Nestory Irankunda",   nameZh: "伊兰昆达",       country: "Australia",    countryCode: "au", position: "FW", club: "Bayern Munich",     age: 21, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: true  },

  // ── IRAN (expanded) ───────────────────────────────────────────────────────
  { id: 405, name: "Ali Gholizadeh",      nameZh: "戈利扎德",       country: "Iran",         countryCode: "ir", position: "FW", club: "Charleroi",         age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 406, name: "Saman Ghoddos",       nameZh: "戈多斯",         country: "Iran",         countryCode: "ir", position: "FW", club: "Southampton",       age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 407, name: "Ramin Rezaeian",      nameZh: "雷扎伊安",       country: "Iran",         countryCode: "ir", position: "DF", club: "Sepahan",           age: 35, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── CAMEROON (expanded) ───────────────────────────────────────────────────
  { id: 410, name: "Martin Hongla",       nameZh: "洪格拉",         country: "Cameroon",     countryCode: "cm", position: "MF", club: "Hellas Verona",     age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 411, name: "Karl Toko Ekambi",    nameZh: "托科·艾坎比",    country: "Cameroon",     countryCode: "cm", position: "FW", club: "Besiktas",          age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 412, name: "Jean-Charles Castelletto", nameZh: "卡斯泰莱托", country: "Cameroon",    countryCode: "cm", position: "DF", club: "Nantes",            age: 31, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SAUDI ARABIA (expanded) ───────────────────────────────────────────────
  { id: 415, name: "Abdullah Al-Hamdan",  nameZh: "阿尔-哈姆丹",   country: "Saudi Arabia",  countryCode: "sa", position: "FW", club: "Al-Qadsiah",        age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 416, name: "Saud Abdulhamid",     nameZh: "阿卜杜勒哈米德", country: "Saudi Arabia",  countryCode: "sa", position: "DF", club: "Roma",              age: 24, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 417, name: "Saleh Al-Shehri",     nameZh: "谢赫里",         country: "Saudi Arabia",  countryCode: "sa", position: "FW", club: "Al-Hilal",          age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── ITALY ─────────────────────────────────────────────────────────────────
  { id: 500, name: "Gianluigi Donnarumma", nameZh: "多纳鲁马",      country: "Italy",        countryCode: "it", position: "GK", club: "Paris SG",          age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 501, name: "Federico Chiesa",     nameZh: "基耶萨",         country: "Italy",        countryCode: "it", position: "FW", club: "Liverpool",         age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 502, name: "Nicolò Barella",      nameZh: "巴雷拉",         country: "Italy",        countryCode: "it", position: "MF", club: "Inter Milan",       age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 503, name: "Federico Dimarco",    nameZh: "迪马尔科",       country: "Italy",        countryCode: "it", position: "DF", club: "Inter Milan",       age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 504, name: "Sandro Tonali",       nameZh: "托纳利",         country: "Italy",        countryCode: "it", position: "MF", club: "Newcastle",         age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 505, name: "Giacomo Raspadori",   nameZh: "拉斯帕多里",     country: "Italy",        countryCode: "it", position: "FW", club: "Napoli",            age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 506, name: "Davide Frattesi",     nameZh: "弗拉泰西",       country: "Italy",        countryCode: "it", position: "MF", club: "Inter Milan",       age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 507, name: "Mateo Retegui",       nameZh: "雷特吉",         country: "Italy",        countryCode: "it", position: "FW", club: "Atalanta",          age: 27, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── POLAND ────────────────────────────────────────────────────────────────
  { id: 510, name: "Robert Lewandowski",  nameZh: "莱万多夫斯基",   country: "Poland",       countryCode: "pl", position: "FW", club: "Barcelona",         age: 37, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 511, name: "Piotr Zieliński",     nameZh: "齐林斯基",       country: "Poland",       countryCode: "pl", position: "MF", club: "Inter Milan",       age: 31, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 512, name: "Wojciech Szczęsny",   nameZh: "什琴斯尼",       country: "Poland",       countryCode: "pl", position: "GK", club: "Barcelona",         age: 36, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 513, name: "Jakub Moder",         nameZh: "莫德尔",         country: "Poland",       countryCode: "pl", position: "MF", club: "Brighton",          age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 514, name: "Karol Świderski",     nameZh: "什维德斯基",     country: "Poland",       countryCode: "pl", position: "FW", club: "Charlotte FC",      age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 515, name: "Jan Bednarek",        nameZh: "贝德纳雷克",     country: "Poland",       countryCode: "pl", position: "DF", club: "Aston Villa",       age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── NIGERIA ───────────────────────────────────────────────────────────────
  { id: 520, name: "Victor Osimhen",      nameZh: "奥斯梅恩",       country: "Nigeria",      countryCode: "ng", position: "FW", club: "Galatasaray",       age: 27, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 521, name: "Moses Simon",         nameZh: "摩西·西蒙",      country: "Nigeria",      countryCode: "ng", position: "FW", club: "Nantes",            age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 522, name: "Wilfred Ndidi",       nameZh: "恩迪迪",         country: "Nigeria",      countryCode: "ng", position: "MF", club: "Leicester",         age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 523, name: "Samuel Chukwueze",    nameZh: "楚克埃泽",       country: "Nigeria",      countryCode: "ng", position: "FW", club: "AC Milan",          age: 27, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 524, name: "Stanley Nwabali",     nameZh: "恩瓦巴利",       country: "Nigeria",      countryCode: "ng", position: "GK", club: "Chippa United",     age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 525, name: "Alex Iwobi",          nameZh: "伊沃比",         country: "Nigeria",      countryCode: "ng", position: "MF", club: "Fulham",            age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 526, name: "Cyriel Dessers",      nameZh: "德塞尔斯",       country: "Nigeria",      countryCode: "ng", position: "FW", club: "Rangers",           age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 527, name: "Calvin Bassey",       nameZh: "巴西",           country: "Nigeria",      countryCode: "ng", position: "DF", club: "Fulham",            age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── EGYPT ─────────────────────────────────────────────────────────────────
  { id: 530, name: "Mohamed Salah",       nameZh: "萨拉赫",         country: "Egypt",        countryCode: "eg", position: "FW", club: "Liverpool",         age: 33, goldenBoot: true,  goldenBall: true,  goldenGlove: false, bestYoung: false },
  { id: 531, name: "Omar Marmoush",       nameZh: "马穆什",         country: "Egypt",        countryCode: "eg", position: "FW", club: "Man. City",         age: 27, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 532, name: "Mostafa Mohamed",     nameZh: "穆斯塔法·穆罕默德", country: "Egypt",     countryCode: "eg", position: "FW", club: "Nantes",            age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 533, name: "Mohamed El-Shenawy", nameZh: "埃尔-谢纳维",    country: "Egypt",        countryCode: "eg", position: "GK", club: "Al-Ahly",           age: 37, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 534, name: "Ahmed Trezeguet",     nameZh: "特雷泽盖",       country: "Egypt",        countryCode: "eg", position: "FW", club: "Trabzonspor",       age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 535, name: "Ahmed Hegazy",        nameZh: "赫加齐",         country: "Egypt",        countryCode: "eg", position: "DF", club: "Al-Ittihad",        age: 35, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── IVORY COAST ───────────────────────────────────────────────────────────
  { id: 540, name: "Sébastien Haller",    nameZh: "哈勒尔",         country: "Ivory Coast",  countryCode: "ci", position: "FW", club: "Dortmund",          age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 541, name: "Wilfried Zaha",       nameZh: "扎哈",           country: "Ivory Coast",  countryCode: "ci", position: "FW", club: "Galatasaray",       age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 542, name: "Simon Adingra",       nameZh: "阿丁格拉",       country: "Ivory Coast",  countryCode: "ci", position: "FW", club: "Brighton",          age: 24, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 543, name: "Franck Kessié",       nameZh: "凯西",           country: "Ivory Coast",  countryCode: "ci", position: "MF", club: "Al-Ahli",           age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 544, name: "Mory Doucouré",       nameZh: "杜古雷",         country: "Ivory Coast",  countryCode: "ci", position: "MF", club: "Lens",              age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 545, name: "Ibrahim Sangaré",     nameZh: "桑加雷",         country: "Ivory Coast",  countryCode: "ci", position: "MF", club: "Nottm Forest",      age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 546, name: "Yahia Fofana",        nameZh: "福法纳",         country: "Ivory Coast",  countryCode: "ci", position: "GK", club: "Chelsea",           age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },

  // ── ALGERIA ───────────────────────────────────────────────────────────────
  { id: 550, name: "Riyad Mahrez",        nameZh: "马赫雷斯",       country: "Algeria",      countryCode: "dz", position: "FW", club: "Al-Ahli",           age: 35, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 551, name: "Saïd Benrahma",       nameZh: "本拉赫马",       country: "Algeria",      countryCode: "dz", position: "FW", club: "OGC Nice",          age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 552, name: "Ismaël Bennacer",     nameZh: "本纳塞尔",       country: "Algeria",      countryCode: "dz", position: "MF", club: "AC Milan",          age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 553, name: "Mohamed Amoura",      nameZh: "阿穆拉",         country: "Algeria",      countryCode: "dz", position: "FW", club: "Stuttgart",         age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 554, name: "Amine Gouiri",        nameZh: "古里",           country: "Algeria",      countryCode: "dz", position: "FW", club: "Rennes",            age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 555, name: "Youcef Atal",         nameZh: "阿塔尔",         country: "Algeria",      countryCode: "dz", position: "DF", club: "OGC Nice",          age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 556, name: "Houssem Aouar",       nameZh: "阿瓦尔",         country: "Algeria",      countryCode: "dz", position: "MF", club: "Roma",              age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── GHANA ─────────────────────────────────────────────────────────────────
  { id: 560, name: "Thomas Partey",       nameZh: "帕蒂",           country: "Ghana",        countryCode: "gh", position: "MF", club: "Arsenal",           age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 561, name: "Mohammed Kudus",      nameZh: "库杜斯",         country: "Ghana",        countryCode: "gh", position: "FW", club: "West Ham",          age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 562, name: "Iñaki Williams",      nameZh: "伊纳基·威廉姆斯", country: "Ghana",       countryCode: "gh", position: "FW", club: "Athletic Bilbao",   age: 31, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 563, name: "Abdul Fatawu",        nameZh: "法塔吾",         country: "Ghana",        countryCode: "gh", position: "FW", club: "Leicester",         age: 23, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 564, name: "Lawrence Ati-Zigi",   nameZh: "阿提-齐吉",      country: "Ghana",        countryCode: "gh", position: "GK", club: "Sion",              age: 29, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 565, name: "Daniel-Kofi Kyereh",  nameZh: "凯雷",           country: "Ghana",        countryCode: "gh", position: "FW", club: "Freiburg",          age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 566, name: "Elisha Owusu",        nameZh: "欧苏",           country: "Ghana",        countryCode: "gh", position: "MF", club: "AZ Alkmaar",        age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── AUSTRIA ───────────────────────────────────────────────────────────────
  { id: 570, name: "David Alaba",         nameZh: "阿拉巴",         country: "Austria",      countryCode: "at", position: "DF", club: "Real Madrid",       age: 33, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 571, name: "Marcel Sabitzer",     nameZh: "萨比策尔",       country: "Austria",      countryCode: "at", position: "MF", club: "Dortmund",          age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 572, name: "Michael Gregoritsch", nameZh: "格雷格里奇",     country: "Austria",      countryCode: "at", position: "FW", club: "Freiburg",          age: 32, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 573, name: "Florian Grillitsch",  nameZh: "格里利奇",       country: "Austria",      countryCode: "at", position: "MF", club: "Ajax",              age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 574, name: "Patrick Pentz",       nameZh: "彭茨",           country: "Austria",      countryCode: "at", position: "GK", club: "Bayer Leverkusen",  age: 28, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 575, name: "Christoph Baumgartner", nameZh: "鲍姆加特纳",   country: "Austria",      countryCode: "at", position: "MF", club: "RB Leipzig",        age: 26, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 576, name: "Marko Arnautović",    nameZh: "阿诺托维奇",     country: "Austria",      countryCode: "at", position: "FW", club: "Inter Milan",       age: 37, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── SCOTLAND ──────────────────────────────────────────────────────────────
  { id: 580, name: "Andrew Robertson",    nameZh: "罗伯逊",         country: "Scotland",     countryCode: "gb-sct", position: "DF", club: "Liverpool",     age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 581, name: "Scott McTominay",     nameZh: "麦克托米奈",     country: "Scotland",     countryCode: "gb-sct", position: "MF", club: "Napoli",        age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 582, name: "Ryan Christie",       nameZh: "克里斯蒂",       country: "Scotland",     countryCode: "gb-sct", position: "MF", club: "Bournemouth",   age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 583, name: "Callum McGregor",     nameZh: "麦格雷戈",       country: "Scotland",     countryCode: "gb-sct", position: "MF", club: "Celtic",        age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 584, name: "Angus Gunn",          nameZh: "安格斯·冈",      country: "Scotland",     countryCode: "gb-sct", position: "GK", club: "Norwich",       age: 30, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 585, name: "Lawrence Shankland",  nameZh: "尚克兰",         country: "Scotland",     countryCode: "gb-sct", position: "FW", club: "Hearts",        age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 586, name: "Che Adams",           nameZh: "切·亚当斯",      country: "Scotland",     countryCode: "gb-sct", position: "FW", club: "Southampton",   age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── UKRAINE ───────────────────────────────────────────────────────────────
  { id: 590, name: "Andriy Lunin",        nameZh: "卢宁",           country: "Ukraine",      countryCode: "ua", position: "GK", club: "Real Madrid",       age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 591, name: "Mykhailo Mudryk",     nameZh: "穆德里克",       country: "Ukraine",      countryCode: "ua", position: "FW", club: "Chelsea",           age: 25, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 592, name: "Oleksandr Zinchenko", nameZh: "辛琴科",         country: "Ukraine",      countryCode: "ua", position: "DF", club: "Arsenal",           age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 593, name: "Viktor Tsygankov",    nameZh: "齐干科夫",       country: "Ukraine",      countryCode: "ua", position: "FW", club: "Girona",            age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 594, name: "Artem Dovbyk",        nameZh: "多夫比克",       country: "Ukraine",      countryCode: "ua", position: "FW", club: "Roma",              age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 595, name: "Mykola Shaparenko",   nameZh: "沙帕连科",       country: "Ukraine",      countryCode: "ua", position: "MF", club: "Dynamo Kyiv",       age: 27, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 596, name: "Georgiy Sudakov",     nameZh: "苏达科夫",       country: "Ukraine",      countryCode: "ua", position: "MF", club: "Shakhtar",          age: 24, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── VENEZUELA ─────────────────────────────────────────────────────────────
  { id: 600, name: "Yangel Herrera",      nameZh: "扬赫尔·埃雷拉",  country: "Venezuela",    countryCode: "ve", position: "MF", club: "Girona",            age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 601, name: "Josef Martínez",      nameZh: "约瑟夫·马丁内斯", country: "Venezuela",   countryCode: "ve", position: "FW", club: "Inter Miami",       age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 602, name: "Yeferson Soteldo",    nameZh: "索特尔多",       country: "Venezuela",    countryCode: "ve", position: "FW", club: "Santos",            age: 28, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 603, name: "Darwin Machís",       nameZh: "马奇斯",         country: "Venezuela",    countryCode: "ve", position: "FW", club: "Granada",           age: 33, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 604, name: "Wuilker Faríñez",     nameZh: "法里涅斯",       country: "Venezuela",    countryCode: "ve", position: "GK", club: "Millonarios",       age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 605, name: "Adalberto Peñaranda", nameZh: "佩尼亚兰达",     country: "Venezuela",    countryCode: "ve", position: "FW", club: "Udinese",           age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── PARAGUAY ──────────────────────────────────────────────────────────────
  { id: 610, name: "Miguel Almirón",      nameZh: "阿尔米龙",       country: "Paraguay",     countryCode: "py", position: "MF", club: "Newcastle",         age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 611, name: "Antonio Sanabria",    nameZh: "萨纳布里亚",     country: "Paraguay",     countryCode: "py", position: "FW", club: "Torino",            age: 30, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 612, name: "Junior Alonso",       nameZh: "胡尼奥尔·阿隆索", country: "Paraguay",    countryCode: "py", position: "DF", club: "Atletico Mineiro",  age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 613, name: "Gustavo Gómez",       nameZh: "古斯塔沃·戈麦斯", country: "Paraguay",    countryCode: "py", position: "DF", club: "Palmeiras",         age: 32, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 614, name: "Julio Enciso",        nameZh: "胡利奥·恩西索",  country: "Paraguay",     countryCode: "py", position: "FW", club: "Brighton",          age: 22, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: true  },
  { id: 615, name: "Mathías Villasanti",  nameZh: "比利亚桑蒂",     country: "Paraguay",     countryCode: "py", position: "MF", club: "Grêmio",            age: 28, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── CHILE ─────────────────────────────────────────────────────────────────
  { id: 620, name: "Alexis Sánchez",      nameZh: "亚历克西斯·桑切斯", country: "Chile",    countryCode: "cl", position: "FW", club: "Udinese",           age: 37, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 621, name: "Ben Brereton Díaz",   nameZh: "布雷雷顿·迪亚斯", country: "Chile",      countryCode: "cl", position: "FW", club: "Villarreal",        age: 26, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 622, name: "Paulo Díaz",          nameZh: "保罗·迪亚斯",    country: "Chile",        countryCode: "cl", position: "DF", club: "River Plate",       age: 29, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 623, name: "Brayan Cortés",       nameZh: "科尔特斯",       country: "Chile",        countryCode: "cl", position: "GK", club: "Colo-Colo",         age: 30, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 624, name: "Damián Pizarro",      nameZh: "达米安·皮萨罗",  country: "Chile",        countryCode: "cl", position: "FW", club: "Udinese",           age: 22, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 625, name: "Darío Osorio",        nameZh: "达里奥·奥索里奥", country: "Chile",       countryCode: "cl", position: "FW", club: "Midtjylland",       age: 22, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── QATAR ─────────────────────────────────────────────────────────────────
  { id: 630, name: "Akram Afif",          nameZh: "阿基夫",         country: "Qatar",        countryCode: "qa", position: "FW", club: "Al-Sadd",           age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 631, name: "Almoez Ali",          nameZh: "阿尔莫兹·阿里",  country: "Qatar",        countryCode: "qa", position: "FW", club: "Al-Duhail",         age: 29, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 632, name: "Hassan Al-Haydos",    nameZh: "阿尔-海多斯",    country: "Qatar",        countryCode: "qa", position: "MF", club: "Al-Sadd",           age: 35, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 633, name: "Meshaal Barsham",     nameZh: "巴沙姆",         country: "Qatar",        countryCode: "qa", position: "GK", club: "Al-Sadd",           age: 27, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 634, name: "Pedro Miguel",        nameZh: "佩德罗·米格尔",  country: "Qatar",        countryCode: "qa", position: "DF", club: "Al-Rayyan",         age: 31, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 635, name: "Tarek Salman",        nameZh: "塔雷克·萨勒曼",  country: "Qatar",        countryCode: "qa", position: "DF", club: "Al-Sadd",           age: 30, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },

  // ── NEW ZEALAND ───────────────────────────────────────────────────────────
  { id: 640, name: "Chris Wood",          nameZh: "克里斯·伍德",    country: "New Zealand",  countryCode: "nz", position: "FW", club: "Nottm Forest",      age: 34, goldenBoot: true,  goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 641, name: "Clayton Lewis",       nameZh: "克莱顿·刘易斯",  country: "New Zealand",  countryCode: "nz", position: "MF", club: "Club Brugge",       age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 642, name: "Liberato Cacace",     nameZh: "卡卡斯",         country: "New Zealand",  countryCode: "nz", position: "DF", club: "Empoli",            age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
  { id: 643, name: "Stefan Marinovic",    nameZh: "马里诺维奇",     country: "New Zealand",  countryCode: "nz", position: "GK", club: "Wisla Krakow",      age: 35, goldenBoot: false, goldenBall: false, goldenGlove: true,  bestYoung: false },
  { id: 644, name: "Elijah Just",         nameZh: "以利亚·贾斯特",  country: "New Zealand",  countryCode: "nz", position: "MF", club: "Hammarby",          age: 25, goldenBoot: false, goldenBall: false, goldenGlove: false, bestYoung: false },
];

// ── Helper functions ────────────────────────────────────────────────────────

export function getPlayersByAward(award: "goldenBoot" | "goldenBall" | "goldenGlove" | "bestYoung"): Player[] {
  return PLAYERS.filter((p) => p[award]).sort((a, b) => a.name.localeCompare(b.name));
}

export function getPlayersByCountry(country: string): Player[] {
  return PLAYERS.filter((p) => p.country === country);
}

export function getPlayerById(id: number): Player | undefined {
  return PLAYERS.find((p) => p.id === id);
}

export const AWARD_META = {
  goldenBoot: {
    key:    "goldenBoot" as const,
    icon:   "👟",
    nameZh: "金靴奖",
    name:   "Golden Boot",
    descZh: "本届世界杯进球最多的球员",
    desc:   "Top scorer of the tournament",
    color:  "#FFD700",
  },
  goldenBall: {
    key:    "goldenBall" as const,
    icon:   "🏆",
    nameZh: "金球奖",
    name:   "Golden Ball",
    descZh: "本届世界杯最佳球员",
    desc:   "Best player of the tournament",
    color:  "#FFD700",
  },
  goldenGlove: {
    key:    "goldenGlove" as const,
    icon:   "🧤",
    nameZh: "金手套奖",
    name:   "Golden Glove",
    descZh: "本届世界杯最佳门将",
    desc:   "Best goalkeeper of the tournament",
    color:  "#60A5FA",
  },
  bestYoung: {
    key:    "bestYoung" as const,
    icon:   "🌟",
    nameZh: "最佳新人奖",
    name:   "Best Young Player",
    descZh: "本届世界杯最佳年轻球员（2004年后出生）",
    desc:   "Best young player born on/after Jan 1, 2004",
    color:  "#34D399",
  },
} as const;

export type AwardKey = keyof typeof AWARD_META;

// ── DB ↔ TS key converters ───────────────────────────────────────────────────
const TO_DB: Record<AwardKey, string> = {
  goldenBoot:  "golden_boot",
  goldenBall:  "golden_ball",
  goldenGlove: "golden_glove",
  bestYoung:   "best_young",
};
const FROM_DB: Record<string, AwardKey> = {
  golden_boot:  "goldenBoot",
  golden_ball:  "goldenBall",
  golden_glove: "goldenGlove",
  best_young:   "bestYoung",
};
export const awardKeyToDb  = (k: AwardKey): string  => TO_DB[k];
export const dbToAwardKey  = (s: string):   AwardKey => FROM_DB[s] ?? "goldenBoot";
