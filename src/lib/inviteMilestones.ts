export interface Milestone {
  count:    number;   // invites required
  gcBonus:  number;   // one-time bonus GC
  label:    string;   // badge label (en)
  labelZh:  string;   // badge label (zh)
  emoji:    string;
  color:    string;   // Tailwind text color
  bg:       string;   // Tailwind bg color
}

export const MILESTONES: Milestone[] = [
  { count: 1,  gcBonus: 0,         label: "First Invite",   labelZh: "首次邀请",   emoji: "🌱", color: "text-green-400",  bg: "bg-green-400/10"  },
  { count: 3,  gcBonus: 50_000,    label: "Recruiter",      labelZh: "招募者",     emoji: "🥉", color: "text-orange-400", bg: "bg-orange-400/10" },
  { count: 10, gcBonus: 200_000,   label: "Ambassador",     labelZh: "大使",       emoji: "🥈", color: "text-blue-400",   bg: "bg-blue-400/10"   },
  { count: 25, gcBonus: 500_000,   label: "Champion",       labelZh: "冠军推手",   emoji: "🥇", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { count: 50, gcBonus: 1_000_000, label: "Legend",         labelZh: "传奇推手",   emoji: "👑", color: "text-purple-400", bg: "bg-purple-400/10" },
];

/** Per-invite flat reward (both sides) */
export const PER_INVITE_GC = 500_000;

/** Find the next unclaimed milestone given current invite count */
export function nextMilestone(inviteCount: number): Milestone | null {
  return MILESTONES.find((m) => m.count > inviteCount && m.gcBonus > 0) ?? null;
}

/** All milestones at or below current invite count */
export function reachedMilestones(inviteCount: number): Milestone[] {
  return MILESTONES.filter((m) => m.count <= inviteCount);
}

export function formatGcShort(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return String(n);
}
