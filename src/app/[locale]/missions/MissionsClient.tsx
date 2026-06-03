"use client";

import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserStats {
  todayCheckin:     boolean;
  todayBetCount:    number;
  totalBets:        number;
  wonBets:          number;
  consecutiveWins:  number;
  maxStreak:        number;
  currentStreak:    number;
  inviteCount:      number;
  postCount:        number;
  gcBalance:        number;
}

interface DailyTask {
  id:       string;
  emoji:    string;
  labelZh:  string;
  labelEn:  string;
  descZh:   string;
  descEn:   string;
  done:     boolean;
  linkHref: string;
}

interface Achievement {
  id:            string;
  emoji:         string;
  nameZh:        string;
  nameEn:        string;
  descZh:        string;
  descEn:        string;
  unlocked:      boolean;
  progress:      number;  // 0–100
  progressLabel: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function pct(v: number, max: number) {
  return Math.min(100, Math.round((v / max) * 100));
}

function buildDailyTasks(stats: UserStats, locale: string): DailyTask[] {
  return [
    {
      id: "checkin",
      emoji: "📅",
      labelZh: "每日签到",
      labelEn: "Daily Check-in",
      descZh: "每天签到免费领取 GC",
      descEn: "Check in daily to receive free GC",
      done: stats.todayCheckin,
      linkHref: `/${locale}/profile/checkin`,
    },
    {
      id: "bet",
      emoji: "⚽",
      labelZh: "今日预测",
      labelEn: "Today's Prediction",
      descZh: "今天至少完成 1 次预测",
      descEn: "Make at least 1 prediction today",
      done: stats.todayBetCount > 0,
      linkHref: `/${locale}/matches`,
    },
  ];
}

function buildAchievements(stats: UserStats): Achievement[] {
  const s = stats;
  return [
    {
      id: "first_bet",
      emoji: "🎯",
      nameZh: "初出茅庐",
      nameEn: "First Kick",
      descZh: "完成第 1 次比赛预测",
      descEn: "Complete your first match prediction",
      unlocked: s.totalBets >= 1,
      progress: pct(s.totalBets, 1),
      progressLabel: `${Math.min(s.totalBets, 1)}/1`,
    },
    {
      id: "ten_bets",
      emoji: "🏅",
      nameZh: "坚持者",
      nameEn: "Dedicated",
      descZh: "累计完成 10 次预测",
      descEn: "Make 10 total predictions",
      unlocked: s.totalBets >= 10,
      progress: pct(s.totalBets, 10),
      progressLabel: `${Math.min(s.totalBets, 10)}/10`,
    },
    {
      id: "fifty_bets",
      emoji: "🏆",
      nameZh: "预测专家",
      nameEn: "Expert Predictor",
      descZh: "累计完成 50 次预测",
      descEn: "Make 50 total predictions",
      unlocked: s.totalBets >= 50,
      progress: pct(s.totalBets, 50),
      progressLabel: `${Math.min(s.totalBets, 50)}/50`,
    },
    {
      id: "first_win",
      emoji: "✅",
      nameZh: "首战告捷",
      nameEn: "First Victory",
      descZh: "第 1 次预测成功",
      descEn: "Win your first prediction",
      unlocked: s.wonBets >= 1,
      progress: pct(s.wonBets, 1),
      progressLabel: `${Math.min(s.wonBets, 1)}/1`,
    },
    {
      id: "three_streak",
      emoji: "🔥",
      nameZh: "连胜之星",
      nameEn: "Win Streak",
      descZh: "连续 3 次预测正确",
      descEn: "Win 3 predictions in a row",
      unlocked: s.consecutiveWins >= 3,
      progress: pct(s.consecutiveWins, 3),
      progressLabel: `${Math.min(s.consecutiveWins, 3)}/3`,
    },
    {
      id: "five_streak",
      emoji: "⚡",
      nameZh: "全垒打",
      nameEn: "Grand Slam",
      descZh: "连续 5 次预测正确",
      descEn: "Win 5 predictions in a row",
      unlocked: s.consecutiveWins >= 5,
      progress: pct(s.consecutiveWins, 5),
      progressLabel: `${Math.min(s.consecutiveWins, 5)}/5`,
    },
    {
      id: "gc_1m",
      emoji: "💰",
      nameZh: "GC 新贵",
      nameEn: "GC Rising Star",
      descZh: "GC 余额达到 100 万",
      descEn: "Reach 1,000,000 GC balance",
      unlocked: s.gcBalance >= 1_000_000,
      progress: pct(s.gcBalance, 1_000_000),
      progressLabel: `${fmt(Math.min(s.gcBalance, 1_000_000))}/1M`,
    },
    {
      id: "gc_10m",
      emoji: "💎",
      nameZh: "GC 富豪",
      nameEn: "GC Tycoon",
      descZh: "GC 余额达到 1000 万",
      descEn: "Reach 10,000,000 GC balance",
      unlocked: s.gcBalance >= 10_000_000,
      progress: pct(s.gcBalance, 10_000_000),
      progressLabel: `${fmt(Math.min(s.gcBalance, 10_000_000))}/10M`,
    },
    {
      id: "invite_5",
      emoji: "📢",
      nameZh: "传道师",
      nameEn: "Evangelist",
      descZh: "成功邀请 5 位好友",
      descEn: "Successfully invite 5 friends",
      unlocked: s.inviteCount >= 5,
      progress: pct(s.inviteCount, 5),
      progressLabel: `${Math.min(s.inviteCount, 5)}/5`,
    },
    {
      id: "invite_20",
      emoji: "📣",
      nameZh: "布道者",
      nameEn: "Ambassador",
      descZh: "成功邀请 20 位好友",
      descEn: "Successfully invite 20 friends",
      unlocked: s.inviteCount >= 20,
      progress: pct(s.inviteCount, 20),
      progressLabel: `${Math.min(s.inviteCount, 20)}/20`,
    },
    {
      id: "post_10",
      emoji: "📝",
      nameZh: "论坛达人",
      nameEn: "Forum Star",
      descZh: "在论坛发布 10 篇帖子",
      descEn: "Publish 10 forum posts",
      unlocked: s.postCount >= 10,
      progress: pct(s.postCount, 10),
      progressLabel: `${Math.min(s.postCount, 10)}/10`,
    },
    {
      id: "streak_7",
      emoji: "🌙",
      nameZh: "连签七日",
      nameEn: "Seven-Day Streak",
      descZh: "连续签到 7 天",
      descEn: "Check in 7 days in a row",
      unlocked: s.maxStreak >= 7,
      progress: pct(s.maxStreak, 7),
      progressLabel: `${Math.min(s.maxStreak, 7)}/7`,
    },
    {
      id: "streak_30",
      emoji: "🌟",
      nameZh: "签到达人",
      nameEn: "Consistency King",
      descZh: "连续签到 30 天",
      descEn: "Check in 30 days in a row",
      unlocked: s.maxStreak >= 30,
      progress: pct(s.maxStreak, 30),
      progressLabel: `${Math.min(s.maxStreak, 30)}/30`,
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  locale:  string;
  userId:  string | null;
  stats:   UserStats | null;
}

export default function MissionsClient({ locale, userId, stats }: Props) {
  const zh = locale === "zh";

  if (!userId || !stats) {
    return (
      <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-white">🎖️ {zh ? "任务中心" : "Missions"}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {zh ? "完成任务解锁成就，提升 GC 等级" : "Complete tasks and unlock achievements"}
          </p>
        </div>
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 text-center">
          <p className="text-gray-400 text-sm mb-4">
            {zh ? "登录后查看你的任务进度和成就" : "Log in to view your missions and achievements"}
          </p>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-6 py-2.5 rounded-xl text-sm"
          >
            {zh ? "立即登录" : "Log In"}
          </Link>
        </div>
      </div>
    );
  }

  const dailyTasks    = buildDailyTasks(stats, locale);
  const achievements  = buildAchievements(stats);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const todayDone     = dailyTasks.filter((t) => t.done).length;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">🎖️ {zh ? "任务中心" : "Missions"}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {zh ? "完成任务解锁成就，提升 GC 等级" : "Complete tasks and unlock achievements"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-[#FFD700]">{unlockedCount}/{achievements.length}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            {zh ? "成就解锁" : "Achievements"}
          </p>
        </div>
      </div>

      {/* ── Daily Tasks ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-white">
            📋 {zh ? "今日任务" : "Daily Tasks"}
          </h2>
          <span className="text-xs text-gray-500">
            {todayDone}/{dailyTasks.length} {zh ? "完成" : "done"}
          </span>
        </div>
        <div className="space-y-2">
          {dailyTasks.map((task) => (
            <Link
              key={task.id}
              href={task.linkHref}
              className={`flex items-center gap-4 bg-[#0F2040] border rounded-xl p-4 transition-all hover:border-[#FFD700]/30 ${
                task.done ? "border-green-500/25 bg-green-500/5" : "border-[#1E3A5F]"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                task.done ? "bg-green-500/20" : "bg-[#1E3A5F]"
              }`}>
                {task.done ? "✅" : task.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${task.done ? "text-green-400" : "text-white"}`}>
                  {zh ? task.labelZh : task.labelEn}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {zh ? task.descZh : task.descEn}
                </p>
              </div>
              {task.done ? (
                <span className="text-xs text-green-400 font-bold shrink-0">
                  {zh ? "完成" : "Done"}
                </span>
              ) : (
                <span className="text-xs text-[#FFD700] font-bold shrink-0">
                  {zh ? "去完成 →" : "Go →"}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Achievements ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-white">
            🏅 {zh ? "成就徽章" : "Achievements"}
          </h2>
          <span className="text-xs text-gray-500">
            {unlockedCount}/{achievements.length} {zh ? "已解锁" : "unlocked"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`relative bg-[#0F2040] border rounded-xl p-4 flex flex-col items-center text-center gap-2 ${
                ach.unlocked
                  ? "border-[#FFD700]/30 bg-gradient-to-b from-[#FFD700]/5 to-transparent"
                  : "border-[#1E3A5F] opacity-70"
              }`}
            >
              {/* Icon */}
              <span className={`text-3xl ${!ach.unlocked ? "grayscale opacity-40" : ""}`}>
                {ach.emoji}
              </span>
              {/* Name */}
              <p className={`text-xs font-black leading-tight ${ach.unlocked ? "text-white" : "text-gray-500"}`}>
                {zh ? ach.nameZh : ach.nameEn}
              </p>
              {/* Description */}
              <p className="text-[10px] text-gray-600 leading-tight">
                {zh ? ach.descZh : ach.descEn}
              </p>
              {/* Progress bar */}
              {!ach.unlocked && (
                <div className="w-full">
                  <div className="w-full bg-[#1E3A5F] rounded-full h-1 mb-1">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-[#FFD700]/50 to-[#FFD700]"
                      style={{ width: `${ach.progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-600">{ach.progressLabel}</p>
                </div>
              )}
              {/* Unlocked badge */}
              {ach.unlocked && (
                <span className="absolute top-2 right-2 text-[10px] bg-[#FFD700] text-[#0A1628] font-black px-1.5 py-0.5 rounded-full">
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
