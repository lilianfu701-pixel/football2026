// Wealth Levels (based on GC balance)
export interface LevelInfo {
  name: string;
  nameZh: string;
  minGc: number;
  maxGc: number | null;
  dailyFreeGc: number;
  color: string;
  bgColor: string;
  icon: string;
  iconUrl: string;
  rank: number;
}

export const WEALTH_LEVELS: LevelInfo[] = [
  {
    rank: 0,
    name: "Beggar",
    nameZh: "乞丐",
    minGc: -Infinity,
    maxGc: -1,
    dailyFreeGc: 10_000,
    color: "#A16207",
    bgColor: "#292524",
    icon: "🪣",
    iconUrl: "/icons/levels/badge_lv_0.png",
  },
  {
    rank: 1,
    name: "Common",
    nameZh: "平民",
    minGc: 0,
    maxGc: 999_999,
    dailyFreeGc: 30_000,
    color: "#9CA3AF",
    bgColor: "#374151",
    icon: "🥉",
    iconUrl: "/icons/levels/badge_lv_1.png",
  },
  {
    rank: 2,
    name: "Prosper",
    nameZh: "小康",
    minGc: 1_000_000,
    maxGc: 9_999_999,
    dailyFreeGc: 40_000,
    color: "#6EE7B7",
    bgColor: "#064E3B",
    icon: "🌱",
    iconUrl: "/icons/levels/badge_lv_2.png",
  },
  {
    rank: 3,
    name: "Wealthy",
    nameZh: "富裕",
    minGc: 10_000_000,
    maxGc: 99_999_999,
    dailyFreeGc: 60_000,
    color: "#34D399",
    bgColor: "#065F46",
    icon: "💰",
    iconUrl: "/icons/levels/badge_lv_3.png",
  },
  {
    rank: 4,
    name: "Noble",
    nameZh: "豪绅",
    minGc: 100_000_000,
    maxGc: 999_999_999,
    dailyFreeGc: 100_000,
    color: "#60A5FA",
    bgColor: "#1E3A8A",
    icon: "👑",
    iconUrl: "/icons/levels/badge_lv_4.png",
  },
  {
    rank: 5,
    name: "Tycoon",
    nameZh: "富豪",
    minGc: 1_000_000_000,
    maxGc: 9_999_999_999,
    dailyFreeGc: 120_000,
    color: "#818CF8",
    bgColor: "#312E81",
    icon: "🏰",
    iconUrl: "/icons/levels/badge_lv_5.png",
  },
  {
    rank: 6,
    name: "Magnate",
    nameZh: "财阀",
    minGc: 10_000_000_000,
    maxGc: 99_999_999_999,
    dailyFreeGc: 150_000,
    color: "#C084FC",
    bgColor: "#4C1D95",
    icon: "💎",
    iconUrl: "/icons/levels/badge_lv_6.png",
  },
  {
    rank: 7,
    name: "Elite",
    nameZh: "巨富",
    minGc: 100_000_000_000,
    maxGc: 999_999_999_999,
    dailyFreeGc: 170_000,
    color: "#F472B6",
    bgColor: "#831843",
    icon: "🔱",
    iconUrl: "/icons/levels/badge_lv_7.png",
  },
  {
    rank: 8,
    name: "Imperial",
    nameZh: "财尊",
    minGc: 1_000_000_000_000,
    maxGc: 499_999_999_999_999,
    dailyFreeGc: 190_000,
    color: "#FB923C",
    bgColor: "#7C2D12",
    icon: "⚜️",
    iconUrl: "/icons/levels/badge_lv_8.png",
  },
  {
    rank: 9,
    name: "Supreme",
    nameZh: "至尊",
    minGc: 500_000_000_000_000,
    maxGc: null,
    dailyFreeGc: 200_000,
    color: "#FFD700",
    bgColor: "#78350F",
    icon: "🌟",
    iconUrl: "/icons/levels/badge_lv_9.png",
  },
];

