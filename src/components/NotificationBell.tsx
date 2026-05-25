"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface NotifItem {
  id:         number;
  type:       "rating" | "reply";
  is_read:    boolean;
  gc_amount:  number | null;
  reason:     string | null;
  created_at: string;
  post_id:    number | null;
  reply_id:   number | null;
  actor:      { nickname: string; avatar_url: string | null } | null;
  post_title: string | null;
}

interface Props {
  locale: string;
}

function timeAgo(dateStr: string, zh: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return zh ? "刚刚"       : "just now";
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  if (d < 30) return zh ? `${d}天前`   : `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

function NotifIcon({ type, gc_amount }: { type: string; gc_amount: number | null }) {
  if (type === "rating") return gc_amount && gc_amount > 0 ? <span>🎁</span> : <span>🔨</span>;
  return <span>💬</span>;
}

function NotifText({ n, zh }: { n: NotifItem; zh: boolean }) {
  const actor = n.actor?.nickname ?? (zh ? "某用户" : "Someone");
  const title = n.post_title
    ? `「${n.post_title.slice(0, 20)}${n.post_title.length > 20 ? "…" : ""}」`
    : "";

  if (n.type === "rating" && n.gc_amount !== null) {
    const sign   = n.gc_amount > 0 ? "+" : "";
    const gcText = `${sign}${n.gc_amount.toLocaleString()} GC`;
    if (zh) {
      return (
        <span>
          <strong className="text-white">{actor}</strong>
          {n.gc_amount > 0 ? " 打赏了你 " : " 扣了你 "}
          <strong className={n.gc_amount > 0 ? "text-[#FFD700]" : "text-red-400"}>{gcText}</strong>
          {title && <> 在 <span className="text-gray-300">{title}</span></>}
          {n.reason && <span className="text-gray-500 text-[10px]"> · {n.reason.slice(0, 30)}</span>}
        </span>
      );
    }
    return (
      <span>
        <strong className="text-white">{actor}</strong>
        {n.gc_amount > 0 ? " tipped you " : " penalised you "}
        <strong className={n.gc_amount > 0 ? "text-[#FFD700]" : "text-red-400"}>{gcText}</strong>
        {title && <> on <span className="text-gray-300">{title}</span></>}
        {n.reason && <span className="text-gray-500 text-[10px]"> · {n.reason.slice(0, 30)}</span>}
      </span>
    );
  }

  // reply
  if (zh) {
    return (
      <span>
        <strong className="text-white">{actor}</strong>
        {" 回复了你的帖子 "}
        {title && <span className="text-gray-300">{title}</span>}
      </span>
    );
  }
  return (
    <span>
      <strong className="text-white">{actor}</strong>
      {" replied to your post "}
      {title && <span className="text-gray-300">{title}</span>}
    </span>
  );
}

export default function NotificationBell({ locale }: Props) {
  const zh = locale === "zh";
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState<NotifItem[]>([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch { /* ignore */ }
  }, []);

  // Initial fetch + poll every 30 s + refetch on window focus
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    const onFocus  = () => fetchNotifs();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Mark all read
  async function markAllRead() {
    if (unread === 0) return;
    setLoading(true);
    await fetch("/api/notifications", { method: "PATCH" });
    setLoading(false);
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  function handleOpen() {
    setOpen((v) => !v);
    // Refetch on open to show latest
    fetchNotifs();
  }

  function notifHref(n: NotifItem) {
    if (!n.post_id) return `/${locale}/forum`;
    return `/${locale}/forum/thread/${n.post_id}`;
  }

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        title={zh ? "通知" : "Notifications"}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-[#1E3A5F] transition-colors"
      >
        {/* Bell SVG */}
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                           bg-red-500 text-white text-[9px] font-black flex items-center justify-center
                           leading-none border border-[#0A1628]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-[60]
                        bg-[#0F2040] border border-[#1E3A5F] rounded-2xl
                        shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]/70">
            <span className="text-sm font-black text-white">
              🔔 {zh ? "通知" : "Notifications"}
              {unread > 0 && (
                <span className="ml-2 text-xs font-bold text-red-400">{unread} {zh ? "条未读" : "unread"}</span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-[11px] font-bold text-[#FFD700]/70 hover:text-[#FFD700] transition-colors disabled:opacity-50"
              >
                {zh ? "全部已读" : "Mark all read"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-600">
                {zh ? "暂无通知" : "No notifications yet"}
              </div>
            ) : (
              notifs.map((n) => (
                <Link
                  key={n.id}
                  href={notifHref(n)}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[#1E3A5F]/40 transition-colors hover:bg-[#1E3A5F]/30 ${
                    !n.is_read ? "bg-[#1E3A5F]/20" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base mt-0.5 ${
                    n.type === "rating" && (n.gc_amount ?? 0) > 0 ? "bg-[#FFD700]/15" :
                    n.type === "rating"                           ? "bg-red-500/15"    :
                                                                    "bg-blue-500/15"
                  }`}>
                    <NotifIcon type={n.type} gc_amount={n.gc_amount} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      <NotifText n={n} zh={zh} />
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(n.created_at, zh)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700] mt-1.5" />
                  )}
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#1E3A5F]/70 text-center">
              <Link
                href={`/${locale}/forum`}
                onClick={() => setOpen(false)}
                className="text-[11px] text-gray-500 hover:text-[#FFD700] transition-colors font-medium"
              >
                {zh ? "前往论坛查看详情 →" : "Go to forum →"}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
