"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { lc } from "@/i18n/content";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchEventDetail {
  home_team:   string;
  away_team:   string;
  home_flag:   string;
  away_flag:   string;
  team?:       "home" | "away";
  score_home?: number;
  score_away?: number;
  home_score?: number;
  away_score?: number;
  kickoff_time?: string;
}

interface NotifItem {
  id:           number;
  type:         string;
  is_read:      boolean;
  gc_amount:    number | null;
  reason:       string | null;
  created_at:   string;
  post_id:      number | null;
  reply_id:     number | null;
  match_id:     number | null;
  event_detail: MatchEventDetail | null;
  actor:        { nickname: string; avatar_url: string | null } | null;
  post_title:   string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, zh: boolean, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return lc(locale, "刚刚", "just now");
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  if (d < 30) return zh ? `${d}天前`   : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

function NotifIcon({ type, gc_amount }: { type: string; gc_amount: number | null }) {
  if (type === "rating")          return <span>{gc_amount && gc_amount > 0 ? "🎁" : "🔨"}</span>;
  if (type === "reply")           return <span>💬</span>;
  if (type === "mention")         return <span>📣</span>;
  if (type === "follow")          return <span>👤</span>;
  if (type === "bet_settled")     return <span>{gc_amount && gc_amount > 0 ? "🎉" : "💔"}</span>;
  if (type === "match_countdown") return <span>⏰</span>;
  if (type === "match_kickoff")   return <span>🟢</span>;
  if (type === "match_goal")      return <span>⚽</span>;
  if (type === "match_red_card")  return <span>🟥</span>;
  if (type === "match_final")     return <span>🏁</span>;
  return <span>🔔</span>;
}

function MatchNotifText({ n, zh }: { n: NotifItem; zh: boolean }) {
  const d = n.event_detail;
  if (!d) return <span className="text-sm text-gray-300">{zh ? "比赛通知" : "Match notification"}</span>;

  const matchLabel = (
    <span className="font-medium text-white">
      {d.home_flag} {d.home_team} vs {d.away_flag} {d.away_team}
    </span>
  );

  if (n.type === "match_countdown") {
    return (
      <span className="text-sm text-gray-300">
        {zh ? "⏰ 即将开赛 · " : "⏰ Starting soon · "}{matchLabel}
        {zh ? " · 10分钟后开赛" : " · kicks off in 10 min"}
      </span>
    );
  }
  if (n.type === "match_kickoff") {
    return (
      <span className="text-sm text-gray-300">
        {zh ? "🟢 开赛 · " : "🟢 Kick off · "}{matchLabel}
      </span>
    );
  }
  if (n.type === "match_goal") {
    const scoredBy   = d.team === "home" ? d.home_flag : d.away_flag;
    const scoredTeam = d.team === "home" ? d.home_team : d.away_team;
    const score      = `${d.score_home ?? 0}–${d.score_away ?? 0}`;
    return (
      <span className="text-sm text-gray-300">
        {"⚽ "}<strong className="text-white">{scoredBy} {scoredTeam}</strong>
        {" · "}<span className="text-[#FFD700] font-bold">{score}</span>
        {" · "}{matchLabel}
      </span>
    );
  }
  if (n.type === "match_red_card") {
    const team = d.team === "home" ? d.home_team : d.away_team;
    return (
      <span className="text-sm text-gray-300">
        {"🟥 "}{zh ? "红牌 · " : "Red card · "}
        <strong className="text-white">{team}</strong>{" · "}{matchLabel}
      </span>
    );
  }
  if (n.type === "match_final") {
    const score = `${d.home_score ?? 0}–${d.away_score ?? 0}`;
    return (
      <span className="text-sm text-gray-300">
        {"🏁 "}{zh ? "比赛结束 · " : "Full time · "}
        {matchLabel}{" · "}
        <span className="text-[#FFD700] font-bold">{score}</span>
      </span>
    );
  }
  return <span className="text-sm text-gray-300">{matchLabel}</span>;
}

function NotifText({ n, zh, locale }: { n: NotifItem; zh: boolean; locale: string }) {
  // Match event notifications
  if (n.type.startsWith("match_")) {
    return <MatchNotifText n={n} zh={zh} />;
  }

  const actor = n.actor?.nickname ?? (lc(locale, "系统", "System"));
  const title = n.post_title
    ? `「${n.post_title.slice(0, 24)}${n.post_title.length > 24 ? "…" : ""}」`
    : "";

  if (n.type === "rating" && n.gc_amount !== null) {
    const sign   = n.gc_amount > 0 ? "+" : "";
    const gcText = `${sign}${n.gc_amount.toLocaleString()} GC`;
    return (
      <span className="text-sm text-gray-300">
        <strong className="text-white">{actor}</strong>
        {zh
          ? (n.gc_amount > 0 ? " 打赏了你 " : " 扣了你 ")
          : (n.gc_amount > 0 ? " tipped you " : " penalised you ")}
        <strong className={n.gc_amount > 0 ? "text-[#FFD700]" : "text-red-400"}>{gcText}</strong>
        {title && (
          zh
            ? <> 在 <span className="text-gray-200">{title}</span></>
            : <> on <span className="text-gray-200">{title}</span></>
        )}
        {n.reason && (
          <span className="text-gray-500 text-xs"> · {n.reason.slice(0, 40)}</span>
        )}
      </span>
    );
  }

  if (n.type === "reply" || n.type === "mention") {
    return (
      <span className="text-sm text-gray-300">
        <strong className="text-white">{actor}</strong>
        {n.type === "mention"
          ? lc(locale, " 在帖子中提到了你 ", " mentioned you in a post ")
          : lc(locale, " 回复了你的帖子 ", " replied to your post ")}
        {title && <span className="text-gray-200">{title}</span>}
      </span>
    );
  }

  if (n.type === "follow") {
    return (
      <span className="text-sm text-gray-300">
        <strong className="text-white">{actor}</strong>
        {lc(locale, " 关注了你", " started following you")}
      </span>
    );
  }

  if (n.type === "bet_settled") {
    const won = n.gc_amount !== null && n.gc_amount > 0;
    return (
      <span className="text-sm text-gray-300">
        {zh
          ? (won ? "🎉 预测结算：恭喜你赢了！" : "💔 预测结算：很遗憾没有命中。")
          : (won ? "🎉 Prediction settled: You won!" : "💔 Prediction settled: Better luck next time.")}
        {n.gc_amount !== null && (
          <strong className={won ? "text-[#FFD700]" : "text-red-400"}>
            {" "}{won ? "+" : ""}{n.gc_amount.toLocaleString()} GC
          </strong>
        )}
      </span>
    );
  }

  return (
    <span className="text-sm text-gray-300">
      {n.reason ?? (lc(locale, "系统通知", "System notification"))}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";

  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) {
        router.push(`/${locale}/auth/login`);
        return;
      }
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      // Mark all as read
      fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    } catch {
      setError(lc(locale, "加载失败，请刷新重试", "Failed to load, please refresh"));
    } finally {
      setLoading(false);
    }
  }, [locale, zh, router]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-8">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">
              🔔 {lc(locale, "通知中心", "Notifications")}
            </h1>
            {unread > 0 && (
              <p className="text-xs text-[#FFD700] mt-0.5">
                {zh ? `${unread} 条未读` : `${unread} unread`}
              </p>
            )}
          </div>
          {notifs.length > 0 && (
            <button
              onClick={() => fetch("/api/notifications", { method: "PATCH" }).then(fetchNotifs)}
              className="text-xs text-gray-400 hover:text-white bg-[#0F2040] border border-[#1E3A5F] px-3 py-2 rounded-xl transition-colors"
            >
              {lc(locale, "全部已读", "Mark all read")}
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
            ⚠ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && notifs.length === 0 && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-10 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-400 text-sm">
              {lc(locale, "暂无通知", "No notifications yet")}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {lc(locale, "预测结算、被打赏或被回复时，通知将显示在这里。", "Notifications for prediction settlements, tips, and replies will appear here.")}
            </p>
          </div>
        )}

        {/* Notification list */}
        {!loading && notifs.length > 0 && (
          <div className="space-y-2">
            {notifs.map((n) => {
              const href = n.type.startsWith("match_") && n.match_id
                ? `/${locale}/matches/${n.match_id}`
                : n.post_id
                ? `/${locale}/forum/thread/${n.post_id}`
                : n.type === "follow"
                ? `/${locale}/forum`
                : null;

              const inner = (
                <div
                  className={`flex items-start gap-3 p-4 ${
                    !n.is_read ? "bg-[#FFD700]/5" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-lg shrink-0 mt-0.5">
                    <NotifIcon type={n.type} gc_amount={n.gc_amount} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <NotifText n={n} zh={zh} locale={locale} />
                    <p className="text-[10px] text-gray-600 mt-1">
                      {timeAgo(n.created_at, zh, locale)}
                    </p>
                  </div>
                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#FFD700] shrink-0 mt-2" />
                  )}
                </div>
              );

              return (
                <div
                  key={n.id}
                  className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden hover:border-[#1E3A5F]/80 transition-colors"
                >
                  {href ? (
                    <Link href={href}>{inner}</Link>
                  ) : (
                    inner
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer links */}
        <div className="mt-10 pt-6 border-t border-[#1E3A5F] flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href={`/${locale}`} className="hover:text-[#FFD700]">
            {lc(locale, "← 返回首页", "← Back to Home")}
          </Link>
          <Link href={`/${locale}/profile`} className="hover:text-[#FFD700]">
            {lc(locale, "个人中心", "My Profile")}
          </Link>
        </div>

      </div>
    </div>
  );
}