// Honor Levels (based on honor points)
export interface HonorLevelInfo {
  rank: number;
  name: string;
  nameZh: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  icon: string;
  iconUrl: string;
}

export const HONOR_LEVELS: HonorLevelInfo[] = [
  { rank: 1, name: "Rookie",   nameZh: "新人",   minPoints: 0,     maxPoints: 99,    color: "#9CA3AF", icon: "⚽", iconUrl: "/icons/levels/1.jpg" },
  { rank: 2, name: "Fan",      nameZh: "球迷",   minPoints: 100,   maxPoints: 499,   color: "#6EE7B7", icon: "🏅", iconUrl: "/icons/levels/2.jpg" },
  { rank: 3, name: "Analyst",  nameZh: "分析师", minPoints: 500,   maxPoints: 1999,  color: "#34D399", icon: "📊", iconUrl: "/icons/levels/3.jpg" },
  { rank: 4, name: "Expert",   nameZh: "专家",   minPoints: 2000,  maxPoints: 4999,  color: "#60A5FA", icon: "🔍", iconUrl: "/icons/levels/4.jpg" },
  { rank: 5, name: "Prophet",  nameZh: "先知",   minPoints: 5000,  maxPoints: 9999,  color: "#818CF8", icon: "🔮", iconUrl: "/icons/levels/5.jpg" },
  { rank: 6, name: "Oracle",   nameZh: "神谕",   minPoints: 10000, maxPoints: 24999, color: "#C084FC", icon: "🌙", iconUrl: "/icons/levels/6.jpg" },
  { rank: 7, name: "Legend",   nameZh: "传奇",   minPoints: 25000, maxPoints: 49999, color: "#F472B6", icon: "⭐", iconUrl: "/icons/levels/7.jpg" },
  { rank: 8, name: "Champion", nameZh: "冠军",   minPoints: 50000, maxPoints: 149999,color: "#FB923C", icon: "🏆", iconUrl: "/icons/levels/8.jpg" },
  { rank: 9, name: "GOAT",     nameZh: "球神",   minPoints: 150000,maxPoints: null,  color: "#FFD700", icon: "🐐", iconUrl: "/icons/levels/9.jpg" },
];

export function getWealthLevel(gcBalance: number): LevelInfo {
  if (gcBalance < 0) return WEALTH_LEVELS[0]; // 乞丐：仅负GC
  for (let i = WEALTH_LEVELS.length - 1; i >= 1; i--) {
    if (gcBalance >= WEALTH_LEVELS[i].minGc) {
      return WEALTH_LEVELS[i];
    }
  }
  return WEALTH_LEVELS[1];
}

export function getHonorLevel(points: number): HonorLevelInfo {
  for (let i = HONOR_LEVELS.length - 1; i >= 0; i--) {
    if (points >= HONOR_LEVELS[i].minPoints) {
      return HONOR_LEVELS[i];
    }
  }
  return HONOR_LEVELS[0];
}

export function getNextWealthLevel(gcBalance: number): LevelInfo | null {
  const current = getWealthLevel(gcBalance);
  const next = WEALTH_LEVELS.find((l) => l.rank === current.rank + 1);
  return next ?? null;
}

export function getWealthProgress(gcBalance: number): number {
  const current = getWealthLevel(gcBalance);
  if (current.rank === 0) {
    if (gcBalance >= 0) return Math.min(100, gcBalance * 100);
    return 0;
  }
  if (!current.maxGc) return 100;
  const progress =
    ((gcBalance - current.minGc) / (current.maxGc - current.minGc)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function getHonorProgress(points: number): number {
  const current = getHonorLevel(points);
  if (!current.maxPoints) return 100;
  const progress =
    ((points - current.minPoints) / (current.maxPoints - current.minPoints)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// Format large GC numbers
export function formatGc(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return (amount / 1_000_000_000_000).toFixed(2) + "T";
  }
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(2) + "B";
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + "M";
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + "K";
  }
  return amount.toLocaleString();
}
