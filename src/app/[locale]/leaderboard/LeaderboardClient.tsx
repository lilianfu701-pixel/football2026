"use client";

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

interface CountryEntry {
  countryCode: string;
  countryName: string;
  flagUrl: string;
  totalGc: number;
  userCount: number;
  gcFormatted: string;
}

interface Props {
  locale: string;
  myId: string | null;
  myRanks: { wealth: number; honor: number; win: number; invite: number; country: number };
  wealthBoard: WealthUser[];
  honorBoard: WealthUser[];
  winBoard: WinUser[];
  inviteBoard: InviteUser[];
  countryBoard: CountryEntry[];
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

function SectionTitle({ icon, title, myRank, zh }: { icon: string; title: string; myRank: number; zh: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-black text-white flex items-center gap-2">
        {icon} {title}
      </h2>
      {myRank > 0 && (
        <span className="text-xs text-[#FFD700] font-bold bg-[#FFD700]/10 px-2.5 py-1 rounded-full">
          {zh ? `我的排名 #${myRank}` : `My rank #${myRank}`}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeaderboardClient({
  locale, myId, myRanks, wealthBoard, honorBoard, winBoard, inviteBoard, countryBoard,
}: Props) {
  const zh = locale === "zh";
  const myCountryCode = wealthBoard.find((u) => u.id === myId)?.countryCode ?? null;

  return (
    <div className="space-y-8">

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

      {/* ① 国家财富榜 */}
      <section>
        <SectionTitle icon="🌍" title={zh ? "国家财富榜" : "Nation Wealth"} myRank={myRanks.country} zh={zh} />
        <CountryBoard entries={countryBoard} myCountryCode={myCountryCode} zh={zh} />
      </section>

      {/* ② 财富榜 */}
      <section>
        <SectionTitle icon="💰" title={zh ? "财富榜" : "Wealth"} myRank={myRanks.wealth} zh={zh} />
        <WealthBoard
          users={wealthBoard} myId={myId} zh={zh} locale={locale}
          metricLabel={zh ? "GC 余额" : "GC Balance"}
          metricFn={(u) => u.gcFormatted + " GC"}
          badgeFn={(u) => ({ label: u.wlName, color: u.wlColor, bg: u.wlBg, icon: u.wlIcon })}
        />
      </section>

      {/* ③ 荣誉榜 */}
      <section>
        <SectionTitle icon="🏅" title={zh ? "荣誉榜" : "Honor"} myRank={myRanks.honor} zh={zh} />
        <WealthBoard
          users={honorBoard} myId={myId} zh={zh} locale={locale}
          metricLabel={zh ? "荣誉积分" : "Honor Points"}
          metricFn={(u) => u.honorFormatted}
          badgeFn={(u) => ({ label: u.hlName, color: u.hlColor, bg: u.hlColor + "22", icon: u.hlIcon })}
        />
      </section>

      {/* ④ 胜率榜 */}
      <section>
        <SectionTitle icon="🎯" title={zh ? "胜率榜" : "Win Rate"} myRank={myRanks.win} zh={zh} />
        <WinBoard users={winBoard} myId={myId} zh={zh} locale={locale} />
      </section>

      {/* ⑤ 邀请榜 */}
      <section>
        <SectionTitle icon="🤝" title={zh ? "邀请榜" : "Invites"} myRank={myRanks.invite} zh={zh} />
        <InviteBoard users={inviteBoard} myId={myId} zh={zh} locale={locale} />
      </section>

    </div>
  );
}

// ── Country board ─────────────────────────────────────────────────────────────

function CountryBoard({ entries, myCountryCode, zh }: {
  entries: CountryEntry[];
  myCountryCode: string | null;
  zh: boolean;
}) {
  if (entries.length === 0) return <EmptyState zh={zh} />;

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3 border-b border-[#1E3A5F] bg-[#0A1628]/60">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">#</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">{zh ? "国家" : "Nation"}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">{zh ? "GC 总量" : "Total GC"}</span>
      </div>
      <div className="divide-y divide-[#1E3A5F]/60">
        {entries.map((entry, i) => {
          const rank = i + 1;
          const isMe = entry.countryCode === myCountryCode;
          return (
            <div
              key={entry.countryCode}
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
                <div className="w-10 h-7 relative overflow-hidden rounded-md shadow shrink-0">
                  <Image src={entry.flagUrl} alt={entry.countryCode} fill className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-bold truncate ${isMe ? "text-[#FFD700]" : "text-white"}`}>
                      {entry.countryName || entry.countryCode}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-black bg-[#FFD700] text-[#0A1628] px-1.5 py-0.5 rounded-full leading-none">
                        {zh ? "我的国家" : "MINE"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {entry.userCount}{zh ? " 名玩家" : entry.userCount === 1 ? " player" : " players"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-black tabular-nums ${
                  rank === 1 ? "text-[#FFD700]" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-gray-300"
                }`}>
                  {entry.gcFormatted} GC
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t border-[#1E3A5F] bg-[#0A1628]/40 text-center">
        <p className="text-[11px] text-gray-600">
          {zh ? "国家总GC = 该国所有玩家财富之和" : "Nation total = sum of all players' GC from that country"}
        </p>
      </div>
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
      <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3 border-b border-[#1E3A5F] bg-[#0A1628]/60">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">#</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">{zh ? "玩家" : "Player"}</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">{metricLabel}</span>
      </div>
      <div className="divide-y divide-[#1E3A5F]/60">
        {users.map((u, i) => {
          const rank  = i + 1;
          const isMe  = u.id === myId;
          const badge = badgeFn(u);
          return (
            <Link
              key={u.id}
              href={`/${locale}/profile/${u.id}`}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 transition-colors ${
                isMe
                  ? "bg-[#FFD700]/8 border-l-2 border-l-[#FFD700]"
                  : rank <= 3
                  ? "bg-gradient-to-r from-[#FFD700]/5 to-transparent hover:bg-[#FFD700]/8"
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
              <div className="text-right shrink-0">
                <span className={`text-sm font-black tabular-nums ${
                  rank === 1 ? "text-[#FFD700]" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : "text-gray-300"
                }`}>
                  {metricFn(u)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Win-rate board ────────────────────────────────────────────────────────────

function WinBoard({ users, myId, zh, locale }: {
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
            <Link
              key={u.id}
              href={`/${locale}/profile/${u.id}`}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 transition-colors ${
                isMe
                  ? "bg-[#FFD700]/8 border-l-2 border-l-[#FFD700]"
                  : rank <= 3
                  ? "bg-gradient-to-r from-[#FFD700]/5 to-transparent hover:bg-[#FFD700]/8"
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
            </Link>
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
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl py-12 text-center">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-gray-500 text-sm">
        {zh ? "暂无数据，成为第一名吧！" : "No data yet — be the first!"}
      </p>
    </div>
  );
}
