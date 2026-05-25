"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface BaseUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  countryCode: string;
  countryName: string;
  flagUrl: string | null;
}

interface WealthUser extends BaseUser {
  gc: number;
  gcFormatted: string;
  honor: number;
  honorFormatted: string;
  wlName: string; wlColor: string; wlBg: string; wlIcon: string;
  hlName: string; hlColor: string; hlIcon: string;
}

interface WinUser extends WealthUser {
  total: number;
  won: number;
  rate: number;
}

interface InviteUser extends BaseUser {
  inviteCount: number;
  inviteGc: string;
}

interface Props {
  locale: string;
  myId: string | null;
  myRanks: { wealth: number; honor: number; win: number; invite: number };
  wealthBoard: WealthUser[];
  honorBoard: WealthUser[];
  winBoard: WinUser[];
  inviteBoard: InviteUser[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="text-sm font-black text-gray-500 w-7 text-center tabular-nums">
      {rank}
    </span>
  );
}

function Avatar({ avatarUrl, username, size = 40 }: { avatarUrl: string | null; username: string; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl} alt={username}
        width={size} height={size}
        className="rounded-full object-cover"
        unoptimized
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeaderboardClient({
  locale, myId, myRanks, wealthBoard, honorBoard, winBoard, inviteBoard,
}: Props) {
  const zh = locale === "zh";
  type Tab = "wealth" | "honor" | "win" | "invite";
  const [tab, setTab] = useState<Tab>("wealth");

  const tabs: { key: Tab; label: string; icon: string; myRank: number }[] = [
    { key: "wealth", label: zh ? "财富榜" : "Wealth",   icon: "💰", myRank: myRanks.wealth },
    { key: "honor",  label: zh ? "荣誉榜" : "Honor",    icon: "🏅", myRank: myRanks.honor  },
    { key: "win",    label: zh ? "胜率榜" : "Win Rate",  icon: "🎯", myRank: myRanks.win    },
    { key: "invite", label: zh ? "邀请榜" : "Invites",  icon: "🤝", myRank: myRanks.invite },
  ];

  const myRankNow = tabs.find((t) => t.key === tab)?.myRank ?? 0;

  return (
    <div className="space-y-5">

      {/* ── My rank banner (logged in) ── */}
      {myId && myRankNow > 0 && (
        <div className="bg-gradient-to-r from-[#FFD700]/15 via-[#FF8C00]/10 to-transparent border border-[#FFD700]/25 rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                {zh ? "我的排名" : "Your Rank"}
              </p>
              <p className="text-white font-black text-lg leading-tight">
                #{myRankNow}
                <span className="text-gray-500 font-normal text-xs ml-1">
                  {zh ? "（前100名）" : "(top 100)"}
                </span>
              </p>
            </div>
          </div>
          <Link href={`/${locale}/profile`}
            className="text-xs text-[#FFD700] font-bold hover:underline shrink-0">
            {zh ? "我的主页 →" : "My Profile →"}
          </Link>
        </div>
      )}

      {/* ── Guest banner ── */}
      {!myId && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            {zh ? "登录后查看你的排名" : "Login to see your ranking"}
          </p>
          <Link href={`/${locale}/auth/login`}
            className="shrink-0 text-xs bg-[#FFD700] text-[#0A1628] font-black px-4 py-2 rounded-xl hover:bg-[#FFC200] transition-colors">
            {zh ? "登录" : "Login"}
          </Link>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.key
                ? "bg-[#FFD700] text-[#0A1628]"
                : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Boards ── */}
      {tab === "wealth" && (
        <WealthBoard users={wealthBoard} myId={myId} zh={zh} locale={locale}
          metricLabel={zh ? "GC 余额" : "GC Balance"}
          metricFn={(u) => u.gcFormatted + " GC"}
          badgeFn={(u) => ({ label: u.wlName, color: u.wlColor, bg: u.wlBg, icon: u.wlIcon })}
        />
      )}
      {tab === "honor" && (
        <WealthBoard users={honorBoard} myId={myId} zh={zh} locale={locale}
          metricLabel={zh ? "荣誉积分" : "Honor Points"}
          metricFn={(u) => u.honorFormatted}
          badgeFn={(u) => ({ label: u.hlName, color: u.hlColor, bg: u.hlColor + "22", icon: u.hlIcon })}
        />
      )}
      {tab === "win" && (
        <WinBoard users={winBoard} myId={myId} zh={zh} locale={locale} />
      )}
      {tab === "invite" && (
        <InviteBoard users={inviteBoard} myId={myId} zh={zh} locale={locale} />
      )}

    </div>
  );
}

// ── Wealth / Honor board ──────────────────────────────────────────────────────

function WealthBoard({
  users, myId, zh, locale, metricLabel, metricFn, badgeFn,
}: {
  users: WealthUser[];
  myId: string | null;
  zh: boolean;
  locale: string;
  metricLabel: string;
  metricFn: (u: WealthUser) => string;
  badgeFn: (u: WealthUser) => { label: string; color: string; bg: string; icon: string };
}) {
  if (users.length === 0) return <EmptyState zh={zh} />;

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      {/* Column header */}
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3 border-b border-[#1E3A5F] bg-[#0A1628]/60">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">#</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">{zh ? "玩家" : "Player"}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">{metricLabel}</span>
      </div>
      <div className="divide-y divide-[#1E3A5F]/60">
        {users.map((u, i) => {
          const rank   = i + 1;
          const isMe   = u.id === myId;
          const badge  = badgeFn(u);
          return (
            <div
              key={u.id}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 transition-colors ${
                isMe
                  ? "bg-[#FFD700]/8 border-l-2 border-l-[#FFD700]"
                  : rank <= 3
                  ? "bg-gradient-to-r from-[#FFD700]/5 to-transparent"
                  : "hover:bg-[#1E3A5F]/30"
              }`}
            >
              {/* Rank */}
              <div className="flex justify-center">
                <RankBadge rank={rank} />
              </div>

              {/* User */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar avatarUrl={u.avatarUrl} username={u.username} size={36} />
                  {u.flagUrl && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-3 overflow-hidden rounded-sm border border-[#0F2040]">
                      <Image src={u.flagUrl} alt={u.countryCode} width={16} height={12} className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-bold truncate ${isMe ? "text-[#FFD700]" : "text-white"}`}>
                      @{u.username}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-black bg-[#FFD700] text-[#0A1628] px-1.5 py-0.5 rounded-full leading-none">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: badge.color, backgroundColor: badge.bg }}>
                      {badge.icon} {badge.label}
                    </span>
                    {u.countryName && (
                      <span className="text-[10px] text-gray-600 truncate">{u.countryName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metric */}
              <div className="text-right shrink-0">
                <span className={`text-sm font-black tabular-nums ${
                  rank === 1 ? "text-[#FFD700]" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-gray-300"
                }`}>
                  {metricFn(u)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Win-rate board ────────────────────────────────────────────────────────────

function WinBoard({ users, myId, zh, locale: _locale }: {
  users: WinUser[]; myId: string | null; zh: boolean; locale: string;
}) {
  if (users.length === 0) return <EmptyState zh={zh} />;

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3 border-b border-[#1E3A5F] bg-[#0A1628]/60">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">#</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">{zh ? "玩家" : "Player"}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">{zh ? "胜率" : "Win Rate"}</span>
      </div>
      <div className="divide-y divide-[#1E3A5F]/60">
        {users.map((u, i) => {
          const rank = i + 1;
          const isMe = u.id === myId;
          return (
            <div
              key={u.id}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 transition-colors ${
                isMe
                  ? "bg-[#FFD700]/8 border-l-2 border-l-[#FFD700]"
                  : rank <= 3
                  ? "bg-gradient-to-r from-[#FFD700]/5 to-transparent"
                  : "hover:bg-[#1E3A5F]/30"
              }`}
            >
              <div className="flex justify-center">
                <RankBadge rank={rank} />
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar avatarUrl={u.avatarUrl} username={u.username} size={36} />
                  {u.flagUrl && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-3 overflow-hidden rounded-sm border border-[#0F2040]">
                      <Image src={u.flagUrl} alt={u.countryCode} width={16} height={12} className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold truncate ${isMe ? "text-[#FFD700]" : "text-white"}`}>
                      @{u.username}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-black bg-[#FFD700] text-[#0A1628] px-1.5 py-0.5 rounded-full leading-none">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-20 h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${u.rate}%`,
                          background: u.rate >= 60
                            ? "linear-gradient(to right,#22c55e,#16a34a)"
                            : u.rate >= 40
                            ? "linear-gradient(to right,#FFD700,#FF8C00)"
                            : "linear-gradient(to right,#f87171,#ef4444)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {u.won}/{u.total} {zh ? "场" : "bets"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-lg font-black tabular-nums ${
                  u.rate >= 60 ? "text-green-400" : u.rate >= 40 ? "text-[#FFD700]" : "text-red-400"
                }`}>
                  {u.rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Invite board ──────────────────────────────────────────────────────────────

function InviteBoard({ users, myId, zh, locale }: {
  users: InviteUser[]; myId: string | null; zh: boolean; locale: string;
}) {
  if (users.length === 0) return <EmptyState zh={zh} />;

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3 border-b border-[#1E3A5F] bg-[#0A1628]/60">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">#</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">{zh ? "玩家" : "Player"}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">{zh ? "邀请数" : "Invites"}</span>
      </div>
      <div className="divide-y divide-[#1E3A5F]/60">
        {users.map((u, i) => {
          const rank = i + 1;
          const isMe = u.id === myId;
          return (
            <div
              key={u.id}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 transition-colors ${
                isMe
                  ? "bg-[#FFD700]/8 border-l-2 border-l-[#FFD700]"
                  : rank <= 3
                  ? "bg-gradient-to-r from-[#FFD700]/5 to-transparent"
                  : "hover:bg-[#1E3A5F]/30"
              }`}
            >
              <div className="flex justify-center">
                <RankBadge rank={rank} />
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar avatarUrl={u.avatarUrl} username={u.username} size={36} />
                  {u.flagUrl && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-3 overflow-hidden rounded-sm border border-[#0F2040]">
                      <Image src={u.flagUrl} alt={u.countryCode} width={16} height={12} className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold truncate ${isMe ? "text-[#FFD700]" : "text-white"}`}>
                      @{u.username}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-black bg-[#FFD700] text-[#0A1628] px-1.5 py-0.5 rounded-full leading-none">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {u.countryName || u.countryCode}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-black text-[#FFD700] tabular-nums">
                  {u.inviteCount.toLocaleString()}
                  <span className="text-xs text-gray-500 font-normal ml-0.5">{zh ? "人" : ""}</span>
                </p>
                <p className="text-[10px] text-gray-600">🪙 {u.inviteGc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-5 py-4 border-t border-[#1E3A5F] bg-[#0A1628]/40">
        <Link href={`/${locale}/invite`}
          className="block w-full text-center bg-[#1E3A5F] hover:bg-[#FFD700]/20 border border-[#1E3A5F] hover:border-[#FFD700]/40 text-gray-300 hover:text-[#FFD700] font-semibold py-2.5 rounded-xl text-sm transition-all">
          🤝 {zh ? "邀请好友，一起上榜" : "Invite Friends & Climb the Board"}
        </Link>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ zh }: { zh: boolean }) {
  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-16 text-center">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-gray-500 text-sm">
        {zh ? "暂无数据，成为第一名吧！" : "No data yet — be the first!"}
      </p>
    </div>
  );
}
