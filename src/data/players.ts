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
