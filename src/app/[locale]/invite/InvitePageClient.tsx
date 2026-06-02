"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MILESTONES,
  PER_INVITE_GC,
  nextMilestone,
  formatGcShort,
} from "@/lib/inviteMilestones";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  username:    string;
  inviteCount: number;
  inviteGc:    number;
  countryCode: string | null;
  avatarUrl:   string | null;
}

interface MyProfile {
  username:     string;
  invite_count: number;
  invite_gc:    number;
  referred_by:  string | null;
  gc_balance:   number;
}

interface Props {
  locale:            string;
  siteUrl:           string;
  myProfile:         MyProfile | null;
  myRank:            number;
  claimedMilestones: number[];
  leaderboard:       LeaderboardEntry[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvitePageClient({
  locale, siteUrl, myProfile, myRank, claimedMilestones, leaderboard,
}: Props) {
  const zh = locale === "zh";
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"my" | "board">(myProfile ? "my" : "board");

  const inviteCount = myProfile?.invite_count ?? 0;
  const referralUrl = myProfile
    ? `${siteUrl}/${locale}/auth/register?ref=${myProfile.username}`
    : `${siteUrl}/${locale}/auth/register`;

  const shareText = zh
    ? `🎉 加入 Football2026，免费注册即得 100,000 GC，一起助威世界杯！`
    : `🎉 Join Football2026! Sign up free & get 100,000 GC. Let's predict the World Cup together!`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }

  // Progress to next milestone
  const next      = nextMilestone(inviteCount);
  const prevCount = next
    ? (MILESTONES.find((m) => m.gcBonus > 0 && m.count < next.count)?.count ?? 0)
    : (MILESTONES[MILESTONES.length - 1]?.count ?? 0);
  const segPct    = next && next.count > prevCount
    ? Math.min(100, Math.round(((inviteCount - prevCount) / (next.count - prevCount)) * 100))
    : 100;

  const SHARE_PLATFORMS = [
    { name: "X",        color: "#000000", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralUrl)}` },
    { name: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + referralUrl)}` },
    { name: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareText)}` },
    { name: "Facebook", color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}` },
  ];

  return (
    <div className="space-y-5">

      {/* ── How it works ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🔗", title: zh ? "分享链接" : "Share Link",     desc: zh ? "复制你的专属链接" : "Copy your unique link"      },
          { icon: "👤", title: zh ? "好友注册" : "Friend Joins",   desc: zh ? "好友点击链接注册" : "Friend signs up via link"    },
          { icon: "🪙", title: zh ? "双方得币" : "Both Earn GC",   desc: zh ? "各得 500,000 GC" : "Each gets 500,000 GC" },
        ].map((s) => (
          <div key={s.title} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 text-center">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-white font-bold text-xs mb-1">{s.title}</p>
            <p className="text-gray-500 text-[10px] leading-snug">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Tab switcher (logged in only) ── */}
      {myProfile && (
        <div className="flex gap-2">
          {(["my", "board"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {t === "my" ? `👤 ${zh ? "我的邀请" : "My Invites"}` : `🏆 ${zh ? "排行榜" : "Leaderboard"}`}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MY INVITES TAB
      ═══════════════════════════════════════════════════════════ */}
      {tab === "my" && myProfile && (
        <div className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: zh ? "已邀人数" : "Invited",    value: inviteCount.toString(),                 icon: "👥", color: "text-blue-400"   },
              { label: zh ? "获得 GC" : "GC Earned",   value: formatGcShort(myProfile.invite_gc),     icon: "🪙", color: "text-[#FFD700]"  },
              { label: zh ? "邀请排名" : "My Rank",     value: myRank > 0 ? `#${myRank}` : "—",        icon: "🏆", color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 text-center">
                <div className="text-xl mb-1.5">{s.icon}</div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Referral link + share */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                {zh ? "你的专属邀请链接" : "Your Referral Link"}
              </p>
              <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3 focus-within:border-[#FFD700] transition-colors">
                <span className="text-[11px] text-gray-400 truncate flex-1 font-mono select-all">
                  {referralUrl.replace(/^https?:\/\//, "")}
                </span>
                <button
                  onClick={copyLink}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    copied
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-[#1E3A5F] text-white border border-[#1E3A5F] hover:border-[#FFD700]/40"
                  }`}
                >
                  {copied ? (zh ? "✓ 已复制" : "✓ Copied") : (zh ? "复制" : "Copy")}
                </button>
              </div>
            </div>

            {/* Share buttons */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                {zh ? "分享到" : "Share via"}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SHARE_PLATFORMS.map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center py-2.5 rounded-xl text-white text-xs font-bold hover:opacity-80 active:scale-95 transition-all"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Milestone progress */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">
                🏅 {zh ? "邀请里程碑" : "Invite Milestones"}
              </h3>
              {next && (
                <span className="text-[10px] text-gray-500">
                  {zh ? `距 ${next.emoji} 还差 ${next.count - inviteCount} 人` : `${next.count - inviteCount} more to ${next.emoji}`}
                </span>
              )}
            </div>

            {/* Progress bar toward next milestone */}
            {next && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {prevCount} → <span className={`font-bold ${next.color}`}>{next.emoji} {next.count}</span>
                  </span>
                  <span className="text-white font-bold">{inviteCount}/{next.count}</span>
                </div>
                <div className="h-2.5 bg-[#0A1628] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF8C00] transition-all duration-700"
                    style={{ width: `${segPct}%` }}
                  />
                </div>
                {next.gcBonus > 0 && (
                  <p className="text-[10px] text-[#FFD700]">
                    🎁 {zh ? "达成奖励" : "Milestone bonus"}: +{formatGcShort(next.gcBonus)} GC
                  </p>
                )}
              </div>
            )}

            {/* Milestone cards */}
            <div className="space-y-2">
              {MILESTONES.filter((m) => m.gcBonus > 0).map((m) => {
                const reached = inviteCount >= m.count;
                const claimed = claimedMilestones.includes(m.count);
                const isNext  = !reached && next?.count === m.count;
                return (
                  <div
                    key={m.count}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      reached
                        ? `${m.bg} border-transparent`
                        : isNext
                        ? "bg-[#FFD700]/5 border-[#FFD700]/20"
                        : "bg-[#0A1628] border-[#1E3A5F]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                      reached ? m.bg : "bg-[#1E3A5F]"
                    }`}>
                      {m.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${reached ? m.color : isNext ? "text-white" : "text-gray-500"}`}>
                        {zh ? m.labelZh : m.label}
                        <span className="font-normal text-[11px] ml-1.5 opacity-70">
                          ({zh ? `邀请 ${m.count} 人` : `Invite ${m.count}`})
                        </span>
                      </p>
                      {m.gcBonus > 0 && (
                        <p className={`text-[10px] mt-0.5 font-bold ${reached ? m.color : "text-gray-600"}`}>
                          +{formatGcShort(m.gcBonus)} GC
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {claimed ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 font-bold border border-green-500/20">
                          {zh ? "✓ 已领取" : "✓ Claimed"}
                        </span>
                      ) : reached ? (
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${m.bg} ${m.color}`}>
                          {zh ? "✓ 达成" : "✓ Done"}
                        </span>
                      ) : isNext ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#FFD700]/10 text-[#FFD700] font-bold border border-[#FFD700]/20">
                          {zh ? "进行中" : "In progress"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600">
                          -{m.count - inviteCount} {zh ? "人" : "more"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-600 text-center border-t border-[#1E3A5F] pt-3">
              {zh
                ? `每邀请一人，双方各得 ${formatGcShort(PER_INVITE_GC)} GC`
                : `Every invite: both you and your friend get ${formatGcShort(PER_INVITE_GC)} GC`}
            </p>
          </div>

          {/* Referred by */}
          {myProfile.referred_by && (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-5 py-3.5 flex items-center gap-3">
              <span className="text-xl">🤝</span>
              <p className="text-sm text-gray-400">
                {zh ? "邀请你的人：" : "Invited by "}
                <span className="text-white font-bold">@{myProfile.referred_by}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LEADERBOARD TAB
      ═══════════════════════════════════════════════════════════ */}
      {(tab === "board" || !myProfile) && (
        <div className="space-y-4">

          {/* Guest CTA */}
          {!myProfile && (
            <div className="bg-gradient-to-r from-[#FFD700]/10 via-[#FF8C00]/5 to-transparent border border-[#FFD700]/20 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-black text-sm">
                  {zh ? "登录后开始邀请" : "Login to Start Inviting"}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {zh ? "每邀一人双方各得 2000 万 GC" : "Both sides earn 20M GC per invite"}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/${locale}/auth/register`}
                  className="text-xs bg-[#FFD700] text-[#0A1628] font-black px-4 py-2 rounded-xl hover:bg-[#FFC200] transition-colors">
                  {zh ? "注册" : "Register"}
                </Link>
                <Link href={`/${locale}/auth/login`}
                  className="text-xs border border-[#1E3A5F] text-gray-400 font-semibold px-4 py-2 rounded-xl hover:text-white transition-colors">
                  {zh ? "登录" : "Login"}
                </Link>
              </div>
            </div>
          )}

          {/* Board */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 px-5 py-3 border-b border-[#1E3A5F] bg-[#0A1628]/60">
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">#</span>
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">{zh ? "玩家" : "Player"}</span>
              <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">{zh ? "邀请数" : "Invites"}</span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm">
                  {zh ? "还没有邀请记录，成为第一名！" : "No invites yet — be the first!"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1E3A5F]/60">
                {leaderboard.map((entry, idx) => {
                  const rank  = idx + 1;
                  const isMe  = myProfile?.username === entry.username;
                  const flagUrl = entry.countryCode
                    ? `https://flagcdn.com/w40/${entry.countryCode.toLowerCase()}.png`
                    : null;

                  return (
                    <div
                      key={entry.username}
                      className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 transition-colors ${
                        isMe
                          ? "bg-[#FFD700]/8 border-l-2 border-[#FFD700]"
                          : rank <= 3
                          ? "bg-gradient-to-r from-[#FFD700]/5 to-transparent"
                          : "hover:bg-[#1E3A5F]/30"
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex justify-center shrink-0">
                        {rank === 1 ? <span className="text-xl">🥇</span>
                        : rank === 2 ? <span className="text-xl">🥈</span>
                        : rank === 3 ? <span className="text-xl">🥉</span>
                        : <span className="text-sm font-black text-gray-500 w-7 text-center tabular-nums">{rank}</span>}
                      </div>

                      {/* User */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {entry.avatarUrl ? (
                            <Image
                              src={entry.avatarUrl} alt={entry.username}
                              width={36} height={36}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-sm">
                              {entry.username.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          {flagUrl && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-3 overflow-hidden rounded-sm border border-[#0F2040]">
                              <Image src={flagUrl} alt="" width={16} height={12} className="object-cover" unoptimized />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold truncate ${isMe ? "text-[#FFD700]" : "text-white"}`}>
                              @{entry.username}
                            </span>
                            {isMe && (
                              <span className="shrink-0 text-[9px] font-black bg-[#FFD700] text-[#0A1628] px-1.5 py-0.5 rounded-full">
                                YOU
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            🪙 {formatGcShort(entry.inviteGc)} GC {zh ? "已赚" : "earned"}
                          </p>
                        </div>
                      </div>

                      {/* Count */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black tabular-nums ${rank <= 3 ? "text-[#FFD700]" : "text-white"}`}>
                          {entry.inviteCount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500">{zh ? "人" : "friends"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
