"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface Thread {
  partnerId:   string;
  nickname:    string;
  avatar_url:  string | null;
  lastMsg:     string;
  lastTime:    string;
  unreadCount: number;
  isMine:      boolean;
}

interface Props {
  locale:        string;
  initialThreads: Thread[];
}

function timeAgo(d: string, zh: boolean) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (m < 1)  return zh ? "刚刚" : "just now";
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  if (day < 7) return zh ? `${day}天前` : `${day}d ago`;
  return new Date(d).toLocaleDateString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

interface UserResult { id: string; nickname: string; avatar_url: string | null }

export default function MessagesPageClient({ locale, initialThreads }: Props) {
  const zh = locale === "zh";
  const [threads, setThreads]     = useState<Thread[]>(initialThreads);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ,   setSearchQ]   = useState("");
  const [results,   setResults]   = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll inbox every 8 s for new messages
  const pollInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const data = await res.json() as Array<{
        sender_id: string; receiver_id: string; content: string;
        is_read: boolean; created_at: string; partner?: { id: string; nickname: string; avatar_url: string | null };
      }>;
      // Rebuild threads from raw data (API returns deduped list)
      if (Array.isArray(data)) {
        // Need full thread info — just refresh the page data if new unread count differs
        const newUnread = data.filter((m) => !m.is_read).length;
        const oldUnread = threads.reduce((s, t) => s + t.unreadCount, 0);
        if (newUnread !== oldUnread) {
          window.location.reload();
        }
      }
    } catch { /* ignore */ }
  }, [threads]);

  useEffect(() => {
    const id = setInterval(pollInbox, 8_000);
    return () => clearInterval(id);
  }, [pollInbox]);

  // Search users
  useEffect(() => {
    if (!showSearch) { setSearchQ(""); setResults([]); return; }
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQ.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/forum/mention-search?q=${encodeURIComponent(searchQ)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      setSearching(false);
    }, 300);
  }, [searchQ]);

  const totalUnread = threads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-24">
      <div className="max-w-2xl mx-auto pt-6 px-0 sm:px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white">
              ✉️ {zh ? "私信" : "Messages"}
            </h1>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700] text-[#0A1628] font-black text-sm rounded-xl hover:bg-[#FFC200] transition-colors"
          >
            ✏️ {zh ? "新建私信" : "New Message"}
          </button>
        </div>

        {/* Conversation list */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {threads.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-5xl mb-4">✉️</div>
              <p className="text-gray-400 font-bold">{zh ? "暂无私信" : "No messages yet"}</p>
              <p className="text-gray-600 text-sm mt-1">
                {zh ? "点击「新建私信」开始对话" : "Click \"New Message\" to start chatting"}
              </p>
              <button
                onClick={() => setShowSearch(true)}
                className="mt-4 px-5 py-2 bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700] text-sm font-bold rounded-xl hover:bg-[#FFD700]/25 transition-colors"
              >
                {zh ? "找人聊天 →" : "Find someone →"}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3A5F]/40">
              {threads.map((t) => (
                <Link
                  key={t.partnerId}
                  href={`/${locale}/messages/${t.partnerId}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#1E3A5F]/30 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {t.avatar_url ? (
                      <Image src={t.avatar_url} alt={t.nickname} width={46} height={46}
                        className="rounded-full object-cover border border-[#1E3A5F]" unoptimized />
                    ) : (
                      <div className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-lg border border-[#1E3A5F]">
                        {t.nickname.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {t.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-[#0F2040]">
                        {t.unreadCount > 9 ? "9+" : t.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm font-bold ${t.unreadCount > 0 ? "text-white" : "text-gray-200"}`}>
                        {t.nickname}
                      </p>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-2">
                        {timeAgo(t.lastTime, zh)}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${t.unreadCount > 0 ? "text-gray-300 font-medium" : "text-gray-500"}`}>
                      {t.isMine && <span className="text-gray-600">{zh ? "你：" : "You: "}</span>}
                      {t.lastMsg}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search overlay */}
      {showSearch && (
        <div
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-md bg-[#0D1E3A] border border-[#1E3A5F] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]">
              <h3 className="text-white font-black text-base">
                🔍 {zh ? "搜索用户" : "Find User"}
              </h3>
              <button onClick={() => setShowSearch(false)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Search input */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 bg-[#080F1F] border border-[#2A4A7F] rounded-xl px-3 py-2.5 focus-within:border-[#FFD700]/40 transition-colors">
                <span className="text-gray-500 text-sm">🔍</span>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={zh ? "输入用户昵称…" : "Search by nickname…"}
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-[#FFD700] rounded-full animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto">
              {searchQ.trim() && !searching && results.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-8">
                  {zh ? "未找到用户" : "No users found"}
                </p>
              )}
              {!searchQ.trim() && (
                <p className="text-center text-gray-600 text-sm py-8">
                  {zh ? "输入昵称开始搜索" : "Type a nickname to search"}
                </p>
              )}
              {results.map((u) => (
                <Link
                  key={u.id}
                  href={`/${locale}/messages/${u.id}`}
                  onClick={() => setShowSearch(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#1E3A5F]/40 transition-colors"
                >
                  {u.avatar_url ? (
                    <Image src={u.avatar_url} alt={u.nickname} width={38} height={38}
                      className="rounded-full object-cover border border-[#1E3A5F]" unoptimized />
                  ) : (
                    <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#4F46E5] flex items-center justify-center text-white font-black text-sm border border-[#1E3A5F]">
                      {u.nickname.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{u.nickname}</p>
                  </div>
                  <span className="text-xs text-[#FFD700] font-bold">
                    {zh ? "发消息 →" : "Message →"}
                  </span>
                </Link>
              ))}
            </div>

            <div className="px-4 pb-4" />
          </div>
        </div>
      )}
    </div>
  );
}
